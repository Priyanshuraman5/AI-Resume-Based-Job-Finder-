from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parent
MD_PATH = ROOT / "SRS_AI_Resume_Based_LinkedIn_Job_Finder.md"
PDF_PATH = ROOT / "SRS_AI_Resume_Based_LinkedIn_Job_Finder.pdf"


def esc(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def split_cells(line: str) -> list[str]:
    return [part.strip() for part in line.strip().strip("|").split("|")]


def is_separator_row(cells: list[str]) -> bool:
    return all(cell and set(cell.replace("-", "").replace(":", "").strip()) == set() for cell in cells)


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "DocTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=19,
            alignment=TA_CENTER,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            spaceBefore=5,
            spaceAfter=3,
            textColor=colors.HexColor("#14342b"),
        )
    )
    styles.add(
        ParagraphStyle(
            "Subsection",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=11,
            spaceBefore=4,
            spaceAfter=2,
            textColor=colors.HexColor("#1f4b3f"),
        )
    )
    styles.add(
        ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.1,
            leading=9.7,
            spaceAfter=2.3,
        )
    )
    styles.add(
        ParagraphStyle(
            "CompactBullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.1,
            leading=9.6,
            leftIndent=12,
            firstLineIndent=-7,
            spaceAfter=1.4,
        )
    )
    styles.add(
        ParagraphStyle(
            "Small",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=8.4,
            spaceAfter=1.5,
        )
    )
    styles.add(
        ParagraphStyle(
            "CompactCode",
            fontName="Courier",
            fontSize=6.4,
            leading=7.3,
            leftIndent=8,
            textColor=colors.HexColor("#27332f"),
        )
    )
    return styles


def build_table(rows: list[list[str]], styles):
    max_cols = max(len(row) for row in rows)
    normalized = [row + [""] * (max_cols - len(row)) for row in rows]
    data = [[Paragraph(esc(cell), styles["Small"]) for cell in row] for row in normalized]
    available_width = A4[0] - 0.9 * inch
    table = Table(data, colWidths=[available_width / max_cols] * max_cols, hAlign="LEFT", repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f1ee")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#aab7b2")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def markdown_to_story(markdown: str):
    styles = build_styles()
    story = []
    lines = markdown.splitlines()
    index = 0
    in_code = False
    code_buffer: list[str] = []

    while index < len(lines):
        line = lines[index].rstrip()

        if line.startswith("```"):
            if not in_code:
                in_code = True
                code_buffer = []
            else:
                in_code = False
                if code_buffer:
                    story.append(Preformatted("\n".join(code_buffer), styles["CompactCode"]))
                    story.append(Spacer(1, 2))
            index += 1
            continue

        if in_code:
            code_buffer.append(line)
            index += 1
            continue

        if not line.strip():
            index += 1
            continue

        if line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = split_cells(lines[index].strip())
                if not is_separator_row(cells):
                    rows.append(cells)
                index += 1
            if rows:
                story.append(build_table(rows, styles))
                story.append(Spacer(1, 3))
            continue

        if line.startswith("# "):
            story.append(Paragraph(esc(line[2:]), styles["DocTitle"]))
        elif line.startswith("## Contents"):
            story.append(Paragraph("Contents", styles["Section"]))
        elif line.startswith("## "):
            story.append(Paragraph(esc(line[3:]), styles["Section"]))
        elif line.startswith("### "):
            story.append(Paragraph(esc(line[4:]), styles["Subsection"]))
        elif line.startswith("- "):
            story.append(Paragraph("- " + esc(line[2:]), styles["CompactBullet"]))
        else:
            story.append(Paragraph(esc(line).replace("  ", "&nbsp;&nbsp;"), styles["Body"]))

        index += 1

    return story


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#52615d"))
    canvas.drawString(0.45 * inch, 0.3 * inch, "AI Resume Based LinkedIn Job Finder - SRS")
    canvas.drawRightString(A4[0] - 0.45 * inch, 0.3 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf() -> None:
    markdown = MD_PATH.read_text(encoding="utf-8")
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=0.45 * inch,
        leftMargin=0.45 * inch,
        topMargin=0.42 * inch,
        bottomMargin=0.45 * inch,
    )
    doc.build(markdown_to_story(markdown), onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build_pdf()
    print(f"Generated {PDF_PATH}")
