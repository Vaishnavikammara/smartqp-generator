import os
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.auth import get_current_user
from app.models import User
from app.config import UPLOAD_DIR
from app.services.template_service import (
    get_all_templates,
    get_template,
    parse_uploaded_template_docx,
    register_custom_template
)

router = APIRouter(prefix="/api/templates", tags=["Institute Templates"])


class CustomTemplateCreate(BaseModel):
    name: Optional[str] = "Custom Institute Template"
    header_title: str
    header_subtitle: Optional[str] = "SEMESTER END EXAMINATION"
    show_usn_box: bool = True
    show_obe_columns: bool = True
    instructions: Optional[str] = "Answer all questions. Figures to the right indicate full marks."
    sign_off_blocks: Optional[List[str]] = ["Course Coordinator", "HOD"]


@router.get("", response_model=List[Dict[str, Any]])
def list_templates():
    """Returns all available institute templates (built-in presets and custom uploaded)."""
    return get_all_templates()


@router.get("/{template_id}")
def get_template_details(template_id: str):
    """Retrieves full layout details of a specific institute template."""
    return get_template(template_id)


@router.post("/upload")
async def upload_institute_template(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an institute question paper template (.docx or .txt).
    Extracts headers, instructions, USN configuration, and registers it.
    """
    filename = file.filename or "template.docx"
    ext = Path(filename).suffix.lower()
    if ext not in [".docx", ".doc", ".txt"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported template format. Please upload a .docx Word document or .txt template."
        )

    temp_path = UPLOAD_DIR / f"inst_tpl_{current_user.id}_{filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        parsed_tpl = parse_uploaded_template_docx(str(temp_path))
        return {
            "message": "Template uploaded and analyzed successfully",
            "template": parsed_tpl
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process template file: {str(e)}")
    finally:
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.post("/custom")
def create_custom_template(
    payload: CustomTemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Save user-configured institute template parameters."""
    tpl_dict = payload.model_dump()
    tpl_id = f"custom_user_{current_user.id}_{abs(hash(payload.header_title)) % 10000}"
    tpl_dict["id"] = tpl_id
    register_custom_template(tpl_dict)
    return {
        "message": "Custom institute template registered",
        "template": tpl_dict
    }
