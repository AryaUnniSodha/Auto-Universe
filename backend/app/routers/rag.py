from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.models.models import User
from app.rag.pipeline import answer_with_context

router = APIRouter(prefix="/api/rag", tags=["RAG Assistant"])


@router.get("/ask")
def ask(question: str, course: str | None = None, user: User = Depends(get_current_user)):
    return answer_with_context(question, course_filter=course)
