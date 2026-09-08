"""
Basic API test suite. Run with:  pytest -v  (from backend/ with venv active)
Uses a fresh in-memory-style SQLite test DB and re-seeds a tiny dataset.
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite:///./test_universe.db"

from app.main import app  # noqa: E402
from app.core.database import Base, engine, SessionLocal  # noqa: E402
from app.ml.train import ensure_models_trained  # noqa: E402
from app.seed.seed_data import seed  # noqa: E402

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    ensure_models_trained()
    seed()
    yield


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_success():
    r = client.post("/api/auth/login", json={"email": "student1@university.edu", "password": "student123"})
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "student"
    assert "access_token" in body


def test_login_failure():
    r = client.post("/api/auth/login", json={"email": "student1@university.edu", "password": "wrong"})
    assert r.status_code == 401


def _student_token():
    r = client.post("/api/auth/login", json={"email": "student1@university.edu", "password": "student123"})
    return r.json()["access_token"]


def test_attendance_analytics():
    token = _student_token()
    r = client.get("/api/student/attendance", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert "overall_percentage" in body
    assert 0 <= body["overall_percentage"] <= 100
    assert "recommendations" in body


def test_academic_analytics():
    token = _student_token()
    r = client.get("/api/student/academic", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["predicted_cgpa"] <= 10


def test_digital_twin():
    token = _student_token()
    r = client.get("/api/student/digital-twin", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert "narrative" in body
    assert 0 <= body["overall_score"] <= 100


def test_placement_readiness():
    token = _student_token()
    r = client.get("/api/placement/readiness", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert 0 <= r.json()["readiness_score"] <= 100


def test_unauthorized_access_blocked():
    r = client.get("/api/student/attendance")
    assert r.status_code == 401


def test_admin_dashboard_requires_admin_role():
    token = _student_token()
    r = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def _placement_token():
    r = client.post("/api/auth/login", json={"email": "placement@university.edu", "password": "placement123"})
    return r.json()["access_token"]


def _hod_token():
    r = client.post("/api/auth/login", json={"email": "hod.cse@university.edu", "password": "hod123"})
    return r.json()["access_token"]


def test_placement_dashboard_has_seeded_data():
    token = _placement_token()
    r = client.get("/api/placement/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["total_students"] > 0
    assert len(body["tests"]) >= 2  # seeded aptitude + coding test


def test_student_cannot_access_placement_dashboard():
    token = _student_token()
    r = client.get("/api/placement/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_placement_officer_can_create_test_and_event():
    token = _placement_token()
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/placement/tests", headers=headers, json={
        "title": "Sample Aptitude Round", "type": "aptitude", "department_scope": "ALL",
        "duration_minutes": 20,
        "questions": [{"question": "2+2=?", "options": ["3", "4", "5"], "correct_index": 1}],
    })
    assert r.status_code == 200
    assert r.json()["question_count"] == 1

    r = client.post("/api/placement/events", headers=headers, json={
        "title": "Test Drive", "company_name": "Acme", "event_type": "drive",
        "event_date": "2026-12-01T10:00:00", "min_cgpa": 6.0, "department_scope": "ALL",
    })
    assert r.status_code == 200
    assert r.json()["company_name"] == "Acme"


def test_student_can_view_and_submit_assigned_test():
    officer_headers = {"Authorization": f"Bearer {_placement_token()}"}
    create = client.post("/api/placement/tests", headers=officer_headers, json={
        "title": "Quick Quiz", "type": "coding", "department_scope": "ALL", "duration_minutes": 10,
        "questions": [{"question": "1+1=?", "options": ["1", "2", "3"], "correct_index": 1}],
    })
    test_id = create.json()["id"]

    student_headers = {"Authorization": f"Bearer {_student_token()}"}
    mine = client.get("/api/placement/tests/mine", headers=student_headers)
    assert mine.status_code == 200
    assert any(t["id"] == test_id for t in mine.json())

    submit = client.post(f"/api/placement/tests/{test_id}/submit", headers=student_headers, json={"answers": [1]})
    assert submit.status_code == 200
    assert submit.json()["score"] == 1.0

    # duplicate submission should be rejected
    dup = client.post(f"/api/placement/tests/{test_id}/submit", headers=student_headers, json={"answers": [1]})
    assert dup.status_code == 400


def test_hod_dashboard_is_department_scoped():
    admin_token = _student_token()  # placeholder to ensure fixture ran; real check below
    hod_headers = {"Authorization": f"Bearer {_hod_token()}"}
    r = client.get("/api/admin/dashboard", headers=hod_headers)
    assert r.status_code == 200
    body = r.json()
    assert "Department" in body["scope"]
    assert body["total_students"] > 0
