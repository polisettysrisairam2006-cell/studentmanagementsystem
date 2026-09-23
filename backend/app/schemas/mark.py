from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from backend.app.schemas.subject import SubjectOut

class MarkBase(BaseModel):
    student_id: int
    subject_id: int
    semester: int = Field(..., ge=1, le=8)
    internal_marks: float = Field(..., ge=0.0, le=40.0)
    external_marks: float = Field(..., ge=0.0, le=70.0)

class MarkCreate(MarkBase):
    pass

class MarkUpdate(BaseModel):
    internal_marks: Optional[float] = Field(None, ge=0.0, le=40.0)
    external_marks: Optional[float] = Field(None, ge=0.0, le=70.0)

class MarkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    subject_id: int
    semester: int
    internal_marks: float
    external_marks: float
    total_marks: float
    percentage: float
    grade: str
    grade_point: float
    created_at: datetime
    subject: SubjectOut
