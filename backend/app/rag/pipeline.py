"""
UniVerse AI 2026 — Retrieval-Augmented Generation over university documents
(syllabus PDFs/notes, policy handbooks, course material).

Design choice: rather than sentence-transformers (large model download, slow on
CPU-only laptops), we use a TF-IDF vector space + FAISS flat index. This is fully
offline, trains in milliseconds, and is more than adequate for retrieval over a
few hundred/thousand short university documents. The interface is swappable —
swap `_vectorize` for a transformer encoder later without touching callers.
"""
import json
import re
import numpy as np
import faiss
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from app.core.config import settings

DOCS_META_PATH = settings.RAG_INDEX_DIR / "docs_meta.json"
INDEX_PATH = settings.RAG_INDEX_DIR / "faiss.index"
VECTORIZER_PATH = settings.RAG_INDEX_DIR / "vectorizer.joblib"


class RAGStore:
    def __init__(self):
        self.vectorizer: TfidfVectorizer | None = None
        self.index: faiss.Index | None = None
        self.docs: list[dict] = []
        self._load()

    def _load(self):
        import joblib
        if VECTORIZER_PATH.exists() and DOCS_META_PATH.exists() and INDEX_PATH.exists():
            self.vectorizer = joblib.load(VECTORIZER_PATH)
            self.docs = json.loads(DOCS_META_PATH.read_text())
            self.index = faiss.read_index(str(INDEX_PATH))

    def _save(self):
        import joblib
        joblib.dump(self.vectorizer, VECTORIZER_PATH)
        DOCS_META_PATH.write_text(json.dumps(self.docs))
        faiss.write_index(self.index, str(INDEX_PATH))

    def build(self, documents: list[dict]):
        """documents: [{id, title, course, text}]"""
        self.docs = documents
        texts = [d["text"] for d in documents]
        self.vectorizer = TfidfVectorizer(max_features=4096, stop_words="english")
        X = self.vectorizer.fit_transform(texts).toarray().astype("float32")
        faiss.normalize_L2(X)
        self.index = faiss.IndexFlatIP(X.shape[1])
        self.index.add(X)
        self._save()

    def query(self, text: str, k: int = 4, course_filter: str | None = None) -> list[dict]:
        if not self.index or not self.vectorizer:
            return []
        q = self.vectorizer.transform([text]).toarray().astype("float32")
        faiss.normalize_L2(q)
        scores, idxs = self.index.search(q, min(k * 3, len(self.docs)))
        results = []
        for score, idx in zip(scores[0], idxs[0]):
            if idx == -1:
                continue
            doc = self.docs[idx]
            if course_filter and doc.get("course") != course_filter:
                continue
            results.append({**doc, "relevance": round(float(score), 3)})
            if len(results) >= k:
                break
        return results


_store = RAGStore()


def get_store() -> RAGStore:
    return _store


def chunk_text(text: str, chunk_size: int = 400) -> list[str]:
    words = re.split(r"\s+", text.strip())
    return [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)] or [text]


def answer_with_context(question: str, course_filter: str | None = None) -> dict:
    """Simple extractive RAG: retrieve top chunks, compose a grounded explainable answer."""
    store = get_store()
    hits = store.query(question, k=3, course_filter=course_filter)
    if not hits:
        return {"answer": "No indexed course material matched this question yet. "
                           "Ask faculty to upload notes/syllabus for this course.",
                "sources": []}
    answer = " ".join(h["text"][:280] for h in hits[:2])
    sources = [{"title": h["title"], "course": h.get("course"), "relevance": h["relevance"]} for h in hits]
    return {"answer": answer, "sources": sources}
