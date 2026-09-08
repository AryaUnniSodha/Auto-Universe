import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import User, Student, RoleEnum, SyllabusTopic, Enrollment, Course
from app.agents.agents import GRAPH
from app.schemas.schemas import (
    AttendanceAnalyticsOut, AcademicAnalyticsOut, DigitalTwinOut, MentorPlanOut, SyllabusStatusOut
)

router = APIRouter(prefix="/api/student", tags=["Student Portal"])


def _resolve_student(db: Session, user: User, student_id: int | None) -> Student:
    if user.role == RoleEnum.student:
        student = user.student_profile
        if not student:
            raise HTTPException(404, "Student profile not found")
        return student
    # faculty/hod/admin can view a specific student
    if student_id is None:
        raise HTTPException(400, "student_id is required for this role")
    student = db.query(Student).get(student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    return student


@router.get("/attendance", response_model=AttendanceAnalyticsOut)
def get_attendance(student_id: int | None = None, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, student_id)
    ctx = GRAPH.run(["attendance"], db, student)
    return ctx.results["attendance"]


@router.get("/academic", response_model=AcademicAnalyticsOut)
def get_academic(student_id: int | None = None, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, student_id)
    ctx = GRAPH.run(["academic"], db, student)
    return ctx.results["academic"]


@router.get("/digital-twin", response_model=DigitalTwinOut)
def get_digital_twin(student_id: int | None = None, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, student_id)
    ctx = GRAPH.run(["digital_twin"], db, student)
    return ctx.results["digital_twin"]


@router.get("/mentor-plan", response_model=MentorPlanOut)
def get_mentor_plan(student_id: int | None = None, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, student_id)
    ctx = GRAPH.run(["mentor"], db, student)
    return ctx.results["mentor"]


@router.get("/syllabus/{course_id}", response_model=SyllabusStatusOut)
def get_syllabus_status(course_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    topics = db.query(SyllabusTopic).filter(SyllabusTopic.course_id == course_id).order_by(
        SyllabusTopic.order_index).all()
    total = len(topics)
    completed = sum(1 for t in topics if t.status == "completed")
    pending = total - completed
    pct = round(completed / total * 100, 1) if total else 0.0

    alerts = []
    weeks_left_in_term = 8  # simplifying assumption; could be derived from academic calendar
    if total and pending > 0:
        weekly_rate = max(completed / max(1, 6), 0.5)  # assume ~6 weeks elapsed so far
        weeks_needed = pending / weekly_rate if weekly_rate else 99
        est_date = dt.date.today() + dt.timedelta(weeks=weeks_needed)
        at_risk = weeks_needed > weeks_left_in_term
        if at_risk:
            alerts.append(
                f"At current pace, syllabus completion needs ~{weeks_needed:.1f} weeks, "
                f"exceeding the {weeks_left_in_term}-week term window. Consider compressing lower-priority topics."
            )
    else:
        est_date = None
        at_risk = False

    if pct < 40 and total:
        alerts.append("Less than 40% of syllabus covered — schedule catch-up sessions.")

    return SyllabusStatusOut(
        course_id=course_id, course_name=course.name, total_topics=total, completed=completed,
        pending=pending, percent_complete=pct,
        estimated_completion_date=est_date.isoformat() if est_date else None,
        at_risk=at_risk, alerts=alerts, topics=topics,
    )


@router.get("/enrollments")
def get_enrollments(student_id: int | None = None, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, student_id)
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    return [{"course_id": e.course_id, "code": e.course.code, "name": e.course.name,
             "semester": e.course.semester} for e in enrollments]


@router.get("/profile")
def get_profile(student_id: int | None = None, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, student_id)
    return {
        "id": student.id, "roll_number": student.roll_number, "full_name": student.user.full_name,
        "department": student.department.name if student.department else None,
        "semester": student.semester, "cgpa": student.cgpa,
        "learning_style": student.learning_style, "placement_goal": student.placement_goal,
    }
