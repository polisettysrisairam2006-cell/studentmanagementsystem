from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.student import Student
from backend.app.models.department import Department
from backend.app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentDetailOut
from backend.app.services.academic_service import compute_student_academic_summary
from backend.app.routes.auth import get_current_user, require_admin, require_faculty_or_admin, check_student_access_permission

router = APIRouter(prefix="/api/v1/students", tags=["Students"])

@router.get("", response_model=List[StudentOut])
def list_students(
    department_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    section: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve students with department, year, section, and search text filtering."""
    query = db.query(Student)
    
    if department_id:
        query = query.filter(Student.department_id == department_id)
    if year:
        query = query.filter(Student.year == year)
    if section:
        query = query.filter(Student.section == section.upper())
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (Student.name.ilike(search_pattern)) |
            (Student.roll_number.ilike(search_pattern)) |
            (Student.email.ilike(search_pattern))
        )
        
    return query.order_by(Student.roll_number.asc()).all()

from backend.app.models.user import User

@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Create a new student with roll number, email, and phone uniqueness validations (Admin only)."""
    dept = db.query(Department).filter(Department.id == student_in.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with ID {student_in.department_id} does not exist"
        )
        
    # Check duplicate Roll Number
    existing_roll = db.query(Student).filter(Student.roll_number == student_in.roll_number.upper()).first()
    if existing_roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with Roll Number '{student_in.roll_number}' already exists."
        )
        
    # Check duplicate Email
    existing_email = db.query(Student).filter(Student.email == student_in.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with Email '{student_in.email}' already exists."
        )

    # Check duplicate Phone
    existing_phone = db.query(Student).filter(Student.phone == student_in.phone.strip()).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with Phone Number '{student_in.phone}' already exists."
        )

    student = Student(
        roll_number=student_in.roll_number.upper(),
        name=student_in.name,
        dob=student_in.dob,
        gender=student_in.gender,
        email=student_in.email.lower(),
        phone=student_in.phone.strip(),
        address=student_in.address,
        department_id=student_in.department_id,
        course=student_in.course,
        year=student_in.year,
        section=student_in.section.upper(),
        status=student_in.status
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.get("/me/profile", response_model=StudentDetailOut)
def get_my_student_profile(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get student profile and academic stats for currently authenticated student user."""
    student = db.query(Student).filter(Student.email == current_user.email.lower()).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found for current user")
    return get_student_profile(student.id, db=db, current_user=current_user)

@router.get("/{student_id}", response_model=StudentDetailOut)
def get_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get comprehensive student profile including academic summary and attendance stats."""
    check_student_access_permission(student_id, current_user, db)
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    academic_summary = compute_student_academic_summary(student.marks)
    
    # Calculate attendance stats
    attendance_records = student.attendance_records
    total_classes = len(attendance_records)
    attended = len([a for a in attendance_records if a.status in ("Present", "Late")])
    att_percentage = round((attended / total_classes) * 100.0, 2) if total_classes > 0 else 0.0

    attendance_stats = {
        "total_classes": total_classes,
        "total_attended": attended,
        "overall_percentage": att_percentage,
        "is_low_attendance": att_percentage < 75.0 if total_classes > 0 else False
    }

    return {
        "id": student.id,
        "roll_number": student.roll_number,
        "name": student.name,
        "dob": student.dob,
        "gender": student.gender,
        "email": student.email,
        "phone": student.phone,
        "address": student.address,
        "department_id": student.department_id,
        "course": student.course,
        "year": student.year,
        "section": student.section,
        "status": student.status,
        "created_at": student.created_at,
        "department": student.department,
        "academic_summary": academic_summary,
        "attendance_stats": attendance_stats
    }

@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update student information (Admin only)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    old_email = student.email

    # Check Roll Number uniqueness if changing
    if student_in.roll_number and student_in.roll_number.upper() != student.roll_number:
        existing_roll = db.query(Student).filter(
            Student.roll_number == student_in.roll_number.upper(),
            Student.id != student_id
        ).first()
        if existing_roll:
            raise HTTPException(status_code=400, detail=f"Roll Number '{student_in.roll_number}' is already in use")
        student.roll_number = student_in.roll_number.upper()

    # Check Email uniqueness if changing
    if student_in.email and student_in.email.lower() != student.email:
        existing_email = db.query(Student).filter(
            Student.email == student_in.email.lower(),
            Student.id != student_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail=f"Email '{student_in.email}' is already in use")
        student.email = student_in.email.lower()
        
        user_acct = db.query(User).filter(User.email == old_email).first()
        if user_acct:
            user_acct.email = student.email

    # Check Phone Number uniqueness if changing
    if student_in.phone and student_in.phone.strip() != student.phone:
        existing_phone = db.query(Student).filter(
            Student.phone == student_in.phone.strip(),
            Student.id != student_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail=f"Phone Number '{student_in.phone}' is already in use")
        student.phone = student_in.phone.strip()

    if student_in.name:
        student.name = student_in.name
        user_acct = db.query(User).filter(User.email == student.email).first()
        if user_acct:
            user_acct.full_name = student.name

    if student_in.dob:
        student.dob = student_in.dob
    if student_in.gender:
        student.gender = student_in.gender
    if student_in.address is not None:
        student.address = student_in.address
    if student_in.department_id:
        dept = db.query(Department).filter(Department.id == student_in.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department ID")
        student.department_id = student_in.department_id
    if student_in.course:
        student.course = student_in.course
    if student_in.year:
        student.year = student_in.year
    if student_in.section:
        student.section = student_in.section.upper()
    if student_in.status:
        student.status = student_in.status

    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Delete student and all associated records (Admin only)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return None
