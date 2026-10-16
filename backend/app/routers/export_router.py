from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, QuestionPaper, PaperSet
from app.auth import get_current_user
from app.services.exporter import export_set_to_pdf, export_set_to_docx, export_all_sets_bundle

router = APIRouter(prefix="/api/export", tags=["Paper Export"])


@router.get("/{paper_id}/set/{set_id}/pdf")
def download_set_pdf(
    paper_id: int,
    set_id: int,
    include_tags: bool = Query(False, description="Include CO/Bloom/Module metadata tags"),
    template_id: str = Query("autonomous_obe", description="Selected Institute Template ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper_set = db.query(PaperSet).filter(
        PaperSet.id == set_id,
        PaperSet.paper_id == paper_id
    ).first()
    if not paper_set:
        raise HTTPException(status_code=404, detail="Set not found")

    file_path = export_set_to_pdf(paper, paper_set, include_tags=include_tags, template_id=template_id)
    clean_set_name = paper_set.set_label.replace(" ", "_")
    tag_suffix = "_Faculty" if include_tags else ""
    download_filename = f"{paper.subject.subject_name}_{clean_set_name}_{template_id}{tag_suffix}.pdf"

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=download_filename
    )


@router.get("/{paper_id}/set/{set_id}/docx")
def download_set_docx(
    paper_id: int,
    set_id: int,
    include_tags: bool = Query(False, description="Include CO/Bloom/Module metadata tags"),
    template_id: str = Query("autonomous_obe", description="Selected Institute Template ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper_set = db.query(PaperSet).filter(
        PaperSet.id == set_id,
        PaperSet.paper_id == paper_id
    ).first()
    if not paper_set:
        raise HTTPException(status_code=404, detail="Set not found")

    file_path = export_set_to_docx(paper, paper_set, include_tags=include_tags, template_id=template_id)
    clean_set_name = paper_set.set_label.replace(" ", "_")
    tag_suffix = "_Faculty" if include_tags else ""
    download_filename = f"{paper.subject.subject_name}_{clean_set_name}_{template_id}{tag_suffix}.docx"

    return FileResponse(
        path=file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=download_filename
    )


@router.get("/{paper_id}/bundle")
def download_all_sets_bundle(
    paper_id: int,
    format: str = Query("pdf", pattern="^(pdf|docx)$"),
    include_tags: bool = Query(False),
    template_id: str = Query("autonomous_obe", description="Selected Institute Template ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.user_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    zip_path = export_all_sets_bundle(paper, fmt=format, include_tags=include_tags, template_id=template_id)
    download_filename = f"{paper.subject.subject_name}_All_Sets_{template_id}_{format.upper()}.zip"

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=download_filename
    )
