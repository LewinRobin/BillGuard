import pytest
from app.services.anomaly import compute_anomaly, compute_bill_risk_level
from app.models.benchmark import PricingBenchmark
import uuid


def make_benchmark(avg: float, min_: float, max_: float) -> PricingBenchmark:
    b = PricingBenchmark()
    b.id = uuid.uuid4()
    b.service_id = uuid.uuid4()
    b.avg_price = avg
    b.min_price = min_
    b.max_price = max_
    b.city = "Kochi"
    b.state = "Kerala"
    b.source_type = "cghs"
    return b


def test_no_anomaly_within_threshold():
    b = make_benchmark(1000, 800, 1200)
    flagged, score, pct = compute_anomaly(1200.0, b)
    assert not flagged
    assert score == 0.0


def test_anomaly_above_threshold():
    b = make_benchmark(1000, 800, 1200)
    flagged, score, pct = compute_anomaly(1500.0, b)  # 50% above
    assert flagged
    assert score > 0
    assert pct == pytest.approx(50.0, abs=1.0)


def test_no_benchmark_returns_no_flag():
    flagged, score, pct = compute_anomaly(5000.0, None)
    assert not flagged
    assert pct is None


def test_bill_risk_level_none():
    items = [{"anomaly_flag": False, "anomaly_score": 0}]
    assert compute_bill_risk_level(items) == "none"


def test_bill_risk_level_high():
    items = [{"anomaly_flag": True, "anomaly_score": 75}]
    assert compute_bill_risk_level(items) == "high"
