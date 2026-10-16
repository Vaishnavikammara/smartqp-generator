# SmartQP – AI-Based Intelligent Question Paper Generation System

SmartQP is an end-to-end, modern, accessible, and intelligent web application designed for university faculty members to generate curriculum-aligned, syllabus-grounded, multi-set examination question papers with automated non-repetition, Bloom's Taxonomy tagging, and one-click PDF/DOCX exports.

---

## 🌟 Key Features

1. **Authentication & Tenant Isolation**:
   - Secure faculty registration with Full Name, Institute Email, Institute Name, Department, and Password.
   - Native Bcrypt password hashing and JWT (JSON Web Token) authentication with 24-hour expiration.
   - Complete tenant isolation ensuring faculty members only access their own subjects, modules, question papers, and drafts.
   - Built-in "Forgot Password" self-service reset.

2. **Faculty Dashboard**:
   - Real-time statistics: Total Question Papers, Approved Papers, Drafts in Progress, and Saved Course Plans.
   - Filterable paper repository (All, Drafts, Approved).
   - Saved Course Plans manager for rapid syllabus re-use.
   - Status tracking with interactive validation badges.

3. **Step-by-Step Question Paper Generator Wizard**:
   - **Step 1 (Institute & Subject Details)**: Institute name, department, course/program, subject name, subject code, semester, academic year, examination title, and optional Course Outcome (CO) syllabus definitions. Quick-fill from saved course plans.
   - **Step 2 (Multi-Module Syllabus Upload & Text Extraction)**:
     - Add multiple modules individually (e.g. Module 1 – DBMS Intro, Module 2 – SQL, Module 3 – Normalization, Module 4 – Transactions, Module 5 – Storage & Indexing).
     - Upload documents in PDF, DOCX, DOC, or TXT format.
     - Fast extraction via **PyMuPDF** (`pymupdf`) and **python-docx**.
     - Optical Character Recognition (OCR) fallback via **Tesseract OCR** for scanned documents.
     - Text cleaning, unicode normalization, hyphen de-breaking, and chunking with overlap.
     - In-line editable review textarea so faculty can review or refine extracted topics before generation.
     - "Include in Paper" checkboxes for each module.
     - "Load Sample DBMS Syllabus" button for 1-click testing.
   - **Step 3 (Multi-Set & Marks Bounds Configuration)**:
     - Select number of sets (Set A, Set B, Set C, Set D).
     - Target Total Marks per set (e.g. 100 Marks, 50 Marks, 25 Marks).
     - Examination duration (e.g. 180 Minutes).
     - Custom examination instructions.
     - Uniqueness Cosine Similarity Threshold slider (default `0.85`).
   - **Step 4 (Custom Question & Marks Distribution Matrix)**:
     - Dynamic category builder: Question Type (Short Answer, Descriptive, Numerical, Application-Based, Case-Based, Custom), Marks per question (2, 3, 5, 8, 10, 15, etc.), Number of questions, Difficulty (Easy, Medium, Hard, Balanced), Bloom's Taxonomy Level (Remember, Understand, Apply, Analyze, Evaluate, Create), and Target CO (e.g. CO1, CO2).
     - Dynamic **Module × Category Matrix**: Specify exact question counts required from each module for every question type.
     - Real-time calculated marks vs target marks comparison with difference explanation and generation protection if mismatched.
   - **Step 5 (AI Generation Progress Tracker)**:
     - Multi-stage visual progress: RAG chunking & indexing, Gemini synthesis, cross-set similarity audit, and rule engine validation.

4. **AI-Based Question Synthesis with Google Gemini Flash**:
   - Official Google Gemini API integration supporting configurable model names (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-3.8-flash`).
   - Retrieval-Augmented Generation (RAG) grounding prompts strictly in syllabus chunks.
   - Strict avoidance of external out-of-syllabus content.
   - Dynamic Gemini API Key modal with live connection test and model selector.

5. **Multi-Set Non-Repetition & Uniqueness Engine**:
   - Cross-set deduplication: Set A questions are unique; Set B cannot repeat Set A; Set C cannot repeat Set A or Set B; Set D cannot repeat earlier sets.
   - Composite similarity scoring combining TF-IDF character/word n-gram cosine similarity and token Jaccard overlap.
   - Automated replacement loop with configurable retry limit (`MAX_RETRY_COUNT = 4`).
   - Insufficient unique questions are flagged with warning badges for faculty review rather than silently accepted.

6. **Automated Academic Validation Engine**:
   - Rule checks before paper approval:
     • Total Marks verification per set.
     • Question counts and pattern compliance.
     • Module coverage across syllabus.
     • Cross-set duplicate and semantic similarity verification (< 0.85).
     • Bloom's Taxonomy diversity.
     • Difficulty distribution balance.
     • Structural equivalence across all sets.
   - Detailed Validation Report dialog with Passed, Warning, and Failed indicators.

7. **Faculty Review & Examination Paper Layout**:
   - Academic exam-paper format preview with institutional header, metadata table, instructions, question table, and right-aligned marks.
   - In-line question editing (text, marks, module, Bloom's level, difficulty).
   - Single-question AI regeneration on demand.
   - Delete questions with automatic question re-numbering.
   - Side-by-side multi-set comparator (`/papers/:id/compare`).
   - Save as Draft or Approve Question Paper.

8. **Export Engine (PDF & DOCX)**:
   - High-quality academic PDF export powered by **ReportLab** with running page headers and "Page X of Y" canvas footers.
   - Formatted Word document export (`.docx`) powered by **python-docx**.
   - Student mode (clean exam paper) vs Faculty mode (includes `[Module | CO | Bloom | Difficulty]` tags).
   - Single set downloads and one-click **All Sets ZIP Bundle**.

9. **Evaluation Dataset & Benchmark Calibrator**:
   - Dedicated `/evaluation` page with sample syllabus excerpts and labeled questions.
   - Interactive similarity threshold calibrator (testing 0.50 to 0.95) with confusion matrix accuracy on duplicate vs distinct question pairs.

---

## 🏗️ Architecture & Technology Stack

```
SmartQP/
├── backend/
│   ├── app/
│   │   ├── config.py             # Environment configuration (Gemini model, DB URL, similarity threshold)
│   │   ├── database.py           # SQLAlchemy database session & engine (SQLite / PostgreSQL)
│   │   ├── models.py             # Relational data models (Users, Subjects, Modules, Papers, Questions, Logs)
│   │   ├── schemas.py            # Pydantic validation schemas
│   │   ├── auth.py               # Native bcrypt password hashing & JWT auth
│   │   ├── services/
│   │   │   ├── doc_parser.py     # PyMuPDF, python-docx, OCR fallback, text cleaning & chunking
│   │   │   ├── rag_engine.py     # Syllabus RAG index and chunk retriever
│   │   │   ├── gemini_client.py  # Google Gemini Flash API client with connection test & fallbacks
│   │   │   ├── uniqueness.py     # Sentence embedding & Cosine Similarity uniqueness engine
│   │   │   ├── validator.py      # Automated academic rule validation engine
│   │   │   └── exporter.py       # ReportLab PDF & python-docx exam paper generator
│   │   ├── routers/
│   │   │   ├── auth_router.py    # Login, signup, forgot password, profile, API key settings
│   │   │   ├── modules_router.py # Subjects & Module upload / text review / CRUD
│   │   │   ├── papers_router.py  # Generation, question review, edit, regenerate, re-validate
│   │   │   ├── export_router.py  # PDF, DOCX, and ZIP bundle downloads
│   │   │   └── evaluation_router.py # Benchmark runner & dataset API
│   │   └── main.py               # FastAPI application with CORS & SPA fallback mount
│   ├── tests/
│   │   ├── test_smartqp.py       # Unit tests for parser, uniqueness, validator, exporter
│   │   └── test_e2e_flow.py      # Complete End-to-End API integration test
│   ├── evaluation_dataset.json   # Labeled syllabus excerpts, questions, and duplicate pairs
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variables template
│   └── .env                      # Local environment configuration
├── frontend/
│   ├── src/
│   │   ├── api/client.ts         # Axios API client with JWT interceptor
│   │   ├── context/AuthContext.tsx # Authentication state provider
│   │   ├── components/           # Navbar, Sidebar, Modal, ApiKeyModal, ValidationBadge
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CreatePaper/      # Steps 1–5 Wizard
│   │   │   ├── PaperReview.tsx   # Exam paper layout, inline edit, regeneration, exports
│   │   │   ├── PaperCompare.tsx  # Side-by-side cross-set comparison
│   │   │   ├── SavedPapers.tsx   # Filterable paper repository
│   │   │   ├── CoursePlans.tsx   # Course plan & module manager
│   │   │   └── EvaluationBenchmark.tsx # Threshold calibrator
│   │   ├── App.tsx               # React Router configuration
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── run_app.py                    # Unified application launcher
├── run_app.bat                   # 1-click Windows runner
├── Dockerfile                    # Multi-stage production container build
├── docker-compose.yml            # Multi-container setup with PostgreSQL
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Python 3.11–3.13 recommended)
- Node.js 18+ (for frontend development if running separately)

### 1. Instant Run (Unified Server)
The frontend build is pre-compiled into `frontend/dist`. You can launch the full application with a single command:

```powershell
# Using the pre-configured virtual environment
& ".\venv\Scripts\python.exe" run_app.py
```
Or simply double-click `run_app.bat` on Windows!

Open your browser at:
- **Application URL**: `http://localhost:8000`
- **Interactive API Docs (Swagger)**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

---

## ⚙️ Configuration & Environment Variables

Copy `backend/.env.example` to `backend/.env` (or project root `.env`):

```ini
# Security
SECRET_KEY=your-production-jwt-secret-key-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database (SQLite default for zero-friction local dev; PostgreSQL supported)
DATABASE_URL=sqlite:///./smartqp.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/smartqp_db

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Multi-Set Uniqueness & Similarity
SIMILARITY_THRESHOLD=0.85
MAX_RETRY_COUNT=4
```

> **Tip:** You do not need to manually edit `.env` for your Gemini API key! You can click the **"Configure Gemini Key"** badge directly in the top navigation bar of the application to test and save your key interactively.

---

## 🧪 Running Automated Tests

Run the test suite verifying document extraction, semantic cosine uniqueness, automated rule validation, ReportLab/python-docx generation, and the complete E2E workflow:

```powershell
# Run all unit and integration tests
& ".\venv\Scripts\python.exe" -m unittest discover backend/tests
```

Both test suites:
- `backend/tests/test_smartqp.py` (Parser, Uniqueness Engine, Rule Validator, PDF & DOCX generation)
- `backend/tests/test_e2e_flow.py` (Signup, Subject, Modules, Multi-Set Generation, Validation, Export)

Pass with 100% success.

---

## 🌐 Public Deployment Guide

SmartQP is ready for public deployment as a secure multi-user SaaS platform:

### Option A: Docker & Docker Compose (Recommended)
```bash
# Start PostgreSQL and SmartQP
docker-compose up --build -d
```
The application will be available on port `8000`.

### Option B: Cloud Platforms (Render / Railway / Fly.io)
1. **Build Command**:
   ```bash
   cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
   ```
2. **Start Command**:
   ```bash
   python run_app.py
   ```
3. **Environment Variables**:
   - `DATABASE_URL`: Your managed PostgreSQL connection URL (e.g. from Supabase, Neon, or Render Postgres).
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `GEMINI_MODEL`: `gemini-2.5-flash`.
   - `SECRET_KEY`: A secure random string for JWT signing.
   - `PORT`: Set automatically by the cloud host.

---

## 🎓 Complete Faculty User Workflow

1. **Sign Up / Login**: Register with your name, institute email, institute name, and password.
2. **Dashboard**: Access quick stats, recent papers, and saved course plans.
3. **Configure Gemini API**: Click the key badge in the top-right header and paste your Google AI Studio API key.
4. **Create Question Paper**:
   - Enter institute, department, course, and subject metadata.
   - Upload syllabus documents for each module or click "Load Sample DBMS Syllabus". Review extracted text.
   - Set the number of sets (Set A, Set B, Set C, Set D) and target marks (e.g. 100 Marks).
   - Define custom question types, marks per question, and the module distribution matrix. Check the real-time marks calculator.
   - Click **Generate Multi-Set Question Papers**.
5. **AI Generation & Verification**:
   - SmartQP retrieves syllabus chunks via RAG, queries Gemini Flash, computes cross-set cosine similarity, replaces duplicate questions, and runs the rule engine.
6. **Review, Edit & Compare**:
   - Inspect questions in academic layout.
   - Edit, delete, or regenerate any individual question.
   - View the Automated Validation Report.
   - Compare Set A vs Set B side-by-side.
7. **Approve & Export**:
   - Click "Approve Paper".
   - Download individual sets as PDF or DOCX (with or without faculty metadata tags).
   - Download all sets together in a single ZIP bundle.
