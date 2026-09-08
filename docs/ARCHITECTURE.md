# Architecture

## 1. Design goals, in priority order

1. **Runs on a CPU-only Windows 11 laptop, no Docker, no GPU.** This shaped almost every
   dependency choice below — heavier defaults (LangGraph runtime, sentence-transformer embeddings,
   Chroma's downloaded ONNX encoder) were deliberately replaced with lighter equivalents that
   preserve the same architectural *pattern* without the resource cost.
2. **Explainable, not just accurate.** Every prediction (CGPA, attendance forecast, interview
   probability) ships with a plain-language "why" derived from the model itself (feature
   importances / coefficients), not a canned string.
3. **Faculty enters data once.** Attendance, marks and syllabus updates are the *only* manual
   inputs; everything downstream (student insights, digital twin, mentor plan, university
   dashboard) is derived automatically by the agent graph.
4. **Local-first / privacy-first.** No student data or resume text leaves the device — RAG,
   resume analysis, and all ML inference run entirely in-process against the local SQLite DB.

## 2. Agent orchestration

`app/agents/base.py` implements a small dependency-aware DAG executor:

```
Agent.depends_on: list[str]     # which other agents' outputs this agent needs
Agent.run(ctx) -> dict           # writes its result into ctx.results[self.name]

AgentGraph.run(targets, db, student)
  -> topologically sorts the requested targets + their transitive dependencies
  -> executes each agent once, threading a shared AgentContext
```

Concrete agents (`app/agents/agents.py`) and their dependency chain:

```
AttendanceAgent  ──┐
                    ├──> AcademicAgent ──> PlacementAgent ──> DigitalTwinAgent
                    │                                    └──> MentorAgent
                    └─────────────────────────────────────────┘
```

- **AttendanceAgent** — subject-wise %, eligibility (75% rule), classes-needed-to-recover,
  6-week forecast (via the trained Ridge slope model), a "miss next N classes" simulation, and
  rule-based + model-informed recommendations.
- **AcademicAgent** — per-subject trend detection (first-half vs. second-half performance),
  CGPA prediction (RandomForestRegressor), a 5-axis radar (attendance / internals / consistency /
  mastery / engagement), and a prioritized study plan targeting the weakest subjects.
- **PlacementAgent** — combines coding/aptitude/communication practice scores with predicted CGPA
  and attendance into a readiness score, an interview-probability classifier, a salary-band
  classifier, and company-tier fit.
- **DigitalTwinAgent** — the composite holistic model: academic + attendance + skill +
  extracurricular scores rolled into one overall figure, a skill-relationship graph (subjects
  and skills as nodes, an outcome node for "Placement Readiness"), and an AI-generated narrative.
- **MentorAgent** — turns the outputs of the other four agents into a short, prioritized daily
  task list with a rationale referencing the actual numbers behind each recommendation.

**Why not LangGraph by default?** LangGraph's graph/state model is the right abstraction, but its
runtime (plus typical LLM-call nodes) adds latency and dependency weight that isn't needed here —
these agents are fast, deterministic, ML/rule-based functions, not LLM chains. The custom
`AgentGraph` preserves the *same mental model* (nodes, edges = dependencies, shared state) so
swapping in LangGraph later (e.g. to add an LLM-authored explanation node) is additive, not a
rewrite — see `README.md §4`.

## 3. ML pipeline & explainability

`app/ml/train.py` trains four scikit-learn models against a statistically-grounded synthetic
cohort (documented assumptions inline, e.g. `next_cgpa` is a weighted function of prior CGPA,
internal marks, attendance and study hours plus noise) so the platform is useful immediately on
a fresh install, before any real semester of data exists:

| Model | Algorithm | Predicts | Explainability |
|---|---|---|---|
| `cgpa_model` | RandomForestRegressor | Next-semester CGPA | Feature importances → top-3 drivers in plain English |
| `attendance_model` | Ridge regression | Weekly attendance % slope | Used to project the 6-week forecast |
| `placement_model` | LogisticRegression | Interview success probability | Coefficients → top-3 positive/negative drivers |
| `salary_band_model` | RandomForestClassifier | Salary band (5 tiers) | — |

`app/ml/predict.py` is the inference + explainability layer: it loads the cached `.joblib`
artifacts, runs prediction, and converts raw feature-importance/coefficient values into
human-readable sentences (`_readable()` maps internal feature names to plain language).

**Retraining on real data:** once live attendance/marks/placement-outcome data accumulates,
replace `_synthetic_cohort()` in `train.py` with a query against the real tables (the feature
set is unchanged), then call `POST /api/admin/retrain-models` — no other code changes needed.

## 4. RAG (Retrieval-Augmented Generation)

`app/rag/pipeline.py` implements a fully offline retrieval pipeline: **TF-IDF vectorization +
FAISS flat inner-product index**, instead of a transformer-based embedding model. This was a
deliberate trade-off for this deployment target:

- No model download (sentence-transformers' default encoder is 300–400MB+ and needs internet
  on first run — unacceptable for a "just works offline" laptop pilot).
- Sub-millisecond indexing/query time on CPU, even for hundreds of documents.
- The `RAGStore` interface (`build()`, `query()`) is intentionally embedding-agnostic — swapping
  in a local sentence-transformer later means changing `_load()`/`build()` internals only.

Faculty notes/syllabus text uploaded via `POST /api/faculty/notes/upload` are chunked
(`chunk_text()`, ~400 words/chunk) and indexed; `GET /api/rag/ask` performs extractive retrieval
and returns the most relevant chunks plus their source titles — students see exactly which
uploaded material backs each answer.

## 5. Data model

`app/models/models.py` is the single source of truth. Key relationships:

- `User` (1) — (0..1) `Student` / `Faculty` profile, discriminated by `role`.
- `Course` belongs to a `Department`, has many `SyllabusTopic`, `CourseOutcome`, `Enrollment`,
  `AttendanceRecord`, `Mark`.
- `Student` has many `AttendanceRecord`, `Mark`, `Activity`, `Certification`, one
  `PlacementProfile` (which has many `PracticeAttempt`), many `DigitalTwinSnapshot` and
  `MentorPlan` (both currently computed on-demand by the agent graph rather than persisted on
  every request — snapshots can be periodically materialized via a scheduled job if historical
  trend storage is desired).

## 6. API surface

All endpoints are namespaced by portal and protected by JWT + role dependency
(`app/core/deps.require_roles`):

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/student/{attendance, academic, digital-twin, mentor-plan, syllabus/{course_id}, enrollments, profile}`
- `GET /api/placement/readiness`, `POST /api/placement/resume/analyze`, `POST /api/placement/practice/attempt`, `GET /api/placement/practice/history`
- `POST /api/faculty/attendance/mark`, `POST /api/faculty/marks/bulk`, `GET /api/faculty/co-attainment/{course_id}`, `PUT /api/faculty/syllabus/topic/{id}/status`, `POST /api/faculty/notes/upload`, `GET /api/faculty/question-paper/blueprint/{course_id}`, `GET /api/faculty/courses`, `GET /api/faculty/course/{id}/students`
- `GET /api/admin/dashboard`, `POST /api/admin/retrain-models`
- `GET /api/rag/ask`

Full interactive docs (request/response schemas) are generated automatically by FastAPI at
`/docs` when the backend is running.

## 7. Frontend design system

The UI intentionally avoids generic "AI dashboard" defaults (cream+terracotta, black+neon-green).
Tokens (`frontend/tailwind.config.js`):

- **Color** — an ink-indigo base (`primary-700 #1D2A6B`) for authority/trust, a signal-teal
  accent (`#0EA5A4`) for positive/AI-insight moments, amber for moderate risk, rose for critical
  risk, violet for "AI mentor" touches.
- **Type** — Space Grotesk (display, geometric/technical personality) + Inter (body) +
  JetBrains Mono (roll numbers, percentages, stat labels) — reinforcing "this is a data system,"
  not a generic SaaS template.
- **Signature element — the Score Ring** (`components/ScoreRing.tsx`): a composite score is never
  shown as a single flat number; it's rendered as concentric animated arcs (academic / attendance
  / skill / extracurricular) converging into one overall figure. The same component appears on
  the student overview, the full Digital Twin page, and is echoed by the department-health bars
  on the university dashboard — one visual language at every zoom level of the system.
