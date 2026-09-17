from pathlib import Path

import cv2
import numpy as np
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

from app.config import settings

TESSERACT_CONFIG = "--psm 6"
TARGET_DPI = 200
ASSUMED_DOC_WIDTH_INCHES = 8.5


def _confidence_from_data(data: dict) -> float:
    confidences = [
        int(conf)
        for text, conf in zip(data["text"], data["conf"])
        if text.strip() and str(conf).lstrip("-").isdigit() and int(conf) >= 0
    ]
    if not confidences:
        return 0.0
    return (sum(confidences) / len(confidences)) / 100


def _pil_to_gray_cv2(image: Image.Image) -> np.ndarray:
    arr = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    return cv2.cvtColor(arr, cv2.COLOR_BGR2GRAY)


def _upscale_if_needed(gray: np.ndarray) -> np.ndarray:
    h, w = gray.shape[:2]
    estimated_dpi = w / ASSUMED_DOC_WIDTH_INCHES
    if estimated_dpi >= TARGET_DPI:
        return gray

    factor = min(TARGET_DPI / estimated_dpi, settings.ocr_max_upscale_factor)
    new_w, new_h = int(w * factor), int(h * factor)
    if max(new_w, new_h) > settings.ocr_max_dimension:
        scale_down = settings.ocr_max_dimension / max(new_w, new_h)
        new_w, new_h = int(new_w * scale_down), int(new_h * scale_down)
    if new_w <= w:
        return gray
    return cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_CUBIC)


def _deskew(gray: np.ndarray) -> np.ndarray:
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
    if lines is None:
        return gray

    angles = []
    for line in lines[:50]:
        rho, theta = line[0]
        angle = (theta * 180 / np.pi) - 90
        if -30 <= angle <= 30:
            angles.append(angle)
    if not angles:
        return gray

    median_angle = float(np.median(angles))
    if abs(median_angle) < 0.5:
        return gray

    h, w = gray.shape[:2]
    matrix = cv2.getRotationMatrix2D((w // 2, h // 2), median_angle, 1.0)
    return cv2.warpAffine(gray, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def preprocess_image(image: Image.Image) -> Image.Image:

    gray = _pil_to_gray_cv2(image)
    gray = _upscale_if_needed(gray)
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    gray = _deskew(gray)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )
    return Image.fromarray(binary)


def preprocess_pdf_page(image: Image.Image) -> Image.Image:

    gray = _pil_to_gray_cv2(image)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return Image.fromarray(clahe.apply(gray))


def ocr_image(path: Path) -> tuple[str, float]:
    image = Image.open(path)
    processed = preprocess_image(image)
    data = pytesseract.image_to_data(processed, config=TESSERACT_CONFIG, output_type=pytesseract.Output.DICT)
    text = pytesseract.image_to_string(processed, config=TESSERACT_CONFIG)
    return text, _confidence_from_data(data)


def ocr_pdf(path: Path) -> tuple[str, float]:
    pages = convert_from_path(str(path), dpi=200)
    texts: list[str] = []
    all_confidences: list[float] = []
    for page in pages:
        processed = preprocess_pdf_page(page)
        data = pytesseract.image_to_data(processed, config=TESSERACT_CONFIG, output_type=pytesseract.Output.DICT)
        texts.append(pytesseract.image_to_string(processed, config=TESSERACT_CONFIG))
        page_conf = _confidence_from_data(data)
        if page_conf:
            all_confidences.append(page_conf)
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
    return "\n".join(texts), avg_confidence


def run_ocr(path: Path) -> tuple[str, float]:
    if path.suffix.lower() == ".pdf":
        return ocr_pdf(path)
    return ocr_image(path)