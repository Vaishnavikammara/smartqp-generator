import unittest
import os
from app.services.doc_parser import clean_text, chunk_text
from app.services.uniqueness import UniquenessEngine, normalize_question_text
from app.services.validator import ValidationEngine
from app.services.exporter import export_set_to_pdf, export_set_to_docx
from app.models import QuestionPaper, PaperSet, Question, SubjectCoursePlan


class TestSmartQPEngine(unittest.TestCase):

    def test_text_cleaning_and_chunking(self):
        raw = "This is a   test   document.\n\n\nWith multiple   spaces and \n line- \n breaks."
        cleaned = clean_text(raw)
        self.assertIn("linebreaks", cleaned)
        self.assertNotIn("   ", cleaned)

        chunks = chunk_text("Word " * 600, chunk_size_words=200, overlap_words=50)
        self.assertGreaterEqual(len(chunks), 3)

    def test_uniqueness_engine(self):
        engine = UniquenessEngine(threshold=0.85)

        q1 = "Explain the advantages of database normalization with a suitable real-world example."
        q2 = "Describe why normalization is necessary in relational database design and illustrate with an example."
        q3 = "Calculate the maximum number of record pointers in a B+ tree of order 4 and height 3."

        # Normalized question texts
        norm1 = normalize_question_text(q1)
        norm2 = normalize_question_text(q2)
        self.assertIn("normalization", norm1)
        self.assertIn("normalization", norm2)

        # q1 and q2 are semantically about the exact same concept
        sim_dup = engine.compute_similarity(q1, q2)
        # q1 and q3 are completely distinct
        sim_diff = engine.compute_similarity(q1, q3)

        self.assertGreater(sim_dup, sim_diff)
        self.assertLess(sim_diff, 0.4)

    def test_validation_engine(self):
        categories = [
            {"name": "2-Marks", "marks_per_question": 2, "num_questions": 2},
            {"name": "5-Marks", "marks_per_question": 5, "num_questions": 2}
        ]
        # Target = 2*2 + 5*2 = 14 marks
        validator = ValidationEngine(target_total_marks=14, categories_config=categories, similarity_threshold=0.85)

        valid_sets = [
            {
                "set_label": "Set A",
                "questions": [
                    {"question_number": 1, "marks": 2, "question_text": "Define ACID properties.", "module_name": "Mod 1", "bloom_level": "Remember"},
                    {"question_number": 2, "marks": 2, "question_text": "What is primary key?", "module_name": "Mod 1", "bloom_level": "Remember"},
                    {"question_number": 3, "marks": 5, "question_text": "Explain 3NF with example.", "module_name": "Mod 2", "bloom_level": "Understand"},
                    {"question_number": 4, "marks": 5, "question_text": "Illustrate two-phase locking.", "module_name": "Mod 3", "bloom_level": "Apply"}
                ]
            },
            {
                "set_label": "Set B",
                "questions": [
                    {"question_number": 1, "marks": 2, "question_text": "Define serializability.", "module_name": "Mod 3", "bloom_level": "Remember"},
                    {"question_number": 2, "marks": 2, "question_text": "What is foreign key?", "module_name": "Mod 1", "bloom_level": "Remember"},
                    {"question_number": 3, "marks": 5, "question_text": "Explain BCNF decomposition.", "module_name": "Mod 2", "bloom_level": "Analyze"},
                    {"question_number": 4, "marks": 5, "question_text": "Demonstrate timestamp protocol.", "module_name": "Mod 3", "bloom_level": "Apply"}
                ]
            }
        ]

        report = validator.validate_paper(valid_sets)
        self.assertEqual(report["overall_status"], "passed")
        self.assertEqual(report["failed_count"], 0)

    def test_exporter_pdf_and_docx(self):
        # Create mock objects
        subj = SubjectCoursePlan(
            institute_name="National Engineering Institute",
            department_name="Department of Computer Science",
            course_name="B.Tech Computer Science",
            subject_name="Database Systems",
            subject_code="CS301",
            semester="5th Semester",
            academic_year="2026-2027"
        )
        paper = QuestionPaper(
            id=999,
            title="Database Systems - Midterm",
            examination_name="Midterm Examination 2026",
            total_marks=20,
            duration_minutes=90,
            instructions="Answer all questions.",
            subject=subj
        )
        pset = PaperSet(
            id=101,
            paper_id=999,
            set_label="Set A",
            total_marks=20,
            paper=paper
        )
        q1 = Question(
            id=1, set_id=101, question_number=1, marks=10, question_type="descriptive",
            module_name="Transactions", question_text="Explain ACID properties in detail.",
            co_level="CO3", bloom_level="Understand", difficulty="Medium"
        )
        q2 = Question(
            id=2, set_id=101, question_number=2, marks=10, question_type="application-based",
            module_name="Normalization", question_text="Perform BCNF decomposition on relation R(A,B,C,D).",
            co_level="CO2", bloom_level="Apply", difficulty="Hard"
        )
        pset.questions = [q1, q2]
        paper.sets = [pset]

        pdf_path = export_set_to_pdf(paper, pset, include_tags=True)
        docx_path = export_set_to_docx(paper, pset, include_tags=True)

        self.assertTrue(os.path.exists(pdf_path))
        self.assertTrue(os.path.exists(docx_path))
        self.assertGreater(os.path.getsize(pdf_path), 1000)
        self.assertGreater(os.path.getsize(docx_path), 1000)


if __name__ == "__main__":
    unittest.main()
