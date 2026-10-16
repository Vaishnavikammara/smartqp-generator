# Multi-stage Docker build for SmartQP on Render
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Final Image
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (Tesseract OCR, fonts, build-essential)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    fonts-dejavu-core \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy Backend Code
COPY backend/ ./backend/
COPY run_app.py ./

# Copy built frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PORT=10000
ENV HOST=0.0.0.0
ENV PYTHONPATH=/app/backend

EXPOSE 10000

CMD ["python", "run_app.py"]
