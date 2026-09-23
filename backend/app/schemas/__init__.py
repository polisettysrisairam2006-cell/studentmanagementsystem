from backend.app.schemas.user import UserCreate, UserLogin, UserOut, Token, TokenData
from backend.app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from backend.app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentDetailOut
from backend.app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectOut
from backend.app.schemas.mark import MarkCreate, MarkUpdate, MarkOut
from backend.app.schemas.attendance import AttendanceRecordCreate, AttendanceOut, StudentAttendanceSummary
from backend.app.schemas.dashboard import DashboardStatsOut

__all__ = [
    "UserCreate", "UserLogin", "UserOut", "Token", "TokenData",
    "DepartmentCreate", "DepartmentUpdate", "DepartmentOut",
    "StudentCreate", "StudentUpdate", "StudentOut", "StudentDetailOut",
    "SubjectCreate", "SubjectUpdate", "SubjectOut",
    "MarkCreate", "MarkUpdate", "MarkOut",
    "AttendanceRecordCreate", "AttendanceOut", "StudentAttendanceSummary",
    "DashboardStatsOut"
]
