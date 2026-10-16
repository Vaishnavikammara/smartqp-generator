import re
from typing import Dict, Any, List, Optional
import docx

DEFAULT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "autonomous_obe": {
        "id": "autonomous_obe",
        "name": "Autonomous College – NBA / NAAC Outcome-Based Education (OBE) Format",
        "header_title": "OFFICE OF THE CONTROLLER OF EXAMINATIONS",
        "header_subtitle": "AUTONOMOUS END SEMESTER EXAMINATIONS",
        "show_usn_box": True,
        "show_obe_columns": True, # Displays CO and Bloom's Level (BL) columns in table
        "sections": [
            {"name": "PART – A", "heading": "Answer ALL Questions (Short Answer)", "max_marks": 20},
            {"name": "PART – B", "heading": "Answer ALL Questions (Descriptive / Analytical)", "max_marks": 80}
        ],
        "instructions": (
            "1. Answer ALL questions.\n"
            "2. Part A carries 2 marks each; Part B carries comprehensive evaluation.\n"
            "3. Mention Course Outcomes (CO) and Bloom's Taxonomy Levels (BTL) appropriately.\n"
            "4. Assume suitable data if necessary and state them clearly."
        ),
        "sign_off_blocks": ["Course Coordinator", "Module Lead", "Head of the Department (HOD)"]
    },
    "vtu_anna_univ": {
        "id": "vtu_anna_univ",
        "name": "State Technological University Format (VTU / Anna University)",
        "header_title": "UNIVERSITY EXAMINATIONS",
        "header_subtitle": "SEMESTER END THEORY EXAMINATION",
        "show_usn_box": True,
        "show_obe_columns": True,
        "instructions": (
            "1. Answer any FIVE full questions, choosing ONE full question from each module.\n"
            "2. Missing data, if any, may be suitably assumed.\n"
            "3. Use of non-programmable scientific calculator is permitted."
        ),
        "sign_off_blocks": ["Examiner Signature", "Chief Superintendent"]
    },
    "presidency_univ": {
        "id": "presidency_univ",
        "name": "Presidency University Standard Format",
        "header_title": "PRESIDENCY UNIVERSITY",
        "header_subtitle": "SCHOOL OF ENGINEERING • DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING",
        "show_usn_box": True,
        "show_obe_columns": False,
        "instructions": (
            "1. Answer all questions.\n"
            "2. Figures to the right indicate full marks.\n"
            "3. Programmable calculators and electronic gadgets are strictly prohibited."
        ),
        "sign_off_blocks": ["Course Instructor", "Program Chair"]
    },
    "iit_nit_minimal": {
        "id": "iit_nit_minimal",
        "name": "National Institute / IIT Minimalist Format",
        "header_title": "INSTITUTE OF TECHNOLOGY",
        "header_subtitle": "ACADEMIC MID-TERM / COMPREHENSIVE EXAMINATION",
        "show_usn_box": False,
        "show_obe_columns": False,
        "instructions": (
            "Academic Integrity: By taking this exam, you agree to abide by the Institute Honor Code.\n"
            "Write your solutions clearly, demonstrating step-by-step reasoning."
        ),
        "sign_off_blocks": []
    }
}


CUSTOM_TEMPLATES: Dict[str, Dict[str, Any]] = {}


def register_custom_template(template_data: Dict[str, Any]) -> str:
    """Registers or updates a custom institute template."""
    template_id = template_data.get("id") or f"custom_{len(CUSTOM_TEMPLATES) + 1}"
    template_data["id"] = template_id
    CUSTOM_TEMPLATES[template_id] = template_data
    return template_id


def get_all_templates() -> List[Dict[str, Any]]:
    """Returns all default and custom templates."""
    all_tpls = list(DEFAULT_TEMPLATES.values()) + list(CUSTOM_TEMPLATES.values())
    return all_tpls


def get_template(template_id: str, custom_override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Retrieve template by ID with optional custom overrides."""
    if template_id in CUSTOM_TEMPLATES:
        base = CUSTOM_TEMPLATES[template_id].copy()
    elif template_id in DEFAULT_TEMPLATES:
        base = DEFAULT_TEMPLATES[template_id].copy()
    else:
        base = DEFAULT_TEMPLATES["autonomous_obe"].copy()

    if custom_override:
        base.update({k: v for k, v in custom_override.items() if v is not None})
    return base


def parse_uploaded_template_docx(file_path: str) -> Dict[str, Any]:
    """
    Parses an uploaded institute template document (.docx or .txt)
    Extracts headers, examination title, instructions, and table structures.
    """
    try:
        if file_path.lower().endswith(".txt"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = [line.strip() for line in f if line.strip()]
            header_title = lines[0] if len(lines) > 0 else "INSTITUTION OF HIGHER EDUCATION"
            header_subtitle = lines[1] if len(lines) > 1 else "EXAMINATION PAPER"
            instructions_lines = [l for l in lines[2:] if "instruction" in l.lower() or "note" in l.lower() or "answer" in l.lower()]
            instructions_text = "\n".join(instructions_lines[:5]) if instructions_lines else "Answer all questions. Figures to the right indicate full marks."
        else:
            doc = docx.Document(file_path)
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            
            header_title = paragraphs[0] if len(paragraphs) > 0 else "INSTITUTION OF HIGHER EDUCATION"
            header_subtitle = paragraphs[1] if len(paragraphs) > 1 else "EXAMINATION PAPER"
            
            # Look for instructions
            instructions_lines = []
            found_instructions = False
            for p in paragraphs:
                if "instruction" in p.lower() or "note:" in p.lower():
                    found_instructions = True
                    continue
                if found_instructions:
                    if len(instructions_lines) < 4:
                        instructions_lines.append(p)
                    else:
                        break

            instructions_text = "\n".join(instructions_lines) if instructions_lines else "Answer all questions. Figures to the right indicate full marks."

        template_id = f"custom_uploaded_{abs(hash(header_title)) % 100000}"
        result = {
            "id": template_id,
            "name": f"Uploaded: {header_title[:32]}",
            "header_title": header_title,
            "header_subtitle": header_subtitle,
            "show_usn_box": True,
            "show_obe_columns": True,
            "instructions": instructions_text,
            "sign_off_blocks": ["Faculty Signature", "HOD Signature"]
        }
        register_custom_template(result)
        return result
    except Exception as e:
        default_custom = {
            "id": "custom_uploaded_default",
            "name": "Custom Uploaded Template",
            "header_title": "INSTITUTION OF HIGHER EDUCATION",
            "header_subtitle": "EXAMINATION PAPER",
            "show_usn_box": True,
            "show_obe_columns": True,
            "instructions": "Answer all questions. Figures to the right indicate full marks.",
            "sign_off_blocks": ["Faculty Signature", "HOD Signature"],
            "error": str(e)
        }
        register_custom_template(default_custom)
        return default_custom
