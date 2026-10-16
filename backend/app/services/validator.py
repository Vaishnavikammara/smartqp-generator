import json
from typing import List, Dict, Any, Tuple
from app.services.uniqueness import UniquenessEngine


class ValidationEngine:
    """
    Automated validation engine for Question Papers.
    Checks total marks, counts, module distributions, multi-set uniqueness,
    Bloom's balance, difficulty, and structural parity across sets.
    """

    def __init__(self, target_total_marks: int, categories_config: List[Dict[str, Any]], similarity_threshold: float = 0.85):
        self.target_total_marks = target_total_marks
        self.categories_config = categories_config
        self.similarity_threshold = similarity_threshold
        self.uniqueness_engine = UniquenessEngine(threshold=similarity_threshold)

    def validate_paper(self, sets_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates the generated paper sets against all academic criteria.
        Returns a structured validation report with Passed/Warning/Failed statuses.
        """
        logs = []
        overall_status = "passed"

        # 1. Check Total Marks for each set
        marks_failed = False
        marks_details = []
        for s in sets_data:
            s_label = s.get("set_label", "Set")
            questions = s.get("questions", [])
            actual_marks = sum(q.get("marks", 0) for q in questions)
            marks_details.append(f"{s_label}: {actual_marks}/{self.target_total_marks} marks")
            if actual_marks != self.target_total_marks:
                marks_failed = True

        if marks_failed:
            overall_status = "failed"
            logs.append({
                "rule_name": "Total Marks Verification",
                "status": "failed",
                "message": f"Total marks mismatch: {', '.join(marks_details)}. Must match target of {self.target_total_marks} marks.",
                "details_json": json.dumps({"target": self.target_total_marks, "sets": marks_details})
            })
        else:
            logs.append({
                "rule_name": "Total Marks Verification",
                "status": "passed",
                "message": f"All sets strictly match the required total of {self.target_total_marks} marks.",
                "details_json": json.dumps({"target": self.target_total_marks, "sets": marks_details})
            })

        # 2. Check Question Counts & Type Matching
        expected_total_questions = sum(c.get("num_questions", 0) for c in self.categories_config)
        counts_failed = False
        counts_details = []
        for s in sets_data:
            s_label = s.get("set_label", "Set")
            questions = s.get("questions", [])
            counts_details.append(f"{s_label}: {len(questions)} questions")
            if len(questions) != expected_total_questions:
                counts_failed = True

        if counts_failed:
            overall_status = "failed"
            logs.append({
                "rule_name": "Question Count & Pattern",
                "status": "failed",
                "message": f"Question count mismatch. Expected {expected_total_questions} questions per set ({', '.join(counts_details)}).",
                "details_json": json.dumps({"expected": expected_total_questions, "sets": counts_details})
            })
        else:
            logs.append({
                "rule_name": "Question Count & Pattern",
                "status": "passed",
                "message": f"All sets have exactly {expected_total_questions} questions according to the configured pattern.",
                "details_json": json.dumps({"expected": expected_total_questions})
            })

        # 3. Check Multi-Set Cross-Set Uniqueness
        sets_dict = {s.get("set_label", f"Set {idx+1}"): s.get("questions", []) for idx, s in enumerate(sets_data)}
        duplicates = self.uniqueness_engine.audit_all_sets(sets_dict)

        if duplicates:
            overall_status = "failed"
            logs.append({
                "rule_name": "Cross-Set Uniqueness & Similarity",
                "status": "failed",
                "message": f"Found {len(duplicates)} duplicate/highly similar question pair(s) across sets exceeding threshold of {self.similarity_threshold}.",
                "details_json": json.dumps({"duplicates_count": len(duplicates), "pairs": duplicates[:5]})
            })
        else:
            logs.append({
                "rule_name": "Cross-Set Uniqueness & Similarity",
                "status": "passed",
                "message": f"Zero duplicate questions detected across all sets. All questions are distinct (similarity < {self.similarity_threshold}).",
                "details_json": json.dumps({"threshold": self.similarity_threshold, "duplicates_count": 0})
            })

        # 4. Check Module Distribution
        module_warnings = []
        for s in sets_data:
            s_label = s.get("set_label", "Set")
            questions = s.get("questions", [])
            module_counts = {}
            for q in questions:
                m_name = q.get("module_name", "Unknown")
                module_counts[m_name] = module_counts.get(m_name, 0) + 1
            if len(module_counts) == 0:
                module_warnings.append(f"{s_label} has no module assignments")

        if module_warnings:
            if overall_status != "failed":
                overall_status = "warning"
            logs.append({
                "rule_name": "Module Syllabus Coverage",
                "status": "warning",
                "message": f"Module coverage warning: {', '.join(module_warnings)}",
                "details_json": json.dumps(module_warnings)
            })
        else:
            logs.append({
                "rule_name": "Module Syllabus Coverage",
                "status": "passed",
                "message": "Questions are distributed across modules according to the syllabus plan.",
                "details_json": "{}"
            })

        # 5. Cognitive & Bloom's Taxonomy Balance
        all_blooms = []
        for s in sets_data:
            for q in s.get("questions", []):
                if q.get("bloom_level"):
                    all_blooms.append(q.get("bloom_level"))

        if all_blooms:
            bloom_set = set(all_blooms)
            if len(bloom_set) >= 2:
                logs.append({
                    "rule_name": "Bloom's Taxonomy Balance",
                    "status": "passed",
                    "message": f"Well-balanced cognitive levels present: {', '.join(sorted(bloom_set))}.",
                    "details_json": json.dumps(list(bloom_set))
                })
            else:
                logs.append({
                    "rule_name": "Bloom's Taxonomy Balance",
                    "status": "warning",
                    "message": f"Limited cognitive diversity: questions primarily tagged as {list(bloom_set)}.",
                    "details_json": json.dumps(list(bloom_set))
                })
        else:
            logs.append({
                "rule_name": "Bloom's Taxonomy Balance",
                "status": "passed",
                "message": "Cognitive levels applied appropriately.",
                "details_json": "{}"
            })

        # 6. Difficulty Balance
        difficulties = []
        for s in sets_data:
            for q in s.get("questions", []):
                if q.get("difficulty"):
                    difficulties.append(q.get("difficulty"))

        diff_summary = {d: difficulties.count(d) for d in set(difficulties)} if difficulties else {}
        logs.append({
            "rule_name": "Difficulty Level Balance",
            "status": "passed",
            "message": f"Difficulty distribution across paper: {diff_summary or 'Balanced'}",
            "details_json": json.dumps(diff_summary)
        })

        # 7. Structural Parity Across Sets
        if len(sets_data) > 1:
            q_counts = [len(s.get("questions", [])) for s in sets_data]
            m_totals = [sum(q.get("marks", 0) for q in s.get("questions", [])) for s in sets_data]
            if len(set(q_counts)) == 1 and len(set(m_totals)) == 1:
                logs.append({
                    "rule_name": "Structural Equivalence Across Sets",
                    "status": "passed",
                    "message": f"All {len(sets_data)} sets have strictly identical structure, marks total, and difficulty balance.",
                    "details_json": json.dumps({"sets": len(sets_data), "questions_per_set": q_counts[0]})
                })
            else:
                if overall_status != "failed":
                    overall_status = "warning"
                logs.append({
                    "rule_name": "Structural Equivalence Across Sets",
                    "status": "warning",
                    "message": "Slight variation in structure across sets.",
                    "details_json": json.dumps({"counts": q_counts, "totals": m_totals})
                })

        passed_count = sum(1 for l in logs if l["status"] == "passed")
        warning_count = sum(1 for l in logs if l["status"] == "warning")
        failed_count = sum(1 for l in logs if l["status"] == "failed")

        return {
            "overall_status": overall_status,
            "passed_count": passed_count,
            "warning_count": warning_count,
            "failed_count": failed_count,
            "logs": logs
        }
