import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User, SubjectCoursePlan, Module, QuestionPaper

import time

class TestSmartQPE2E(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        cls.test_email = f"faculty_{int(time.time())}@presidency.edu"

    def test_complete_e2e_workflow(self):
        # 1. Health check
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "healthy")

        # 2. User registration
        reg_payload = {
            "email": "dr.sharma@presidency.edu",
            "full_name": "Dr. Ramesh Sharma",
            "institute_name": "Presidency University",
            "department": "Computer Science & Engineering",
            "password": "SecurePassword123"
        }
        res = self.client.post("/api/auth/register", json=reg_payload)
        if res.status_code == 400: # Already registered in previous test
            res = self.client.post("/api/auth/login", json={
                "email": "dr.sharma@presidency.edu",
                "password": "SecurePassword123"
            })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Subject / Course Plan
        subj_payload = {
            "institute_name": "Presidency University",
            "department_name": "Department of Computer Science & Engineering",
            "course_name": "B.Tech Computer Science & Engineering",
            "subject_name": "Database Management Systems",
            "subject_code": "CS301",
            "semester": "5th Semester",
            "academic_year": "2026-2027",
            "examination_name": "End Semester Examination 2026",
            "co_definitions": "CO1: Understand relational schema concepts.\nCO2: Apply SQL queries and algebra."
        }
        res = self.client.post("/api/subjects", json=subj_payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        subject_id = res.json()["id"]

        # 4. Add Modules
        mod1_res = self.client.post(
            f"/api/subjects/{subject_id}/modules/manual",
            data={
                "module_number": 1,
                "module_name": "Module 1 – Relational Data Model",
                "content_text": "Relational model concepts, relations, schemas, domain constraints, key constraints, referential integrity and foreign keys."
            },
            headers=headers
        )
        self.assertEqual(mod1_res.status_code, 200)

        mod2_res = self.client.post(
            f"/api/subjects/{subject_id}/modules/manual",
            data={
                "module_number": 2,
                "module_name": "Module 2 – SQL & Relational Algebra",
                "content_text": "SQL DDL, DML, relational algebra select, project, join, aggregate functions and group by clauses."
            },
            headers=headers
        )
        self.assertEqual(mod2_res.status_code, 200)

        # 5. Generate Multi-Set Question Paper
        gen_payload = {
            "subject_id": subject_id,
            "examination_name": "End Semester Examination 2026",
            "duration_minutes": 180,
            "num_sets": 2, # Set A and Set B
            "target_total_marks": 20,
            "categories": [
                {
                    "category_id": "c1",
                    "name": "2-Marks Questions",
                    "question_type": "short answer",
                    "marks_per_question": 2,
                    "num_questions": 5, # 5 * 2 = 10 marks
                    "module_distribution": {"1": 3, "2": 2},
                    "difficulty": "Easy",
                    "bloom_level": "Remember"
                },
                {
                    "category_id": "c2",
                    "name": "5-Marks Questions",
                    "question_type": "descriptive",
                    "marks_per_question": 5,
                    "num_questions": 2, # 2 * 5 = 10 marks
                    "module_distribution": {"1": 1, "2": 1},
                    "difficulty": "Medium",
                    "bloom_level": "Understand"
                }
            ],
            "similarity_threshold": 0.85
        }
        # 5. Test direct generation without requiring API key
        res = self.client.post("/api/papers/generate", json=gen_payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        paper_data = res.json()
        self.assertEqual(paper_data["total_marks"], 20)
        self.assertEqual(len(paper_data["sets"]), 2)
        paper_id = paper_data["id"]

        # 6. Verify sets structure and uniqueness
        set_a = paper_data["sets"][0]
        set_b = paper_data["sets"][1]
        self.assertEqual(set_a["set_label"], "Set A")
        self.assertEqual(set_b["set_label"], "Set B")
        self.assertEqual(len(set_a["questions"]), 7)
        self.assertEqual(len(set_b["questions"]), 7)

        # 7. Test Institute Template endpoints
        res_tpls = self.client.get("/api/templates")
        self.assertEqual(res_tpls.status_code, 200)
        tpl_list = res_tpls.json()
        self.assertGreaterEqual(len(tpl_list), 4)

        # 8. Test PDF and DOCX export with custom template
        res_pdf = self.client.get(f"/api/export/{paper_id}/set/{set_a['id']}/pdf?template_id=autonomous_obe", headers=headers)
        self.assertEqual(res_pdf.status_code, 200)
        self.assertEqual(res_pdf.headers["content-type"], "application/pdf")
        self.assertGreater(len(res_pdf.content), 1000)

        res_docx = self.client.get(f"/api/export/{paper_id}/set/{set_a['id']}/docx", headers=headers)
        self.assertEqual(res_docx.status_code, 200)
        self.assertIn("officedocument", res_docx.headers["content-type"])
        self.assertGreater(len(res_docx.content), 1000)

        # 8. Test Similarity Benchmark endpoint
        res_bench = self.client.get("/api/evaluation/run-similarity-benchmark?threshold=0.85", headers=headers)
        self.assertEqual(res_bench.status_code, 200)
        bench_data = res_bench.json()
        self.assertIn("accuracy_percent", bench_data)

        print("\nAll End-to-End Test Steps Passed Successfully!")


if __name__ == "__main__":
    unittest.main()
