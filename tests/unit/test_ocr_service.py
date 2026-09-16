from app.services.ocr_service import _confidence_from_data


def test_confidence_averages_valid_word_detections():
    data = {"text": ["Hello", "World"], "conf": [90, 80]}
    assert _confidence_from_data(data) == 0.85


def test_confidence_ignores_negative_conf_markers():
    data = {"text": ["", "", "Hello"], "conf": [-1, -1, 90]}
    assert _confidence_from_data(data) == 0.9


def test_confidence_ignores_blank_text_even_with_valid_conf():
    data = {"text": [""], "conf": [95]}
    assert _confidence_from_data(data) == 0.0


def test_confidence_no_valid_detections_returns_zero():
    data = {"text": ["", ""], "conf": [-1, -1]}
    assert _confidence_from_data(data) == 0.0


def test_confidence_mixed_blank_and_real_detections():
    data = {"text": ["", "Real"], "conf": [95, 80]}
    assert _confidence_from_data(data) == 0.8