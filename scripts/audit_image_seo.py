#!/usr/bin/env python3
"""Auditoría SEO de imágenes para todas las páginas HTML publicables."""
from __future__ import annotations

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "_site", "dist", "build"}
EXCLUDED_HTML = {"google939990971c7be018.html", "pinterest-4667b.html"}
IMAGE_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp", ".ico"}


class ImageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.images: list[dict[str, str]] = []
        self.noscript_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        if tag == "noscript":
            self.noscript_depth += 1
        if tag == "img" and self.noscript_depth == 0:
            self.images.append({str(k).lower(): (v or "") for k, v in attrs})

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "noscript" and self.noscript_depth:
            self.noscript_depth -= 1


def public_html_files() -> list[Path]:
    return sorted(
        p for p in ROOT.rglob("*.html")
        if not any(part in SKIP_DIRS for part in p.parts)
        and p.name not in EXCLUDED_HTML
    )


def is_external_or_generated(src: str) -> bool:
    return (
        not src or src.startswith(("#", "data:", "blob:", "javascript:"))
        or bool(urlsplit(src).scheme)
        or src.startswith("//")
    )


def resolve_local_image(page: Path, src: str) -> Path | None:
    parsed = urlsplit(src.strip())
    raw = unquote(parsed.path)
    if not raw:
        return None
    target = ROOT / raw.lstrip("/") if raw.startswith("/") else page.parent / raw
    try:
        target = target.resolve()
        target.relative_to(ROOT.resolve())
    except (ValueError, OSError):
        return None
    return target


def main() -> int:
    pages = public_html_files()
    if not pages:
        print("ERROR: no se encontraron páginas HTML.")
        return 2

    counts: Counter[str] = Counter()
    errors: list[str] = []
    warnings: list[str] = []
    seen_extensions: Counter[str] = Counter()
    image_total = 0

    for page in pages:
        parser = ImageParser()
        try:
            parser.feed(page.read_text(encoding="utf-8", errors="ignore"))
        except OSError as exc:
            errors.append(f"{page.relative_to(ROOT)}: no se pudo leer ({exc})")
            continue

        rel_page = page.relative_to(ROOT).as_posix()
        for index, image in enumerate(parser.images, start=1):
            image_total += 1
            src = image.get("src", "").strip()
            alt = image.get("alt")
            label = f"{rel_page} [img #{index}]"
            if alt is None:
                counts["sin_alt"] += 1
                errors.append(f"{label}: falta atributo alt (src={src or '(vacío)'})")
            elif not alt.strip() and image.get("role") != "presentation" and image.get("aria-hidden") != "true":
                counts["alt_vacio"] += 1
                warnings.append(f"{label}: alt vacío; confirmar si la imagen es decorativa (src={src or '(vacío)'})")

            if not src:
                if image.get("srcset"):
                    src = image.get("srcset", "").split(",")[0].strip().split(" ")[0]
                else:
                    # Preview/output nodes populated after a user selects or creates an image.
                    counts["placeholder_dinamico"] += 1
                    continue

            if not is_external_or_generated(src):
                target = resolve_local_image(page, src)
                if target is None:
                    counts["ruta_fuera"] += 1
                    errors.append(f"{label}: ruta de imagen local no válida: {src}")
                elif not target.is_file():
                    counts["archivo_roto"] += 1
                    errors.append(f"{label}: archivo local inexistente: {src} -> {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}")
                else:
                    ext = target.suffix.lower()
                    seen_extensions[ext or "(sin extensión)"] += 1
                    if ext and ext not in IMAGE_EXTENSIONS:
                        counts["extension_no_estandar"] += 1
                        warnings.append(f"{label}: extensión de imagen poco habitual: {src}")

            if not image.get("width") or not image.get("height"):
                counts["sin_dimensiones"] += 1
                warnings.append(f"{label}: faltan width/height explícitos (src={src})")

            loading = image.get("loading", "").lower()
            fetchpriority = image.get("fetchpriority", "").lower()
            if loading not in {"lazy", "eager"}:
                counts["sin_loading"] += 1
                warnings.append(f"{label}: sin loading explícito; decidir según posición (src={src})")
            if loading == "lazy" and fetchpriority == "high":
                counts["lazy_y_prioridad_alta"] += 1
                warnings.append(f"{label}: combina loading=lazy con fetchpriority=high (src={src})")

            if src.lower().endswith((".svg", ".ico")):
                continue
            if not image.get("alt", "").strip() and image.get("aria-hidden") != "true":
                pass

    print(f"Auditoría SEO de imágenes: {len(pages)} páginas HTML, {image_total} etiquetas img.")
    print("Hallazgos por categoría:")
    for key, value in sorted(counts.items()):
        print(f"  {key}: {value}")
    print("Extensiones locales encontradas:")
    for ext, value in sorted(seen_extensions.items()):
        print(f"  {ext}: {value}")
    print(f"Errores: {len(errors)} | Avisos: {len(warnings)}")
    for item in errors:
        print("ERROR: " + item)
    for item in warnings:
        print("AVISO: " + item)
    if errors:
        print("RESULTADO: hay errores reales de accesibilidad/rutas que deben corregirse.")
        return 1
    print("RESULTADO: sin errores bloqueantes de alt o rutas locales; los avisos requieren evaluación contextual.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
