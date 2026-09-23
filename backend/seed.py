from datetime import date, timedelta, datetime
import random
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.models.department import Department
from backend.app.models.subject import Subject
from backend.app.models.student import Student
from backend.app.models.mark import Mark
from backend.app.models.attendance import Attendance
from backend.app.services.academic_service import calculate_grade_and_gp

def seed_database():
    """Populate database with comprehensive, realistic sample college data."""
    print("Resetting database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        print("1. Creating Admin and Faculty Accounts...")
        admin_user = User(
            email="admin@college.edu",
            hashed_password=hash_password("admin123"),
            full_name="System Administrator",
            role="admin",
            is_active=True
        )
        faculty_user = User(
            email="faculty@college.edu",
            hashed_password=hash_password("faculty123"),
            full_name="Dr. Alan Turing",
            role="faculty",
            is_active=True
        )
        db.add(admin_user)
        db.add(faculty_user)
        db.commit()

        print("2. Creating Departments...")
        departments_data = [
            {"code": "CSE", "name": "Computer Science & Engineering", "description": "Software, AI, Systems & Computing"},
            {"code": "ECE", "name": "Electronics & Communication Engg", "description": "Embedded Systems, Microprocessors, Signals"},
            {"code": "MECH", "name": "Mechanical Engineering", "description": "Thermodynamics, Robotics, Manufacturing"},
            {"code": "EEE", "name": "Electrical & Electronics Engg", "description": "Power Systems, Circuit Analysis, Machines"},
            {"code": "CIVIL", "name": "Civil Engineering", "description": "Structural Engineering, Geotechnical, Surveying"}
        ]
        
        dept_models = {}
        for d in departments_data:
            dept = Department(code=d["code"], name=d["name"], description=d["description"])
            db.add(dept)
            db.commit()
            db.refresh(dept)
            dept_models[d["code"]] = dept

        print("3. Creating Academic Subjects...")
        subjects_data = [
            # CSE
            {"code": "CS101", "name": "Data Structures & Algorithms", "dept": "CSE", "semester": 1, "credits": 4},
            {"code": "CS102", "name": "Object-Oriented Programming (Python)", "dept": "CSE", "semester": 1, "credits": 3},
            {"code": "CS201", "name": "Database Management Systems", "dept": "CSE", "semester": 2, "credits": 4},
            {"code": "CS202", "name": "Operating Systems", "dept": "CSE", "semester": 2, "credits": 4},
            {"code": "CS301", "name": "Computer Networks & Security", "dept": "CSE", "semester": 3, "credits": 3},
            # ECE
            {"code": "EC101", "name": "Digital Logic & Circuit Design", "dept": "ECE", "semester": 1, "credits": 4},
            {"code": "EC102", "name": "Signals & Systems", "dept": "ECE", "semester": 1, "credits": 3},
            {"code": "EC201", "name": "Microprocessors & Microcontrollers", "dept": "ECE", "semester": 2, "credits": 4},
            # MECH
            {"code": "ME101", "name": "Engineering Thermodynamics", "dept": "MECH", "semester": 1, "credits": 4},
            {"code": "ME102", "name": "Fluid Mechanics", "dept": "MECH", "semester": 1, "credits": 3},
            # EEE
            {"code": "EE101", "name": "Electric Circuit Analysis", "dept": "EEE", "semester": 1, "credits": 4},
            {"code": "EE102", "name": "Electrical Machines", "dept": "EEE", "semester": 1, "credits": 3},
            # CIVIL
            {"code": "CE101", "name": "Structural Analysis", "dept": "CIVIL", "semester": 1, "credits": 4},
            {"code": "CE102", "name": "Engineering Mechanics", "dept": "CIVIL", "semester": 1, "credits": 3}
        ]

        subject_models = []
        for s in subjects_data:
            subj = Subject(
                code=s["code"],
                name=s["name"],
                department_id=dept_models[s["dept"]].id,
                semester=s["semester"],
                credits=s["credits"]
            )
            db.add(subj)
            db.commit()
            db.refresh(subj)
            subject_models.append(subj)

        print("4. Registering Students...")
        sample_students_data = [
            ("2024CSE001", "Aarav Sharma", "2003-05-14", "Male", "aarav.sharma@college.edu", "+91 9876543210", "CSE", 1, "A"),
            ("2024CSE002", "Ananya Verma", "2003-08-22", "Female", "ananya.verma@college.edu", "+91 9876543211", "CSE", 1, "A"),
            ("2024CSE003", "Rohan Gupta", "2003-11-03", "Male", "rohan.gupta@college.edu", "+91 9876543212", "CSE", 1, "B"),
            ("2023CSE015", "Priya Patel", "2002-04-18", "Female", "priya.patel@college.edu", "+91 9876543213", "CSE", 2, "A"),
            ("2023CSE016", "Vikram Reddy", "2002-09-30", "Male", "vikram.reddy@college.edu", "+91 9876543214", "CSE", 2, "B"),
            ("2022CSE040", "Neha Singh", "2001-01-12", "Female", "neha.singh@college.edu", "+91 9876543215", "CSE", 3, "A"),
            ("2024ECE001", "Devansh Joshi", "2003-06-25", "Male", "devansh.joshi@college.edu", "+91 9876543216", "ECE", 1, "A"),
            ("2024ECE002", "Ishita Nair", "2003-12-10", "Female", "ishita.nair@college.edu", "+91 9876543217", "ECE", 1, "A"),
            ("2023ECE010", "Aditya Rao", "2002-03-05", "Male", "aditya.rao@college.edu", "+91 9876543218", "ECE", 2, "A"),
            ("2024ME001", "Kabir Mehta", "2003-07-19", "Male", "kabir.mehta@college.edu", "+91 9876543219", "MECH", 1, "A"),
            ("2024ME002", "Sanya Kapoor", "2003-02-14", "Female", "sanya.kapoor@college.edu", "+91 9876543220", "MECH", 1, "A"),
            ("2024EE001", "Arjun Bhat", "2003-10-28", "Male", "arjun.bhat@college.edu", "+91 9876543221", "EEE", 1, "A"),
            ("2024CE001", "Kavya Choudhury", "2003-04-09", "Female", "kavya.choudhury@college.edu", "+91 9876543222", "CIVIL", 1, "A"),
            ("2021CSE099", "Siddharth Malhotra", "2000-09-15", "Male", "siddharth.m@college.edu", "+91 9876543223", "CSE", 4, "A"),
            ("2023ME012", "Rhea Saxena", "2002-11-20", "Female", "rhea.saxena@college.edu", "+91 9876543224", "MECH", 2, "A")
        ]

        student_models = []
        for roll, name, dob_str, gender, email, phone, dept_code, yr, sec in sample_students_data:
            dob_obj = datetime.strptime(dob_str, "%Y-%m-%d").date()
            st = Student(
                roll_number=roll,
                name=name,
                dob=dob_obj,
                gender=gender,
                email=email,
                phone=phone,
                address="College Campus Hostel Block B, Suite 402",
                department_id=dept_models[dept_code].id,
                course="B.Tech",
                year=yr,
                section=sec,
                status="Active"
            )
            db.add(st)

            # Create corresponding student user account for login
            st_user = User(
                email=email.lower(),
                hashed_password=hash_password("student123"),
                full_name=name,
                role="student",
                is_active=True
            )
            db.add(st_user)

            db.commit()
            db.refresh(st)
            student_models.append(st)

        print("5. Recording Marks & Academic Performance...")
        # Assign realistic marks to students for their department subjects
        random.seed(42)
        for student in student_models:
            # Get subjects matching student department
            dept_subjs = [s for s in subject_models if s.department_id == student.department_id]
            for subj in dept_subjs:
                # Top performers get higher marks
                if student.roll_number in ("2024CSE001", "2024ECE002", "2022CSE040"):
                    internal = random.uniform(28.0, 30.0)
                    external = random.uniform(62.0, 70.0)
                else:
                    internal = random.uniform(18.0, 27.0)
                    external = random.uniform(35.0, 60.0)

                total = round(internal + external, 2)
                pct = round(total, 2)
                grade, gp = calculate_grade_and_gp(pct)

                mark = Mark(
                    student_id=student.id,
                    subject_id=subj.id,
                    semester=subj.semester,
                    internal_marks=round(internal, 1),
                    external_marks=round(external, 1),
                    total_marks=total,
                    percentage=pct,
                    grade=grade,
                    grade_point=gp
                )
                db.add(mark)
        db.commit()

        print("6. Logging Attendance Records...")
        # Log 15 days of attendance for each student
        start_date = date.today() - timedelta(days=20)
        for student in student_models:
            dept_subjs = [s for s in subject_models if s.department_id == student.department_id]
            
            # Simulate low attendance for 2 specific students ("2023CSE016" and "2024ME001")
            is_low_att_student = student.roll_number in ("2023CSE016", "2024ME001")
            
            for day_offset in range(15):
                current_date = start_date + timedelta(days=day_offset)
                if current_date.weekday() >= 5: # Skip weekends
                    continue

                for subj in dept_subjs:
                    if is_low_att_student:
                        status_val = "Absent" if random.random() < 0.60 else "Present"
                    else:
                        status_val = "Present" if random.random() < 0.90 else "Absent"

                    att = Attendance(
                        student_id=student.id,
                        subject_id=subj.id,
                        date=current_date,
                        status=status_val,
                        remarks="Regular Class Session"
                    )
                    db.add(att)
        db.commit()

        print("\nSeed completed successfully!")
        print("---------------------------------------")
        print("Admin Login Credentials:")
        print("Email:    admin@college.edu")
        print("Password: admin123")
        print("---------------------------------------")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
