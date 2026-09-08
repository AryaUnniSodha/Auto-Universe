"""
Inference + explainability layer. Wraps trained scikit-learn artifacts and turns
raw predictions into human-readable, explainable outputs for the frontend.
"""
import joblib
import numpy as np
from app.core.config import settings

_cache = {}


def _load(name: str):
    if name not in _cache:
        _cache[name] = joblib.load(settings.ML_MODELS_DIR / f"{name}.joblib")
    return _cache[name]


def predict_cgpa(prev_cgpa, attendance, internal_marks_pct, study_hours,
                  assignment_completion, concept_mastery):
    art = _load("cgpa_model")
    model, features = art["model"], art["features"]
    row = {
        "prev_cgpa": prev_cgpa, "attendance": attendance,
        "internal_marks_pct": internal_marks_pct, "study_hours": study_hours,
        "assignment_completion": assignment_completion, "concept_mastery": concept_mastery,
    }
    X = np.array([[row[f] for f in features]])
    pred = float(model.predict(X)[0])
    pred = round(min(max(pred, 0), 10), 2)

    importances = dict(zip(features, model.feature_importances_))
    top = sorted(importances.items(), key=lambda x: -x[1])[:3]
    explanations = [f"{_readable(f)} contributes {imp*100:.0f}% to this prediction" for f, imp in top]
    confidence = round(max(0.55, 1 - art["mae"] / 2), 2)
    return pred, confidence, explanations


def predict_attendance_slope(attendance, study_hours):
    art = _load("attendance_model")
    model, features = art["model"], art["features"]
    X = np.array([[attendance, study_hours]])
    slope = float(model.predict(X)[0])
    return slope  # % change per week


def predict_placement(coding_score, aptitude_score, communication_score, cgpa,
                       attendance, certifications, projects):
    art = _load("placement_model")
    model, features = art["model"], art["features"]
    row = {
        "coding_score": coding_score, "aptitude_score": aptitude_score,
        "communication_score": communication_score, "next_cgpa": cgpa,
        "attendance": attendance, "certifications": certifications, "projects": projects,
    }
    X = np.array([[row[f] for f in features]])
    prob = float(model.predict_proba(X)[0][1])

    band_art = _load("salary_band_model")
    band_model, band_features = band_art["model"], band_art["features"]
    Xb = np.array([[row[f] for f in band_features]])
    band = str(band_model.predict(Xb)[0])

    coefs = dict(zip(features, model.coef_[0]))
    top = sorted(coefs.items(), key=lambda x: -abs(x[1]))[:3]
    explanations = [f"{_readable(f)} has {'a positive' if v > 0 else 'a negative'} influence on interview success" for f, v in top]
    return round(prob * 100, 1), band, explanations


def _readable(feature: str) -> str:
    mapping = {
        "prev_cgpa": "Previous CGPA", "attendance": "Attendance %",
        "internal_marks_pct": "Internal marks", "study_hours": "Daily study hours",
        "assignment_completion": "Assignment completion", "concept_mastery": "Concept mastery",
        "coding_score": "Coding practice score", "aptitude_score": "Aptitude score",
        "communication_score": "Communication score", "next_cgpa": "CGPA",
        "certifications": "Certifications earned", "projects": "Projects completed",
    }
    return mapping.get(feature, feature)
