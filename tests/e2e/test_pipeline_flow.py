from app.jobs.processing import _process_submission, process_submission_job
from tests.conftest import create_test_user


def test_valid_request_routes_to_pending_approval(client, auth_headers, seed_user):
    seed_user("submitter@x.com")
    headers = auth_headers("submitter@x.com")
    r = client.post(
        "/api/submissions/requests",
        json={"submission_type": "leave_request", "fields": {"start_date": "2026-10-01", "end_date": "2026-10-05"}},
        headers=headers,
    )
    sub_id = r.json()["id"]

    process_submission_job(sub_id)

    r = client.get(f"/api/submissions/{sub_id}", headers=headers)
    assert r.json()["status"] == "pending_approval"


def test_invalid_request_routes_to_needs_review(client, auth_headers, seed_user):
    seed_user("submitter@x.com")
    headers = auth_headers("submitter@x.com")
    r = client.post(
        "/api/submissions/requests",
        json={"submission_type": "leave_request", "fields": {"start_date": "2026-10-05", "end_date": "2026-10-01"}},
        headers=headers,
    )
    sub_id = r.json()["id"]

    process_submission_job(sub_id)

    r = client.get(f"/api/submissions/{sub_id}", headers=headers)
    assert r.json()["status"] == "needs_review"


async def test_missing_file_fails_permanently_without_retry(client, auth_headers, db_conn):
    await create_test_user(db_conn, "submitter@x.com")
    headers = auth_headers("submitter@x.com")
    submitter_id = client.get("/api/auth/me", headers=headers).json()["id"]

    row = await db_conn.fetchrow(
        """
        INSERT INTO submissions (submitter_id, channel, submission_type, stored_filename,
                                  original_filename, content_type, file_size_bytes)
        VALUES ($1, 'document', 'invoice', 'this-file-does-not-exist.png', 'ghost.png', 'image/png', 100)
        RETURNING id
        """,
        submitter_id,
    )
    sub_id = row["id"]

    await _process_submission(sub_id)

    r = client.get(f"/api/submissions/{sub_id}", headers=headers)
    assert r.json()["status"] == "failed"

    audit = await db_conn.fetch(
        "SELECT event, details FROM audit_log WHERE submission_id = $1", sub_id
    )
    assert audit[0]["event"] == "ai_processing_failed"
    assert audit[0]["details"]["retried"] is False


def test_approval_chain_created_after_processing(client, auth_headers, seed_user):
    seed_user("submitter@x.com")
    headers = auth_headers("submitter@x.com")
    r = client.post(
        "/api/submissions/requests",
        json={"submission_type": "leave_request", "fields": {"start_date": "2026-10-01", "end_date": "2026-10-05"}},
        headers=headers,
    )
    sub_id = r.json()["id"]
    process_submission_job(sub_id)

    r = client.get(f"/api/workflow/{sub_id}", headers=headers)
    assert len(r.json()["approvals"]) == 1
    assert r.json()["approvals"][0]["required_role"] == "approver"