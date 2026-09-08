from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.ml.train import ensure_models_trained
from app.routers import auth, student, placement, faculty, admin, rag

app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous University Operating System — AI agents for attendance, "
                "academics, placement, syllabus and institutional intelligence.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_models_trained()


app.include_router(auth.router)
app.include_router(student.router)
app.include_router(placement.router)
app.include_router(faculty.router)
app.include_router(admin.router)
app.include_router(rag.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
