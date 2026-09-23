from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    students = relationship("Student", back_populates="department", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="department", cascade="all, delete-orphan")
