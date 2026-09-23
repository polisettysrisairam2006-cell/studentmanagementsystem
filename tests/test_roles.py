import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture
def admin_header():
    res = client.post("/api/v1/auth/login", json={"email": "admin@college.edu", "password": "admin123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def faculty_header():
    res = client.post("/api/v1/auth/login", json={"email": "faculty@college.edu", "password": "faculty123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def student_a_header():
    res = client.post("/api/v1/auth/login", json={"email": "aarav.sharma@college.edu", "password": "student123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def student_b_header():
    res = client.post("/api/v1/auth/login", json={"email": "ananya.verma@college.edu", "password": "student123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# 1. Unauthorized & Invalid JWT Requests
def test_unauthorized_request():
    res = client.get("/api/v1/students")
    assert res.status_code == 401

def test_invalid_jwt_token():
    res = client.get("/api/v1/students", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res.status_code == 401

# 2. Role Authorization Enforcement
def test_faculty_cannot_create_student(faculty_header, admin_header):
    dept_res = client.get("/api/v1/departments", headers=admin_header)
    dept_id = dept_res.json()[0]["id"]
    
    payload = {
        "roll_number": "FAC_CREATE_TEST",
        "name": "Unauthorized Faculty Create",
        "dob": "2003-01-01",
        "gender": "Male",
        "email": "unauth.faculty@college.edu",
        "phone": "+91 9998887776",
        "department_id": dept_id,
        "course": "B.Tech",
        "year": 1,
        "section": "A"
    }
    res = client.post("/api/v1/students", json=payload, headers=faculty_header)
    assert res.status_code == 403
    assert "Admin privileges required" in res.json()["detail"]

def test_student_cannot_create_student(student_a_header, admin_header):
    dept_res = client.get("/api/v1/departments", headers=admin_header)
    dept_id = dept_res.json()[0]["id"]
    
    payload = {
        "roll_number": "STU_CREATE_TEST",
        "name": "Unauthorized Student Create",
        "dob": "2003-01-01",
        "gender": "Female",
        "email": "unauth.student@college.edu",
        "phone": "+91 9998887775",
        "department_id": dept_id,
        "course": "B.Tech",
        "year": 1,
        "section": "A"
    }
    res = client.post("/api/v1/students", json=payload, headers=student_a_header)
    assert res.status_code == 403

# 3. Student Self-Access Protection
def test_student_can_access_own_profile(student_a_header):
    # Student A is Aarav Sharma (id=1)
    res = client.get("/api/v1/students/1", headers=student_a_header)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "aarav.sharma@college.edu"

def test_student_me_profile_endpoint(student_a_header):
    res = client.get("/api/v1/students/me/profile", headers=student_a_header)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "aarav.sharma@college.edu"

def test_student_cannot_access_other_student_profile(student_a_header):
    # Student A (id=1) attempting to access Student B (id=2)
    res = client.get("/api/v1/students/2", headers=student_a_header)
    assert res.status_code == 403
    assert "You do not have permission" in res.json()["detail"]

def test_student_cannot_access_other_student_marks(student_a_header):
    res = client.get("/api/v1/marks/students/2", headers=student_a_header)
    assert res.status_code == 403

def test_student_cannot_access_other_student_attendance(student_a_header):
    res = client.get("/api/v1/attendance/students/2", headers=student_a_header)
    assert res.status_code == 403

def test_student_cannot_download_other_student_pdf(student_a_header):
    res = client.get("/api/v1/reports/students/2/pdf", headers=student_a_header)
    assert res.status_code == 403

def test_student_can_download_own_pdf(student_a_header):
    res = client.get("/api/v1/reports/students/1/pdf", headers=student_a_header)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 0

# 4. Input Validation (Marks & Attendance)
def test_invalid_internal_marks_bounds(admin_header):
    res = client.post("/api/v1/marks", json={
        "student_id": 1,
        "subject_id": 1,
        "semester": 1,
        "internal_marks": 35.0, # max allowed is 30.0
        "external_marks": 50.0
    }, headers=admin_header)
    assert res.status_code == 422

def test_invalid_external_marks_bounds(admin_header):
    res = client.post("/api/v1/marks", json={
        "student_id": 1,
        "subject_id": 1,
        "semester": 1,
        "internal_marks": 25.0,
        "external_marks": 75.0 # max allowed is 70.0
    }, headers=admin_header)
    assert res.status_code == 422

def test_negative_marks_validation(admin_header):
    res = client.post("/api/v1/marks", json={
        "student_id": 1,
        "subject_id": 1,
        "semester": 1,
        "internal_marks": -5.0,
        "external_marks": 50.0
    }, headers=admin_header)
    assert res.status_code == 422

def test_invalid_attendance_status(admin_header):
    res = client.post("/api/v1/attendance", json={
        "student_id": 1,
        "subject_id": 1,
        "date": "2026-09-22",
        "status": "InvalidStatus"
    }, headers=admin_header)
    assert res.status_code == 422

# 5. Dashboard Statistics & Duplicate Validations
def test_dashboard_statistics(admin_header):
    res = client.get("/api/v1/dashboard/stats", headers=admin_header)
    assert res.status_code == 200
    data = res.json()
    assert "total_students" in data
    assert "average_college_cgpa" in data
    assert "overall_attendance_rate" in data
    assert "department_distribution" in data
    assert "top_performers" in data
    assert "low_attendance_alerts" in data

def test_dashboard_statistics_forbidden_for_student(student_a_header):
    res = client.get("/api/v1/dashboard/stats", headers=student_a_header)
    assert res.status_code == 403

def test_duplicate_student_email_validation(admin_header):
    dept_res = client.get("/api/v1/departments", headers=admin_header)
    dept_id = dept_res.json()[0]["id"]

    new_student = {
        "roll_number": "UNIQUE_ROLL_987",
        "name": "Duplicate Email Test",
        "dob": "2003-01-01",
        "gender": "Male",
        "email": "aarav.sharma@college.edu", # Existing student email
        "phone": "+91 9999999999",
        "department_id": dept_id,
        "course": "B.Tech",
        "year": 1,
        "section": "A"
    }

    res = client.post("/api/v1/students", json=new_student, headers=admin_header)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]
