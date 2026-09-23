from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from backend.app.core.database import get_db
from backend.app.models.student import Student
from backend.app.models.department import Department
from backend.app.models.subject import Subject
from backend.app.models.mark import Mark
from backend.app.models.attendance import Attendance
from backend.app.schemas.dashboard import DashboardStatsOut
from backend.app.services.academic_service import compute_student_academic_summary

from backend.app.routes.auth import require_faculty_or_admin

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard & Analytics"])

@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user = Depends(require_faculty_or_admin)
):
    """Retrieve aggregate statistics, distribution metrics, top performers, and low-attendance warnings."""
    total_students = db.query(Student).count()
    total_departments = db.query(Department).count()
    total_subjects = db.query(Subject).count()

    # Department distribution
    dept_distribution = []
    departments = db.query(Department).all()
    for dept in departments:
        count = db.query(Student).filter(Student.department_id == dept.id).count()
        dept_distribution.append({
            "department_code": dept.code,
            "department_name": dept.name,
            "student_count": count
        })

    # Year distribution
    year_distribution = []
    for yr in range(1, 5):
        count = db.query(Student).filter(Student.year == yr).count()
        year_distribution.append({
            "year": yr,
            "student_count": count
        })

    # Academic Performance Analytics across all students
    all_students = db.query(Student).all()
    student_summaries = []
    
    total_college_pct_sum = 0.0
    total_college_cgpa_sum = 0.0
    valid_academic_count = 0
    
    low_attendance_alerts = []

    for s in all_students:
        summary = compute_student_academic_summary(s.marks)
        if summary["total_credits"] > 0:
            total_college_pct_sum += summary["percentage"]
            total_college_cgpa_sum += summary["cgpa"]
            valid_academic_count += 1
            student_summaries.append({
                "id": s.id,
                "name": s.name,
                "roll_number": s.roll_number,
                "department_code": s.department.code if s.department else "N/A",
                "cgpa": summary["cgpa"],
                "percentage": summary["percentage"]
            })

        # Calculate attendance percentage for alert
        att_records = s.attendance_records
        t_classes = len(att_records)
        if t_classes > 0:
            t_attended = len([r for r in att_records if r.status in ("Present", "Late")])
            att_pct = round((t_attended / t_classes) * 100.0, 2)
            if att_pct < 75.0:
                low_attendance_alerts.append({
                    "id": s.id,
                    "name": s.name,
                    "roll_number": s.roll_number,
                    "department_code": s.department.code if s.department else "N/A",
                    "attendance_percentage": att_pct
                })

    avg_college_percentage = round(total_college_pct_sum / valid_academic_count, 2) if valid_academic_count > 0 else 0.0
    avg_college_cgpa = round(total_college_cgpa_sum / valid_academic_count, 2) if valid_academic_count > 0 else 0.0

    # Overall college attendance rate
    all_att_count = db.query(Attendance).count()
    all_attended_count = db.query(Attendance).filter(Attendance.status.in_(["Present", "Late"])).count()
    overall_attendance_rate = round((all_attended_count / all_att_count) * 100.0, 2) if all_att_count > 0 else 0.0

    # Sort top 5 performers by CGPA
    top_performers = sorted(student_summaries, key=lambda x: x["cgpa"], reverse=True)[:5]

    return {
        "total_students": total_students,
        "total_departments": total_departments,
        "total_subjects": total_subjects,
        "average_college_percentage": avg_college_percentage,
        "average_college_cgpa": avg_college_cgpa,
        "overall_attendance_rate": overall_attendance_rate,
        "department_distribution": dept_distribution,
        "year_distribution": year_distribution,
        "top_performers": top_performers,
        "low_attendance_alerts": low_attendance_alerts
    }
