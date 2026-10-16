from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.config import GEMINI_MODEL, GEMINI_API_KEY
from app.routers import (
    auth_router,
    modules_router,
    papers_router,
    export_router,
    evaluation_router,
    template_router
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartQP – AI-Based Intelligent Question Paper Generator",
    description="Intelligent Question Paper Generation with Multi-Set Uniqueness, RAG, and Rule Validation",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Register Routers
app.include_router(auth_router.router)
app.include_router(modules_router.router)
app.include_router(papers_router.router)
app.include_router(export_router.router)
app.include_router(evaluation_router.router)
app.include_router(template_router.router)

@app.get("/api/health")
def health_check():
    has_api_key = bool(GEMINI_API_KEY and GEMINI_API_KEY.strip())
    return {
        "status": "healthy",
        "database": "connected",
        "gemini_api_configured": has_api_key,
        "active_gemini_model": GEMINI_MODEL,
        "service": "SmartQP Backend API"
    }

from fastapi.responses import FileResponse, JSONResponse
from fastapi import HTTPException

# Mount Frontend Build if available
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
assets_dir = frontend_dist / "assets"

if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Do not intercept API routes
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    file_path = frontend_dist / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {
        "app": "SmartQP – AI-Based Intelligent Question Paper Generator",
        "status": "online",
        "docs_url": "/docs",
        "api_health": "/api/health"
    }
