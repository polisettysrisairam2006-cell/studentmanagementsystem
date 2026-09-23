from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.student import Student
from backend.app.models.attendance import Attendance
from backend.app.services.academic_service import compute_student_academic_summary
from backend.app.services.pdf_service import generate_student_pdf_report
from backend.app.routes.attendance import get_student_attendance_summary

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])

@router.get("/students/{student_id}/pdf")
def download_student_pdf_report(student_id: int, db: Session = Depends(get_db)):
    """Generate and download a branded PDF academic & attendance report card for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    academic_summary = compute_student_academic_summary(student.marks)
    attendance_stats = get_student_attendance_summary(student_id, db)

    pdf_bytes = generate_student_pdf_report(student, academic_summary, attendance_stats)

    filename = f"Transcript_{student.roll_number.replace('/', '_')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
