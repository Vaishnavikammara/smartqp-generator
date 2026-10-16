import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SubjectCoursePlan, QuestionPaper, PaperSet, Question, ValidationLog
from app.schemas import (
    GeneratePaperRequest, QuestionPaperOut, QuestionPaperListItem,
    QuestionUpdate, QuestionOut, ValidationReportOut
)
from app.auth import get_current_user
from app.services.generator import GenerationOrchestrator
from app.services.gemini_client import GeminiClient, GeminiConfigurationError
from app.services.validator import ValidationEngine
from app.services.rag_engine import RAGEngine

router = APIRouter(prefix="/api/papers", tags=["Question Papers"])


@router.post("/generate", response_model=QuestionPaperOut)
def generate_question_paper(
    req: GeneratePaperRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify Subject Ownership
    subject = db.query(SubjectCoursePlan).filter(
        SubjectCoursePlan.id == req.subject_id,
        SubjectCoursePlan.user_id == current_user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    included_modules = [m for m in subject.modules if m.is_included and m.extracted_text.strip()]
    if not included_modules:
        raise HTTPException(
            status_code=400,
            detail="No modules are selected or have syllabus content. Please upload or include modules before generating questions."
        )

    # 2. Validate Calculated Total Marks against Target Total Marks
    calculated_total = sum(cat.num_questions * cat.marks_per_question for cat in req.categories)
    if calculated_total != req.target_total_marks:
        discrepancy = calculated_total - req.target_total_marks
        disc_text = f"excess of +{discrepancy}" if discrepancy > 0 else f"shortfall of {discrepancy}"
        raise HTTPException(
            status_code=400,
            detail=(
                f"Marks configuration mismatch! Configured questions sum to {calculated_total} marks "
                f"({disc_text}), but target paper total marks is set to {req.target_total_marks} marks. "
                f"Please adjust the number of questions or marks per question so they match."
            )
        )

    # 3. Initialize Generation Engine (Gemini Flash if configured, or direct syllabus AI engine)
    gemini_client = GeminiClient()

    # 4. Orchestrate Generation
    orchestrator = GenerationOrchestrator(db, gemini_client)
    try:
        categories_dict = [cat.model_dump() for cat in req.categories]
        paper = orchestrator.generate_paper(
            user_id=current_user.id,
            subject=subject,
            examination_name=req.examination_name or "Semester Examination",
            num_sets=req.num_sets,
            target_total_marks=req.target_total_marks,
            duration_minutes=req.duration_minutes or 180,
            categories=categories_dict,
            instructions=req.instructions or "",
            similarity_threshold=req.similarity_threshold or 0.85
        )
        return paper
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.get("", response_model=List[QuestionPaperListItem])
def list_papers(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(QuestionPaper).filter(QuestionPaper.user_id == current_user.id)
    if status_filter:
        query = query.filter(QuestionPaper.status == status_filter.lower())

    papers = query.order_by(QuestionPaper.created_at.desc()).all()
    
    result = []
    for p in papers:
        result.append(QuestionPaperListItem(
            id=p.id,
            title=p.title,
            subject_name=p.subject.subject_name if p.subject else "N/A",
            course_name=p.subject.course_name if p.subject else "N/A",
            institute_name=p.subject.institute_name if p.subject else "N/A",
            total_marks=p.total_marks,
            num_sets=p.num_sets,
            status=p.status,
            created_at=p.created_at,
            sets_count=len(p.sets)
        ))
    return result


@router.get("/{paper_id}", response_model=QuestionPaperOut)
def get_paper(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    return paper


@router.patch("/{paper_id}/status")
def update_paper_status(
    paper_id: int,
    status: str = Query(..., pattern="^(draft|validated|approved)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    paper.status = status
    db.commit()
    return {"message": f"Question paper status updated to '{status}'"}


@router.delete("/{paper_id}")
def delete_paper(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    db.delete(paper)
    db.commit()
    return {"message": "Question paper deleted successfully"}


@router.put("/questions/{question_id}", response_model=QuestionOut)
def edit_question(
    question_id: int,
    q_in: QuestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(Question).join(PaperSet).join(QuestionPaper).filter(
        Question.id == question_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    question.question_text = q_in.question_text
    if q_in.marks is not None:
        question.marks = q_in.marks
    if q_in.question_type is not None:
        question.question_type = q_in.question_type
    if q_in.module_name is not None:
        question.module_name = q_in.module_name
    if q_in.co_level is not None:
        question.co_level = q_in.co_level
    if q_in.bloom_level is not None:
        question.bloom_level = q_in.bloom_level
    if q_in.difficulty is not None:
        question.difficulty = q_in.difficulty

    # Reset flagged state upon manual review
    question.is_flagged = False
    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(Question).join(PaperSet).join(QuestionPaper).filter(
        Question.id == question_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    set_id = question.set_id
    db.delete(question)
    db.commit()

    # Re-number remaining questions in set
    remaining = db.query(Question).filter(Question.set_id == set_id).order_by(Question.id.asc()).all()
    for idx, q in enumerate(remaining):
        q.question_number = idx + 1
    db.commit()

    return {"message": "Question deleted successfully"}


@router.post("/questions/{question_id}/regenerate", response_model=QuestionOut)
def regenerate_single_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(Question).join(PaperSet).join(QuestionPaper).filter(
        Question.id == question_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    paper_set = question.paper_set
    paper = paper_set.paper
    subject = paper.subject

    # Retrieve syllabus context
    mod = db.query(Module).filter(Module.id == question.module_id).first() if question.module_id else None
    if not mod and subject.modules:
        mod = subject.modules[0]

    rag = RAGEngine(subject.modules)
    syllabus_ctx = rag.get_grounding_context_for_module(question.module_name)

    # Collect existing questions to prevent duplicates
    all_q_texts = [
        q.question_text for s in paper.sets for q in s.questions if q.id != question.id
    ]

    client = GeminiClient()
    new_q_data = None
    if client.is_configured():
        try:
            new_q_data = client.generate_single_replacement_question(
                set_label=paper_set.set_label,
                question_type=question.question_type,
                marks=question.marks,
                module_name=question.module_name,
                syllabus_context=syllabus_ctx,
                duplicate_question_text=question.question_text,
                all_existing_questions=all_q_texts,
                difficulty=question.difficulty or "Medium",
                co_level=question.co_level,
                bloom_level=question.bloom_level
            )
        except Exception:
            new_q_data = None

    if not new_q_data or not new_q_data.get("question_text"):
        # Local syllabus replacement without requiring external API key
        orchestrator = GenerationOrchestrator(db, client)
        new_q_data = orchestrator._create_single_fallback_question(
            mod=mod,
            marks=question.marks,
            q_type=question.question_type,
            diff=question.difficulty or "Medium",
            custom_prompt="Replacement question",
            offset=question.id + 7
        )

    if new_q_data and new_q_data.get("question_text"):
        question.question_text = new_q_data["question_text"]
        if new_q_data.get("co_level"):
            question.co_level = new_q_data["co_level"]
        if new_q_data.get("bloom_level"):
            question.bloom_level = new_q_data["bloom_level"]
        question.is_flagged = False
        db.commit()
        db.refresh(question)

    return question


@router.post("/{paper_id}/revalidate", response_model=ValidationReportOut)
def revalidate_paper(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    categories = json.loads(paper.config_json) if paper.config_json else []
    validation_engine = ValidationEngine(
        target_total_marks=paper.total_marks,
        categories_config=categories,
        similarity_threshold=0.85
    )

    sets_data = []
    for s in paper.sets:
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
                for q in s.questions
            ]
        })

    report = validation_engine.validate_paper(sets_data)

    # Clear old logs and replace
    db.query(ValidationLog).filter(ValidationLog.paper_id == paper.id).delete()
    for log in report["logs"]:
        db.add(ValidationLog(
            paper_id=paper.id,
            rule_name=log["rule_name"],
            status=log["status"],
            message=log["message"],
            details_json=log.get("details_json")
        ))

    if report["overall_status"] in ("passed", "warning") and paper.status != "approved":
        paper.status = "validated"
    elif report["overall_status"] == "failed" and paper.status != "approved":
        paper.status = "draft"

    db.commit()
    db.refresh(paper)

    return {
        "paper_id": paper.id,
        "overall_status": report["overall_status"],
        "passed_count": report["passed_count"],
        "warning_count": report["warning_count"],
        "failed_count": report["failed_count"],
        "logs": paper.validation_logs
    }
