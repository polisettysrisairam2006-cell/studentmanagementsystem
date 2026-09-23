from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.models.mark import Mark
from backend.app.models.student import Student
from backend.app.models.subject import Subject
from backend.app.schemas.mark import MarkCreate, MarkUpdate, MarkOut
from backend.app.services.academic_service import calculate_grade_and_gp, compute_student_academic_summary
from backend.app.routes.auth import get_current_user, require_faculty_or_admin, check_student_access_permission

router = APIRouter(prefix="/api/v1/marks", tags=["Academics & Marks"])

@router.post("", response_model=MarkOut, status_code=status.HTTP_201_CREATED)
def record_student_mark(
    mark_in: MarkCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_faculty_or_admin)
):
    """Record or update subject marks for a student, auto-computing percentage, grade, and grade points."""
    student = db.query(Student).filter(Student.id == mark_in.student_id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student not found")
        
    subject = db.query(Subject).filter(Subject.id == mark_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=400, detail="Subject not found")

    total_marks = round(mark_in.internal_marks + mark_in.external_marks, 2)
    percentage = round(total_marks, 2) # max 100
    grade, grade_point = calculate_grade_and_gp(percentage)

    # Upsert logic if mark already recorded for student, subject, semester
    existing_mark = db.query(Mark).filter(
        Mark.student_id == mark_in.student_id,
        Mark.subject_id == mark_in.subject_id,
        Mark.semester == mark_in.semester
    ).first()

    if existing_mark:
        existing_mark.internal_marks = mark_in.internal_marks
        existing_mark.external_marks = mark_in.external_marks
        existing_mark.total_marks = total_marks
        existing_mark.percentage = percentage
        existing_mark.grade = grade
        existing_mark.grade_point = grade_point
        db.commit()
        db.refresh(existing_mark)
        return existing_mark

    mark = Mark(
        student_id=mark_in.student_id,
        subject_id=mark_in.subject_id,
        semester=mark_in.semester,
        internal_marks=mark_in.internal_marks,
        external_marks=mark_in.external_marks,
        total_marks=total_marks,
        percentage=percentage,
        grade=grade,
        grade_point=grade_point
    )
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return mark

@router.get("/students/{student_id}", response_model=List[MarkOut])
def get_student_marks(
    student_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve all subject marks recorded for a student."""
    check_student_access_permission(student_id, current_user, db)
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return db.query(Mark).filter(Mark.student_id == student_id).order_by(Mark.semester.asc()).all()

@router.get("/students/{student_id}/summary")
def get_student_transcript_summary(
    student_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get academic summary (GPA/CGPA, total marks, percentage, status) for a student."""
    check_student_access_permission(student_id, current_user, db)
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return compute_student_academic_summary(student.marks)
