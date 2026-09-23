from pydantic import BaseModel
from typing import List, Dict, Any

class DeptDistribution(BaseModel):
    department_code: str
    department_name: str
    student_count: int

class YearDistribution(BaseModel):
    year: int
    student_count: int

class TopPerformer(BaseModel):
    id: int
    name: str
    roll_number: str
    department_code: str
    cgpa: float
    percentage: float

class LowAttendanceAlert(BaseModel):
    id: int
    name: str
    roll_number: str
    department_code: str
    attendance_percentage: float

class DashboardStatsOut(BaseModel):
    total_students: int
    total_departments: int
    total_subjects: int
    average_college_percentage: float
    average_college_cgpa: float
    overall_attendance_rate: float
    department_distribution: List[DeptDistribution]
    year_distribution: List[YearDistribution]
    top_performers: List[TopPerformer]
    low_attendance_alerts: List[LowAttendanceAlert]
