from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    dob = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    address = Column(Text, nullable=True)
    
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    course = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    department = relationship("Department", back_populates="students")
    marks = relationship("Mark", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
