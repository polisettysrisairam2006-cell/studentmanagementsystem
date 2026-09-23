import os
import sys
import socket
import uvicorn
from backend.seed import seed_database

def find_available_port(host="127.0.0.1", preferred_ports=(8000, 8050, 8080, 8888)):
    for port in preferred_ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, port))
                return port
            except OSError:
                continue
    return 8000

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

    port = find_available_port()

    print("\nStarting FastAPI Application & Serving Web Dashboard...")
    print(f"-> Web App URL:        http://127.0.0.1:{port}")
    print(f"-> API Docs (Swagger): http://127.0.0.1:{port}/docs")
    print(f"-> ReDoc API Docs:     http://127.0.0.1:{port}/redoc")
    print("\nDemo Admin Login Credentials:")
    print("   Email:    admin@college.edu")
    print("   Password: admin123")
    print("=" * 60)
    print("Press Ctrl+C to stop the server.\n")

    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, reload=True)

if __name__ == "__main__":
    main()
