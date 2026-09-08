"""
UniVerse AI 2026 — Core Data Model
Covers: identity/roles, academic structure, attendance, marks, syllabus,
placement, student life, digital twin snapshots, and mentor plans.
"""
import enum
import datetime as dt
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class RoleEnum(str, enum.Enum):
    student = "student"
    faculty = "faculty"
    hod = "hod"
    placement = "placement"
    admin = "admin"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    department = relationship("Department", back_populates="users")
    student_profile = relationship("Student", back_populates="user", uselist=False)
    faculty_profile = relationship("Faculty", back_populates="user", uselist=False)


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)

    users = relationship("User", back_populates="department")
    courses = relationship("Course", back_populates="department")


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    roll_number = Column(String, unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    semester = Column(Integer, default=1)
    batch_year = Column(Integer, default=2026)
    cgpa = Column(Float, default=0.0)
    learning_style = Column(String, default="visual")  # visual/auditory/reading/kinesthetic
    placement_goal = Column(String, nullable=True)

    user = relationship("User", back_populates="student_profile")
    department = relationship("Department")
    enrollments = relationship("Enrollment", back_populates="student")
    attendance_records = relationship("AttendanceRecord", back_populates="student")
    marks = relationship("Mark", back_populates="student")
    activities = relationship("Activity", back_populates="student")
    certifications = relationship("Certification", back_populates="student")
    placement_profile = relationship("PlacementProfile", back_populates="student", uselist=False)
    twin_snapshots = relationship("DigitalTwinSnapshot", back_populates="student")
    mentor_plans = relationship("MentorPlan", back_populates="student")


class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    designation = Column(String, default="Assistant Professor")

    user = relationship("User", back_populates="faculty_profile")
    department = relationship("Department")
    courses = relationship("CourseFaculty", back_populates="faculty")


class Course(Base):
    """A subject offered in a given semester."""
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    semester = Column(Integer, nullable=False)
    credits = Column(Integer, default=3)
    total_classes_planned = Column(Integer, default=60)

    department = relationship("Department", back_populates="courses")
    faculty_links = relationship("CourseFaculty", back_populates="course")
    enrollments = relationship("Enrollment", back_populates="course")
    syllabus_topics = relationship("SyllabusTopic", back_populates="course")
    attendance_records = relationship("AttendanceRecord", back_populates="course")
    marks = relationship("Mark", back_populates="course")
    cos = relationship("CourseOutcome", back_populates="course")


class CourseFaculty(Base):
    __tablename__ = "course_faculty"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    faculty_id = Column(Integer, ForeignKey("faculty.id"))

    course = relationship("Course", back_populates="faculty_links")
    faculty = relationship("Faculty", back_populates="courses")


class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class AttendanceRecord(Base):
    """One row per student per course per class session."""
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    date = Column(DateTime, nullable=False)
    present = Column(Boolean, nullable=False)

    student = relationship("Student", back_populates="attendance_records")
    course = relationship("Course", back_populates="attendance_records")


class MarkTypeEnum(str, enum.Enum):
    internal1 = "internal1"
    internal2 = "internal2"
    assignment = "assignment"
    quiz = "quiz"
    endsem = "endsem"
    lab = "lab"


class Mark(Base):
    __tablename__ = "marks"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    mark_type = Column(Enum(MarkTypeEnum), nullable=False)
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False)
    bloom_level = Column(String, default="Understand")  # Remember/Understand/Apply/Analyze/Evaluate/Create
    co_mapped = Column(String, nullable=True)  # e.g. "CO1,CO3"
    recorded_at = Column(DateTime, default=dt.datetime.utcnow)

    student = relationship("Student", back_populates="marks")
    course = relationship("Course", back_populates="marks")


class CourseOutcome(Base):
    """CO/PO attainment tracking."""
    __tablename__ = "course_outcomes"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    code = Column(String, nullable=False)  # CO1, CO2...
    description = Column(String, nullable=False)
    target_attainment = Column(Float, default=60.0)
    po_mapping = Column(String, nullable=True)  # "PO1:3,PO2:2"

    course = relationship("Course", back_populates="cos")


class SyllabusTopic(Base):
    __tablename__ = "syllabus_topics"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    unit = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    planned_hours = Column(Float, default=2.0)
    status = Column(String, default="pending")  # pending/in_progress/completed/revision
    completed_at = Column(DateTime, nullable=True)
    order_index = Column(Integer, default=0)

    course = relationship("Course", back_populates="syllabus_topics")


class ActivityTypeEnum(str, enum.Enum):
    club = "club"
    ieee = "ieee"
    iedc = "iedc"
    hackathon = "hackathon"
    nss = "nss"
    ncc = "ncc"
    sports = "sports"
    volunteering = "volunteering"
    leadership = "leadership"


class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    type = Column(Enum(ActivityTypeEnum), nullable=False)
    title = Column(String, nullable=False)
    role = Column(String, nullable=True)
    hours = Column(Float, default=0.0)
    date = Column(DateTime, default=dt.datetime.utcnow)
    impact_score = Column(Float, default=0.0)  # 0-10, AI-estimated

    student = relationship("Student", back_populates="activities")


class Certification(Base):
    __tablename__ = "certifications"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    title = Column(String, nullable=False)
    issuer = Column(String, nullable=True)
    skill_tags = Column(String, nullable=True)  # comma separated
    date_earned = Column(DateTime, default=dt.datetime.utcnow)

    student = relationship("Student", back_populates="certifications")


class PlacementStatusEnum(str, enum.Enum):
    not_placed = "not_placed"
    placed = "placed"
    opted_out = "opted_out"


class PlacementProfile(Base):
    __tablename__ = "placement_profiles"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True)
    resume_text = Column(Text, nullable=True)
    aptitude_score = Column(Float, default=0.0)
    coding_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    readiness_score = Column(Float, default=0.0)
    predicted_salary_band = Column(String, nullable=True)
    target_companies = Column(String, nullable=True)  # comma separated
    placement_status = Column(Enum(PlacementStatusEnum), default=PlacementStatusEnum.not_placed)
    placed_company = Column(String, nullable=True)
    placed_package_lpa = Column(Float, nullable=True)
    placed_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="placement_profile")
    practice_attempts = relationship("PracticeAttempt", back_populates="profile")


class PracticeTypeEnum(str, enum.Enum):
    aptitude = "aptitude"
    coding = "coding"
    interview = "interview"


class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"
    id = Column(Integer, primary_key=True)
    profile_id = Column(Integer, ForeignKey("placement_profiles.id"))
    type = Column(Enum(PracticeTypeEnum), nullable=False)
    topic = Column(String, nullable=True)
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=100.0)
    taken_at = Column(DateTime, default=dt.datetime.utcnow)

    profile = relationship("PlacementProfile", back_populates="practice_attempts")


class DigitalTwinSnapshot(Base):
    """A periodic AI-generated snapshot of the student's holistic profile."""
    __tablename__ = "digital_twin_snapshots"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    generated_at = Column(DateTime, default=dt.datetime.utcnow)
    academic_score = Column(Float)
    attendance_score = Column(Float)
    skill_score = Column(Float)
    extracurricular_score = Column(Float)
    placement_readiness = Column(Float)
    overall_score = Column(Float)
    skill_graph = Column(JSON, nullable=True)  # nodes/edges for skill relationships
    narrative = Column(Text, nullable=True)  # explainable AI summary

    student = relationship("Student", back_populates="twin_snapshots")


class MentorPlan(Base):
    __tablename__ = "mentor_plans"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    plan_type = Column(String, default="daily")  # daily/weekly/exam_prep
    generated_at = Column(DateTime, default=dt.datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    tasks = Column(JSON, nullable=False)  # list of {title, why, subject, priority, minutes}
    rationale = Column(Text, nullable=True)

    student = relationship("Student", back_populates="mentor_plans")


class EventTypeEnum(str, enum.Enum):
    drive = "drive"
    webinar = "webinar"
    workshop = "workshop"
    deadline = "deadline"


class JobEvent(Base):
    """Placement Cell-created upcoming job drives, webinars, and deadlines."""
    __tablename__ = "job_events"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    event_type = Column(Enum(EventTypeEnum), default=EventTypeEnum.drive)
    event_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    min_cgpa = Column(Float, default=0.0)
    department_scope = Column(String, default="ALL")  # comma-separated dept codes, or "ALL"
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class AssessmentTypeEnum(str, enum.Enum):
    aptitude = "aptitude"
    coding = "coding"


class AssessmentTest(Base):
    """An aptitude/coding test authored and assigned by the Placement Officer."""
    __tablename__ = "assessment_tests"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    type = Column(Enum(AssessmentTypeEnum), nullable=False)
    description = Column(Text, nullable=True)
    department_scope = Column(String, default="ALL")  # comma-separated dept codes, or "ALL"
    semester_scope = Column(Integer, nullable=True)  # null = all semesters
    duration_minutes = Column(Integer, default=30)
    due_date = Column(DateTime, nullable=True)
    questions = Column(JSON, nullable=False, default=list)  # [{question, options:[...], correct_index}]
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    submissions = relationship("AssessmentSubmission", back_populates="test")


class AssessmentSubmission(Base):
    __tablename__ = "assessment_submissions"
    id = Column(Integer, primary_key=True)
    test_id = Column(Integer, ForeignKey("assessment_tests.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    answers = Column(JSON, nullable=True)  # list of selected option indices
    submitted_at = Column(DateTime, default=dt.datetime.utcnow)

    test = relationship("AssessmentTest", back_populates="submissions")
    student = relationship("Student")
