import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

def generate_student_pdf_report(student, academic_summary, attendance_stats) -> bytes:
    """
    Generate a styled PDF transcript & report card using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY_COLOR = colors.HexColor("#1e293b")   # Slate dark
    SECONDARY_COLOR = colors.HexColor("#0f766e") # Teal accent
    ACCENT_BG = colors.HexColor("#f8fafc")       # Slate light
    BORDER_COLOR = colors.HexColor("#cbd5e1")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=PRIMARY_COLOR,
        alignment=1, # Center
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=SECONDARY_COLOR,
        alignment=1,
        spaceAfter=15
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=PRIMARY_COLOR,
        spaceBefore=12,
        spaceAfter=6
    )
    
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor("#334155")
    )
    
    cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=PRIMARY_COLOR
    )

    elements = []

    # Header
    elements.append(Paragraph("UNIVERSAL INSTITUTE OF TECHNOLOGY", title_style))
    elements.append(Paragraph("OFFICIAL STUDENT ACADEMIC & ATTENDANCE TRANSCRIPT", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=SECONDARY_COLOR, spaceBefore=0, spaceAfter=15))

    # Student Profile Info Table
    dept_name = student.department.name if student.department else "N/A"
    profile_data = [
        [
            Paragraph("<b>Student Name:</b>", cell_style), Paragraph(student.name, cell_bold),
            Paragraph("<b>Roll Number:</b>", cell_style), Paragraph(student.roll_number, cell_bold)
        ],
        [
            Paragraph("<b>Department:</b>", cell_style), Paragraph(f"{student.department.code} - {dept_name}", cell_style),
            Paragraph("<b>Course / Degree:</b>", cell_style), Paragraph(student.course, cell_style)
        ],
        [
            Paragraph("<b>Academic Year:</b>", cell_style), Paragraph(f"Year {student.year} (Sec {student.section})", cell_style),
            Paragraph("<b>Email Address:</b>", cell_style), Paragraph(student.email, cell_style)
        ],
        [
            Paragraph("<b>Date of Birth:</b>", cell_style), Paragraph(str(student.dob), cell_style),
            Paragraph("<b>Phone Number:</b>", cell_style), Paragraph(student.phone, cell_style)
        ]
    ]

    profile_table = Table(profile_data, colWidths=[100, 170, 100, 170])
    profile_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ACCENT_BG),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0"))
    ]))
    elements.append(profile_table)
    elements.append(Spacer(1, 15))

    # Academic Performance Table
    elements.append(Paragraph("Academic Marks & Grades", section_heading))
    
    marks_headers = [
        Paragraph("<b>Code</b>", cell_bold),
        Paragraph("<b>Subject Name</b>", cell_bold),
        Paragraph("<b>Sem</b>", cell_bold),
        Paragraph("<b>Internal (30)</b>", cell_bold),
        Paragraph("<b>External (70)</b>", cell_bold),
        Paragraph("<b>Total (100)</b>", cell_bold),
        Paragraph("<b>Grade</b>", cell_bold),
        Paragraph("<b>GP</b>", cell_bold)
    ]
    
    marks_data = [marks_headers]
    for mark in student.marks:
        subj_code = mark.subject.code if mark.subject else "N/A"
        subj_name = mark.subject.name if mark.subject else "N/A"
        marks_data.append([
            Paragraph(subj_code, cell_style),
            Paragraph(subj_name, cell_style),
            Paragraph(str(mark.semester), cell_style),
            Paragraph(str(mark.internal_marks), cell_style),
            Paragraph(str(mark.external_marks), cell_style),
            Paragraph(str(mark.total_marks), cell_bold),
            Paragraph(mark.grade, cell_bold),
            Paragraph(str(mark.grade_point), cell_style)
        ])

    marks_table = Table(marks_data, colWidths=[65, 175, 40, 55, 55, 50, 50, 50])
    marks_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1"))
    ]))
    elements.append(marks_table)
    elements.append(Spacer(1, 10))

    # Summary Statistics Box
    summary_data = [
        [
            Paragraph("<b>Total Obtained Marks:</b>", cell_style), Paragraph(f"{academic_summary['total_marks']} / {academic_summary['max_marks']}", cell_bold),
            Paragraph("<b>Overall Percentage:</b>", cell_style), Paragraph(f"{academic_summary['percentage']}%", cell_bold),
            Paragraph("<b>Cumulative GPA (CGPA):</b>", cell_style), Paragraph(f"<b>{academic_summary['cgpa']} / 10.0</b>", cell_bold),
            Paragraph("<b>Final Status:</b>", cell_style), Paragraph(f"<b>{academic_summary['status']}</b>", cell_bold)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[110, 80, 110, 60, 110, 70, 70, 70])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdf4") if academic_summary['status'] == "Passed" else colors.HexColor("#fef2f2")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#86efac") if academic_summary['status'] == "Passed" else colors.HexColor("#fca5a5"))
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 15))

    # Attendance Summary Section
    elements.append(Paragraph("Attendance Statistics Summary", section_heading))
    att_headers = [
        Paragraph("<b>Subject Code</b>", cell_bold),
        Paragraph("<b>Subject Name</b>", cell_bold),
        Paragraph("<b>Total Conducted</b>", cell_bold),
        Paragraph("<b>Total Attended</b>", cell_bold),
        Paragraph("<b>Attendance %</b>", cell_bold),
        Paragraph("<b>Status</b>", cell_bold)
    ]
    att_rows = [att_headers]
    for stat in attendance_stats.get("subjects", []):
        status_text = "Satisfactory" if stat["percentage"] >= 75.0 else "Shortage (<75%)"
        att_rows.append([
            Paragraph(stat["subject_code"], cell_style),
            Paragraph(stat["subject_name"], cell_style),
            Paragraph(str(stat["total_classes"]), cell_style),
            Paragraph(str(stat["attended"]), cell_style),
            Paragraph(f"{stat['percentage']}%", cell_bold),
            Paragraph(status_text, cell_bold if stat["percentage"] < 75.0 else cell_style)
        ])

    att_table = Table(att_rows, colWidths=[80, 200, 70, 70, 60, 60])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1"))
    ]))
    elements.append(att_table)
    
    # Signature Footer
    elements.append(Spacer(1, 40))
    footer_data = [
        [Paragraph("______________________<br/><b>Academic Coordinator</b>", cell_style),
         Paragraph("______________________<br/><b>Controller of Examinations</b>", cell_style),
         Paragraph("______________________<br/><b>Principal / Registrar</b>", cell_style)]
    ]
    footer_table = Table(footer_data, colWidths=[180, 180, 180])
    footer_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    elements.append(footer_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
