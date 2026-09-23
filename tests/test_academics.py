import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture
def auth_header():
    res = client.post("/api/v1/auth/login", json={"email": "admin@college.edu", "password": "admin123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_record_mark_and_calculate_grade(auth_header):
    # Fetch a student and subject
    st_res = client.get("/api/v1/students")
    student_id = st_res.json()[0]["id"]
    
    subj_res = client.get("/api/v1/subjects")
    subject_id = subj_res.json()[0]["id"]

    mark_payload = {
        "student_id": student_id,
        "subject_id": subject_id,
        "semester": 1,
        "internal_marks": 28.5, # internal max 40
        "external_marks": 63.5  # external max 70 -> total = 92.0 -> Grade A+, GP 10.0
    }

    res = client.post("/api/v1/marks", json=mark_payload, headers=auth_header)
    assert res.status_code == 201
    data = res.json()
    assert data["total_marks"] == 92.0
    assert data["grade"] == "A+"
    assert data["grade_point"] == 10.0

def test_get_transcript_summary(auth_header):
    st_res = client.get("/api/v1/students")
    student_id = st_res.json()[0]["id"]

    res = client.get(f"/api/v1/marks/students/{student_id}/summary", headers=auth_header)
    assert res.status_code == 200
    summary = res.json()
    assert "cgpa" in summary
    assert "percentage" in summary
    assert "status" in summary
