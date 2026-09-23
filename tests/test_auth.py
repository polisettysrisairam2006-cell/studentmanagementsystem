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

def test_get_current_user_profile():
    # First login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@college.edu", "password": "admin123"}
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "admin@college.edu"
