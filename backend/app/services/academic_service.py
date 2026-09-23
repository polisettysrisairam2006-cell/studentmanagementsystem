from typing import Tuple, List, Dict, Any

def calculate_grade_and_gp(percentage: float) -> Tuple[str, float]:
    """
    Calculate Letter Grade and Grade Point based on percentage (10-point CGPA scale).
    """
    if percentage >= 90.0:
        return "A+", 10.0
    elif percentage >= 80.0:
        return "A", 9.0
    elif percentage >= 70.0:
        return "B", 8.0
    elif percentage >= 60.0:
        return "C", 7.0
    elif percentage >= 50.0:
        return "D", 6.0
    else:
        return "F", 0.0

def compute_student_academic_summary(marks: List[Any]) -> Dict[str, Any]:
    """
    Compute total marks, percentage, CGPA, semester breakdowns, and pass/fail status for a student.
    """
    if not marks:
        return {
            "total_marks": 0.0,
            "max_marks": 0.0,
            "percentage": 0.0,
            "cgpa": 0.0,
            "grade": "N/A",
            "total_credits": 0,
            "status": "N/A",
            "semester_performance": {}
        }
    
    total_obtained = 0.0
    total_max = len(marks) * 100.0
    weighted_gp_sum = 0.0
    total_credits = 0
    has_failed = False
    
    semester_map: Dict[int, Dict[str, Any]] = {}

    for mark in marks:
        subject = mark.subject
        credits = subject.credits if subject else 3
        
        total_obtained += mark.total_marks
        weighted_gp_sum += (mark.grade_point * credits)
        total_credits += credits
        
        if mark.grade == "F":
            has_failed = True

        sem = mark.semester
        if sem not in semester_map:
            semester_map[sem] = {
                "semester": sem,
                "obtained_marks": 0.0,
                "max_marks": 0,
                "credits": 0,
                "weighted_gp": 0.0,
                "subjects_count": 0
            }

        semester_map[sem]["obtained_marks"] += mark.total_marks
        semester_map[sem]["max_marks"] += 100
        semester_map[sem]["credits"] += credits
        semester_map[sem]["weighted_gp"] += (mark.grade_point * credits)
        semester_map[sem]["subjects_count"] += 1

    overall_percentage = round((total_obtained / total_max) * 100.0, 2) if total_max > 0 else 0.0
    cgpa = round(weighted_gp_sum / total_credits, 2) if total_credits > 0 else 0.0
    overall_grade, _ = calculate_grade_and_gp(overall_percentage)

    # Format semester performance
    semester_performance = {}
    for sem, data in sorted(semester_map.items()):
        sem_percentage = round((data["obtained_marks"] / data["max_marks"]) * 100.0, 2)
        sem_gpa = round(data["weighted_gp"] / data["credits"], 2) if data["credits"] > 0 else 0.0
        semester_performance[sem] = {
            "semester": sem,
            "obtained_marks": round(data["obtained_marks"], 2),
            "max_marks": data["max_marks"],
            "percentage": sem_percentage,
            "gpa": sem_gpa,
            "credits": data["credits"],
            "subjects_count": data["subjects_count"]
        }

    return {
        "total_marks": round(total_obtained, 2),
        "max_marks": total_max,
        "percentage": overall_percentage,
        "cgpa": cgpa,
        "grade": overall_grade,
        "total_credits": total_credits,
        "status": "Failed" if has_failed else "Passed",
        "semester_performance": semester_performance
    }
