import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_roles
from app.models.models import (
    User, RoleEnum, AttendanceRecord, Mark, MarkTypeEnum, SyllabusTopic, CourseOutcome, Course,
    CourseFaculty, Enrollment, Student
)
from app.schemas.schemas import AttendanceMarkRequest, BulkMarksIn, COAttainmentOut
from app.rag.pipeline import get_store, chunk_text
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/faculty", tags=["Faculty Automation"],
                    dependencies=[Depends(require_roles(RoleEnum.faculty, RoleEnum.hod, RoleEnum.admin))])


@router.get("/courses")
def my_courses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Courses taught by the current faculty member (all courses for HOD/admin)."""
    if user.role == RoleEnum.faculty and user.faculty_profile:
        links = db.query(CourseFaculty).filter(CourseFaculty.faculty_id == user.faculty_profile.id).all()
        courses = [l.course for l in links]
    else:
        courses = db.query(Course).filter(
            Course.department_id == user.department_id
        ).all() if user.department_id else db.query(Course).all()
    return [{"id": c.id, "code": c.code, "name": c.name, "semester": c.semester} for c in courses]


@router.get("/course/{course_id}/students")
def course_roster(course_id: int, db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    result = []
    for e in enrollments:
        s: Student = e.student
        result.append({"student_id": s.id, "roll_number": s.roll_number, "full_name": s.user.full_name})
    return result


@router.post("/attendance/mark")
def mark_attendance(payload: AttendanceMarkRequest, db: Session = Depends(get_db)):
    date_dt = dt.datetime.combine(payload.date, dt.time())
    created = 0
    for sid in payload.present_student_ids:
        db.add(AttendanceRecord(student_id=sid, course_id=payload.course_id, date=date_dt, present=True))
        created += 1
    for sid in payload.absent_student_ids:
        db.add(AttendanceRecord(student_id=sid, course_id=payload.course_id, date=date_dt, present=False))
        created += 1
    db.commit()
    return {"status": "recorded", "records_created": created}


@router.post("/marks/bulk")
def bulk_marks(payload: BulkMarksIn, db: Session = Depends(get_db)):
    created = 0
    for entry in payload.entries:
        db.add(Mark(
            student_id=entry.student_id, course_id=payload.course_id,
            mark_type=MarkTypeEnum(payload.mark_type), marks_obtained=entry.marks_obtained,
            max_marks=payload.max_marks, bloom_level=payload.bloom_level, co_mapped=payload.co_mapped,
        ))
        created += 1
    db.commit()
    return {"status": "recorded", "marks_created": created}


@router.get("/co-attainment/{course_id}", response_model=list[COAttainmentOut])
def co_attainment(course_id: int, db: Session = Depends(get_db)):
    cos = db.query(CourseOutcome).filter(CourseOutcome.course_id == course_id).all()
    results = []
    for co in cos:
        marks = db.query(Mark).filter(Mark.course_id == course_id, Mark.co_mapped.like(f"%{co.code}%")).all()
        if marks:
            pct_scores = [mk.marks_obtained / mk.max_marks * 100 for mk in marks]
            attained_students = sum(1 for p in pct_scores if p >= 50)
            actual = round(attained_students / len(pct_scores) * 100, 1)
        else:
            actual = 0.0
        results.append(COAttainmentOut(
            co_code=co.code, description=co.description, target_attainment=co.target_attainment,
            actual_attainment=actual, attained=actual >= co.target_attainment,
        ))
    return results


@router.put("/syllabus/topic/{topic_id}/status")
def update_syllabus_status(topic_id: int, status: str, db: Session = Depends(get_db)):
    topic = db.query(SyllabusTopic).get(topic_id)
    if not topic:
        raise HTTPException(404, "Topic not found")
    if status not in ("pending", "in_progress", "completed", "revision"):
        raise HTTPException(400, "Invalid status")
    topic.status = status
    topic.completed_at = dt.datetime.utcnow() if status == "completed" else None
    db.commit()
    return {"status": "updated", "topic_id": topic_id, "new_status": status}


@router.post("/notes/upload")
def upload_notes(course_id: int, title: str, text: str, db: Session = Depends(get_db)):
    """Ingests faculty notes into the RAG index (chunked, TF-IDF vectorized)."""
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    store = get_store()
    existing_docs = store.docs if store.docs else []
    chunks = chunk_text(text)
    new_docs = [
        {"id": f"{course.code}-{title}-{i}", "title": f"{title} (part {i+1})",
         "course": course.code, "text": chunk}
        for i, chunk in enumerate(chunks)
    ]
    store.build(existing_docs + new_docs)
    return {"status": "indexed", "chunks_added": len(new_docs), "total_documents": len(store.docs)}


BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]


@router.get("/question-paper/blueprint/{course_id}")
def question_paper_blueprint(course_id: int, total_marks: int = 100, db: Session = Depends(get_db)):
    """AI-assisted blueprint distributing marks across CO and Bloom's taxonomy levels."""
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    cos = db.query(CourseOutcome).filter(CourseOutcome.course_id == course_id).all()
    if not cos:
        raise HTTPException(400, "Define Course Outcomes (COs) for this course before generating a blueprint")

    marks_per_co = total_marks / len(cos)
    # Bloom distribution skews toward Apply/Analyze for engineering assessments (evidence-based default)
    bloom_weights = {"Remember": 0.10, "Understand": 0.20, "Apply": 0.25,
                      "Analyze": 0.25, "Evaluate": 0.12, "Create": 0.08}

    blueprint = []
    for co in cos:
        rows = [{"bloom_level": lvl, "marks": round(marks_per_co * w, 1)} for lvl, w in bloom_weights.items()]
        blueprint.append({"co_code": co.code, "description": co.description,
                          "total_marks": round(marks_per_co, 1), "distribution": rows})

    return {"course": course.name, "total_marks": total_marks, "blueprint": blueprint,
            "note": "Distribution follows a Bloom's-weighted template biased toward Apply/Analyze levels; "
                    "adjust weights per department policy."}
