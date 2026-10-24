#!/usr/bin/env python3
"""Normalize overlong SEO titles and meta descriptions across published HTML."""
from pathlib import Path
import html
import re

ROOT = Path(__file__).resolve().parents[1]
SITE_SUFFIX = " | Imágenes y Postales"
TITLE_LIMIT = 65
DESCRIPTION_LIMIT = 160
EXCLUDED = {"google939990971c7be018.html", "pinterest-4667b.html"}


def plain(value):
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def shorten_words(value, limit):
    value = re.sub(r"\s+", " ", value).strip()
    if len(value) <= limit:
        return value
    clipped = value[: limit + 1].rsplit(" ", 1)[0].rstrip(" ,:;.-")
    # Avoid titles ending in an article, preposition, or conjunction.
    stopwords = {"a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los", "o", "para", "por", "que", "un", "una", "y"}
    while clipped and clipped.split()[-1].lower() in stopwords:
        clipped = clipped.rsplit(" ", 1)[0].rstrip(" ,:;.-")
    return clipped


def optimize_title(title):
    title = plain(title)
    if len(title) <= TITLE_LIMIT:
        return title
    # Author collection pages share this repetitive suffix; preserve the author name.
    match = re.match(r"^Frases de (.+?):\s*(?:\d+\s+)?citas célebres para leer y compartir(?:\s*\|\s*Imágenes y Postales)?$", title, re.I)
    if match:
        candidate = f"Frases de {match.group(1).strip()}{SITE_SUFFIX}"
        if len(candidate) <= TITLE_LIMIT:
            return candidate
    # Remove the brand suffix before trimming so the topic remains prominent.
    base = re.sub(r"\s*\|\s*Imágenes y Postales$", "", title, flags=re.I).strip()
    if len(base) + len(SITE_SUFFIX) <= TITLE_LIMIT:
        return base + SITE_SUFFIX
    available = TITLE_LIMIT - len(SITE_SUFFIX)
    base = shorten_words(base, available)
    return base + SITE_SUFFIX


def optimize_description(description):
    description = plain(description)
    if len(description) <= DESCRIPTION_LIMIT:
        return description
    # Prefer a complete first sentence when it remains descriptive and within the limit.
    sentences = re.split(r"(?<=[.!?])\s+", description)
    if sentences and 90 <= len(sentences[0]) <= DESCRIPTION_LIMIT:
        return sentences[0]
    shortened = shorten_words(description, DESCRIPTION_LIMIT - 1)
    if shortened and shortened[-1] not in ".!?":
        shortened += "…"
    return shortened


def replace_meta_content(page, selector, value):
    pattern = re.compile(
        r'(<meta\b(?=[^>]*\b' + selector[0] + r'=["\']' + re.escape(selector[1]) +
        r'["\'])(?=[^>]*\bcontent=["\'])[^>]*\bcontent=["\'])(.*?)(["\'][^>]*>)',
        re.I | re.S,
    )
    escaped = html.escape(value, quote=True)
    return pattern.sub(lambda m: m.group(1) + escaped + m.group(3), page, count=1)


def process(path):
    original = path.read_text(encoding="utf-8", errors="ignore")
    page = original
    title_match = re.search(r"<title\b[^>]*>(.*?)</title>", page, re.I | re.S)
    if title_match:
        old_title = plain(title_match.group(1))
        new_title = optimize_title(old_title)
        if new_title != old_title:
            page = page[:title_match.start(1)] + html.escape(new_title) + page[title_match.end(1):]
            page = replace_meta_content(page, ("property", "og:title"), new_title)
            page = replace_meta_content(page, ("name", "twitter:title"), new_title)

    desc_match = re.search(r'<meta\b(?=[^>]*\bname=["\']description["\'])[^>]*\bcontent=["\'](.*?)["\'][^>]*>', page, re.I | re.S)
    if desc_match:
        old_desc = html.unescape(desc_match.group(1)).strip()
        new_desc = optimize_description(old_desc)
        if new_desc != old_desc:
            page = replace_meta_content(page, ("name", "description"), new_desc)
            page = replace_meta_content(page, ("property", "og:description"), new_desc)
            # Keep the CollectionPage/WebPage structured description aligned with the meta description.
            page = re.sub(
                r'("description"\s*:\s*")[^"]*(")',
                lambda m: m.group(1) + json_escape(new_desc) + m.group(2),
                page,
                count=1,
            )

    if page != original:
        path.write_text(page, encoding="utf-8")
        return True
    return False


def json_escape(value):
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "\\r")


def main():
    changed = 0
    scanned = 0
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT)
        if rel.as_posix() in EXCLUDED or any(part.startswith(".") for part in rel.parts[:-1]):
            continue
        scanned += 1
        changed += int(process(path))
    print(f"Metadatos SEO revisados: {scanned} páginas; actualizadas: {changed}.")
    # Confirm no overlong titles or descriptions remain.
    problems = []
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT)
        if rel.as_posix() in EXCLUDED or any(part.startswith(".") for part in rel.parts[:-1]):
            continue
        page = path.read_text(encoding="utf-8", errors="ignore")
        title = re.search(r"<title\b[^>]*>(.*?)</title>", page, re.I | re.S)
        desc = re.search(r'<meta\b(?=[^>]*\bname=["\']description["\'])[^>]*\bcontent=["\'](.*?)["\'][^>]*>', page, re.I | re.S)
        if title and len(plain(title.group(1))) > TITLE_LIMIT:
            problems.append(f"{rel}: title {len(plain(title.group(1)))} caracteres")
        if desc and len(html.unescape(desc.group(1))) > DESCRIPTION_LIMIT:
            problems.append(f"{rel}: description {len(html.unescape(desc.group(1)))} caracteres")
    if problems:
        print("\n".join(problems))
        raise SystemExit(f"Quedan {len(problems)} metadatos por revisar.")
    print("OK: todos los títulos y descripciones están dentro de los límites configurados.")


if __name__ == "__main__":
    import json
    main()
