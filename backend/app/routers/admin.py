import numpy as np
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_roles, get_current_user
from app.models.models import User, RoleEnum, Student, Faculty, AttendanceRecord, Department
from app.agents.agents import GRAPH
from app.schemas.schemas import UniversityDashboardOut
from app.ml.train import retrain_all

router = APIRouter(prefix="/api/admin", tags=["University Digital Twin"],
                    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.hod))])


@router.get("/dashboard", response_model=UniversityDashboardOut)
def university_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Student)
    if user.role == RoleEnum.hod:
        query = query.filter(Student.department_id == user.department_id)
    students = query.all()
    faculty_query = db.query(Faculty)
    if user.role == RoleEnum.hod:
        faculty_query = faculty_query.filter(Faculty.department_id == user.department_id)
    faculty_count = faculty_query.count()

    attendance_pcts, cgpas, readiness_vals, at_risk = [], [], [], 0
    dept_stats: dict[str, list] = {}

    for s in students:
        ctx = GRAPH.run(["digital_twin"], db, s)
        twin = ctx.results["digital_twin"]
        attendance_pcts.append(twin["attendance_score"])
        cgpas.append(ctx.results["academic"]["predicted_cgpa"])
        readiness_vals.append(twin["placement_readiness"])
        if twin["overall_score"] < 50 or twin["attendance_score"] < 65:
            at_risk += 1

        dept_name = s.department.name if s.department else "Unassigned"
        dept_stats.setdefault(dept_name, []).append(twin["overall_score"])

    department_health = [
        {"department": d, "avg_health_score": round(float(np.mean(v)), 1), "students": len(v)}
        for d, v in dept_stats.items()
    ]

    early_warnings = []
    for s in students:
        ctx = GRAPH.run(["attendance"], db, s)
        att = ctx.results["attendance"]
        if att["risk_level"] in ("critical", "high"):
            early_warnings.append({
                "student": s.user.full_name, "roll_number": s.roll_number,
                "issue": f"Attendance risk: {att['overall_percentage']}% ({att['risk_level']})",
                "department": s.department.name if s.department else None,
            })
    early_warnings = early_warnings[:25]

    scope_label = f"{user.department.name} Department" if user.role == RoleEnum.hod and user.department else "University"

    return UniversityDashboardOut(
        scope=scope_label,
        total_students=len(students), total_faculty=faculty_count,
        avg_attendance=round(float(np.mean(attendance_pcts)) if attendance_pcts else 0, 1),
        avg_cgpa=round(float(np.mean(cgpas)) if cgpas else 0, 2),
        at_risk_students=at_risk,
        placement_readiness_avg=round(float(np.mean(readiness_vals)) if readiness_vals else 0, 1),
        department_health=department_health, early_warnings=early_warnings,
    )


@router.post("/retrain-models")
def retrain_models(user: User = Depends(require_roles(RoleEnum.admin))):
    return retrain_all()
