"""
SmartQP – Application Launcher
Runs the complete unified SmartQP Fullstack Application (Frontend + FastAPI Backend).
Accessible at: http://localhost:8000
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    print("\n" + "=" * 65)
    print(" SmartQP – AI-Based Intelligent Question Paper Generation System")
    print("=" * 65)
    print(f" * Server running on: http://127.0.0.1:{port}")
    print(f" * API Health Check:  http://127.0.0.1:{port}/api/health")
    print(f" * Swagger API Docs:  http://127.0.0.1:{port}/docs")
    print("=" * 65 + "\n")

    uvicorn.run("app.main:app", host=host, port=port, reload=False, app_dir=str(backend_dir))
