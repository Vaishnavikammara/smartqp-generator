import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import SubjectCoursePlan, Module, QuestionPaper, PaperSet, Question, ValidationLog
from app.services.rag_engine import RAGEngine
from app.services.gemini_client import GeminiClient, GeminiConfigurationError
from app.services.uniqueness import UniquenessEngine
from app.services.validator import ValidationEngine
from app.config import SIMILARITY_THRESHOLD, MAX_RETRY_COUNT

logger = logging.getLogger(__name__)


class GenerationOrchestrator:
    """
    Coordinates multi-set question paper generation, RAG retrieval,
    Gemini LLM calls, duplicate detection & replacement, and rule validation.
    """

    def __init__(self, db: Session, gemini_client: Optional[GeminiClient] = None):
        self.db = db
        self.gemini_client = gemini_client or GeminiClient()

    def generate_paper(
        self,
        user_id: int,
        subject: SubjectCoursePlan,
        examination_name: str,
        num_sets: int,
        target_total_marks: int,
        duration_minutes: int,
        categories: List[Dict[str, Any]],
        instructions: str = "",
        similarity_threshold: float = SIMILARITY_THRESHOLD
    ) -> QuestionPaper:
        """
        Generates all sets (Set A, Set B, Set C, ...) with strict uniqueness,
        validation, and database persistence.
        """
        # 1. Initialize RAG Engine on Subject Modules
        modules = [m for m in subject.modules if m.is_included and m.extracted_text.strip()]
        if not modules:
            raise ValueError("No modules with syllabus content found. Please upload and include at least one module.")

        rag_engine = RAGEngine(modules)
        uniqueness_engine = UniquenessEngine(threshold=similarity_threshold)

        # 2. Setup Paper Header
        paper_title = f"{subject.subject_name} – {examination_name}"
        paper = QuestionPaper(
            user_id=user_id,
            subject_id=subject.id,
            title=paper_title,
            examination_name=examination_name,
            total_marks=target_total_marks,
            duration_minutes=duration_minutes,
            num_sets=num_sets,
            instructions=instructions,
            status="draft",
            config_json=json.dumps(categories)
        )
        self.db.add(paper)
        self.db.flush()

        set_names = [f"Set {chr(65 + i)}" for i in range(num_sets)]  # Set A, Set B, Set C...
        all_generated_questions_pool: List[Dict[str, Any]] = []  # Across all sets for cross-set deduplication
        created_sets: List[PaperSet] = []

        # 3. Generate Sets Sequentially
        for set_idx, set_label in enumerate(set_names):
            paper_set = PaperSet(
                paper_id=paper.id,
                set_label=set_label,
                total_marks=target_total_marks
            )
            self.db.add(paper_set)
            self.db.flush()
            created_sets.append(paper_set)

            set_questions: List[Dict[str, Any]] = []
            question_counter = 1

            for cat in categories:
                cat_name = cat.get("name", "Category")
                q_type = cat.get("question_type", "descriptive")
                marks = cat.get("marks_per_question", 2)
                num_q = cat.get("num_questions", 0)
                diff = cat.get("difficulty", "Medium")
                target_bloom = cat.get("bloom_level")
                target_co = cat.get("co_level")
                mod_dist = cat.get("module_distribution", {})

                # If module distribution specified per module, generate accordingly
                module_targets = []
                if mod_dist and any(v > 0 for v in mod_dist.values()):
                    for m_key, count in mod_dist.items():
                        if count > 0:
                            # Match module by id or name
                            matched_mod = None
                            for m in modules:
                                if str(m.id) == str(m_key) or str(m.module_number) == str(m_key) or m.module_name == str(m_key):
                                    matched_mod = m
                                    break
                            if not matched_mod:
                                matched_mod = modules[0]
                            module_targets.append((matched_mod, count))
                else:
                    # Distribute evenly across modules
                    per_mod = max(1, num_q // len(modules))
                    remaining = num_q
                    for m in modules:
                        count = min(remaining, per_mod) if m != modules[-1] else remaining
                        if count > 0:
                            module_targets.append((m, count))
                            remaining -= count

                # Generate questions for each module target
                for target_mod, count_needed in module_targets:
                    if count_needed <= 0:
                        continue

                    # Retrieve syllabus context for this module
                    context_text = rag_engine.get_grounding_context_for_module(target_mod.module_name)
                    if not context_text:
                        context_text = target_mod.extracted_text[:3000]

                    # Summarize previously generated questions to inform Gemini to pick distinct concepts
                    prev_summary = "\n- ".join([q["question_text"] for q in all_generated_questions_pool[-12:]]) if all_generated_questions_pool else ""

                    # Call Gemini or generate directly from syllabus
                    batch_questions = []
                    if self.gemini_client.is_configured():
                        try:
                            batch_questions = self.gemini_client.generate_questions_for_batch(
                                set_label=set_label,
                                category_name=cat_name,
                                question_type=q_type,
                                marks_per_question=marks,
                                count_needed=count_needed,
                                module_name=target_mod.module_name,
                                syllabus_context=context_text,
                                difficulty=diff,
                                target_bloom=target_bloom,
                                target_co=target_co,
                                existing_questions_summary=prev_summary,
                                co_definitions=subject.co_definitions
                            )
                        except Exception as e:
                            logger.error(f"Error calling Gemini for {set_label}: {e}")
                            batch_questions = []

                    if not batch_questions:
                        # Direct syllabus-grounded generation without requiring external API key
                        batch_questions = self._create_fallback_questions(
                            count_needed=count_needed,
                            marks=marks,
                            q_type=q_type,
                            mod=target_mod,
                            diff=diff,
                            set_label=set_label,
                            q_counter_start=question_counter
                        )

                    # Ensure we have the needed number of questions
                    while len(batch_questions) < count_needed:
                        fallback_q = self._create_single_fallback_question(
                            target_mod, marks, q_type, diff, f"Question on {target_mod.module_name}",
                            offset=len(batch_questions) + question_counter
                        )
                        batch_questions.append(fallback_q)

                    # Now check each question for uniqueness across all previously generated sets
                    for cand_q in batch_questions[:count_needed]:
                        q_text = cand_q.get("question_text", "").strip()
                        is_dup, sim_score, matched = uniqueness_engine.check_against_existing(q_text, all_generated_questions_pool)

                        # If duplicate exceeds threshold, attempt replacement loop
                        retries = 0
                        while is_dup and retries < MAX_RETRY_COUNT:
                            retries += 1
                            logger.info(f"Duplicate detected in {set_label} (score: {sim_score:.2f}). Retry {retries}/{MAX_RETRY_COUNT}...")
                            all_texts = [x["question_text"] for x in all_generated_questions_pool]
                            replacement = None
                            if self.gemini_client.is_configured():
                                try:
                                    replacement = self.gemini_client.generate_single_replacement_question(
                                        set_label=set_label,
                                        question_type=q_type,
                                        marks=marks,
                                        module_name=target_mod.module_name,
                                        syllabus_context=context_text,
                                        duplicate_question_text=q_text,
                                        all_existing_questions=all_texts,
                                        difficulty=diff,
                                        co_level=cand_q.get("co_level"),
                                        bloom_level=cand_q.get("bloom_level")
                                    )
                                except Exception:
                                    replacement = None

                            if not replacement or not replacement.get("question_text"):
                                # High-variety offline syllabus replacement
                                replacement = self._create_single_fallback_question(
                                    target_mod, marks, q_type, diff,
                                    custom_prompt="Unique replacement",
                                    offset=retries * 5 + set_idx * 7 + question_counter
                                )

                            if replacement and replacement.get("question_text"):
                                q_text = replacement["question_text"]
                                cand_q = replacement
                                is_dup, sim_score, matched = uniqueness_engine.check_against_existing(q_text, all_generated_questions_pool)
                            else:
                                break

                        # Save question record
                        db_question = Question(
                            set_id=paper_set.id,
                            question_number=question_counter,
                            question_type=cand_q.get("question_type", q_type),
                            marks=cand_q.get("marks", marks),
                            module_id=target_mod.id,
                            module_name=cand_q.get("module_name", target_mod.module_name),
                            question_text=q_text,
                            co_level=cand_q.get("co_level") or f"CO{target_mod.module_number}",
                            bloom_level=cand_q.get("bloom_level") or "Understand",
                            difficulty=cand_q.get("difficulty") or diff,
                            syllabus_reference=cand_q.get("syllabus_reference") or f"Module {target_mod.module_number}",
                            is_flagged=is_dup
                        )
                        self.db.add(db_question)

                        q_dict = {
                            "question_text": q_text,
                            "set_label": set_label,
                            "question_number": question_counter,
                            "marks": marks,
                            "module_name": target_mod.module_name
                        }
                        set_questions.append(q_dict)
                        all_generated_questions_pool.append(q_dict)
                        question_counter += 1

            self.db.flush()

        # 4. Run Automated Validation Engine
        validation_engine = ValidationEngine(
            target_total_marks=target_total_marks,
            categories_config=categories,
            similarity_threshold=similarity_threshold
        )
        # Prepare sets data for validator
        sets_data = []
        for s in created_sets:
            questions_list = self.db.query(Question).filter(Question.set_id == s.id).all()
            sets_data.append({
                "set_label": s.set_label,
                "questions": [
                    {
                        "question_number": q.question_number,
                        "question_text": q.question_text,
                        "marks": q.marks,
                        "module_name": q.module_name,
                        "bloom_level": q.bloom_level,
                        "difficulty": q.difficulty,
                        "co_level": q.co_level
                    }
                    for q in questions_list
                ]
            })

        val_report = validation_engine.validate_paper(sets_data)

        # 5. Persist Validation Logs
        for log in val_report["logs"]:
            db_log = ValidationLog(
                paper_id=paper.id,
                rule_name=log["rule_name"],
                status=log["status"],
                message=log["message"],
                details_json=log.get("details_json")
            )
            self.db.add(db_log)

        # Update paper status
        if val_report["overall_status"] == "passed":
            paper.status = "validated"
        elif val_report["overall_status"] == "warning":
            paper.status = "validated"
        else:
            paper.status = "draft"

        self.db.commit()
        self.db.refresh(paper)
        return paper

    def _extract_topics_from_module(self, mod: Module) -> List[str]:
        """Extracts concrete syllabus topic phrases from module text."""
        raw = mod.extracted_text or ""
        import re
        segments = re.split(r"[;\n•\r\t]+", raw)
        topics = []
        for seg in segments:
            cleaned = seg.strip(" -:.,")
            if len(cleaned.split()) > 15:
                sub_segs = [s.strip(" -:.,") for s in cleaned.split(",") if len(s.strip()) > 5]
                topics.extend([s for s in sub_segs if len(s.split()) >= 2])
            elif len(cleaned.split()) >= 2 and len(cleaned) > 5:
                topics.append(cleaned)

        if not topics:
            clean_name = re.sub(r"^Module\s*\d+\s*[-–:]\s*", "", mod.module_name, flags=re.IGNORECASE)
            topics = [clean_name or "Database concepts"]

        return topics

    def _create_fallback_questions(
        self,
        count_needed: int,
        marks: int,
        q_type: str,
        mod: Module,
        diff: str,
        set_label: str,
        q_counter_start: int
    ) -> List[Dict[str, Any]]:
        """
        Generates authentic, syllabus-grounded academic examination questions
        derived from actual module topics without generic prefixes or module names.
        """
        topics = self._extract_topics_from_module(mod)
        res = []
        
        # Offset topics based on set label (Set A, Set B, Set C) so sets are completely distinct
        set_char = set_label.replace("Set", "").strip() or "A"
        set_offset = ord(set_char[0]) - ord("A") if len(set_char) > 0 else 0
        
        for i in range(count_needed):
            topic_idx = (i * 2 + set_offset) % len(topics)
            topic = topics[topic_idx]
            
            if marks <= 2:
                templates = [
                    f"Define {topic} and state its significance in relational database systems.",
                    f"What is {topic}? State the fundamental rules and constraints associated with it.",
                    f"Explain the primary purpose of {topic} with a brief technical example.",
                    f"Differentiate between the key properties of {topic} and related database mechanisms."
                ]
                bloom = "Remember"
            elif marks <= 5:
                templates = [
                    f"Explain the concepts and architectural principles of {topic} with a suitable diagram.",
                    f"Describe the working mechanism of {topic}. What advantages does it offer over conventional designs?",
                    f"Illustrate {topic} with a concrete relational schema example and show how constraints are enforced.",
                    f"Discuss the role and practical implementation of {topic} in modern database management."
                ]
                bloom = "Understand" if diff == "Easy" else "Apply"
            else:
                templates = [
                    f"Analyze the design principles of {topic}. Formulate a comprehensive implementation strategy with schema definitions and integrity constraints.",
                    f"Demonstrate how {topic} operates in concurrent transaction processing. Analyze potential trade-offs and optimization techniques with suitable examples.",
                    f"Construct a complete relational database design incorporating {topic}. Illustrate how anomalies are eliminated and query efficiency is maintained.",
                    f"Critically evaluate {topic}. Given a real-world enterprise scenario, demonstrate its algorithmic steps and justify the design decisions."
                ]
                bloom = "Analyze" if diff != "Hard" else "Evaluate"

            q_text = templates[(i + set_offset) % len(templates)]
            
            res.append({
                "question_text": q_text,
                "marks": marks,
                "question_type": q_type,
                "module_name": mod.module_name,
                "co_level": f"CO{mod.module_number}",
                "bloom_level": bloom,
                "difficulty": diff,
                "syllabus_reference": topic
            })
            
        return res

    def _create_single_fallback_question(
        self,
        mod: Module,
        marks: int,
        q_type: str,
        diff: str,
        custom_prompt: str,
        offset: int = 0
    ) -> Dict[str, Any]:
        topics = self._extract_topics_from_module(mod)
        topic_idx = offset % len(topics) if topics else 0
        topic = topics[topic_idx] if topics else mod.module_name

        if marks <= 2:
            options = [
                f"Define {topic} and state its primary significance.",
                f"What is {topic}? Explain its key characteristics with an example.",
                f"State the fundamental purpose and properties of {topic}.",
                f"Distinguish between {topic} and conventional database mechanisms."
            ]
            bloom = "Remember"
        elif marks <= 4:
            options = [
                f"Explain the basic mechanism of {topic} with a simple technical example.",
                f"Differentiate between the key features of {topic} and related concepts.",
                f"Discuss the necessity of {topic} and outline its operational rules.",
                f"Summarize the advantages and limitations of {topic}."
            ]
            bloom = "Understand"
        elif marks <= 7:
            options = [
                f"Explain the architectural structure and functioning of {topic} with a neat diagram.",
                f"Describe the operational mechanism of {topic}. What advantages does it offer over conventional designs?",
                f"Illustrate {topic} with a concrete relational schema example and show how constraints are enforced.",
                f"Discuss the practical implementation and performance considerations of {topic}."
            ]
            bloom = "Apply" if diff != "Easy" else "Understand"
        else:
            options = [
                f"Design a comprehensive relational schema incorporating {topic}. Analyze how constraints and performance are optimized.",
                f"Demonstrate how {topic} operates in concurrent transaction processing. Analyze potential trade-offs and optimization techniques.",
                f"Critically analyze the design principles of {topic}. Formulate a complete solution with schema definitions and integrity constraints.",
                f"Given a complex enterprise scenario, evaluate the role of {topic} and demonstrate step-by-step query execution and optimization."
            ]
            bloom = "Analyze" if diff != "Hard" else "Evaluate"

        q_text = options[offset % len(options)]

        return {
            "question_text": q_text,
            "marks": marks,
            "question_type": q_type,
            "module_name": mod.module_name,
            "co_level": f"CO{mod.module_number}",
            "bloom_level": bloom,
            "difficulty": diff,
            "syllabus_reference": topic
        }
