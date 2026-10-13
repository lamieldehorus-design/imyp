#!/usr/bin/env python3
"""Normaliza el menú y los enlaces informativos en todas las páginas HTML."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NAV_ITEMS = [
    ("/herramientas/", "Herramientas"),
    ("/crear/", "Crear imágenes"),
    ("/frases/", "Frases célebres"),
    ("/postales/", "Postales"),
    ("/blog/", "Blog"),
    ("/sobre-nosotros/", "Qué hacemos"),
    ("/privacidad/", "Privacidad"),
]
FOOTER = '<nav class="legal-footer-links" aria-label="Información del sitio"><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Política de privacidad</a></nav>'

def current_path(text: str) -> str:
    match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']https?://[^/]+([^"\']*)', text, re.I)
    if not match:
        match = re.search(r'<link[^>]+href=["\']https?://[^/]+([^"\']*)["\'][^>]+rel=["\']canonical["\']', text, re.I)
    path = match.group(1) if match else ""
    if not path:
        return ""
    if not path.endswith("/") and not path.endswith(".html"):
        path += "/"
    return path or "/"

def standard_nav(text: str) -> str:
    path = current_path(text)
    links = []
    for href, label in NAV_ITEMS:
        active = ' aria-current="page"' if path == href or (href != "/" and path.startswith(href)) else ""
        links.append(f'<a href="{href}"{active}>{label}</a>')
    return '<nav class="top-nav" aria-label="Navegación principal">' + "".join(links) + "</nav>"

def update(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    if path.name in {"pinterest-4667b.html", "google939990971c7be018.html"}:
        return False
    nav = standard_nav(text)
    pattern = r'<nav\b[^>]*class=["\'][^"\']*\btop-nav\b[^"\']*["\'][^>]*>[\s\S]*?</nav>'
    if re.search(pattern, text, re.I):
        text = re.sub(pattern, lambda _: nav, text, count=1, flags=re.I)
    elif re.search(r'<header\b', text, re.I):
        text = re.sub(r'(</a>\s*)(</header>)', lambda m: m.group(1) + nav + m.group(2), text, count=1, flags=re.I)
    if 'class="legal-footer-links"' not in text:
        if re.search(r'</footer>', text, re.I):
            text = re.sub(r'</footer>', FOOTER + '</footer>', text, count=1, flags=re.I)
        elif re.search(r'</body>', text, re.I):
            footer = '<footer><strong>imagenesypostales.com</strong><span>Frases, postales y herramientas para crear.</span>' + FOOTER + '</footer>'
            text = re.sub(r'</body>', footer + '</body>', text, count=1, flags=re.I)

    # Evita repetir los enlaces informativos si el footer ya tiene otra navegación.
    if 'class="legal-footer-links"' in text:
        footer_match = re.search(r'<footer\b[\s\S]*?</footer>', text, re.I)
        if footer_match:
            footer_text = footer_match.group(0)
            def clean_footer_nav(match):
                nav = match.group(0)
                if re.search(r'class=["\'][^"\']*\blegal-footer-links\b', nav, re.I):
                    return nav
                nav = re.sub(
                    r'<a\b(?=[^>]*href=["\']/(?:sobre-nosotros|privacidad)/["\'])[^>]*>[\s\S]*?</a>',
                    '',
                    nav,
                    flags=re.I,
                )
                if not re.search(r'<a\b', nav, re.I):
                    return ''
                return nav
            cleaned_footer = re.sub(r'<nav\b[^>]*>[\s\S]*?</nav>', clean_footer_nav, footer_text, flags=re.I)
            text = text[:footer_match.start()] + cleaned_footer + text[footer_match.end():]

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False

def main():
    changed = []
    for path in ROOT.rglob("*.html"):
        if ".git" in path.parts:
            continue
        if update(path):
            changed.append(path.relative_to(ROOT).as_posix())
    print(f"Menús y enlaces informativos normalizados: {len(changed)} páginas")
    for item in changed:
        print(item)

if __name__ == "__main__":
    main()
