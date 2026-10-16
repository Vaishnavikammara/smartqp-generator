import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SubjectCoursePlan, Module, ModuleChunk
from app.schemas import SubjectCreate, SubjectOut, ModuleOut, ModuleUpdate
from app.auth import get_current_user
from app.config import UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB
from app.services.doc_parser import extract_text_from_file, chunk_text, DocumentProcessingError

router = APIRouter(prefix="/api/subjects", tags=["Subjects & Modules"])


@router.post("", response_model=SubjectOut)
def create_subject(
    subject_in: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = SubjectCoursePlan(
        user_id=current_user.id,
        institute_name=subject_in.institute_name,
        department_name=subject_in.department_name,
        course_name=subject_in.course_name,
        subject_name=subject_in.subject_name,
        subject_code=subject_in.subject_code,
        semester=subject_in.semester,
        academic_year=subject_in.academic_year,
        examination_name=subject_in.examination_name,
        co_definitions=subject_in.co_definitions
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("", response_model=List[SubjectOut])
def list_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve subjects created by current logged-in faculty member."""
    subjects = db.query(SubjectCoursePlan).filter(
        SubjectCoursePlan.user_id == current_user.id
    ).order_by(SubjectCoursePlan.created_at.desc()).all()
    return subjects


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(SubjectCoursePlan).filter(
        SubjectCoursePlan.id == subject_id,
        SubjectCoursePlan.user_id == current_user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(SubjectCoursePlan).filter(
        SubjectCoursePlan.id == subject_id,
        SubjectCoursePlan.user_id == current_user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"message": "Subject and all associated modules deleted successfully"}


@router.post("/{subject_id}/modules/upload", response_model=ModuleOut)
async def upload_module_file(
    subject_id: int,
    module_number: int = Form(...),
    module_name: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify subject ownership
    subject = db.query(SubjectCoursePlan).filter(
        SubjectCoursePlan.id == subject_id,
        SubjectCoursePlan.user_id == current_user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed types: PDF, DOCX, DOC, TXT."
        )

    # Save file
    subject_dir = UPLOAD_DIR / f"user_{current_user.id}" / f"subj_{subject_id}"
    subject_dir.mkdir(parents=True, exist_ok=True)
    saved_path = subject_dir / f"mod_{module_number}_{file.filename}"

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract text using PyMuPDF / python-docx / OCR
    try:
        extracted_text, used_ocr = extract_text_from_file(str(saved_path), file.filename)
    except DocumentProcessingError as e:
        if saved_path.exists():
            os.remove(saved_path)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        if saved_path.exists():
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Unexpected error parsing document: {str(e)}")

    # Check if module already exists for this subject with this module number
    existing_mod = db.query(Module).filter(
        Module.subject_id == subject_id,
        Module.module_number == module_number
    ).first()

    if existing_mod:
        existing_mod.module_name = module_name
        existing_mod.original_filename = file.filename
        existing_mod.file_path = str(saved_path)
        existing_mod.extracted_text = extracted_text
        mod = existing_mod
        # Clear old chunks
        db.query(ModuleChunk).filter(ModuleChunk.module_id == mod.id).delete()
    else:
        mod = Module(
            subject_id=subject_id,
            module_number=module_number,
            module_name=module_name,
            original_filename=file.filename,
            file_path=str(saved_path),
            extracted_text=extracted_text,
            is_included=True
        )
        db.add(mod)
        db.flush()

    # Generate and save text chunks for RAG
    chunks = chunk_text(extracted_text)
    for c_idx, c_text in enumerate(chunks):
        chunk_obj = ModuleChunk(
            module_id=mod.id,
            chunk_index=c_idx,
            chunk_text=c_text,
            token_count=len(c_text.split())
        )
        db.add(chunk_obj)

    db.commit()
    db.refresh(mod)
    return mod


@router.post("/{subject_id}/modules/manual", response_model=ModuleOut)
def create_module_manual(
    subject_id: int,
    module_number: int = Form(...),
    module_name: str = Form(...),
    content_text: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(SubjectCoursePlan).filter(
        SubjectCoursePlan.id == subject_id,
        SubjectCoursePlan.user_id == current_user.id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if not content_text.strip():
        raise HTTPException(status_code=400, detail="Module syllabus content cannot be empty")

    mod = Module(
        subject_id=subject_id,
        module_number=module_number,
        module_name=module_name,
        original_filename="manual_entry.txt",
        file_path=None,
        extracted_text=content_text.strip(),
        is_included=True
    )
    db.add(mod)
    db.flush()

    chunks = chunk_text(content_text.strip())
    for c_idx, c_text in enumerate(chunks):
        chunk_obj = ModuleChunk(
            module_id=mod.id,
            chunk_index=c_idx,
            chunk_text=c_text,
            token_count=len(c_text.split())
        )
        db.add(chunk_obj)

    db.commit()
    db.refresh(mod)
    return mod


@router.put("/modules/{module_id}", response_model=ModuleOut)
def update_module(
    module_id: int,
    mod_update: ModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mod = db.query(Module).join(SubjectCoursePlan).filter(
        Module.id == module_id,
        SubjectCoursePlan.user_id == current_user.id
    ).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    if mod_update.module_name is not None:
        mod.module_name = mod_update.module_name
    if mod_update.is_included is not None:
        mod.is_included = mod_update.is_included
    if mod_update.extracted_text is not None:
        mod.extracted_text = mod_update.extracted_text
        # Re-chunk
        db.query(ModuleChunk).filter(ModuleChunk.module_id == mod.id).delete()
        chunks = chunk_text(mod.extracted_text)
        for c_idx, c_text in enumerate(chunks):
            db.add(ModuleChunk(
                module_id=mod.id,
                chunk_index=c_idx,
                chunk_text=c_text,
                token_count=len(c_text.split())
            ))

    db.commit()
    db.refresh(mod)
    return mod


@router.delete("/modules/{module_id}")
def delete_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mod = db.query(Module).join(SubjectCoursePlan).filter(
        Module.id == module_id,
        SubjectCoursePlan.user_id == current_user.id
    ).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    # Delete physical file if exists
    if mod.file_path and os.path.exists(mod.file_path):
        try:
            os.remove(mod.file_path)
        except Exception:
            pass

    db.delete(mod)
    db.commit()
    return {"message": "Module deleted successfully"}
