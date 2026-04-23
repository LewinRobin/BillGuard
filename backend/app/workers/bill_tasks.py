import asyncio
import uuid
from app.workers.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.models.bill import Bill, BillItem, BillStatus, RiskLevel
from app.services import ocr_service, normalization, anomaly, storage
from sqlalchemy import select
import boto3
from app.core.config import settings


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
            s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            obj = s3.get_object(
                Bucket=settings.S3_BUCKET_NAME, Key=bill.s3_key)
            file_bytes = obj["Body"].read()

            # 2. OCR
            extracted = ocr_service.extract_bill_from_image(file_bytes)
            bill.hospital_name = extracted.hospital_name or bill.hospital_name
            bill.total_amount = extracted.grand_total

            # 3. For each item: normalize + benchmark + anomaly
            bill_items = []
            total_flagged = 0.0

            for raw_item in extracted.items:
                service_id, canonical_name, category = await normalization.find_best_match(
                    db, raw_item.raw_text
                )

                benchmark = None
                if service_id:
                    benchmark = await anomaly.get_benchmark(
                        db, service_id, bill.city, bill.state
                    )

                is_flagged, score, pct_above = anomaly.compute_anomaly(
                    raw_item.total_price, benchmark
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

            await db.commit()

        except Exception as e:
            bill.status = BillStatus.failed
            await db.commit()
            raise
