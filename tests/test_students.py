import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture
def auth_header():
    res = client.post("/api/v1/auth/login", json={"email": "admin@college.edu", "password": "admin123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_list_students(auth_header):
    res = client.get("/api/v1/students", headers=auth_header)
    assert res.status_code == 200
    students = res.json()
    assert len(students) > 0

def test_create_student_duplicate_roll_validation(auth_header):
    # Retrieve existing department
    dept_res = client.get("/api/v1/departments", headers=auth_header)
    dept_id = dept_res.json()[0]["id"]

    new_student = {
        "roll_number": "2024CSE001", # Existing roll number from seed
        "name": "Test Student Duplicate Roll",
        "dob": "2003-01-01",
        "gender": "Male",
        "email": "unique.test.email@college.edu",
        "phone": "+91 9999999999",
        "department_id": dept_id,
        "course": "B.Tech",
        "year": 1,
        "section": "A"
    }

    res = client.post("/api/v1/students", json=new_student, headers=auth_header)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]

def test_create_student_success(auth_header):
    dept_res = client.get("/api/v1/departments", headers=auth_header)
    dept_id = dept_res.json()[0]["id"]

    student_data = {
        "roll_number": "TEST_ROLL_999",
        "name": "Jane Doe",
        "dob": "2004-05-10",
        "gender": "Female",
        "email": "jane.doe.test@college.edu",
        "phone": "+91 9888877776",
        "department_id": dept_id,
        "course": "B.Tech",
        "year": 1,
        "section": "B",
        "address": "Test Campus Hostel"
    }

    res = client.post("/api/v1/students", json=student_data, headers=auth_header)
    assert res.status_code == 201
    data = res.json()
    assert data["roll_number"] == "TEST_ROLL_999"
    assert data["name"] == "Jane Doe"

def test_create_student_duplicate_phone_validation(auth_header):
    dept_res = client.get("/api/v1/departments", headers=auth_header)
    dept_id = dept_res.json()[0]["id"]

    new_student = {
        "roll_number": "UNIQUE_ROLL_888",
        "name": "Test Student Duplicate Phone",
        "dob": "2003-01-01",
        "gender": "Male",
        "email": "unique.phone.test@college.edu",
        "phone": "+91 9876543210", # Existing phone from seed
        "department_id": dept_id,
        "course": "B.Tech",
        "year": 1,
        "section": "A"
    }

    res = client.post("/api/v1/students", json=new_student, headers=auth_header)
    assert res.status_code == 400
    assert "Phone Number" in res.json()["detail"] or "already exists" in res.json()["detail"]

def test_update_student_success(auth_header):
    st_res = client.get("/api/v1/students", headers=auth_header)
    student_id = st_res.json()[0]["id"]

    update_payload = {
        "name": "Aarav Sharma Updated",
        "phone": "+91 9111122223"
    }

    res = client.put(f"/api/v1/students/{student_id}", json=update_payload, headers=auth_header)
    assert res.status_code == 200
    updated_data = res.json()
    assert updated_data["name"] == "Aarav Sharma Updated"
    assert updated_data["phone"] == "+91 9111122223"
