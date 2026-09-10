import re

AMOUNT_PATTERN = re.compile(r"(?:total|amount due|amount)[:\s]*\$?\s*([\d,]+\.\d{2})", re.IGNORECASE)
DATE_PATTERN = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b")
INVOICE_NUMBER_PATTERN = re.compile(r"invoice\s*(?:#|no\.?|number)[:\s]+([A-Za-z0-9.-]+)", re.IGNORECASE)


def extract_fields(text: str) -> dict[str, str | None]:
    amount_match = AMOUNT_PATTERN.search(text)
    date_match = DATE_PATTERN.search(text)
    invoice_match = INVOICE_NUMBER_PATTERN.search(text)

    return {
        "amount": amount_match.group(1) if amount_match else None,
        "date": date_match.group(1) if date_match else None,
        "invoice_number": invoice_match.group(1) if invoice_match else None,
    }