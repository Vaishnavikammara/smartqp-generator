import json
from pathlib import Path
from fastapi import APIRouter, Depends, Query
from app.services.uniqueness import UniquenessEngine
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation & Benchmarks"])

DATASET_PATH = Path(__file__).resolve().parent.parent.parent / "evaluation_dataset.json"


@router.get("/dataset")
def get_evaluation_dataset(current_user: User = Depends(get_current_user)):
    """Returns the evaluation dataset with labeled syllabus and question pairs."""
    if not DATASET_PATH.exists():
        return {"error": "Evaluation dataset not found"}
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@router.get("/run-similarity-benchmark")
def run_similarity_benchmark(
    threshold: float = Query(0.85, ge=0.5, le=0.99),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates duplicate detection performance across the labeled question pairs
    using the configured cosine similarity threshold.
    """
    if not DATASET_PATH.exists():
        return {"error": "Evaluation dataset not found"}

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions_map = {q["id"]: q for q in data.get("labeled_questions", [])}
    pairs = data.get("labeled_pairs", [])

    engine = UniquenessEngine(threshold=threshold)
    results = []
    correct_predictions = 0

    for p in pairs:
        q1 = questions_map.get(p["q1_id"])
        q2 = questions_map.get(p["q2_id"])
        if not q1 or not q2:
            continue

        score = engine.compute_similarity(q1["question_text"], q2["question_text"])
        predicted_dup = score >= threshold
        expected_dup = p["expected_duplicate"]
        is_correct = (predicted_dup == expected_dup)
        if is_correct:
            correct_predictions += 1

        results.append({
            "pair_id": p["pair_id"],
            "q1": q1["question_text"],
            "q2": q2["question_text"],
            "similarity_score": score,
            "threshold": threshold,
            "predicted_duplicate": predicted_dup,
            "expected_duplicate": expected_dup,
            "is_correct": is_correct,
            "reason": p.get("reason", "")
        })

    accuracy = (correct_predictions / len(pairs)) * 100 if pairs else 0.0

    return {
        "tested_threshold": threshold,
        "total_pairs": len(pairs),
        "correct_predictions": correct_predictions,
        "accuracy_percent": round(accuracy, 2),
        "benchmark_results": results
    }
