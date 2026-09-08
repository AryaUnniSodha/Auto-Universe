import re
import datetime as dt
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import (
    User, RoleEnum, Student, PlacementProfile, PracticeAttempt, PracticeTypeEnum,
    AssessmentTest, AssessmentTypeEnum, AssessmentSubmission, JobEvent, EventTypeEnum,
    PlacementStatusEnum, Department,
)
from app.agents.agents import GRAPH
from app.schemas.schemas import (
    PracticeAttemptIn, ResumeAnalysisIn, ResumeAnalysisOut, PlacementReadinessOut,
    TestCreateIn, TestStatsOut, TestForStudentOut, TestDetailOut, SubmitAnswersIn, SubmitResultOut,
    EventIn, EventOut, PlacementStatusIn, StudentRosterOut, PlacementDashboardOut,
)
from app.routers.student import _resolve_student

router = APIRouter(prefix="/api/placement", tags=["Placement Intelligence"])

OFFICER_ROLES = (RoleEnum.placement, RoleEnum.admin)

SKILL_KEYWORDS = [
    "python", "java", "c++", "javascript", "react", "node", "sql", "aws", "docker",
    "machine learning", "data structures", "algorithms", "git", "django", "fastapi",
    "communication", "leadership", "dsa", "system design", "kubernetes", "html", "css",
]


def _in_scope(dept_code: str | None, semester: int, dept_scope: str, sem_scope: int | None) -> bool:
    dept_ok = dept_scope == "ALL" or (dept_code and dept_code in [d.strip() for d in dept_scope.split(",")])
    sem_ok = sem_scope is None or sem_scope == semester
    return bool(dept_ok and sem_ok)


@router.get("/readiness", response_model=PlacementReadinessOut)
def get_readiness(student_id: int | None = None, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, student_id)
    ctx = GRAPH.run(["placement"], db, student)
    return ctx.results["placement"]


@router.post("/resume/analyze", response_model=ResumeAnalysisOut)
def analyze_resume(payload: ResumeAnalysisIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    text = payload.resume_text.lower()
    detected = [kw for kw in SKILL_KEYWORDS if kw in text]
    missing = [kw for kw in SKILL_KEYWORDS if kw not in text][:6]

    has_email = bool(re.search(r"[\w\.-]+@[\w\.-]+", text))
    has_numbers = bool(re.search(r"\b\d+%|\bincreased\b|\breduced\b|\bimproved\b", text))
    length_ok = 150 <= len(text.split()) <= 1200

    ats_score = 40
    ats_score += 20 if has_email else 0
    ats_score += 15 if has_numbers else 0
    ats_score += 15 if length_ok else 0
    ats_score += min(10, len(detected))
    ats_score = min(100, ats_score)

    suggestions = []
    if not has_numbers:
        suggestions.append("Quantify achievements with metrics (e.g., 'reduced load time by 30%').")
    if not length_ok:
        suggestions.append("Aim for a focused 1-page resume (roughly 300-600 words).")
    if len(detected) < 5:
        suggestions.append("Add more role-relevant technical keywords matching target job descriptions.")
    if not suggestions:
        suggestions.append("Resume structure looks solid — tailor keywords per job description before applying.")

    return ResumeAnalysisOut(detected_skills=detected, missing_skills=missing, ats_score=ats_score,
                              suggestions=suggestions)


@router.post("/practice/attempt")
def log_practice_attempt(payload: PracticeAttemptIn, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, None)
    profile = student.placement_profile
    if not profile:
        profile = PlacementProfile(student_id=student.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    attempt = PracticeAttempt(profile_id=profile.id, type=PracticeTypeEnum(payload.type),
                               topic=payload.topic, score=payload.score, max_score=payload.max_score)
    db.add(attempt)

    # rolling-average update to the relevant profile score
    pct = payload.score / payload.max_score * 100
    if payload.type == "aptitude":
        profile.aptitude_score = round((profile.aptitude_score or pct) * 0.7 + pct * 0.3, 1)
    elif payload.type == "coding":
        profile.coding_score = round((profile.coding_score or pct) * 0.7 + pct * 0.3, 1)
    elif payload.type == "interview":
        profile.communication_score = round((profile.communication_score or pct) * 0.7 + pct * 0.3, 1)

    db.commit()
    return {"status": "logged", "updated_profile": {
        "aptitude_score": profile.aptitude_score, "coding_score": profile.coding_score,
        "communication_score": profile.communication_score,
    }}


@router.get("/practice/history")
def practice_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, None)
    profile = student.placement_profile
    if not profile:
        return []
    attempts = db.query(PracticeAttempt).filter(PracticeAttempt.profile_id == profile.id) \
        .order_by(PracticeAttempt.taken_at.desc()).limit(30).all()
    return [{"type": a.type.value, "topic": a.topic, "score": a.score, "max_score": a.max_score,
             "taken_at": a.taken_at} for a in attempts]


# =====================================================================================
# Placement Officer console: tests, events, roster, dashboard
# =====================================================================================

@router.post("/tests", response_model=TestStatsOut)
def create_test(payload: TestCreateIn, db: Session = Depends(get_db),
                 user: User = Depends(require_roles(*OFFICER_ROLES))):
    test = AssessmentTest(
        title=payload.title, type=AssessmentTypeEnum(payload.type), description=payload.description,
        department_scope=payload.department_scope, semester_scope=payload.semester_scope,
        duration_minutes=payload.duration_minutes, due_date=payload.due_date,
        questions=[q.model_dump() for q in payload.questions], created_by=user.id,
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return _test_stats(db, test)


@router.get("/tests", response_model=list[TestStatsOut])
def list_tests(db: Session = Depends(get_db), user: User = Depends(require_roles(*OFFICER_ROLES))):
    tests = db.query(AssessmentTest).order_by(AssessmentTest.created_at.desc()).all()
    return [_test_stats(db, t) for t in tests]


def _test_stats(db: Session, test: AssessmentTest) -> TestStatsOut:
    students = db.query(Student).all()
    eligible = [s for s in students if _in_scope(
        s.department.code if s.department else None, s.semester, test.department_scope, test.semester_scope)]
    submissions = db.query(AssessmentSubmission).filter(AssessmentSubmission.test_id == test.id).all()
    avg_score = round(float(np.mean([sub.score / sub.max_score * 100 for sub in submissions])), 1) if submissions else None
    return TestStatsOut(
        id=test.id, title=test.title, type=test.type.value, description=test.description,
        department_scope=test.department_scope, semester_scope=test.semester_scope,
        duration_minutes=test.duration_minutes, due_date=test.due_date,
        question_count=len(test.questions or []), created_at=test.created_at,
        eligible_count=len(eligible), completed_count=len(submissions), avg_score=avg_score,
    )


@router.get("/tests/mine", response_model=list[TestForStudentOut])
def my_tests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, None)
    dept_code = student.department.code if student.department else None
    tests = db.query(AssessmentTest).order_by(AssessmentTest.created_at.desc()).all()
    out = []
    for t in tests:
        if not _in_scope(dept_code, student.semester, t.department_scope, t.semester_scope):
            continue
        sub = db.query(AssessmentSubmission).filter(
            AssessmentSubmission.test_id == t.id, AssessmentSubmission.student_id == student.id).first()
        out.append(TestForStudentOut(
            id=t.id, title=t.title, type=t.type.value, description=t.description,
            duration_minutes=t.duration_minutes, due_date=t.due_date, question_count=len(t.questions or []),
            status="completed" if sub else "pending",
            score=sub.score if sub else None, max_score=sub.max_score if sub else None,
        ))
    return out


@router.get("/tests/{test_id}", response_model=TestDetailOut)
def get_test(test_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    test = db.query(AssessmentTest).get(test_id)
    if not test:
        raise HTTPException(404, "Test not found")
    questions = [{"question": q["question"], "options": q["options"]} for q in (test.questions or [])]
    return TestDetailOut(id=test.id, title=test.title, type=test.type.value, description=test.description,
                          duration_minutes=test.duration_minutes, questions=questions)


@router.post("/tests/{test_id}/submit", response_model=SubmitResultOut)
def submit_test(test_id: int, payload: SubmitAnswersIn, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    student = _resolve_student(db, user, None)
    test = db.query(AssessmentTest).get(test_id)
    if not test:
        raise HTTPException(404, "Test not found")
    existing = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.test_id == test_id, AssessmentSubmission.student_id == student.id).first()
    if existing:
        raise HTTPException(400, "You have already submitted this test")

    questions = test.questions or []
    max_score = float(len(questions)) or 1.0
    correct = sum(
        1 for i, q in enumerate(questions)
        if i < len(payload.answers) and payload.answers[i] == q.get("correct_index")
    )
    score = float(correct)

    db.add(AssessmentSubmission(test_id=test_id, student_id=student.id, score=score,
                                 max_score=max_score, answers=payload.answers))

    profile = student.placement_profile
    if not profile:
        profile = PlacementProfile(student_id=student.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    pct = (score / max_score * 100) if max_score else 0.0
    if test.type == AssessmentTypeEnum.aptitude:
        profile.aptitude_score = round((profile.aptitude_score or pct) * 0.6 + pct * 0.4, 1)
    else:
        profile.coding_score = round((profile.coding_score or pct) * 0.6 + pct * 0.4, 1)

    db.commit()
    return SubmitResultOut(score=score, max_score=max_score, percentage=round(pct, 1))


@router.post("/events", response_model=EventOut)
def create_event(payload: EventIn, db: Session = Depends(get_db),
                  user: User = Depends(require_roles(*OFFICER_ROLES))):
    event = JobEvent(
        title=payload.title, company_name=payload.company_name, event_type=EventTypeEnum(payload.event_type),
        event_date=payload.event_date, description=payload.description, min_cgpa=payload.min_cgpa,
        department_scope=payload.department_scope, created_by=user.id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventOut(id=event.id, title=event.title, company_name=event.company_name,
                     event_type=event.event_type.value, event_date=event.event_date,
                     description=event.description, min_cgpa=event.min_cgpa,
                     department_scope=event.department_scope)


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles(*OFFICER_ROLES))):
    event = db.query(JobEvent).get(event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    db.delete(event)
    db.commit()
    return {"status": "deleted"}


@router.get("/events", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    events = db.query(JobEvent).order_by(JobEvent.event_date.asc()).all()
    if user.role == RoleEnum.student:
        student = _resolve_student(db, user, None)
        dept_code = student.department.code if student.department else None
        events = [e for e in events if _in_scope(dept_code, student.semester, e.department_scope, None)
                  and (student.cgpa or 0) >= (e.min_cgpa or 0)]
    return [EventOut(id=e.id, title=e.title, company_name=e.company_name, event_type=e.event_type.value,
                      event_date=e.event_date, description=e.description, min_cgpa=e.min_cgpa,
                      department_scope=e.department_scope) for e in events]


@router.get("/roster", response_model=list[StudentRosterOut])
def student_roster(department: str | None = None, db: Session = Depends(get_db),
                    user: User = Depends(require_roles(*OFFICER_ROLES))):
    query = db.query(Student)
    if department:
        query = query.join(Department).filter(Department.code == department)
    students = query.all()
    out = []
    for s in students:
        p = s.placement_profile
        out.append(StudentRosterOut(
            student_id=s.id, roll_number=s.roll_number, full_name=s.user.full_name,
            department=s.department.name if s.department else None, semester=s.semester, cgpa=s.cgpa or 0.0,
            placement_status=(p.placement_status.value if p and p.placement_status else "not_placed"),
            placed_company=p.placed_company if p else None, placed_package_lpa=p.placed_package_lpa if p else None,
            aptitude_score=p.aptitude_score if p else 0.0, coding_score=p.coding_score if p else 0.0,
            readiness_score=p.readiness_score if p else 0.0,
        ))
    return out


@router.put("/students/{student_id}/status")
def update_placement_status(student_id: int, payload: PlacementStatusIn, db: Session = Depends(get_db),
                             user: User = Depends(require_roles(*OFFICER_ROLES))):
    student = db.query(Student).get(student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    profile = student.placement_profile
    if not profile:
        profile = PlacementProfile(student_id=student.id)
        db.add(profile)
    profile.placement_status = PlacementStatusEnum(payload.status)
    profile.placed_company = payload.company
    profile.placed_package_lpa = payload.package_lpa
    profile.placed_at = dt.datetime.utcnow() if payload.status == "placed" else None
    db.commit()
    return {"status": "updated"}


@router.get("/dashboard", response_model=PlacementDashboardOut)
def placement_dashboard(db: Session = Depends(get_db), user: User = Depends(require_roles(*OFFICER_ROLES))):
    students = db.query(Student).all()
    total = len(students)
    placed = sum(1 for s in students if s.placement_profile and s.placement_profile.placement_status == PlacementStatusEnum.placed)

    tests = db.query(AssessmentTest).all()
    apt_tests = [t for t in tests if t.type == AssessmentTypeEnum.aptitude]
    code_tests = [t for t in tests if t.type == AssessmentTypeEnum.coding]

    def completion_rate(test_list):
        if not test_list:
            return 0.0
        rates = []
        for t in test_list:
            stats = _test_stats(db, t)
            rates.append((stats.completed_count / stats.eligible_count * 100) if stats.eligible_count else 0.0)
        return round(float(np.mean(rates)), 1)

    readiness_vals = []
    for s in students:
        ctx = GRAPH.run(["placement"], db, s)
        readiness_vals.append(ctx.results["placement"]["readiness_score"])

    upcoming = db.query(JobEvent).filter(JobEvent.event_date >= dt.datetime.utcnow()).count()

    recent = []
    for s in students:
        p = s.placement_profile
        if p and p.placement_status == PlacementStatusEnum.placed and p.placed_at:
            recent.append({"student": s.user.full_name, "roll_number": s.roll_number,
                            "company": p.placed_company, "package_lpa": p.placed_package_lpa,
                            "placed_at": p.placed_at})
    recent.sort(key=lambda r: r["placed_at"], reverse=True)

    return PlacementDashboardOut(
        total_students=total, placed_count=placed,
        placement_rate=round(placed / total * 100, 1) if total else 0.0,
        aptitude_completion_rate=completion_rate(apt_tests), coding_completion_rate=completion_rate(code_tests),
        avg_readiness=round(float(np.mean(readiness_vals)), 1) if readiness_vals else 0.0,
        upcoming_events_count=upcoming, tests=[_test_stats(db, t) for t in tests], recent_placements=recent[:10],
    )
