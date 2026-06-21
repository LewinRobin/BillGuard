import csv
import uuid
import re
import asyncio
from pathlib import Path
import pdfplumber
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.db.base import Base
from app.models.service import Service
from app.models.benchmark import PricingBenchmark
from app.core.config import settings

ASSETS_DIR = Path(__file__).parent / "assets"
CSV_PATH = ASSETS_DIR / "cghs_nagpur_rates.csv"

CITY = "Nagpur"
STATE = "Maharashtra"
SOURCE_TYPE = "cghs"

SECTION_CATEGORIES = {
    "OPHTHALMOLOGY": "ophthalmology",
    "DENTAL": "dental",
    "ENT": "ent",
    "SURGERY": "surgery",
    "CARDIOLOGY": "cardiology",
    "RADIOLOGY": "radiology",
    "LABORATORY": "laboratory",
    "OBSTETRICS": "obstetrics",
    "GYNAECOLOGY": "gynaecology",
    "ORTHOPAEDICS": "orthopaedics",
    "UROLOGY": "urology",
    "NEUROSURGERY": "neurosurgery",
    "NEUROLOGY": "neurology",
    "PAEDIATRICS": "paediatrics",
    "PLASTIC": "plastic_surgery",
    "NUCLEAR MEDICINE": "nuclear_medicine",
    "RADIOTHERAPY": "radiotherapy",
    "MAMMOGRAPHY": "radiology",
    "CT": "radiology",
    "MRI": "radiology",
    "ULTRASOUND": "radiology",
    "X-RAY": "radiology",
    "ECHO": "cardiology",
    "BLOOD BANK": "laboratory",
    "PATHOLOGY": "laboratory",
    "MICROBIOLOGY": "microbiology",
}

DEFAULT_CATEGORY = "procedure"


def categorize_service(name: str) -> str:
    upper = name.upper()
    for keyword, cat in SECTION_CATEGORIES.items():
        if keyword in upper:
            return cat
    return DEFAULT_CATEGORY


def clean_price(val: str) -> float | None:
    if not val or not val.strip():
        return None
    val = val.strip().replace(",", "").replace("+", "").replace("GST", "").strip()
    try:
        return float(val)
    except ValueError:
        return None


def extract_pdf():
    pdf_path = ASSETS_DIR / "17062025164420_CGHS-Rates--Nagpur-.pdf"
    records = []
    current_category = DEFAULT_CATEGORY

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row or len(row) < 5:
                        continue

                    sr_no = (row[0] or "").strip()
                    procedure = (row[1] or "").strip()
                    non_nabh = (row[2] or "").strip()
                    nabh = (row[3] or "").strip()

                    if not sr_no and procedure:
                        header_text = procedure.upper()
                        cat = categorize_service(procedure)
                        if cat != DEFAULT_CATEGORY:
                            current_category = cat
                        continue

                    if not sr_no.isdigit():
                        continue

                    non_nabh_val = clean_price(non_nabh)
                    nabh_val = clean_price(nabh)

                    avg_price = nabh_val or non_nabh_val
                    min_price = non_nabh_val or nabh_val
                    max_price = nabh_val or non_nabh_val

                    if avg_price is None or min_price is None:
                        continue

                    records.append({
                        "sr_no": int(sr_no),
                        "procedure": procedure,
                        "category": current_category,
                        "min_price": min_price,
                        "avg_price": avg_price,
                        "max_price": max_price,
                    })

    return records


def save_csv(records: list[dict]):
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "sr_no", "procedure", "category",
            "min_price", "avg_price", "max_price",
        ])
        writer.writeheader()
        for r in records:
            writer.writerow(r)
    print(f"Saved {len(records)} records to {CSV_PATH}")


async def seed_database(records: list[dict]):
    engine = create_async_engine(settings.DATABASE_URL)
    session_local = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_local() as db:
        seen_names: dict[str, uuid.UUID] = {}
        existing = await db.execute(select(Service))
        for s in existing.scalars().all():
            seen_names[s.canonical_name] = s.id

        inserted_services = 0
        inserted_benchmarks = 0

        for r in records:
            name = r["procedure"]

            if name not in seen_names:
                svc_id = uuid.uuid4()
                svc = Service(
                    id=svc_id,
                    canonical_name=name,
                    category=r["category"],
                )
                db.add(svc)
                seen_names[name] = svc_id
                inserted_services += 1
            else:
                svc_id = seen_names[name]

        await db.flush()

        for r in records:
            name = r["procedure"]
            svc_id = seen_names[name]
            bench = PricingBenchmark(
                service_id=svc_id,
                city=CITY,
                state=STATE,
                avg_price=r["avg_price"],
                min_price=r["min_price"],
                max_price=r["max_price"],
                source_type=SOURCE_TYPE,
            )
            db.add(bench)
            inserted_benchmarks += 1

        await db.commit()
        print(f"Inserted {inserted_services} services, {inserted_benchmarks} benchmarks")

    await engine.dispose()


async def main():
    print("Extracting PDF...")
    records = extract_pdf()
    print(f"Extracted {len(records)} records")

    save_csv(records)

    print("Seeding database...")
    await seed_database(records)
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
