import asyncio
import logging
import uuid
from app.workers.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.models.bill import Bill, BillItem, BillStatus, RiskLevel
from app.services import ocr_service, normalization, anomaly, storage
from app.services.llm_extractor import extract_bill_with_llm
from sqlalchemy import select
import boto3
from app.core.config import settings

logger = logging.getLogger(__name__)


def run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_bill_task(self, bill_id: str):
    try:
        run_async(_process_bill(bill_id))
    except Exception as exc:
        raise self.retry(exc=exc)


async def _process_bill(bill_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Bill).where(Bill.id == bill_id))
        bill = result.scalar_one_or_none()
        if not bill:
            return

        bill.status = BillStatus.processing
        await db.commit()

        try:
            # 1. Download file from S3
            logger.info("Processing bill %s: downloading s3://%s/%s", bill.id, settings.S3_BUCKET_NAME, bill.s3_key)
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            obj = s3.get_object(
                Bucket=settings.S3_BUCKET_NAME, Key=bill.s3_key)
            file_bytes = obj["Body"].read()
            logger.info("Downloaded %d bytes for bill %s", len(file_bytes), bill.id)

            # 2. OCR
            logger.info("Running OCR for bill %s", bill.id)
            ocr_text = ocr_service.ocr_text_from_image(file_bytes)
            extracted = ocr_service.parse_bill_text(ocr_text)

            # 2b. Try LLM structuring of the raw OCR text, fall back to regex
            llm_extracted = extract_bill_with_llm(ocr_text)
            if llm_extracted is not None:
                extracted = llm_extracted

            bill.hospital_name = extracted.hospital_name or bill.hospital_name
            bill.total_amount = extracted.grand_total
            logger.info(
                "OCR result for bill %s: hospital=%r total=%s items=%d",
                bill.id,
                bill.hospital_name,
                bill.total_amount,
                len(extracted.items),
            )

            # 3. For each item: normalize + benchmark + anomaly
            bill_items = []
            total_flagged = 0.0

            for raw_item in extracted.items:
                logger.info(
                    "Bill %s item: text=%r qty=%s unit=%s total=%s",
                    bill.id,
                    raw_item.raw_text,
                    raw_item.quantity,
                    raw_item.unit_price,
                    raw_item.total_price,
                )
                service_id, canonical_name, category = await normalization.find_best_match(
                    db, raw_item.raw_text
                )
                logger.info(
                    "Bill %s normalization: text=%r -> service_id=%s canonical=%r category=%r",
                    bill.id,
                    raw_item.raw_text,
                    service_id,
                    canonical_name,
                    category,
                )

                benchmark = None
                if service_id:
                    benchmark = await anomaly.get_benchmark(
                        db, service_id, bill.city, bill.state
                    )
                if benchmark is None:
                    logger.warning(
                        "Bill %s: NO benchmark found for item %r (service_id=%s, city=%s, state=%s)",
                        bill.id,
                        raw_item.raw_text,
                        service_id,
                        bill.city,
                        bill.state,
                    )

                is_flagged, score, pct_above = anomaly.compute_anomaly(
                    raw_item.total_price, benchmark
                )
                logger.info(
                    "Bill %s anomaly: item=%r flagged=%s score=%s pct_above_avg=%s benchmark_avg=%s",
                    bill.id,
                    raw_item.raw_text,
                    is_flagged,
                    score,
                    pct_above,
                    benchmark.avg_price if benchmark else None,
                )

                if is_flagged:
                    total_flagged += raw_item.total_price

                item = BillItem(
                    id=uuid.uuid4(),
                    bill_id=bill.id,
                    extracted_text=raw_item.raw_text,
                    normalized_service_id=uuid.UUID(
                        service_id) if service_id else None,
                    normalized_service_name=canonical_name or raw_item.raw_text,
                    category=category or "other",
                    quantity=raw_item.quantity,
                    unit_price=raw_item.unit_price,
                    total_price=raw_item.total_price,
                    avg_regional_price=benchmark.avg_price if benchmark else None,
                    min_regional_price=benchmark.min_price if benchmark else None,
                    max_regional_price=benchmark.max_price if benchmark else None,
                    anomaly_flag=is_flagged,
                    anomaly_score=score,
                    percent_above_average=pct_above,
                )
                db.add(item)
                bill_items.append({
                    "anomaly_flag": is_flagged,
                    "anomaly_score": score,
                })

            # 4. Compute bill-level risk
            risk = anomaly.compute_bill_risk_level(bill_items)
            bill.total_flagged_amount = total_flagged
            bill.risk_level = RiskLevel(risk)
            bill.status = BillStatus.completed
            logger.info(
                "Bill %s completed: items=%d flagged_amount=%s risk=%s",
                bill.id,
                len(bill_items),
                total_flagged,
                risk,
            )

            await db.commit()

        except Exception as e:
            logger.exception("Bill %s processing FAILED: %s", bill.id, e)
            bill.status = BillStatus.failed
            await db.commit()
            raise
