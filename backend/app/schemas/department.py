from pydantic import BaseModel, ConfigDict
from typing import Optional

class DepartmentBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
