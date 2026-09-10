from pathlib import Path

import pytesseract
from pdf2image import convert_from_path
from PIL import Image


def _confidence_from_data(data: dict) -> float:
    confidences = [
        int(conf)
        for text, conf in zip(data["text"], data["conf"])
        if text.strip() and str(conf).lstrip("-").isdigit() and int(conf) >= 0
    ]
    if not confidences:
        return 0.0
    return (sum(confidences) / len(confidences)) / 100


def ocr_image(path: Path) -> tuple[str, float]:
    image = Image.open(path)
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    text = pytesseract.image_to_string(image)
    return text, _confidence_from_data(data)


def ocr_pdf(path: Path) -> tuple[str, float]:
    pages = convert_from_path(str(path), dpi=200)
    texts: list[str] = []
    all_confidences: list[float] = []
    for page in pages:
        data = pytesseract.image_to_data(page, output_type=pytesseract.Output.DICT)
        texts.append(pytesseract.image_to_string(page))
        page_conf = _confidence_from_data(data)
        if page_conf:
            all_confidences.append(page_conf)
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
    return "\n".join(texts), avg_confidence


def run_ocr(path: Path) -> tuple[str, float]:
    
    if path.suffix.lower() == ".pdf":
        return ocr_pdf(path)
    return ocr_image(path)