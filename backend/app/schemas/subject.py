from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from backend.app.schemas.department import DepartmentOut

class SubjectBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    department_id: int
    semester: int = Field(..., ge=1, le=8)
    credits: int = Field(default=3, ge=1, le=6)

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[int] = None
    semester: Optional[int] = None
    credits: Optional[int] = None

class SubjectOut(SubjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department: DepartmentOut
