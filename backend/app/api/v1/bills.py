import uuid
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from sqlalchemy import select, func

from app.core.dependencies import CurrentUser, DB
from app.models.bill import Bill, BillStatus
from app.schemas.bill import BillOut, BillUploadResponse, ProcessResponse, PaginatedBills, ApiResponse, ProcessBillRequest
from app.services.storage import upload_file
from app.workers.bill_tasks import process_bill_task

router = APIRouter(prefix="/bills", tags=["bills"])

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_MB = 20


@router.post("/upload-bill", status_code=201)
async def upload_bill(
    file: UploadFile = File(...),
    city: str = Form(...),
    state: str = Form(...),
    db: DB = ...,
    current_user: CurrentUser = ...,
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            400, "Only PDF, JPEG, PNG, and WebP files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds {MAX_FILE_SIZE_MB}MB limit.")

    bill_id = uuid.uuid4()
    s3_key = f"bills/{current_user.id}/{bill_id}/{file.filename}"

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
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

    task = process_bill_task.delay(str(body.bill_id))
    resp = ProcessResponse(taskId=task.id, message="Processing started.")
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
        select(Bill).where(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found.")
    return ApiResponse(data=BillOut.model_validate(bill).model_dump(by_alias=True))


@router.get("/bill/{bill_id}/analysis")
async def get_bill_analysis(bill_id: uuid.UUID, db: DB, current_user: CurrentUser):
    result = await db.execute(
        select(Bill).where(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found.")
    return ApiResponse(data=BillOut.model_validate(bill).model_dump(by_alias=True))


@router.delete("/bill/{bill_id}", status_code=204)
async def delete_bill(bill_id: uuid.UUID, db: DB, current_user: CurrentUser):
    from app.services.storage import delete_file
    result = await db.execute(
        select(Bill).where(Bill.id == bill_id, Bill.user_id == current_user.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found.")

    if bill.s3_key:
        delete_file(bill.s3_key)

    await db.delete(bill)
    await db.commit()
