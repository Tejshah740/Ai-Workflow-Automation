from app.services.submission_service import create_request_submission
from app.services.workflow_service import create_approval_chain, get_current_level, record_decision
from tests.conftest import create_test_user


async def test_default_chain_is_single_approver_level(db_conn):
    user_id = await create_test_user(db_conn, "a@x.com")
    row = await create_request_submission(db_conn, user_id, "purchase_request", {"amount": "10"})
    await create_approval_chain(db_conn, row["id"], "purchase_request")

    levels = await db_conn.fetch(
        "SELECT level, required_role FROM approvals WHERE submission_id = $1 ORDER BY level", row["id"]
    )
    assert [dict(r) for r in levels] == [{"level": 1, "required_role": "approver"}]


async def test_configured_multi_level_chain(db_conn):
    user_id = await create_test_user(db_conn, "a@x.com")
    await db_conn.execute(
        "INSERT INTO workflow_rules (submission_type, levels) VALUES ($1, $2::jsonb)",
        "purchase_request",
        ["approver", "admin"],
    )
    row = await create_request_submission(db_conn, user_id, "purchase_request", {"amount": "10"})
    await create_approval_chain(db_conn, row["id"], "purchase_request")

    levels = await db_conn.fetch(
        "SELECT level, required_role FROM approvals WHERE submission_id = $1 ORDER BY level", row["id"]
    )
    assert [r["required_role"] for r in levels] == ["approver", "admin"]


async def test_create_approval_chain_is_idempotent(db_conn):
    user_id = await create_test_user(db_conn, "a@x.com")
    row = await create_request_submission(db_conn, user_id, "purchase_request", {"amount": "10"})
    await create_approval_chain(db_conn, row["id"], "purchase_request")
    await create_approval_chain(db_conn, row["id"], "purchase_request") 

    count = await db_conn.fetchval("SELECT COUNT(*) FROM approvals WHERE submission_id = $1", row["id"])
    assert count == 1


async def test_get_current_level_advances_after_decision(db_conn):
    user_id = await create_test_user(db_conn, "a@x.com")
    approver_id = await create_test_user(db_conn, "approver@x.com", role="approver")
    row = await create_request_submission(db_conn, user_id, "purchase_request", {"amount": "10"})
    await db_conn.execute(
        "INSERT INTO workflow_rules (submission_type, levels) VALUES ($1, $2::jsonb)",
        "purchase_request",
        ["approver", "admin"],
    )
    await create_approval_chain(db_conn, row["id"], "purchase_request")

    current = await get_current_level(db_conn, row["id"])
    assert current["level"] == 1
    assert current["required_role"] == "approver"

    await record_decision(db_conn, current["id"], "approved", approver_id, "looks fine")

    next_level = await get_current_level(db_conn, row["id"])
    assert next_level["level"] == 2
    assert next_level["required_role"] == "admin"


async def test_get_current_level_none_when_chain_complete(db_conn):
    user_id = await create_test_user(db_conn, "a@x.com")
    approver_id = await create_test_user(db_conn, "approver@x.com", role="approver")
    row = await create_request_submission(db_conn, user_id, "purchase_request", {"amount": "10"})
    await create_approval_chain(db_conn, row["id"], "purchase_request")

    current = await get_current_level(db_conn, row["id"])
    await record_decision(db_conn, current["id"], "approved", approver_id, None)

    assert await get_current_level(db_conn, row["id"]) is None