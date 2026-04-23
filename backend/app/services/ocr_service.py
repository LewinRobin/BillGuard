import re
from dataclasses import dataclass
from typing import Optional
from google.cloud import vision


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


def extract_bill_from_image(image_bytes: bytes) -> ExtractedBill:
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.document_text_detection(image=image)

    full_text = response.full_text_annotation.text
    return _parse_bill_text(full_text)


def _parse_bill_text(text: str) -> ExtractedBill:
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    hospital_name = _extract_hospital_name(lines)
    items = _extract_line_items(lines)
    grand_total = _extract_grand_total(lines)

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
    items: list[ExtractedItem] = []
    # Pattern: description followed by optional qty, unit price, total
    price_pattern = re.compile(r"[\d,]+\.?\d*")

    for line in lines:
        prices = price_pattern.findall(line)
        if len(prices) >= 2:
            try:
                prices_float = [float(p.replace(",", "")) for p in prices]
                total = prices_float[-1]
                unit = prices_float[-2] if len(prices_float) >= 2 else total
                qty_str = prices_float[-3] if len(prices_float) >= 3 else 1
                qty = int(qty_str) if qty_str <= 100 else 1

                # Description: everything before the first price
                first_price_pos = line.find(prices[0])
                description = line[:first_price_pos].strip()
                if description and total > 0:
                    items.append(ExtractedItem(
                        raw_text=description,
                        quantity=qty,
                        unit_price=unit,
                        total_price=total,
                    ))
            except (ValueError, IndexError):
                continue

    return items


def _extract_grand_total(lines: list[str]) -> float:
    total_keywords = ["grand total", "total amount",
                      "net amount", "total payable"]
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
