import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture
def auth_header():
    res = client.post("/api/v1/auth/login", json={"email": "admin@college.edu", "password": "admin123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_record_attendance(auth_header):
    st_res = client.get("/api/v1/students", headers=auth_header)
    student_id = st_res.json()[0]["id"]
    
    subj_res = client.get("/api/v1/subjects", headers=auth_header)
    subject_id = subj_res.json()[0]["id"]

    att_payload = {
        "student_id": student_id,
        "subject_id": subject_id,
        "date": "2026-09-20",
        "status": "Present",
        "remarks": "On-time arrival"
    }

    res = client.post("/api/v1/attendance", json=att_payload, headers=auth_header)
    assert res.status_code == 201
    assert res.json()["status"] == "Present"

def test_student_attendance_summary(auth_header):
    st_res = client.get("/api/v1/students", headers=auth_header)
    student_id = st_res.json()[0]["id"]

    res = client.get(f"/api/v1/attendance/students/{student_id}", headers=auth_header)
    assert res.status_code == 200
    summary = res.json()
    assert "overall_percentage" in summary
    assert "subjects" in summary
