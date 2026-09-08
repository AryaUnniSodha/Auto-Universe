# UniVerse AI 2026
### Autonomous University Operating System

UniVerse AI 2026 is a full-stack, AI-native platform that goes beyond a traditional ERP/LMS.
Faculty upload attendance, marks, assignments and syllabus **once** — after that, a set of
collaborating AI agents continuously analyze that data and turn it into real-time, explainable
insight for students, faculty, HODs, placement staff and administrators.

Built to run **entirely on a CPU-only Windows 11 laptop** — no Docker, no GPU, no cloud
dependency for its core intelligence.

---

## 1. What's inside

| Layer | Technology | Why |
|---|---|---|
| Backend API | FastAPI + SQLAlchemy + SQLite | Async-ready, typed, zero-config local database |
| Auth | JWT + role-based access control | 5 roles: student, faculty, HOD, placement, admin |
| ML | scikit-learn (RandomForest, LogisticRegression, Ridge) | CPU-fast, explainable, no GPU needed |
| Agent orchestration | Custom dependency-aware DAG executor | LangGraph's mental model, near-zero runtime overhead |
| RAG | TF-IDF + FAISS (offline) | No model downloads; answers grounded in faculty notes |
| Frontend | React 18 + TypeScript + Tailwind CSS + Recharts | Fast, typed, componentized, data-viz ready |

### Feature coverage

- **Student portal** — real-time attendance analytics (forecast, what-if simulation, eligibility,
  risk level), academic analytics (CGPA prediction, radar chart, weak/strong subjects, study plan),
  a Digital Twin (composite score + skill graph + AI narrative), placement readiness scoring,
  resume analysis, syllabus tracking, and a daily AI Mentor plan with a RAG-grounded Q&A assistant.
- **Faculty portal** — one-click attendance marking, bulk marks entry, CO/PO attainment tracking,
  Bloom's-taxonomy-mapped question paper blueprint generation, syllabus status updates, and
  notes/syllabus upload into the local RAG index.
- **HOD portal** — the same Digital Twin dashboard as Admin, but automatically scoped to their
  own department only (students, faculty count, health score, at-risk list all filtered).
- **Admin portal** — the full institution-wide Digital Twin dashboard across every department,
  plus the ability to retrain the ML models on demand.
- **Placement Officer portal** — a dedicated console to create and assign aptitude/coding tests
  (scoped by department/semester), post upcoming job drives/webinars/deadlines, track per-test
  completion and average scores, mark students as placed (company + package), and see
  institution-wide placement rate, completion rates, and recent placement outcomes. Students see
  their assigned tests and eligible events directly inside their own Placement Prep page and can
  take tests in-app (auto-scored, feeds back into their readiness score).

---

## 2. Quick start (Windows 11, CPU-only)

**Prerequisites:** [Python 3.11+](https://python.org) and [Node.js 18+](https://nodejs.org),
both added to PATH during installation.

```bat
scripts\setup_windows.bat
```

This creates a Python virtual environment, installs backend dependencies, trains the ML models,
seeds a realistic 60-student demo university, and installs frontend dependencies.

Then, in **two separate terminals**:

```bat
scripts\run_backend.bat      REM starts API on http://localhost:8000
scripts\run_frontend.bat     REM starts UI on  http://localhost:5173
```

Open **http://localhost:5173** and sign in with a demo account (shown on the login screen):

| Role | Email | Password |
|---|---|---|
| Student | `student1@university.edu` | `student123` |
| Faculty | `faculty0.cse@university.edu` | `faculty123` |
| HOD | `hod.cse@university.edu` | `hod123` |
| Admin | `admin@university.edu` | `admin123` |
| Placement | `placement@university.edu` | `placement123` |

Interactive API docs are auto-generated at **http://localhost:8000/docs**.

### Manual setup (if you prefer not to use the .bat scripts)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed.seed_data      # trains ML models + seeds demo data
uvicorn app.main:app --reload

# in a second terminal
cd frontend
npm install
npm run dev
```

### Re-seeding / resetting data

```bat
scripts\reseed_data.bat
```

### Running tests

```bat
scripts\run_tests.bat
```

---

## 3. Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full write-up: the agent graph,
the ML pipeline and its explainability layer, the RAG design, the data model, and the specific
engineering choices made to keep everything CPU-only and dependency-light.

```
universe-ai/
├── backend/
│   ├── app/
│   │   ├── agents/        # DAG-based agent orchestration (attendance → academic → placement → twin → mentor)
│   │   ├── core/           # config, database, security, auth deps
│   │   ├── ml/             # training pipeline + inference/explainability layer
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── rag/             # TF-IDF + FAISS retrieval pipeline
│   │   ├── routers/         # REST API endpoints, grouped by portal
│   │   ├── schemas/         # Pydantic request/response models
│   │   └── seed/            # synthetic demo-university generator
│   └── tests/                # pytest API test suite
├── frontend/
│   └── src/
│       ├── components/       # AppShell (nav), ScoreRing (signature visual), shared UI primitives
│       ├── context/           # auth state
│       ├── lib/                 # typed API client + data-fetching hook
│       └── pages/               # student / faculty / admin portals
├── docs/                       # architecture + research notes
└── scripts/                    # Windows setup/run/test/reseed .bat files
```

---

## 4. Extending toward a real pilot

This ships as a fully working, realistically-scoped implementation, not a mockup — every
number on every screen is computed from the seeded SQLite database through real ML models and
agent logic. To take it from demo to institutional pilot:

1. **Swap synthetic training data for real history.** `app/ml/train.py` documents exactly which
   features each model expects; point `retrain_all()` at a real historical export (attendance,
   marks, placement outcomes) once one semester of live data exists, and call
   `POST /api/admin/retrain-models`.
2. **Connect real SSO** (e.g. university Google Workspace / Azure AD) in place of the local
   email+password auth in `app/core/security.py`.
3. **Move to PostgreSQL** for multi-campus scale by changing `DATABASE_URL` — the SQLAlchemy
   models are already portable.
4. **Swap RAG's TF-IDF vectorizer for a local sentence-transformer** once GPU/larger-CPU headroom
   is available, without touching any calling code (`app/rag/pipeline.py` is a self-contained
   adapter).
5. **Add LangGraph** as a drop-in alternative orchestrator for more complex, branching agent
   workflows — the current `AgentGraph` in `app/agents/base.py` follows the same node/edge/shared-state
   model, so migrating is additive, not a rewrite.

## 5. Known scope boundaries (read before a pilot)

- Placement question banks and aptitude datasets are **not bundled** — per the brief, only
  legally-usable public datasets or your own uploaded content should be connected; the `PracticeAttempt`
  model is ready to receive scores from any question source you plug in.
- The ML models are bootstrapped on a synthetic cohort so the platform is useful from day one;
  treat early predictions as illustrative until retrained on real institutional data (see §4).
- Resume analysis is keyword/heuristic-based (fully offline, private) rather than an LLM call —
  by design, so no resume content ever leaves the device. It's straightforward to route this to
  an LLM API later if that trade-off is acceptable for your deployment.
