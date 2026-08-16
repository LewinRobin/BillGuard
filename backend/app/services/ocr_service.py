import re
from dataclasses import dataclass
from typing import Optional
from google.cloud import vision
from logging import getLogger
from app.services.image_enhance import enhance_image
logger = getLogger(__name__)



@dataclass
class ExtractedItem:
    raw_text: str
    quantity: int
    unit_price: float
    total_price: float


@dataclass
class ExtractedBill:
    hospital_name: str
    items: list[ExtractedItem]
    grand_total: float


def ocr_text_from_image(image_bytes: bytes) -> str:
    logger.info("Calling Google Vision OCR on %d bytes", len(image_bytes))
    image_bytes = enhance_image(image_bytes)
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    # This following line is commented out because the `document_text_detection` method is added at runtime or mapped dynamically, and may not be directly available in
    # the client library. Instead, we use `annotate_image` with the appropriate feature type.
    # response = client.document_text_detection(image=image)
    response = client.annotate_image({
        "image": image,
        "features": [{"type_": vision.Feature.Type.DOCUMENT_TEXT_DETECTION}],
    })

    full_text = response.full_text_annotation.text
    logger.info("OCR raw text (%d chars):\n%s", len(full_text), full_text)
    return full_text


def extract_bill_from_image(image_bytes: bytes) -> ExtractedBill:
    full_text = ocr_text_from_image(image_bytes)

    bill = parse_bill_text(full_text)
    logger.info(
        "OCR parsed: hospital=%r items=%d grand_total=%s",
        bill.hospital_name,
        len(bill.items),
        bill.grand_total,
    )
    return bill


def parse_bill_text(text: str) -> ExtractedBill:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    logger.debug(f"Extracted lines from OCR: {lines}")

    hospital_name = _extract_hospital_name(lines)
    items = _extract_line_items(lines)
    grand_total = _extract_grand_total(lines)

    logger.info("Parsed %d line items: %s", len(items), items)

    return ExtractedBill(
        hospital_name=hospital_name,
        items=items,
        grand_total=grand_total,
    )


def _extract_hospital_name(lines: list[str]) -> str:
    # First non-empty line that doesn't start with a digit is usually the hospital name
    for line in lines[:5]:
        if line and not line[0].isdigit():
            return line
    return "Unknown Hospital"


def _extract_line_items(lines: list[str]) -> list[ExtractedItem]:
    # Prefer the columnar "DETAILED BREAKUP" table used by most Indian hospital
    # bills; fall back to single-line items for other layouts.
    breakup_start = next(
        (i for i, l in enumerate(lines) if "detailed breakup" in l.lower()),
        None,
    )
    if breakup_start is not None:
        items = _parse_breakup_items(lines[breakup_start + 1:])
        if items:
            return items
    return _parse_inline_items(lines)


def _parse_breakup_items(lines: list[str]) -> list[ExtractedItem]:
    money_re = re.compile(r"^\d{1,7}(?:,\d{3})*\.\d{2}$")
    code_re = re.compile(r"^\d{5,7}$")
    date_re = re.compile(r"^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}")
    time_re = re.compile(r"^\d{1,2}:\d{2}")
    units_re = re.compile(r"^\d{1,4}(?:/\d{1,4})?$")
    paren_re = re.compile(r"^\(.*\)$")
    header_words = ("particulars", "date & time", "rate", "units", "amount", "code")

    items: list[ExtractedItem] = []
    desc_parts: list[str] = []
    amounts: list[float] = []
    skip_amounts = False  # True right after a Subtotal line (skip its value)

    def flush():
        nonlocal desc_parts, amounts
        if desc_parts and amounts:
            total = amounts[-1]
            unit = amounts[0] if len(amounts) >= 2 else total
            items.append(ExtractedItem(
                raw_text=" ".join(desc_parts).strip(),
                quantity=1,
                unit_price=unit,
                total_price=total,
            ))
        desc_parts = []
        amounts = []

    for idx, line in enumerate(lines):
        s = line.strip()
        if not s:
            continue
        low = s.lower()
        if low.startswith("subtotal"):
            flush()
            skip_amounts = True
            continue
        if any(h in low for h in header_words):
            continue
        if paren_re.match(s) or code_re.match(s) or date_re.match(s) or time_re.match(s):
            continue
        if money_re.match(s):
            if not skip_amounts:
                amounts.append(float(s.replace(",", "")))
            continue
        if units_re.match(s):
            continue
        # Description line: starts a new item only if the previous one has prices
        if desc_parts and amounts:
            flush()
        # Skip category headers like "Nursing Charges" that are followed by a code line
        next_line = lines[idx + 1].strip() if idx + 1 < len(lines) else ""
        if code_re.match(next_line):
            skip_amounts = True
            continue
        skip_amounts = False
        desc_parts.append(s)

    flush()
    return items


def _parse_inline_items(lines: list[str]) -> list[ExtractedItem]:
    items: list[ExtractedItem] = []
    # Pattern: description followed by optional qty, unit price, total on one line
    price_pattern = re.compile(r"\d+\.\d{2}")

    for line in lines:
        prices = price_pattern.findall(line)
        if prices:
            try:
                prices_float = [float(p.replace(",", "")) for p in prices]
                total = prices_float[-1]
                unit = prices_float[-2] if len(prices_float) >= 2 else total

                # Description: everything before the first price
                first_price_pos = line.find(prices[0])
                description = line[:first_price_pos].strip()
                if description and total > 0:
                    items.append(ExtractedItem(
                        raw_text=description,
                        quantity=1,
                        unit_price=unit,
                        total_price=total,
                    ))
            except (ValueError, IndexError):
                continue

    return items


def _extract_grand_total(lines: list[str]) -> float:
    total_keywords = [
        "grand total",
        "total amount",
        "bill amount",
        "total bill",
        "net amount",
        "amount payable",
        "total payable",
    ]
    price_pattern = re.compile(r"[\d,]+\.?\d*")

    for line in lines:
        lower = line.lower()
        if any(kw in lower for kw in total_keywords):
            prices = price_pattern.findall(line)
            if prices:
                try:
                    return float(prices[-1].replace(",", ""))
                except ValueError:
                    pass
    return 0.0
