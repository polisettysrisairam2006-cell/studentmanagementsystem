from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    credits = Column(Integer, default=3)

    department = relationship("Department", back_populates="subjects")
    marks = relationship("Mark", back_populates="subject", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="subject", cascade="all, delete-orphan")
