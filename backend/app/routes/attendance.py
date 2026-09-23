from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.core.database import get_db
from backend.app.models.attendance import Attendance
from backend.app.models.student import Student
from backend.app.models.subject import Subject
from backend.app.schemas.attendance import AttendanceRecordCreate, AttendanceOut, StudentAttendanceSummary
from backend.app.routes.auth import get_current_user, require_faculty_or_admin, check_student_access_permission

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance"])

@router.post("", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def record_attendance(
    att_in: AttendanceRecordCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_faculty_or_admin)
):
    """Record or update attendance for a student on a specific date and subject (Faculty or Admin)."""
    student = db.query(Student).filter(Student.id == att_in.student_id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student not found")

    subject = db.query(Subject).filter(Subject.id == att_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=400, detail="Subject not found")

    existing = db.query(Attendance).filter(
        Attendance.student_id == att_in.student_id,
        Attendance.subject_id == att_in.subject_id,
        Attendance.date == att_in.date
    ).first()

    if existing:
        existing.status = att_in.status
        existing.remarks = att_in.remarks
        db.commit()
        db.refresh(existing)
        return existing

    record = Attendance(
        student_id=att_in.student_id,
        subject_id=att_in.subject_id,
        date=att_in.date,
        status=att_in.status,
        remarks=att_in.remarks
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/students/{student_id}", response_model=StudentAttendanceSummary)
def get_student_attendance_summary(
    student_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve detailed attendance metrics and per-subject breakdown for a student."""
    check_student_access_permission(student_id, current_user, db)
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    
    total_classes = len(records)
    total_attended = len([r for r in records if r.status in ("Present", "Late")])
    overall_percentage = round((total_attended / total_classes) * 100.0, 2) if total_classes > 0 else 0.0

    # Subject breakdown
    subject_map: Dict[int, Dict[str, Any]] = {}
    for r in records:
        sid = r.subject_id
        if sid not in subject_map:
            subject_map[sid] = {
                "subject_id": sid,
                "subject_code": r.subject.code if r.subject else f"SUBJ-{sid}",
                "subject_name": r.subject.name if r.subject else "Unknown",
                "total_classes": 0,
                "attended": 0
            }
        subject_map[sid]["total_classes"] += 1
        if r.status in ("Present", "Late"):
            subject_map[sid]["attended"] += 1

    subject_stats = []
    for sid, sdata in subject_map.items():
        s_total = sdata["total_classes"]
        s_att = sdata["attended"]
        s_pct = round((s_att / s_total) * 100.0, 2) if s_total > 0 else 0.0
        subject_stats.append({
            "subject_id": sid,
            "subject_code": sdata["subject_code"],
            "subject_name": sdata["subject_name"],
            "total_classes": s_total,
            "attended": s_att,
            "percentage": s_pct
        })

    return {
        "student_id": student.id,
        "student_name": student.name,
        "roll_number": student.roll_number,
        "total_classes": total_classes,
        "total_attended": total_attended,
        "overall_percentage": overall_percentage,
        "subjects": subject_stats
    }
