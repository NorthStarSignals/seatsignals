"""
Convert HANDOVER_GUNNER.md into a cleanly formatted Word document.

Uses python-docx directly — hand-rolled so we control the styling instead of
pandoc's defaults (no pandoc dep required). Supports the markdown subset we
actually use in this doc: headings, paragraphs, bullets, numbered lists,
tables, bold, italic, inline code, blockquotes, and horizontal rules.
"""

from __future__ import annotations

import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH


# ---------------------------------------------------------------------------
# Inline formatting — bold/italic/code within a paragraph
# ---------------------------------------------------------------------------

INLINE_RE = re.compile(
    r"(\*\*(.+?)\*\*|`([^`]+)`|\*(?!\s)(.+?)(?<!\s)\*|\[([^\]]+)\]\(([^)]+)\))"
)


def add_inline_runs(paragraph, text: str):
    """Walk a piece of inline markdown and append styled runs to the paragraph."""
    cursor = 0
    for m in INLINE_RE.finditer(text):
        pre = text[cursor:m.start()]
        if pre:
            paragraph.add_run(pre)
        bold, code, italic = m.group(2), m.group(3), m.group(4)
        link_text, link_url = m.group(5), m.group(6)
        if bold:
            r = paragraph.add_run(bold)
            r.bold = True
        elif code:
            r = paragraph.add_run(code)
            r.font.name = "Consolas"
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(0xC7, 0x17, 0x4E)
        elif italic:
            r = paragraph.add_run(italic)
            r.italic = True
        elif link_text and link_url:
            # Render as "text (url)" — simpler than real hyperlinks in python-docx
            r = paragraph.add_run(link_text)
            r.font.color.rgb = RGBColor(0x21, 0x5C, 0xAF)
            r.underline = True
        cursor = m.end()
    tail = text[cursor:]
    if tail:
        paragraph.add_run(tail)


# ---------------------------------------------------------------------------
# Block parser — enough markdown to handle the handover doc
# ---------------------------------------------------------------------------


def parse_and_render(md_path: Path, out_path: Path):
    lines = md_path.read_text(encoding="utf-8").splitlines()

    doc = Document()

    # Margins
    for section in doc.sections:
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)

    # Base body font
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.rstrip()

        # Horizontal rule
        if stripped.strip() == "---":
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            r = p.add_run("─" * 60)
            r.font.color.rgb = RGBColor(0xBB, 0xBB, 0xBB)
            i += 1
            continue

        # Headings
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            heading = doc.add_heading(level=level)
            add_inline_runs(heading, text)
            i += 1
            continue

        # Tables
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|\-]+\|\s*$", lines[i + 1]):
            table_lines = []
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                table_lines.append(lines[i])
                i += 1
            render_table(doc, table_lines)
            continue

        # Blockquote
        if stripped.startswith("> "):
            q_lines = []
            while i < len(lines) and lines[i].lstrip().startswith(">"):
                q_lines.append(lines[i].lstrip()[1:].lstrip())
                i += 1
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.3)
            r = p.add_run(" ".join(q_lines))
            r.italic = True
            r.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
            continue

        # Bullet list
        if re.match(r"^[-*]\s+", stripped):
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].rstrip()):
                text = re.sub(r"^[-*]\s+", "", lines[i].rstrip())
                p = doc.add_paragraph(style="List Bullet")
                add_inline_runs(p, text)
                i += 1
            continue

        # Checkbox list (- [ ] or - [x])
        if re.match(r"^-\s+\[[\sxX]\]\s+", stripped):
            while i < len(lines) and re.match(r"^-\s+\[[\sxX]\]\s+", lines[i].rstrip()):
                raw = lines[i].rstrip()
                checked = re.match(r"^-\s+\[[xX]\]", raw) is not None
                text = re.sub(r"^-\s+\[[\sxX]\]\s+", "", raw)
                p = doc.add_paragraph(style="List Bullet")
                marker = "☑  " if checked else "☐  "
                p.add_run(marker)
                add_inline_runs(p, text)
                i += 1
            continue

        # Numbered list
        if re.match(r"^\d+\.\s+", stripped):
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].rstrip()):
                text = re.sub(r"^\d+\.\s+", "", lines[i].rstrip())
                p = doc.add_paragraph(style="List Number")
                add_inline_runs(p, text)
                i += 1
            continue

        # Blank line → just spacing
        if stripped == "":
            i += 1
            continue

        # Regular paragraph — collect until blank or block boundary
        buf = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].rstrip()
            if (
                nxt == ""
                or nxt.strip() == "---"
                or nxt.startswith("#")
                or nxt.startswith("|")
                or re.match(r"^[-*]\s+", nxt)
                or re.match(r"^\d+\.\s+", nxt)
                or nxt.startswith("> ")
            ):
                break
            buf.append(nxt)
            i += 1
        p = doc.add_paragraph()
        add_inline_runs(p, " ".join(buf))

    doc.save(out_path)


def render_table(doc, table_lines):
    """Render a markdown table. Assumes table_lines[1] is the separator row."""
    def split_row(row: str):
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        return cells

    header = split_row(table_lines[0])
    body = [split_row(r) for r in table_lines[2:] if r.strip()]

    ncols = len(header)
    t = doc.add_table(rows=1 + len(body), cols=ncols)
    t.style = "Light Grid Accent 1"

    for j, cell_text in enumerate(header):
        c = t.rows[0].cells[j]
        c.text = ""
        p = c.paragraphs[0]
        r = p.add_run("")
        add_inline_runs(p, cell_text)
        for run in p.runs:
            run.bold = True

    for i_row, row in enumerate(body, start=1):
        for j, cell_text in enumerate(row):
            if j >= ncols:
                break
            c = t.rows[i_row].cells[j]
            c.text = ""
            p = c.paragraphs[0]
            add_inline_runs(p, cell_text)


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    targets = [
        repo_root / "HANDOVER_GUNNER.md",
        repo_root / "QUICKSTART_GUNNER.md",
        repo_root / "PRODUCT_TOUR_GUNNER.md",
    ]
    for src in targets:
        if not src.exists():
            print(f"Skip (not found): {src}")
            continue
        dst = src.with_suffix(".docx")
        parse_and_render(src, dst)
        print(f"Wrote {dst}")
