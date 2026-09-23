import os

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Student Management System")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "college-secret-key-super-secure-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./student_management.db")
    
    # Attendance
    MIN_ATTENDANCE_PERCENTAGE: float = float(os.getenv("MIN_ATTENDANCE_PERCENTAGE", "75.0"))

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost,http://127.0.0.1,http://localhost:8000,http://127.0.0.1:8000,http://localhost:8050,http://127.0.0.1:8050")

settings = Settings()
