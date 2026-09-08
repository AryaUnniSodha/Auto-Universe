from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import datetime as dt


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


# ---------- Attendance ----------
class AttendanceMarkRequest(BaseModel):
    course_id: int
    date: dt.date
    present_student_ids: List[int]
    absent_student_ids: List[int]


class SubjectAttendance(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    attended: int
    total: int
    percentage: float
    eligible: bool
    classes_to_eligibility: int
    risk_level: str


class AttendanceForecastPoint(BaseModel):
    week: int
    projected_percentage: float


class AttendanceAnalyticsOut(BaseModel):
    overall_percentage: float
    overall_eligible: bool
    subjects: List[SubjectAttendance]
    forecast: List[AttendanceForecastPoint]
    what_if_miss_next_n: Dict[str, Any]
    recommendations: List[str]
    risk_level: str


# ---------- Academic Analytics ----------
class SubjectPerformance(BaseModel):
    course_id: int
    course_name: str
    average_percentage: float
    trend: str  # improving/declining/stable
    mastery_level: str


class AcademicAnalyticsOut(BaseModel):
    current_cgpa: float
    predicted_cgpa: float
    confidence: float
    semester_trend: List[Dict[str, Any]]
    weak_subjects: List[SubjectPerformance]
    strong_subjects: List[SubjectPerformance]
    radar: Dict[str, float]
    explanations: List[str]
    study_plan: List[Dict[str, Any]]


# ---------- Digital Twin ----------
class DigitalTwinOut(BaseModel):
    generated_at: dt.datetime
    academic_score: float
    attendance_score: float
    skill_score: float
    extracurricular_score: float
    placement_readiness: float
    overall_score: float
    skill_graph: Dict[str, Any]
    narrative: str


# ---------- Placement ----------
class PracticeAttemptIn(BaseModel):
    type: str
    topic: Optional[str] = None
    score: float
    max_score: float = 100.0


class ResumeAnalysisIn(BaseModel):
    resume_text: str
    target_role: Optional[str] = None


class ResumeAnalysisOut(BaseModel):
    detected_skills: List[str]
    missing_skills: List[str]
    ats_score: float
    suggestions: List[str]


class PlacementReadinessOut(BaseModel):
    readiness_score: float
    aptitude_score: float
    coding_score: float
    communication_score: float
    academic_score: float
    predicted_salary_band: str
    interview_probability: float
    skill_gaps: List[str]
    recommended_path: List[str]
    company_fit: List[Dict[str, Any]]


# ---------- Syllabus ----------
class SyllabusTopicOut(BaseModel):
    id: int
    unit: str
    topic: str
    status: str
    planned_hours: float

    class Config:
        from_attributes = True


class SyllabusStatusOut(BaseModel):
    course_id: int
    course_name: str
    total_topics: int
    completed: int
    pending: int
    percent_complete: float
    estimated_completion_date: Optional[str]
    at_risk: bool
    alerts: List[str]
    topics: List[SyllabusTopicOut]


# ---------- Faculty ----------
class MarkEntry(BaseModel):
    student_id: int
    marks_obtained: float


class BulkMarksIn(BaseModel):
    course_id: int
    mark_type: str
    max_marks: float
    bloom_level: str = "Understand"
    co_mapped: Optional[str] = None
    entries: List[MarkEntry]


class COAttainmentOut(BaseModel):
    co_code: str
    description: str
    target_attainment: float
    actual_attainment: float
    attained: bool


# ---------- Mentor ----------
class MentorPlanOut(BaseModel):
    plan_type: str
    generated_at: dt.datetime
    tasks: List[Dict[str, Any]]
    rationale: str


# ---------- Placement Cell: Tests ----------
class QuestionIn(BaseModel):
    question: str
    options: List[str]
    correct_index: int


class TestCreateIn(BaseModel):
    title: str
    type: str  # aptitude/coding
    description: Optional[str] = None
    department_scope: str = "ALL"  # comma-separated dept codes, or "ALL"
    semester_scope: Optional[int] = None
    duration_minutes: int = 30
    due_date: Optional[dt.datetime] = None
    questions: List[QuestionIn] = []


class TestStatsOut(BaseModel):
    id: int
    title: str
    type: str
    description: Optional[str] = None
    department_scope: str
    semester_scope: Optional[int] = None
    duration_minutes: int
    due_date: Optional[dt.datetime] = None
    question_count: int
    created_at: dt.datetime
    eligible_count: int
    completed_count: int
    avg_score: Optional[float] = None


class TestForStudentOut(BaseModel):
    id: int
    title: str
    type: str
    description: Optional[str] = None
    duration_minutes: int
    due_date: Optional[dt.datetime] = None
    question_count: int
    status: str  # pending/completed
    score: Optional[float] = None
    max_score: Optional[float] = None


class TestDetailOut(BaseModel):
    id: int
    title: str
    type: str
    description: Optional[str] = None
    duration_minutes: int
    questions: List[Dict[str, Any]]  # options only — correct_index withheld from students


class SubmitAnswersIn(BaseModel):
    answers: List[int]


class SubmitResultOut(BaseModel):
    score: float
    max_score: float
    percentage: float


# ---------- Placement Cell: Events ----------
class EventIn(BaseModel):
    title: str
    company_name: Optional[str] = None
    event_type: str = "drive"
    event_date: dt.datetime
    description: Optional[str] = None
    min_cgpa: float = 0.0
    department_scope: str = "ALL"


class EventOut(BaseModel):
    id: int
    title: str
    company_name: Optional[str] = None
    event_type: str
    event_date: dt.datetime
    description: Optional[str] = None
    min_cgpa: float
    department_scope: str


# ---------- Placement Cell: Roster & status ----------
class PlacementStatusIn(BaseModel):
    status: str  # placed/not_placed/opted_out
    company: Optional[str] = None
    package_lpa: Optional[float] = None


class StudentRosterOut(BaseModel):
    student_id: int
    roll_number: str
    full_name: str
    department: Optional[str] = None
    semester: int
    cgpa: float
    placement_status: str
    placed_company: Optional[str] = None
    placed_package_lpa: Optional[float] = None
    aptitude_score: float
    coding_score: float
    readiness_score: float


class PlacementDashboardOut(BaseModel):
    total_students: int
    placed_count: int
    placement_rate: float
    aptitude_completion_rate: float
    coding_completion_rate: float
    avg_readiness: float
    upcoming_events_count: int
    tests: List[TestStatsOut]
    recent_placements: List[Dict[str, Any]]


# ---------- University Dashboard ----------
class UniversityDashboardOut(BaseModel):
    scope: str = "University"
    total_students: int
    total_faculty: int
    avg_attendance: float
    avg_cgpa: float
    at_risk_students: int
    placement_readiness_avg: float
    department_health: List[Dict[str, Any]]
    early_warnings: List[Dict[str, Any]]
