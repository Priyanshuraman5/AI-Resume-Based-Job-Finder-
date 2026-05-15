from io import BytesIO
from typing import Literal

import docx
import pdfplumber


SupportedMime = Literal[
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]


def parse_pdf(content: bytes) -> str:
    text_parts = []
    with pdfplumber.open(BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text.strip():
                text_parts.append(text)
    return "\n".join(text_parts).strip()


def parse_docx(content: bytes) -> str:
    file_stream = BytesIO(content)
    document = docx.Document(file_stream)
    return "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text).strip()


def parse_txt(content: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return content.decode(encoding).strip()
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="ignore").strip()


def extract_text(content: bytes, content_type: SupportedMime, filename: str) -> str:
    normalized_name = filename.lower()
    if content_type == "application/pdf" or normalized_name.endswith(".pdf"):
        text = parse_pdf(content)
    elif (
        content_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or normalized_name.endswith(".docx")
    ):
        text = parse_docx(content)
    elif content_type == "text/plain" or normalized_name.endswith(".txt"):
        text = parse_txt(content)
    else:
        raise ValueError("Unsupported file format. Please upload a PDF, DOCX, or TXT resume.")

    if not text:
        raise ValueError("Could not extract readable text from this resume.")
    return text
