import json
import logging
import time

from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings
from app.services.ocr_service import ExtractedBill, ExtractedItem

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are a hospital bill parser for India. Given the OCR text of a hospital bill,
extract the bill information as JSON. Rules:
- hospital_name: the hospital at the top of the bill.
- grand_total: the final payable/total amount (e.g. from "Total Bill Amount" or "Amount Payable").
- items: ONLY real chargeable line items. Skip category headers (e.g. "Room/Bed Charges",
  "Nursing Charges", "OT Charges"), subtotal lines, codes, dates, bed numbers and units.
- For each item return: description (short, clean), quantity (integer), unit_price and
  total_price (numbers only, no currency symbols).
- A charge line may span multiple OCR lines; join them into one description.
- If a value is unclear, use 1 for quantity and the amount for both prices.
- Return valid JSON only."""


class LLMItem(BaseModel):
    description: str = Field(..., description="Clean line-item description")
    quantity: int = Field(default=1)
    unit_price: float = Field(default=0.0)
    total_price: float = Field(default=0.0)


class LLMBill(BaseModel):
    hospital_name: str = Field(default="Unknown Hospital")
    grand_total: float = Field(default=0.0)
    items: list[LLMItem] = Field(default_factory=list)


def _llm_enabled() -> bool:
    return bool(settings.GEMINI_API_KEY)


def extract_bill_with_llm(ocr_text: str) -> ExtractedBill | None:
    """Ask Gemini to structure the raw OCR text into an ExtractedBill.

    Returns None (never raises) when disabled or on any failure so the
    caller can fall back to the regex parser.
    """
    if not _llm_enabled():
        logger.debug("LLM extraction disabled (no GEMINI_API_KEY)")
        return None
    if not ocr_text.strip():
        return None

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = (
        "Extract the bill structure from the following OCR text.\n"
        "--- OCR TEXT START ---\n"
        f"{ocr_text}\n"
        "--- OCR TEXT END ---"
    )

    started = time.monotonic()
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=LLMBill,
                temperature=0,
            ),
        )
    except Exception:
        logger.exception("Gemini extraction call failed; falling back to regex parser")
        return None

    elapsed = time.monotonic() - started
    try:
        data = json.loads(response.text)
        logger.debug("Gemini returned JSON: %r", data)
        llm_bill = LLMBill.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        logger.warning(
            "Gemini returned unparseable output in %.1fs; falling back to regex parser",
            elapsed,
        )
        return None

    items = [
        ExtractedItem(
            raw_text=it.description,
            quantity=it.quantity,
            unit_price=it.unit_price,
            total_price=it.total_price,
        )
        for it in llm_bill.items
    ]
    bill = ExtractedBill(
        hospital_name=llm_bill.hospital_name,
        items=items,
        grand_total=llm_bill.grand_total,
    )
    logger.info(
        "Gemini extraction in %.2fs: hospital=%r items=%d grand_total=%s",
        elapsed,
        bill.hospital_name,
        len(bill.items),
        bill.grand_total,
    )
    return bill
