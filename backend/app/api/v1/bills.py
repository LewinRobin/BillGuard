import uuid
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, DB
from app.core.logger import logger
from app.models.bill import Bill, BillStatus, RiskLevel
from app.models.service import Service
from app.schemas.bill import BillOut, BillUploadResponse, ProcessResponse, PaginatedBills, ApiResponse, ProcessBillRequest, CorrectItemRequest
from app.services.storage import upload_file
from app.services import anomaly
from app.workers.bill_tasks import _process_bill

router = APIRouter(prefix="/bills", tags=["bills"])

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_MB = 20


@router.post("/upload-bill", status_code=201)
async def upload_bill(
    db: DB,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    city: str = Form(...),
    state: str = Form(...),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            400, "Only PDF, JPEG, PNG, and WebP files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds {MAX_FILE_SIZE_MB}MB limit.")

    # uuid4() creates a random UUID, which is suitable for generating unique identifiers for bills.
    bill_id = uuid.uuid4()
    # The S3 key is constructed using the user's ID and the bill's UUID to ensure that each bill is stored in a unique location in the S3 bucket. This structure helps
    # organize bills by user and bill ID, making it easier to manage and retrieve them later.
    s3_key = f"bills/{current_user.id}/{bill_id}/{file.filename}"

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or "")[1]) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        upload_file(tmp_path, s3_key, file.content_type)
    finally:
        os.unlink(tmp_path)

    bill = Bill(
        id=bill_id,
        user_id=current_user.id,
        city=city,
        state=state,
        s3_key=s3_key,
        status=BillStatus.pending,
    )
    db.add(bill)
    await db.commit()

    resp = BillUploadResponse(billId=bill_id, message="Bill uploaded successfully.")
    return ApiResponse(data=resp.model_dump(by_alias=True))


@router.post("/process-bill")
async def process_bill(
    body: ProcessBillRequest,
    db: DB,
    current_user: CurrentUser,
):
    result = await db.execute(
        select(Bill).where(Bill.id == body.bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found.")
    if bill.status not in (BillStatus.pending, BillStatus.failed):
        raise HTTPException(400, f"Bill is already {bill.status}.")

    try:
        await _process_bill(str(body.bill_id))
    except Exception:
        pass

    resp = ProcessResponse(taskId="inline", message="Processing completed.")
    return ApiResponse(data=resp.model_dump(by_alias=True))


@router.get("")
async def list_bills(
    db: DB,
    current_user: CurrentUser,
    page: int = 1,
    limit: int = 10,
):
    offset = (page - 1) * limit
    total_result = await db.execute(
        select(func.count()).where(Bill.user_id == current_user.id)
    )
    total = total_result.scalar()

    result = await db.execute(
        select(Bill)
        .options(selectinload(Bill.items))
        .where(Bill.user_id == current_user.id)
        .order_by(Bill.uploaded_at.desc())
        .offset(offset)
        .limit(limit)
    )
    bills = result.scalars().all()

    items = [BillOut.model_validate(b).model_dump(by_alias=True) for b in bills]
    data = {"items": items, "total": total, "page": page, "limit": limit}
    return ApiResponse(data=data)


@router.get("/bill/{bill_id}")
async def get_bill(bill_id: uuid.UUID, db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(Bill).options(selectinload(Bill.items)).where(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found.")
    return ApiResponse(data=BillOut.model_validate(bill).model_dump(by_alias=True))


@router.get("/bill/{bill_id}/analysis")
async def get_bill_analysis(bill_id: uuid.UUID, db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(Bill).options(selectinload(Bill.items)).where(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found.")
    return ApiResponse(data=BillOut.model_validate(bill).model_dump(by_alias=True))


@router.delete("/bill/{bill_id}", status_code=204)
async def delete_bill(bill_id: uuid.UUID, db: DB, current_user: CurrentUser):
    from app.services.storage import delete_file
    logger.info("DELETE bill=%s user=%s", bill_id, current_user.id)
    result = await db.execute(
        select(Bill).where(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        logger.warning("DELETE bill=%s not found for user=%s", bill_id, current_user.id)
        raise HTTPException(404, "Bill not found.")

    if bill.s3_key:
        delete_file(bill.s3_key)

    await db.delete(bill)
    await db.commit()
    logger.info("Deleted bill=%s user=%s", bill_id, current_user.id)


@router.patch("/bill/{bill_id}/items/{item_id}")
async def correct_item(
    bill_id: uuid.UUID,
    item_id: uuid.UUID,
    body: CorrectItemRequest,
    db: DB,
    current_user: CurrentUser,
):
    result = await db.execute(
        select(Bill).options(selectinload(Bill.items)).where(
            Bill.id == bill_id, Bill.user_id == current_user.id
        )
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found.")

    item = next((i for i in bill.items if i.id == item_id), None)
    if not item:
        raise HTTPException(404, "Bill item not found.")

    if body.service_id and body.custom_name:
        raise HTTPException(400, "Provide either serviceId or customName, not both.")
    if not body.service_id and not body.custom_name:
        raise HTTPException(400, "Provide serviceId or customName.")

    service = None
    if body.service_id:
        service_result = await db.execute(
            select(Service).where(Service.id == body.service_id)
        )
        service = service_result.scalar_one_or_none()
        if not service:
            raise HTTPException(404, "Service not found.")
    else:
        name = body.custom_name.strip()
        if not name:
            raise HTTPException(400, "Custom service name cannot be empty.")
        existing = await db.execute(
            select(Service).where(Service.canonical_name == name)
        )
        service = existing.scalar_one_or_none()
        if service is None:
            from app.services.normalization import embed_text
            service = Service(
                id=uuid.uuid4(),
                canonical_name=name,
                category="other",
                embedding=embed_text(name),
            )
            db.add(service)
            await db.flush()

    item.normalized_service_id = service.id
    item.normalized_service_name = service.canonical_name
    item.category = service.category

    benchmark = await anomaly.get_benchmark(db, str(service.id), bill.city, bill.state)
    is_flagged, score, pct_above = anomaly.compute_anomaly(item.total_price, benchmark)
    item.avg_regional_price = benchmark.avg_price if benchmark else None
    item.min_regional_price = benchmark.min_price if benchmark else None
    item.max_regional_price = benchmark.max_price if benchmark else None
    item.anomaly_flag = is_flagged
    item.anomaly_score = score
    item.percent_above_average = pct_above

    total_flagged = 0.0
    risk_items = []
    for it in bill.items:
        risk_items.append({"anomaly_flag": it.anomaly_flag, "anomaly_score": it.anomaly_score})
        if it.anomaly_flag:
            total_flagged += it.total_price
    bill.total_flagged_amount = total_flagged
    bill.risk_level = RiskLevel(anomaly.compute_bill_risk_level(risk_items))

    await db.commit()

    refreshed = await db.execute(
        select(Bill).options(selectinload(Bill.items)).where(Bill.id == bill.id)
    )
    bill = refreshed.scalar_one()
    return ApiResponse(data=BillOut.model_validate(bill).model_dump(by_alias=True))
