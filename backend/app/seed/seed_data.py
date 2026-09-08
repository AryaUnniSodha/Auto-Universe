"""
Seeds a realistic demo university so every module in UniVerse AI 2026 has data
to show on first run: 1 admin, 1 placement officer, department HODs, faculty,
~60 students, courses with syllabus/COs, attendance history, marks, activities,
certifications, and placement profiles. Also builds the initial RAG index.

Run: python -m app.seed.seed_data
"""
import random
import datetime as dt
from faker import Faker
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models import models as m
from app.ml.train import ensure_models_trained
from app.rag.pipeline import get_store, chunk_text

fake = Faker()
random.seed(7)

DEPARTMENTS = [("Computer Science & Engineering", "CSE"), ("Electronics & Communication", "ECE"),
               ("Information Technology", "IT"), ("Mechanical Engineering", "MECH")]

COURSES_BY_DEPT = {
    "CSE": [("CS301", "Data Structures & Algorithms"), ("CS302", "Database Management Systems"),
            ("CS303", "Operating Systems"), ("CS304", "Computer Networks")],
    "ECE": [("EC301", "Digital Signal Processing"), ("EC302", "VLSI Design")],
    "IT": [("IT301", "Web Technologies"), ("IT302", "Cloud Computing")],
    "MECH": [("ME301", "Thermodynamics"), ("ME302", "Machine Design")],
}

SYLLABUS_TOPICS = [
    "Introduction & Fundamentals", "Core Theory I", "Core Theory II", "Problem Solving Techniques",
    "Case Studies", "Advanced Concepts", "Design Principles", "Applications & Tools",
    "Industry Practices", "Revision & Assessment Prep",
]

SKILLS = ["Python", "Java", "SQL", "React", "AWS", "Machine Learning", "Data Structures",
          "System Design", "Communication", "Leadership"]

PLACEMENT_COMPANIES = ["TCS", "Infosys", "Wipro", "Amazon", "Microsoft", "Accenture",
                       "Cognizant", "Google", "Deloitte", "Zoho"]

ACTIVITY_TITLES = {
    m.ActivityTypeEnum.club: ["Coding Club Member", "Robotics Club Lead"],
    m.ActivityTypeEnum.ieee: ["IEEE Student Chapter Volunteer"],
    m.ActivityTypeEnum.iedc: ["IEDC Innovation Fellow"],
    m.ActivityTypeEnum.hackathon: ["Smart India Hackathon", "Inter-College Hack Sprint"],
    m.ActivityTypeEnum.nss: ["NSS Community Drive"],
    m.ActivityTypeEnum.ncc: ["NCC Cadet"],
    m.ActivityTypeEnum.sports: ["University Football Team"],
    m.ActivityTypeEnum.volunteering: ["Blood Donation Camp Organizer"],
    m.ActivityTypeEnum.leadership: ["Class Representative", "Fest Coordinator"],
}


def _syllabus_status_distribution(n):
    """Returns a plausible status list: most early topics done, later ones pending."""
    cutoff = int(n * random.uniform(0.4, 0.75))
    return (["completed"] * cutoff) + (["in_progress"] * min(1, n - cutoff)) + \
           (["pending"] * max(0, n - cutoff - 1))


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # --- Departments ---
    dept_objs = {}
    for name, code in DEPARTMENTS:
        d = m.Department(name=name, code=code)
        db.add(d)
        db.flush()
        dept_objs[code] = d
    db.commit()

    # --- Admin & Placement officer ---
    admin_user = m.User(email="admin@university.edu", hashed_password=hash_password("admin123"),
                         full_name="Dr. Ananya Rao", role=m.RoleEnum.admin)
    placement_user = m.User(email="placement@university.edu", hashed_password=hash_password("placement123"),
                             full_name="Mr. Karthik Menon", role=m.RoleEnum.placement)
    db.add_all([admin_user, placement_user])
    db.commit()

    # --- HODs + Faculty + Courses per department ---
    all_courses = []
    faculty_objs = []
    for code, dept in dept_objs.items():
        hod_user = m.User(email=f"hod.{code.lower()}@university.edu", hashed_password=hash_password("hod123"),
                           full_name=f"Prof. {fake.last_name()}", role=m.RoleEnum.hod, department_id=dept.id)
        db.add(hod_user)
        db.commit()

        for i in range(3):
            fu = m.User(email=f"faculty{i}.{code.lower()}@university.edu", hashed_password=hash_password("faculty123"),
                        full_name=f"Dr. {fake.first_name()} {fake.last_name()}", role=m.RoleEnum.faculty,
                        department_id=dept.id)
            db.add(fu)
            db.commit()
            fac = m.Faculty(user_id=fu.id, department_id=dept.id, designation=random.choice(
                ["Assistant Professor", "Associate Professor", "Professor"]))
            db.add(fac)
            db.commit()
            faculty_objs.append(fac)

        for ccode, cname in COURSES_BY_DEPT[code]:
            course = m.Course(code=ccode, name=cname, department_id=dept.id, semester=random.choice([5, 6]),
                              credits=4, total_classes_planned=60)
            db.add(course)
            db.commit()
            all_courses.append(course)

            fac = random.choice([f for f in faculty_objs if f.department_id == dept.id])
            db.add(m.CourseFaculty(course_id=course.id, faculty_id=fac.id))

            for j, topic in enumerate(SYLLABUS_TOPICS):
                db.add(m.SyllabusTopic(course_id=course.id, unit=f"Unit {j // 2 + 1}", topic=topic,
                                       planned_hours=4, order_index=j))
            statuses = _syllabus_status_distribution(len(SYLLABUS_TOPICS))
            db.commit()
            topics = db.query(m.SyllabusTopic).filter(m.SyllabusTopic.course_id == course.id).order_by(
                m.SyllabusTopic.order_index).all()
            for t, st in zip(topics, statuses):
                t.status = st
                if st == "completed":
                    t.completed_at = dt.datetime.utcnow() - dt.timedelta(days=random.randint(1, 60))

            for k in range(1, 4):
                db.add(m.CourseOutcome(course_id=course.id, code=f"CO{k}",
                                       description=f"Apply concepts from Unit {k} to solve real-world problems",
                                       target_attainment=60.0, po_mapping=f"PO1:3,PO2:{k}"))
            db.commit()

            # index course notes into RAG
            store_docs_text = (
                f"{cname} covers {', '.join(SYLLABUS_TOPICS)}. Key focus areas include theoretical "
                f"foundations, practical applications, and industry-relevant case studies for {cname}. "
                f"Assessment includes internal exams, assignments and an end-semester examination."
            )
            _pending_rag_docs.append({"course": ccode, "title": f"{cname} - Syllabus Overview",
                                       "text": store_docs_text})

    # --- Students ---
    students = []
    dept_codes = list(dept_objs.keys())
    for i in range(60):
        dept_code = dept_codes[i % len(dept_codes)]
        dept = dept_objs[dept_code]
        first, last = fake.first_name(), fake.last_name()
        su = m.User(email=f"student{i+1}@university.edu", hashed_password=hash_password("student123"),
                    full_name=f"{first} {last}", role=m.RoleEnum.student, department_id=dept.id)
        db.add(su)
        db.commit()

        semester = random.choice([5, 6])
        student = m.Student(user_id=su.id, roll_number=f"{dept_code}{2023}{i+1:03d}", department_id=dept.id,
                            semester=semester, batch_year=2023,
                            cgpa=round(random.uniform(5.5, 9.4), 2),
                            learning_style=random.choice(["visual", "auditory", "reading", "kinesthetic"]),
                            placement_goal=random.choice(["Product-based company", "Higher studies (MS)",
                                                          "Core engineering role", "Startup / Entrepreneurship"]))
        db.add(student)
        db.commit()
        students.append(student)

        dept_course_list = [c for c in all_courses if c.department_id == dept.id and c.semester == semester]
        if not dept_course_list:
            dept_course_list = [c for c in all_courses if c.department_id == dept.id]

        student_profile_pattern = random.choice(["strong", "average", "struggling"])
        for course in dept_course_list:
            db.add(m.Enrollment(student_id=student.id, course_id=course.id))

            # --- attendance history: ~40 sessions across the term ---
            base_rate = {"strong": 0.92, "average": 0.78, "struggling": 0.58}[student_profile_pattern]
            n_sessions = random.randint(28, 40)
            for d in range(n_sessions):
                present = random.random() < base_rate
                db.add(m.AttendanceRecord(
                    student_id=student.id, course_id=course.id,
                    date=dt.datetime.utcnow() - dt.timedelta(days=(n_sessions - d) * 2),
                    present=present,
                ))

            # --- marks: internal1, internal2, assignment, quiz ---
            base_marks = {"strong": 82, "average": 65, "struggling": 45}[student_profile_pattern]
            for mtype, maxm in [("internal1", 25), ("internal2", 25), ("assignment", 20), ("quiz", 10)]:
                score = max(0, min(maxm, round(maxm * (base_marks + random.uniform(-12, 12)) / 100, 1)))
                db.add(m.Mark(student_id=student.id, course_id=course.id, mark_type=m.MarkTypeEnum(mtype),
                              marks_obtained=score, max_marks=maxm,
                              bloom_level=random.choice(["Remember", "Understand", "Apply", "Analyze"]),
                              co_mapped=f"CO{random.randint(1,3)}",
                              recorded_at=dt.datetime.utcnow() - dt.timedelta(days=random.randint(1, 90))))
        db.commit()

        # --- activities ---
        for _ in range(random.randint(0, 4)):
            atype = random.choice(list(m.ActivityTypeEnum))
            db.add(m.Activity(student_id=student.id, type=atype, title=random.choice(ACTIVITY_TITLES[atype]),
                              hours=random.uniform(5, 40), impact_score=round(random.uniform(3, 9.5), 1)))

        # --- certifications ---
        for _ in range(random.randint(0, 3)):
            db.add(m.Certification(student_id=student.id, title=f"{random.choice(SKILLS)} Certification",
                                   issuer=random.choice(["Coursera", "NPTEL", "AWS", "Google", "IBM"]),
                                   skill_tags=random.choice(SKILLS)))

        # --- placement profile ---
        prof_mult = {"strong": 1.15, "average": 1.0, "struggling": 0.7}[student_profile_pattern]
        is_placed = student_profile_pattern == "strong" and random.random() < 0.55
        pp = m.PlacementProfile(
            student_id=student.id,
            aptitude_score=round(min(100, max(20, random.uniform(40, 90) * prof_mult)), 1),
            coding_score=round(min(100, max(20, random.uniform(35, 88) * prof_mult)), 1),
            communication_score=round(min(100, max(20, random.uniform(45, 85) * prof_mult)), 1),
            target_companies=random.choice(["TCS,Infosys,Wipro", "Google,Amazon,Microsoft", "Startups,Product firms"]),
            placement_status=m.PlacementStatusEnum.placed if is_placed else m.PlacementStatusEnum.not_placed,
            placed_company=random.choice(PLACEMENT_COMPANIES) if is_placed else None,
            placed_package_lpa=round(random.uniform(6, 32), 1) if is_placed else None,
            placed_at=dt.datetime.utcnow() - dt.timedelta(days=random.randint(1, 45)) if is_placed else None,
        )
        db.add(pp)
        db.commit()

        for _ in range(random.randint(2, 6)):
            ptype = random.choice(list(m.PracticeTypeEnum))
            db.add(m.PracticeAttempt(profile_id=pp.id, type=ptype, topic=random.choice(SKILLS),
                                     score=round(random.uniform(40, 95), 1), max_score=100))
        db.commit()

    # --- Placement Cell: sample tests, events, and submissions ---
    aptitude_test = m.AssessmentTest(
        title="Quantitative Aptitude — Round 1", type=m.AssessmentTypeEnum.aptitude,
        description="Numerical ability and logical reasoning screening test.",
        department_scope="ALL", semester_scope=None, duration_minutes=30,
        due_date=dt.datetime.utcnow() + dt.timedelta(days=10),
        questions=[
            {"question": "A train covers 360 km in 4 hours. What is its speed in km/h?",
             "options": ["80", "90", "72", "100"], "correct_index": 1},
            {"question": "If the ratio of two numbers is 3:5 and their sum is 64, find the larger number.",
             "options": ["24", "36", "40", "30"], "correct_index": 2},
            {"question": "What is the next number in the series: 2, 6, 12, 20, 30, ?",
             "options": ["40", "42", "36", "44"], "correct_index": 1},
            {"question": "A shopkeeper marks up an item by 25% and gives a 10% discount. Net profit is:",
             "options": ["12.5%", "15%", "10%", "20%"], "correct_index": 0},
        ],
        created_by=placement_user.id,
    )
    coding_test = m.AssessmentTest(
        title="Coding Fundamentals — Screening", type=m.AssessmentTypeEnum.coding,
        description="Core programming and data-structure concepts.",
        department_scope="CSE,IT", semester_scope=None, duration_minutes=45,
        due_date=dt.datetime.utcnow() + dt.timedelta(days=14),
        questions=[
            {"question": "What is the time complexity of binary search on a sorted array?",
             "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"], "correct_index": 1},
            {"question": "Which data structure uses LIFO order?", "options": ["Queue", "Stack", "Heap", "Graph"],
             "correct_index": 1},
            {"question": "What does SQL's GROUP BY clause do?",
             "options": ["Sorts rows", "Filters rows", "Aggregates rows by column values", "Joins tables"],
             "correct_index": 2},
        ],
        created_by=placement_user.id,
    )
    db.add_all([aptitude_test, coding_test])
    db.commit()

    for s in students:
        dept_code = s.department.code if s.department else None
        for test in (aptitude_test, coding_test):
            in_scope = test.department_scope == "ALL" or (dept_code and dept_code in test.department_scope.split(","))
            if in_scope and random.random() < 0.6:
                n_q = len(test.questions)
                correct_guess_rate = random.uniform(0.35, 0.85)
                answers = [q["correct_index"] if random.random() < correct_guess_rate else random.randint(0, len(q["options"]) - 1)
                           for q in test.questions]
                score = sum(1 for a, q in zip(answers, test.questions) if a == q["correct_index"])
                db.add(m.AssessmentSubmission(test_id=test.id, student_id=s.id, score=float(score),
                                              max_score=float(n_q), answers=answers))
    db.commit()

    now = dt.datetime.utcnow()
    db.add_all([
        m.JobEvent(title="Campus Placement Drive", company_name="TCS", event_type=m.EventTypeEnum.drive,
                   event_date=now + dt.timedelta(days=12), description="On-campus drive for final-year students.",
                   min_cgpa=6.0, department_scope="ALL", created_by=placement_user.id),
        m.JobEvent(title="Tech Talk: System Design Basics", company_name="Amazon", event_type=m.EventTypeEnum.webinar,
                   event_date=now + dt.timedelta(days=5), description="Pre-placement webinar on system design.",
                   min_cgpa=0.0, department_scope="CSE,IT", created_by=placement_user.id),
        m.JobEvent(title="Resume Submission Deadline", company_name="Infosys", event_type=m.EventTypeEnum.deadline,
                   event_date=now + dt.timedelta(days=3), description="Last date to submit resumes for shortlisting.",
                   min_cgpa=6.5, department_scope="ALL", created_by=placement_user.id),
        m.JobEvent(title="Core Engineering Walk-in", company_name="L&T", event_type=m.EventTypeEnum.drive,
                   event_date=now + dt.timedelta(days=20), description="Walk-in interview for core roles.",
                   min_cgpa=6.0, department_scope="MECH,ECE", created_by=placement_user.id),
    ])
    db.commit()

    # --- build RAG index ---
    store = get_store()
    chunked_docs = []
    for i, doc in enumerate(_pending_rag_docs):
        for j, chunk in enumerate(chunk_text(doc["text"], chunk_size=120)):
            chunked_docs.append({"id": f"seed-{i}-{j}", "title": doc["title"], "course": doc["course"], "text": chunk})
    if chunked_docs:
        store.build(chunked_docs)

    print(f"Seeded {len(students)} students, {len(all_courses)} courses, "
          f"{len(faculty_objs)} faculty across {len(dept_objs)} departments.")
    print("Demo logins: admin@university.edu / admin123 | placement@university.edu / placement123")
    print("Student logins: student1@university.edu ... student60@university.edu / student123 (password same for all)")
    print("Faculty logins: faculty0.cse@university.edu / faculty123 (see pattern facultyN.<deptcode>)")
    db.close()


_pending_rag_docs: list[dict] = []


if __name__ == "__main__":
    ensure_models_trained()
    seed()
