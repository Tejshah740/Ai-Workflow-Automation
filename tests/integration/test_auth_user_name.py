import pytest
from app.services.submission_service import (
    create_request_submission,
    get_submission,
    list_submissions,
    log_audit_event,
)
from app.services.workflow_service import (
    create_approval_chain,
    record_decision,
)


async def test_register_and_me_includes_name(client, db_conn):
    resp = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "name": "Alice Wonderland", "password": "securepassword123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alice Wonderland"
    assert data["email"] == "alice@example.com"

    login_resp = client.post(
        "/api/auth/login",
        data={"username": "alice@example.com", "password": "securepassword123"},
    )
    token = login_resp.json()["access_token"]

    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["name"] == "Alice Wonderland"


async def test_submission_and_workflow_include_user_names(client, db_conn):
    reg1 = client.post(
        "/api/auth/register",
        json={"email": "submitter@example.com", "name": "Sam Submitter", "password": "password123"},
    )
    assert reg1.status_code == 201
    sub_user = reg1.json()

    sub_login = client.post(
        "/api/auth/login",
        data={"username": "submitter@example.com", "password": "password123"},
    )
    sub_token = sub_login.json()["access_token"]

    # Register approver
    reg2 = client.post(
        "/api/auth/register",
        json={"email": "approver@example.com", "name": "Alex Approver", "password": "password123"},
    )
    assert reg2.status_code == 201
    appr_user = reg2.json()
    await db_conn.execute("UPDATE users SET role = 'approver' WHERE id = $1", appr_user["id"])

    # Create submission
    create_resp = client.post(
        "/api/submissions/requests",
        json={"submission_type": "leave_request", "fields": {"days": 3}},
        headers={"Authorization": f"Bearer {sub_token}"},
    )
    assert create_resp.status_code == 201
    submission = create_resp.json()
    assert submission["submitter_name"] == "Sam Submitter"

    # Fetch submission
    fetched = await get_submission(db_conn, submission["id"])
    assert fetched["submitter_name"] == "Sam Submitter"

    # List submissions
    listed = await list_submissions(db_conn, submitter_id=None, status=None, channel=None, limit=10, offset=0)
    assert any(s["submitter_name"] == "Sam Submitter" for s in listed)

    # Move submission to pending_approval and create chain
    await db_conn.execute(
        "UPDATE submissions SET status = 'pending_approval' WHERE id = $1", submission["id"]
    )
    await create_approval_chain(db_conn, submission["id"], "leave_request")

    # Log audit event with actor
    await log_audit_event(
        db_conn, submission["id"], actor_id=appr_user["id"], event="manual_check", details={"note": "ok"}
    )

    # Check audit endpoint
    audit_resp = client.get(
        f"/api/submissions/{submission['id']}/audit",
        headers={"Authorization": f"Bearer {sub_token}"},
    )
    assert audit_resp.status_code == 200
    audit_logs = audit_resp.json()
    matched = [log for log in audit_logs if log.get("actor_id") == appr_user["id"]]
    assert len(matched) >= 1
    assert matched[0]["actor_name"] == "Alex Approver"

    # Record approval decision
    approval_row = await db_conn.fetchrow(
        "SELECT id FROM approvals WHERE submission_id = $1 AND level = 1", submission["id"]
    )
    await record_decision(
        db_conn, approval_row["id"], decision="approved", decided_by=appr_user["id"], comment="Looks good"
    )

    # Check workflow status endpoint
    wf_resp = client.get(
        f"/api/workflow/{submission['id']}",
        headers={"Authorization": f"Bearer {sub_token}"},
    )
    assert wf_resp.status_code == 200
    wf_data = wf_resp.json()
    assert wf_data["submission"]["submitter_name"] == "Sam Submitter"
    assert wf_data["submission"]["request_fields"] == {"days": 3}
    assert len(wf_data["approvals"]) == 1
    assert wf_data["approvals"][0]["decided_by_name"] == "Alex Approver"


async def test_extractions_and_fields_in_workflow_status(client, db_conn):
    # Register a user
    reg = client.post(
        "/api/auth/register",
        json={"email": "docuser@example.com", "name": "Doc User", "password": "password123"},
    )
    user_id = reg.json()["id"]
    login = client.post(
        "/api/auth/login",
        data={"username": "docuser@example.com", "password": "password123"},
    )
    token = login.json()["access_token"]

    # Insert a document submission directly
    sub_row = await db_conn.fetchrow(
        """
        INSERT INTO submissions (submitter_id, channel, submission_type, status, original_filename)
        VALUES ($1, 'document', 'invoice', 'needs_review', 'sample_invoice.pdf')
        RETURNING id
        """,
        user_id,
    )
    sub_id = sub_row["id"]

    # Insert an extraction
    await db_conn.execute(
        """
        INSERT INTO extractions (submission_id, raw_text, ocr_confidence, classification_confidence, predicted_type, extracted_fields)
        VALUES ($1, 'Total: $150.00', 0.95, 0.98, 'invoice', $2::jsonb)
        """,
        sub_id,
        {"amount": "150.00", "invoice_number": "INV-999"},
    )

    # Fetch via submission service
    sub = await get_submission(db_conn, sub_id)
    assert sub["extracted_fields"] == {"amount": "150.00", "invoice_number": "INV-999"}

    # Fetch workflow status endpoint
    wf_resp = client.get(
        f"/api/workflow/{sub_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wf_resp.status_code == 200
    data = wf_resp.json()
    assert data["submission"]["extracted_fields"] == {"amount": "150.00", "invoice_number": "INV-999"}
    assert data["extraction"] is not None
    assert data["extraction"]["ocr_confidence"] == pytest.approx(0.95, rel=1e-3)
    assert data["extraction"]["extracted_fields"] == {"amount": "150.00", "invoice_number": "INV-999"}
