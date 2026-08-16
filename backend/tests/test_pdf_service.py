import pymupdf
import pytest

from app.services.pdf_service import extract_text_from_pdf, render_pdf_pages
from app.services.ocr_service import parse_bill_text


def _pdf_bytes_from_lines(lines: list[str]) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    y = 50
    for line in lines:
        page.insert_text((50, y), line, fontsize=10)
        y += 14
    return doc.tobytes()


def _scanned_pdf_bytes() -> bytes:
    """A PDF whose page is an image with no text layer (like a scan)."""
    text_doc = pymupdf.open()
    page = text_doc.new_page()
    page.insert_text((50, 80), "Scanned hospital bill", fontsize=12)
    pix = page.get_pixmap()

    doc = pymupdf.open()
    scan_page = doc.new_page()
    scan_page.insert_image(scan_page.rect, pixmap=pix)
    return doc.tobytes()


BREAKUP_LINES = [
    "City Hospital & Research Centre",
    "DETAILED BREAKUP",
    "Particulars",
    "Date & Time",
    "Rate",
    "Units",
    "Amount",
    "10500",
    "Professional Charges",
    "1",
    "150.00",
    "150.00",
    "10800",
    "Room Rent (General)",
    "1",
    "800.00",
    "800.00",
    "10230",
    "Consultation Fee",
    "1",
    "300.00",
    "300.00",
    "Subtotal",
    "1,250.00",
    "GRAND TOTAL",
    "1,250.00",
]


def test_extract_text_from_text_pdf():
    text = extract_text_from_pdf(_pdf_bytes_from_lines(BREAKUP_LINES))
    assert "DETAILED BREAKUP" in text
    assert "GRAND TOTAL" in text


def test_text_pdf_end_to_end_parse():
    text = extract_text_from_pdf(_pdf_bytes_from_lines(BREAKUP_LINES))
    bill = parse_bill_text(text)
    assert bill.hospital_name == "City Hospital & Research Centre"
    assert len(bill.items) == 3
    assert bill.grand_total == 1250.0


def test_scanned_pdf_has_no_text():
    assert extract_text_from_pdf(_scanned_pdf_bytes()) == ""


def test_render_pdf_pages_returns_pngs():
    pages = render_pdf_pages(_scanned_pdf_bytes())
    assert len(pages) >= 1
    assert all(p.startswith(b"\x89PNG") for p in pages)
