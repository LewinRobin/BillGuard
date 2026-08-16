from logging import getLogger

import pymupdf as fitz

logger = getLogger(__name__)

DEFAULT_DPI = 200
MAX_PAGES = 30


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Return embedded text from a PDF ('' for scanned/image-only PDFs)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        parts = [page.get_text("text") for page in doc]
        return "\n".join(parts).strip()
    finally:
        doc.close()


def render_pdf_pages(pdf_bytes: bytes, dpi: int = DEFAULT_DPI, max_pages: int = MAX_PAGES) -> list[bytes]:
    """Rasterize each PDF page to PNG bytes for OCR."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        matrix = fitz.Matrix(dpi / 72.0, dpi / 72.0)
        pages: list[bytes] = []
        for i, page in enumerate(doc):
            if i >= max_pages:
                logger.warning("PDF has more than %d pages; OCRing only the first %d", max_pages, max_pages)
                break
            pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB, alpha=False)
            pages.append(pix.tobytes("png"))
        logger.info("Rendered %d page(s) to image for OCR", len(pages))
        return pages
    finally:
        doc.close()
