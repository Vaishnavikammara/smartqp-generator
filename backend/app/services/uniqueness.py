import re
import string
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.config import SIMILARITY_THRESHOLD


def normalize_question_text(text: str) -> str:
    """
    Normalizes question text by lowercasing, stripping punctuation,
    removing common exam filler words (e.g., 'explain', 'what is', 'discuss', 'define', 'with neat sketch'),
    and collapsing whitespace.
    """
    if not text:
        return ""
    text = text.lower()
    # Remove punctuation
    text = text.translate(str.maketrans("", "", string.punctuation))
    # Remove common filler prompt words to focus on core concepts
    fillers = {
        "explain", "what", "is", "are", "define", "describe", "discuss",
        "illustrate", "with", "neat", "sketch", "diagram", "suitable",
        "example", "examples", "briefly", "short", "note", "on", "differentiate",
        "between", "write", "a", "an", "the", "in", "of", "and", "or", "for", "to"
    }
    tokens = [t for t in text.split() if t not in fillers]
    return " ".join(tokens)


def token_jaccard_similarity(text1: str, text2: str) -> float:
    """Calculate token-level Jaccard similarity between two normalized strings."""
    tokens1 = set(normalize_question_text(text1).split())
    tokens2 = set(normalize_question_text(text2).split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


class UniquenessEngine:
    """
    Evaluates semantic and syntactic uniqueness across questions in different sets.
    Uses TF-IDF character and word n-gram vectors and token overlap to compute cosine similarity.
    """

    def __init__(self, threshold: float = SIMILARITY_THRESHOLD):
        self.threshold = threshold

    def compute_similarity(self, q1: str, q2: str) -> float:
        """
        Computes composite similarity score between two questions.
        Combines TF-IDF N-Gram Cosine Similarity with Token Jaccard overlap.
        Returns a float between 0.0 and 1.0.
        """
        # Exact or near-exact match
        norm1 = normalize_question_text(q1)
        norm2 = normalize_question_text(q2)
        if norm1 == norm2 and len(norm1) > 0:
            return 1.0

        jaccard_score = token_jaccard_similarity(q1, q2)

        try:
            # TF-IDF with character and word n-grams captures both semantic terms and phrasing
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 3),
                analyzer="word",
                sublinear_tf=True
            )
            tfidf = vectorizer.fit_transform([q1, q2])
            cosine_score = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
        except Exception:
            cosine_score = 0.0

        # Weighted composite score
        composite = 0.75 * cosine_score + 0.25 * jaccard_score
        return round(float(composite), 4)

    def check_against_existing(
        self,
        candidate_question: str,
        existing_questions: List[Dict[str, Any]]
    ) -> Tuple[bool, float, Optional[Dict[str, Any]]]:
        """
        Checks a candidate question against a list of already generated questions across all sets.
        Returns:
            is_duplicate (bool): True if similarity >= threshold
            max_sim (float): Highest similarity found
            matched_question (dict): Details of the question that exceeded threshold
        """
        if not existing_questions:
            return False, 0.0, None

        max_sim = 0.0
        most_similar_q = None

        for eq in existing_questions:
            eq_text = eq.get("question_text", "")
            sim = self.compute_similarity(candidate_question, eq_text)
            if sim > max_sim:
                max_sim = sim
                most_similar_q = eq

        is_duplicate = max_sim >= self.threshold
        return is_duplicate, max_sim, most_similar_q

    def audit_all_sets(self, sets_questions: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """
        Compares all questions across all sets (Set A, Set B, Set C, etc.)
        and generates a detailed cross-set uniqueness audit report.
        """
        audit_results = []
        set_labels = list(sets_questions.keys())

        for i in range(len(set_labels)):
            set_i = set_labels[i]
            questions_i = sets_questions[set_i]

            for q_idx, q in enumerate(questions_i):
                q_text = q.get("question_text", "")
                q_num = q.get("question_number", q_idx + 1)

                # Check against other sets
                for j in range(i + 1, len(set_labels)):
                    set_j = set_labels[j]
                    questions_j = sets_questions[set_j]

                    for other_idx, other_q in enumerate(questions_j):
                        other_text = other_q.get("question_text", "")
                        other_num = other_q.get("question_number", other_idx + 1)
                        sim = self.compute_similarity(q_text, other_text)

                        if sim >= self.threshold:
                            audit_results.append({
                                "set_1": set_i,
                                "q_number_1": q_num,
                                "question_1": q_text,
                                "set_2": set_j,
                                "q_number_2": other_num,
                                "question_2": other_text,
                                "similarity": sim,
                                "threshold": self.threshold,
                                "status": "duplicate"
                            })

        return audit_results
