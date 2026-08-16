import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)

MIN_LONG_EDGE = 2000
ENCODE_QUALITY = 92


def _is_enhanceable(image_bytes: bytes) -> bool:
    for magic in (b"\x89PNG", b"\xff\xd8\xff", b"RIFF", b"II*\x00", b"MM\x00*"):
        if image_bytes.startswith(magic):
            return True
    return False


def enhance_image(image_bytes: bytes) -> bytes:
    """
    Pre-process an image before OCR to improve readability of blurry /
    low-contrast photos: CLAHE contrast, unsharp mask, and upscaling.

    Returns the original bytes untouched if the input is not an image or if
    enhancement fails, so it can never break the OCR pipeline.
    """
    if not _is_enhanceable(image_bytes):
        return image_bytes

    try:
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return image_bytes

        h, w = img.shape[:2]

        # 1. Contrast: CLAHE on the L channel (preserves colour)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l_channel)
        lab = cv2.merge((l_enhanced, a, b))
        img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # 2. Sharpening: unsharp mask
        blurred = cv2.GaussianBlur(img, (0, 0), sigmaX=1.5)
        img = cv2.addWeighted(img, 1.6, blurred, -0.6, 0)

        # 3. Upscale small images for finer text strokes
        long_edge = max(h, w)
        if long_edge < MIN_LONG_EDGE:
            scale = min(MIN_LONG_EDGE / long_edge, 2.0)
            img = cv2.resize(
                img,
                None,
                fx=scale,
                fy=scale,
                interpolation=cv2.INTER_CUBIC,
            )

        ok, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, ENCODE_QUALITY])
        if not ok:
            return image_bytes

        result = encoded.tobytes()
        logger.info(
            "Enhanced image for OCR: %dx%d -> %dx%d (%d bytes)",
            w, h, img.shape[1], img.shape[0], len(result),
        )
        return result
    except Exception:
        logger.exception("Image enhancement failed; passing through original bytes")
        return image_bytes
