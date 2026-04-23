from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.benchmark import PricingBenchmark
from app.core.config import settings
import math


RISK_THRESHOLDS = {"low": 10, "medium": 40, "high": 100}


async def get_benchmark(
    db: AsyncSession,
    service_id: str,
    city: str,
    state: str,
) -> PricingBenchmark | None:
    # Prefer city-level, fall back to state-level
    result = await db.execute(
        select(PricingBenchmark).where(
            PricingBenchmark.service_id == service_id,
            PricingBenchmark.city == city,
            PricingBenchmark.state == state,
        )
    )
    benchmark = result.scalar_one_or_none()

    if benchmark is None:
        result = await db.execute(
            select(PricingBenchmark).where(
                PricingBenchmark.service_id == service_id,
                PricingBenchmark.state == state,
            )
        )
        benchmark = result.scalar_one_or_none()

    return benchmark


def compute_anomaly(
    item_price: float,
    benchmark: PricingBenchmark | None,
) -> tuple[bool, float, float | None]:
    """
    Returns (is_flagged, anomaly_score 0-100, percent_above_average).
    """
    if benchmark is None or benchmark.avg_price <= 0:
        return False, 0.0, None

    ratio = item_price / benchmark.avg_price
    percent_above = (ratio - 1.0) * 100

    if ratio <= settings.ANOMALY_THRESHOLD:
        return False, 0.0, percent_above if percent_above > 0 else None

    # Score: scale from threshold (30% above = score ~20) up to 100 (3× avg)
    excess = ratio - settings.ANOMALY_THRESHOLD
    raw_score = min(excess / (3.0 - settings.ANOMALY_THRESHOLD), 1.0) * 100
    anomaly_score = round(raw_score, 1)

    return True, anomaly_score, round(percent_above, 1)


def compute_bill_risk_level(items: list[dict]) -> str:
    flagged = [i for i in items if i["anomaly_flag"]]
    if not flagged:
        return "none"
    max_score = max(i["anomaly_score"] for i in flagged)
    if max_score <= RISK_THRESHOLDS["low"]:
        return "low"
    if max_score <= RISK_THRESHOLDS["medium"]:
        return "medium"
    return "high"
