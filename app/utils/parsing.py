from datetime import date

from dateutil import parser as dateutil_parser


def parse_amount(value) -> float | None:
    if value is None:
        return None
    try:
        return float(str(value).replace(",", "").replace("$", "").strip())
    except (ValueError, TypeError):
        return None


def parse_date(value) -> date | None:
    if not value:
        return None
    try:
        return dateutil_parser.parse(str(value)).date()
    except (ValueError, TypeError, OverflowError):
        return None