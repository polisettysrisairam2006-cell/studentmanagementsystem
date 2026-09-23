from backend.app.routes.auth import router as auth_router
from backend.app.routes.departments import router as departments_router
from backend.app.routes.subjects import router as subjects_router
from backend.app.routes.students import router as students_router
from backend.app.routes.marks import router as marks_router
from backend.app.routes.attendance import router as attendance_router
from backend.app.routes.dashboard import router as dashboard_router
from backend.app.routes.reports import router as reports_router

__all__ = [
    "auth_router",
    "departments_router",
    "subjects_router",
    "students_router",
    "marks_router",
    "attendance_router",
    "dashboard_router",
    "reports_router"
]
