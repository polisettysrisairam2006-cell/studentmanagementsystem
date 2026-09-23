from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from backend.app.schemas.department import DepartmentOut

class StudentBase(BaseModel):
    roll_number: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    dob: date
    gender: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    department_id: int
    course: str
    year: int = Field(..., ge=1, le=4)
    section: str = Field(..., min_length=1, max_length=10)
    status: str = "Active"

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    roll_number: Optional[str] = None
    name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    department_id: Optional[int] = None
    course: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    status: Optional[str] = None

class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    department: DepartmentOut

class StudentDetailOut(StudentOut):
    academic_summary: Dict[str, Any]
    attendance_stats: Dict[str, Any]
