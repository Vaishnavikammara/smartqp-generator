import re
import os
from pathlib import Path
from typing import List, Dict, Any, Tuple
import pymupdf  # PyMuPDF
import docx
from PIL import Image
import io

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


class DocumentProcessingError(Exception):
    """Custom exception for document parsing failures."""
    pass


def clean_text(text: str) -> str:
    """Preprocess and clean extracted text from documents."""
    if not text:
        return ""
    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Remove repeated blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove non-printable or strange control characters except tabs and newlines
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # Fix broken hyphenated words at line breaks (e.g., "infor- \n mation" -> "information")
    text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
    # Normalize consecutive spaces
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_text_from_pdf(file_path: str) -> Tuple[str, bool]:
    """
    Extracts text from PDF using PyMuPDF.
    If pages contain negligible text, attempts OCR using Tesseract if installed.
    Returns: (extracted_text, used_ocr)
    """
    try:
        doc = pymupdf.open(file_path)
    except Exception as e:
        raise DocumentProcessingError(f"Failed to open PDF document: {str(e)}")

    if len(doc) == 0:
        raise DocumentProcessingError("The uploaded PDF has 0 pages and appears empty.")

    full_text_parts = []
    needs_ocr = False
    pages_with_sparse_text = 0

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_text = page.get_text("text").strip()
        if len(page_text) < 40:
            pages_with_sparse_text += 1
        full_text_parts.append(page_text)

    # If more than 60% of pages have sparse text, attempt OCR
    combined_raw = "\n\n".join(full_text_parts).strip()
    if len(combined_raw) < 100 or (pages_with_sparse_text / max(1, len(doc))) > 0.6:
        needs_ocr = True

    used_ocr = False
    if needs_ocr and PYTESSERACT_AVAILABLE:
        try:
            ocr_parts = []
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_text = pytesseract.image_to_string(img)
                if ocr_text.strip():
                    ocr_parts.append(ocr_text.strip())
            if ocr_parts:
                combined_ocr = "\n\n".join(ocr_parts).strip()
                if len(combined_ocr) > len(combined_raw):
                    combined_raw = combined_ocr
                    used_ocr = True
        except Exception:
            # Fall back to whatever raw text was extracted
            pass

    cleaned = clean_text(combined_raw)
    if not cleaned or len(cleaned) < 15:
        raise DocumentProcessingError(
            "Could not extract readable text from the PDF. It may be password-protected, corrupt, or contain low-resolution unreadable scans."
        )

    return cleaned, used_ocr


def extract_text_from_docx(file_path: str) -> str:
    """Extracts text from DOCX using python-docx, including paragraphs and tables."""
    try:
        doc = docx.Document(file_path)
    except Exception as e:
        raise DocumentProcessingError(f"Failed to open DOCX document: {str(e)}")

    parts = []
    # Extract paragraphs
    for p in doc.paragraphs:
        if p.text.strip():
            parts.append(p.text.strip())

    # Extract tables
    for table in doc.tables:
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_cells:
                parts.append(" | ".join(row_cells))

    combined = "\n\n".join(parts)
    cleaned = clean_text(combined)
    if not cleaned or len(cleaned) < 15:
        raise DocumentProcessingError(
            "The DOCX document is empty or does not contain readable text."
        )
    return cleaned


def extract_text_from_doc(file_path: str) -> str:
    """Extract text from legacy .doc files using binary heuristic extraction."""
    try:
        with open(file_path, "rb") as f:
            content = f.read()
        # Decode strings with printable ascii and common unicode
        ascii_matches = re.findall(rb"[\x20-\x7E\t\n\r]{4,}", content)
        decoded = [m.decode("latin1", errors="ignore") for m in ascii_matches]
        combined = "\n".join(decoded)
        cleaned = clean_text(combined)
        if len(cleaned) > 50:
            return cleaned
        raise DocumentProcessingError("Legacy .DOC file could not be parsed. Please re-save as modern .DOCX or .PDF.")
    except Exception as e:
        raise DocumentProcessingError(f"Error parsing legacy .DOC file: {str(e)}")


def extract_text_from_file(file_path: str, filename: str) -> Tuple[str, bool]:
    """Unified document text extractor with format detection and validation."""
    ext = Path(filename).suffix.lower()
    used_ocr = False

    if ext == ".pdf":
        text, used_ocr = extract_text_from_pdf(file_path)
    elif ext == ".docx":
        text = extract_text_from_docx(file_path)
    elif ext == ".doc":
        text = extract_text_from_doc(file_path)
    elif ext in {".txt", ".md"}:
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                raw = f.read()
            text = clean_text(raw)
            if not text:
                raise DocumentProcessingError("Text file is empty.")
        except Exception as e:
            raise DocumentProcessingError(f"Error reading text file: {str(e)}")
    else:
        raise DocumentProcessingError(
            f"Unsupported file format '{ext}'. Please upload PDF, DOCX, or DOC files."
        )

    return text, used_ocr


def chunk_text(text: str, chunk_size_words: int = 250, overlap_words: int = 50) -> List[str]:
    """
    Split text into logical topic/section chunks with overlap.
    Preserves paragraph and sentence boundaries wherever possible.
    """
    if not text:
        return []

    # First split by paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]

    chunks = []
    current_chunk = []
    current_word_count = 0

    for para in paragraphs:
        para_words = para.split()
        if current_word_count + len(para_words) <= chunk_size_words:
            current_chunk.append(para)
            current_word_count += len(para_words)
        else:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
            # Start new chunk with overlap if possible
            if len(para_words) > chunk_size_words:
                # Subdivide very long paragraph
                words = para_words
                start = 0
                while start < len(words):
                    end = start + chunk_size_words
                    chunks.append(" ".join(words[start:end]))
                    start = end - overlap_words if end < len(words) else end
                current_chunk = []
                current_word_count = 0
            else:
                current_chunk = [para]
                current_word_count = len(para_words)

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks
