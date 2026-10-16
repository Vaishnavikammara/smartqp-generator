from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    institute_name = Column(String(255), nullable=False)
    department = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subjects = relationship("SubjectCoursePlan", back_populates="user", cascade="all, delete-orphan")
    papers = relationship("QuestionPaper", back_populates="user", cascade="all, delete-orphan")

class SubjectCoursePlan(Base):
    __tablename__ = "subject_course_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institute_name = Column(String(255), nullable=False)
    department_name = Column(String(255), nullable=False)
    course_name = Column(String(255), nullable=False)
    subject_name = Column(String(255), nullable=False)
    subject_code = Column(String(100), nullable=True)
    semester = Column(String(100), nullable=True)
    academic_year = Column(String(100), nullable=True)
    examination_name = Column(String(255), nullable=True)
    co_definitions = Column(Text, nullable=True)  # JSON or newline-separated CO definitions
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="subjects")
    modules = relationship("Module", back_populates="subject", cascade="all, delete-orphan", order_by="Module.module_number")
    papers = relationship("QuestionPaper", back_populates="subject", cascade="all, delete-orphan")

class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subject_course_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    module_number = Column(Integer, nullable=False)
    module_name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    extracted_text = Column(Text, nullable=False, default="")
    is_included = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subject = relationship("SubjectCoursePlan", back_populates="modules")
    chunks = relationship("ModuleChunk", back_populates="module", cascade="all, delete-orphan")

class ModuleChunk(Base):
    __tablename__ = "module_chunks"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)

    module = relationship("Module", back_populates="chunks")

class QuestionPaper(Base):
    __tablename__ = "question_papers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subject_course_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    examination_name = Column(String(255), nullable=True)
    total_marks = Column(Integer, nullable=False)
    duration_minutes = Column(Integer, nullable=True, default=180)
    num_sets = Column(Integer, nullable=False, default=1)
    instructions = Column(Text, nullable=True)
    status = Column(String(50), default="draft")  # draft, validated, approved
    config_json = Column(Text, nullable=True)  # Serialized distribution config
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="papers")
    subject = relationship("SubjectCoursePlan", back_populates="papers")
    sets = relationship("PaperSet", back_populates="paper", cascade="all, delete-orphan")
    validation_logs = relationship("ValidationLog", back_populates="paper", cascade="all, delete-orphan")

class PaperSet(Base):
    __tablename__ = "paper_sets"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("question_papers.id", ondelete="CASCADE"), nullable=False, index=True)
    set_label = Column(String(50), nullable=False)  # "Set A", "Set B", etc.
    total_marks = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    paper = relationship("QuestionPaper", back_populates="sets")
    questions = relationship("Question", back_populates="paper_set", cascade="all, delete-orphan", order_by="Question.question_number")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    set_id = Column(Integer, ForeignKey("paper_sets.id", ondelete="CASCADE"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    question_type = Column(String(100), nullable=False)  # short answer, descriptive, numerical, etc.
    marks = Column(Integer, nullable=False)
    module_id = Column(Integer, nullable=True)
    module_name = Column(String(255), nullable=False)
    question_text = Column(Text, nullable=False)
    co_level = Column(String(50), nullable=True)  # CO1, CO2, etc.
    bloom_level = Column(String(50), nullable=True)  # Remember, Understand, Apply, etc.
    difficulty = Column(String(50), nullable=True)  # Easy, Medium, Hard
    syllabus_reference = Column(Text, nullable=True)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    paper_set = relationship("PaperSet", back_populates="questions")

class ValidationLog(Base):
    __tablename__ = "validation_logs"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("question_papers.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)  # passed, warning, failed
    message = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    paper = relationship("QuestionPaper", back_populates="validation_logs")
