#!/usr/bin/env python3
"""Static accessibility and responsive-readiness checks for the published HTML source.

This intentionally checks objective source-level issues only. Visual overflow, keyboard
interaction and real Core Web Vitals are measured separately with Lighthouse/browser tests.
"""
from __future__ import annotations

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "_site", "dist", "build"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class AuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict] = []
        self.nodes: list[dict] = []
        self.text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        node = {"tag": tag.lower(), "attrs": dict(attrs), "text": "", "parent": self.stack[-1] if self.stack else None}
        self.nodes.append(node)
        if tag.lower() not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs) -> None:
        self.nodes.append({"tag": tag.lower(), "attrs": dict(attrs), "text": "", "parent": self.stack[-1] if self.stack else None})

    def handle_data(self, data: str) -> None:
        if self.stack:
            # Ignore script/style content when calculating accessible names.
            if not any(n["tag"] in {"script", "style", "noscript"} for n in self.stack):
                self.stack[-1]["text"] += data

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] == tag:
                node = self.stack[index]
                self.stack = self.stack[:index]
                if self.stack:
                    self.stack[-1]["text"] += " " + node["text"]
                break


def audit(path: Path) -> tuple[list[str], list[str]]:
    parser = AuditParser()
    try:
        parser.feed(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError) as exc:
        return [f"{path.relative_to(ROOT)}: no se pudo leer ({exc})"], []

    rel = str(path.relative_to(ROOT))
    errors: list[str] = []
    warnings: list[str] = []
    nodes = parser.nodes
    tags = [n["tag"] for n in nodes]
    html_node = next((n for n in nodes if n["tag"] == "html"), None)
    if not html_node or not (html_node["attrs"].get("lang") or "").strip():
        errors.append(f"{rel}: falta lang en <html>")

    if not any(n["tag"] == "title" and n["text"].strip() for n in nodes):
        errors.append(f"{rel}: falta un <title> con texto")
    if not any(n["tag"] == "meta" and n["attrs"].get("name", "").lower() == "viewport" for n in nodes):
        errors.append(f"{rel}: falta meta viewport")

    h1_count = tags.count("h1")
    if h1_count == 0:
        errors.append(f"{rel}: falta H1")
    elif h1_count > 1:
        warnings.append(f"{rel}: hay {h1_count} elementos H1; revisar jerarquía")

    ids = [n["attrs"]["id"] for n in nodes if n["attrs"].get("id")]
    for value, count in Counter(ids).items():
        if count > 1:
            errors.append(f"{rel}: id duplicado '{value}' ({count} veces)")

    id_set = set(ids)
    labels_for = {n["attrs"].get("for") for n in nodes if n["tag"] == "label" and n["attrs"].get("for")}
    for n in nodes:
        a = n["attrs"]
        if n["tag"] == "img" and "alt" not in a:
            errors.append(f"{rel}: imagen sin atributo alt")
        if n["tag"] == "img" and "alt" in a and a.get("alt", "").strip() == "" and a.get("role") != "presentation" and a.get("aria-hidden") != "true":
            warnings.append(f"{rel}: imagen con alt vacío que no está marcada como decorativa")
        if n["tag"] == "a":
            name = (n["text"] or "").strip() or (a.get("aria-label") or "").strip() or (a.get("title") or "").strip()
            if not name:
                errors.append(f"{rel}: enlace sin nombre accesible (href={a.get('href', '')})")
            href = a.get("href", "")
            if href.startswith("#") and len(href) > 1 and href[1:] not in id_set:
                errors.append(f"{rel}: enlace a ancla inexistente '{href}'")
        if n["tag"] == "button":
            name = (n["text"] or "").strip() or (a.get("aria-label") or "").strip() or (a.get("title") or "").strip()
            if not name:
                errors.append(f"{rel}: botón sin nombre accesible")
        if n["tag"] in {"input", "select", "textarea"} and a.get("type", "").lower() not in {"hidden", "submit", "button", "reset", "image"}:
            named = bool((a.get("aria-label") or "").strip() or (a.get("aria-labelledby") or "").strip() or (a.get("title") or "").strip())
            if a.get("id") and a["id"] in labels_for:
                named = True
            parent = n.get("parent")
            while parent and not named:
                if parent["tag"] == "label":
                    named = True
                    break
                parent = parent.get("parent")
            if not named:
                warnings.append(f"{rel}: control <{n['tag']}> sin etiqueta explícita detectada (id={a.get('id', '')})")

    has_main = any(n["tag"] == "main" or n["attrs"].get("role") == "main" for n in nodes)
    if not has_main:
        warnings.append(f"{rel}: no se detectó landmark main")
    has_skip = any(n["tag"] == "a" and ("skip" in (n["attrs"].get("class") or "").lower() or "saltar" in (n["text"] or "").lower()) for n in nodes)
    if not has_skip:
        warnings.append(f"{rel}: no se detectó enlace para saltar al contenido")

    return errors, warnings


def main() -> int:
    files = sorted(
        p for p in ROOT.rglob("*.html")
        if not any(part in SKIP_DIRS for part in p.parts)
        and not p.name.lower().startswith("google")
        and not p.name.lower().startswith("pinterest-")
    )
    if not files:
        print("ERROR: no se encontraron archivos HTML para auditar.")
        return 2

    errors: list[str] = []
    warnings: list[str] = []
    for path in files:
        file_errors, file_warnings = audit(path)
        errors.extend(file_errors)
        warnings.extend(file_warnings)

    print(f"Auditoría estática de accesibilidad: {len(files)} páginas HTML")
    print(f"Errores bloqueantes: {len(errors)}")
    print(f"Avisos para revisión: {len(warnings)}")
    for item in errors:
        print(f"ERROR: {item}")
    for item in warnings:
        print(f"AVISO: {item}")
    if errors:
        print("RESULTADO: FALLÓ. Corregí los errores antes de publicar.")
        return 1
    print("RESULTADO: OK. Sin errores bloqueantes detectados por esta auditoría estática.")
    print("Nota: esto no sustituye una prueba visual, teclado real ni Lighthouse.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
