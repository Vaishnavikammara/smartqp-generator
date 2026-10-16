import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend folder
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Security & Auth
SECRET_KEY = os.getenv("SECRET_KEY", "smartqp-faculty-secure-jwt-key-change-in-prod-2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

# Database Configuration (PostgreSQL supported, SQLite default for zero-friction setup)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'smartqp.db'}")

# AI / Gemini Configuration
# Configurable model ID verified against Google Gemini API catalog
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Multi-Set Uniqueness & Similarity
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.85"))
MAX_RETRY_COUNT = int(os.getenv("MAX_RETRY_COUNT", "4"))

# Storage & Uploads
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", BASE_DIR / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_DIR = Path(BASE_DIR / "exports")
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file extensions for course plan uploads
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "25"))
