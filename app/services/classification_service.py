TYPE_KEYWORDS: dict[str, list[str]] = {
    "invoice": ["invoice", "invoice number", "bill to", "amount due", "payment terms"],
    "receipt": ["receipt", "thank you for your purchase", "subtotal", "change due", "cashier"],
    "purchase_order": ["purchase order", "po number", "ship to", "vendor", "requested by"],
    "contract": ["agreement", "hereby agree", "terms and conditions", "signature", "effective date"],
}


def classify_text(text: str) -> tuple[str, float]:
    text_lower = text.lower()
    scores = {
        doc_type: sum(1 for kw in keywords if kw in text_lower) / len(keywords)
        for doc_type, keywords in TYPE_KEYWORDS.items()
    }
    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]
    if best_score == 0:
        return "other", 0.0
    return best_type, best_score