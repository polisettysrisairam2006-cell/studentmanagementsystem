from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.subject import Subject
from backend.app.models.department import Department
from backend.app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectOut
from backend.app.routes.auth import get_current_user

router = APIRouter(prefix="/api/v1/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectOut])
def list_subjects(
    department_id: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """List academic subjects with optional department and semester filters."""
    query = db.query(Subject)
    if department_id:
        query = query.filter(Subject.department_id == department_id)
    if semester:
        query = query.filter(Subject.semester == semester)
    return query.all()

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    subj_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new academic subject."""
    dept = db.query(Department).filter(Department.id == subj_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=400, detail="Invalid department ID")
        
    existing = db.query(Subject).filter(Subject.code == subj_in.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject code '{subj_in.code}' already exists")
        
    subj = Subject(
        code=subj_in.code.upper(),
        name=subj_in.name,
        department_id=subj_in.department_id,
        semester=subj_in.semester,
        credits=subj_in.credits
    )
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj

@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    """Get subject details by ID."""
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subj

@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int,
    subj_in: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update subject information."""
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    if subj_in.code:
        subj.code = subj_in.code.upper()
    if subj_in.name:
        subj.name = subj_in.name
    if subj_in.department_id:
        dept = db.query(Department).filter(Department.id == subj_in.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department ID")
        subj.department_id = subj_in.department_id
    if subj_in.semester:
        subj.semester = subj_in.semester
    if subj_in.credits:
        subj.credits = subj_in.credits

    db.commit()
    db.refresh(subj)
    return subj

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete subject."""
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subj)
    db.commit()
    return None
