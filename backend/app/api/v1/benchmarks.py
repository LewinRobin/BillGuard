from fastapi import APIRouter
from sqlalchemy import select
from app.core.dependencies import DB, CurrentUser
from app.models.benchmark import PricingBenchmark
from app.schemas.benchmark import BenchmarkOut

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


@router.get("", response_model=list[BenchmarkOut])
async def list_benchmarks(
    db: DB,
    current_user: CurrentUser,
    state: str | None = None,
    city: str | None = None,
):
    query = select(PricingBenchmark)
    if state:
        query = query.where(PricingBenchmark.state == state)
    if city:
        query = query.where(PricingBenchmark.city == city)

    result = await db.execute(query.limit(200))
    return result.scalars().all()
