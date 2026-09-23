import os
import sys
import uvicorn
from backend.seed import seed_database

def main():
    print("=" * 60)
    print("  STUDENT MANAGEMENT SYSTEM - COLLEGE PORTAL LAUNCHER")
    print("=" * 60)

    # Automatically run seed if SQLite database does not exist
    db_file = os.path.join(os.path.dirname(__file__), "student_management.db")
    if not os.path.exists(db_file):
        print("\nDatabase file not found. Seeding initial college data...")
        seed_database()
        print("Database seeded successfully!\n")

    print("\nStarting FastAPI Application & Serving Web Dashboard...")
    print("-> Web App URL:      http://127.0.0.1:8000")
    print("-> API Docs (Swagger): http://127.0.0.1:8000/docs")
    print("-> ReDoc API Docs:   http://127.0.0.1:8000/redoc")
    print("\nDemo Admin Login Credentials:")
    print("   Email:    admin@college.edu")
    print("   Password: admin123")
    print("=" * 60)
    print("Press Ctrl+C to stop the server.\n")

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()
