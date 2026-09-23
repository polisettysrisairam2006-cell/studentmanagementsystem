from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.models.department import Department
from backend.app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from backend.app.routes.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/v1/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve all college departments."""
    return db.query(Department).all()

@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Create a new department (Admin only)."""
    existing = db.query(Department).filter(Department.code == dept_in.code.upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department code '{dept_in.code}' already exists"
        )
    dept = Department(
        code=dept_in.code.upper(),
        name=dept_in.name,
        description=dept_in.description
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.get("/{dept_id}", response_model=DepartmentOut)
def get_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get department details by ID."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept

@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update department information (Admin only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if dept_in.code:
        dept.code = dept_in.code.upper()
    if dept_in.name:
        dept.name = dept_in.name
    if dept_in.description is not None:
        dept.description = dept_in.description
        
    db.commit()
    db.refresh(dept)
    return dept

@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Delete department and associated records (Admin only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return None
