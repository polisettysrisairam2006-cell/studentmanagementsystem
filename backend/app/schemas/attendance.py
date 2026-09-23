from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from backend.app.schemas.subject import SubjectOut

class AttendanceRecordCreate(BaseModel):
    student_id: int
    subject_id: int
    date: date
    status: str = Field(..., pattern="^(Present|Absent|Late)$")
    remarks: Optional[str] = None

class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    subject_id: int
    date: date
    status: str
    remarks: Optional[str] = None
    created_at: datetime
    subject: SubjectOut

class SubjectAttendanceStat(BaseModel):
    subject_id: int
    subject_code: str
    subject_name: str
    total_classes: int
    attended: int
    percentage: float

class StudentAttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    roll_number: str
    total_classes: int
    total_attended: int
    overall_percentage: float
    subjects: List[SubjectAttendanceStat]
