import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.database import SessionLocal, Base, engine
from backend.seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    seed_database()
    yield

def test_admin_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@college.edu", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@college.edu"

def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@college.edu", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Invalid email address or password" in response.json()["detail"]

def test_register_new_admin_success():
    reg_payload = {
        "full_name": "Dr. Sarah Connor",
        "email": "sarah.connor@college.edu",
        "password": "securepassword123",
        "role": "admin"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "sarah.connor@college.edu"
    assert data["full_name"] == "Dr. Sarah Connor"

    # Verify logging in with newly registered account
    login_res = client.post("/api/v1/auth/login", json={
        "email": "sarah.connor@college.edu",
        "password": "securepassword123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_register_duplicate_email():
    reg_payload = {
        "full_name": "Duplicate Admin",
        "email": "admin@college.edu",
        "password": "password123",
        "role": "admin"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 400
    assert "User with this email already exists" in response.json()["detail"]
