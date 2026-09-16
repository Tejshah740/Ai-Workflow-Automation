from app.services.validation_service import validate_submission


def _errors(issues):
    return [i for i in issues if i.severity == "error"]


def _warnings(issues):
    return [i for i in issues if i.severity == "warning"]


def test_invoice_valid():
    issues = validate_submission(
        "document", "invoice", {"amount": "100.00", "invoice_number": "INV-1", "date": "2026-01-01"}
    )
    assert issues == []


def test_invoice_missing_required_fields():
    issues = validate_submission("document", "invoice", {})
    fields_with_errors = {i.field for i in _errors(issues)}
    assert fields_with_errors == {"amount", "invoice_number"}


def test_invoice_non_numeric_amount():
    issues = validate_submission("document", "invoice", {"amount": "abc", "invoice_number": "INV-1"})
    assert any(i.field == "amount" and i.severity == "error" for i in issues)


def test_invoice_negative_amount():
    issues = validate_submission("document", "invoice", {"amount": "-50", "invoice_number": "INV-1"})
    assert any(i.field == "amount" and i.severity == "error" for i in issues)


def test_invoice_future_date_is_warning_not_error():
    issues = validate_submission(
        "document", "invoice", {"amount": "100", "invoice_number": "INV-1", "date": "2099-01-01"}
    )
    assert any(i.field == "date" and i.severity == "warning" for i in issues)
    assert _errors(issues) == []

def test_receipt_missing_amount():
    issues = validate_submission("document", "receipt", {})
    assert any(i.field == "amount" and i.severity == "error" for i in issues)


def test_receipt_valid():
    assert validate_submission("document", "receipt", {"amount": "10.00"}) == []


def test_purchase_order_flags_only_if_nothing_extracted():
    assert validate_submission("document", "purchase_order", {"amount": None}) != []
    assert validate_submission("document", "purchase_order", {"amount": "10"}) == []


def test_other_document_type_never_flags():
    assert validate_submission("document", "other", {}) == []


def test_leave_request_valid():
    issues = validate_submission(
        "request", "leave_request", {"start_date": "2026-10-01", "end_date": "2026-10-05"}
    )
    assert issues == []


def test_leave_request_end_before_start():
    issues = validate_submission(
        "request", "leave_request", {"start_date": "2026-10-05", "end_date": "2026-10-01"}
    )
    assert any(i.field == "end_date" and i.severity == "error" for i in issues)


def test_leave_request_missing_dates():
    issues = validate_submission("request", "leave_request", {})
    fields_with_errors = {i.field for i in _errors(issues)}
    assert fields_with_errors == {"start_date", "end_date"}


def test_leave_request_unparseable_date():
    issues = validate_submission(
        "request", "leave_request", {"start_date": "not a date", "end_date": "2026-10-05"}
    )
    assert any(i.field == "start_date" and i.severity == "error" for i in issues)

def test_purchase_request_missing_amount():
    issues = validate_submission("request", "purchase_request", {})
    assert any(i.field == "amount" and i.severity == "error" for i in issues)


def test_expense_reimbursement_negative_amount():
    issues = validate_submission("request", "expense_reimbursement", {"amount": "-1"})
    assert any(i.field == "amount" and i.severity == "error" for i in issues)


def test_unrecognized_request_type_is_noop():
    assert validate_submission("request", "totally_unknown_type", {"whatever": "field"}) == []

def test_unrecognized_document_type_falls_back_to_other():
    assert validate_submission("document", "totally_unknown_type", {"whatever": "field"}) == []