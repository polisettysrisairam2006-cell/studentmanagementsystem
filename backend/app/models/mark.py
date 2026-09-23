from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    internal_marks = Column(Float, default=0.0)
    external_marks = Column(Float, default=0.0)
    total_marks = Column(Float, default=0.0)
    percentage = Column(Float, default=0.0)
    grade = Column(String(5), nullable=False)
    grade_point = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('student_id', 'subject_id', 'semester', name='uix_student_subject_semester'),
    )

    student = relationship("Student", back_populates="marks")
    subject = relationship("Subject", back_populates="marks")
