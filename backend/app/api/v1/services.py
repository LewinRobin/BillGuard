import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy import select, or_

from app.core.dependencies import DB, CurrentUser
from app.models.service import Service
from app.schemas.bill import ApiResponse, ServiceOut

router = APIRouter(prefix="/services", tags=["services"])


@router.get("")
async def search_services(
    db: DB,
    current_user: CurrentUser,
    q: str,
    limit: int = 20,
):
    if not q.strip():
        return ApiResponse(data={"items": []})

    pattern = f"%{q.strip()}%"
    result = await db.execute(
        select(Service)
        .where(or_(Service.canonical_name.ilike(pattern), Service.category.ilike(pattern)))
        .order_by(Service.canonical_name)
        .limit(limit)
    )
    services = result.scalars().all()
    items = [ServiceOut.model_validate(s).model_dump(by_alias=True) for s in services]
    return ApiResponse(data={"items": items, "total": len(items)})
