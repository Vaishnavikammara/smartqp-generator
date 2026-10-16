from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Authentication Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    institute_name: str = Field(..., min_length=2, max_length=255)
    department: Optional[str] = None
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)

class ApiKeyUpdateRequest(BaseModel):
    gemini_api_key: str
    gemini_model: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    institute_name: str
    department: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Module & Subject Schemas ---
class ModuleCreate(BaseModel):
    module_number: int
    module_name: str
    extracted_text: Optional[str] = ""
    is_included: bool = True

class ModuleUpdate(BaseModel):
    module_name: Optional[str] = None
    extracted_text: Optional[str] = None
    is_included: Optional[bool] = None

class ModuleOut(BaseModel):
    id: int
    subject_id: int
    module_number: int
    module_name: str
    original_filename: Optional[str] = None
    file_path: Optional[str] = None
    extracted_text: str
    is_included: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SubjectCreate(BaseModel):
    institute_name: str
    department_name: str
    course_name: str
    subject_name: str
    subject_code: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    examination_name: Optional[str] = None
    co_definitions: Optional[str] = None

class SubjectOut(BaseModel):
    id: int
    institute_name: str
    department_name: str
    course_name: str
    subject_name: str
    subject_code: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    examination_name: Optional[str] = None
    co_definitions: Optional[str] = None
    created_at: datetime
    modules: List[ModuleOut] = []

    class Config:
        from_attributes = True

# --- Question & Paper Configuration Schemas ---
class MarksCategoryConfig(BaseModel):
    category_id: str
    name: str = "2-Mark Questions"
    question_type: str = "short answer"  # short answer, descriptive, numerical, application-based, case-based, custom
    marks_per_question: int = Field(..., gt=0)
    num_questions: int = Field(..., ge=0)
    # Mapping of module_id (or module_number string) to number of questions required from that module
    module_distribution: Dict[str, int] = {}
    difficulty: Optional[str] = "Medium"  # Easy, Medium, Hard, Balanced
    bloom_level: Optional[str] = None    # Remember, Understand, Apply, Analyze, Evaluate, Create
    co_level: Optional[str] = None       # e.g., CO1, CO2, CO3

class GeneratePaperRequest(BaseModel):
    subject_id: int
    examination_name: Optional[str] = "End Semester Examination"
    duration_minutes: Optional[int] = 180
    num_sets: int = Field(..., ge=1, le=6)
    target_total_marks: int = Field(..., gt=0)
    categories: List[MarksCategoryConfig]
    instructions: Optional[str] = "1. Answer all questions. 2. Figures to the right indicate full marks."
    similarity_threshold: Optional[float] = 0.85

class QuestionUpdate(BaseModel):
    question_text: str
    marks: Optional[int] = None
    question_type: Optional[str] = None
    module_name: Optional[str] = None
    co_level: Optional[str] = None
    bloom_level: Optional[str] = None
    difficulty: Optional[str] = None

class QuestionOut(BaseModel):
    id: int
    set_id: int
    question_number: int
    question_type: str
    marks: int
    module_id: Optional[int] = None
    module_name: str
    question_text: str
    co_level: Optional[str] = None
    bloom_level: Optional[str] = None
    difficulty: Optional[str] = None
    syllabus_reference: Optional[str] = None
    is_flagged: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class PaperSetOut(BaseModel):
    id: int
    paper_id: int
    set_label: str
    total_marks: int
    created_at: datetime
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True

class ValidationLogOut(BaseModel):
    id: int
    paper_id: int
    rule_name: str
    status: str  # passed, warning, failed
    message: str
    details_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ValidationReportOut(BaseModel):
    paper_id: int
    overall_status: str  # passed, warning, failed
    passed_count: int
    warning_count: int
    failed_count: int
    logs: List[ValidationLogOut]

class QuestionPaperOut(BaseModel):
    id: int
    user_id: int
    subject_id: int
    title: str
    examination_name: Optional[str] = None
    total_marks: int
    duration_minutes: Optional[int] = 180
    num_sets: int
    instructions: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    subject: Optional[SubjectOut] = None
    sets: List[PaperSetOut] = []
    validation_logs: List[ValidationLogOut] = []

    class Config:
        from_attributes = True

class QuestionPaperListItem(BaseModel):
    id: int
    title: str
    subject_name: str
    course_name: str
    institute_name: str
    total_marks: int
    num_sets: int
    status: str
    created_at: datetime
    sets_count: int

    class Config:
        from_attributes = True
