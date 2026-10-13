#!/usr/bin/env python3
"""Añade enlaces legales comunes a todas las páginas HTML del sitio, sin duplicarlos."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NAV_LINKS = '<a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Privacidad</a>'
FOOTER_LINKS = '<nav class="legal-footer-links" aria-label="Información del sitio"><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Política de privacidad</a></nav>'

def update(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text

    # Menú principal: solo añade los enlaces si todavía no existen.
    match = re.search(r'<nav\b[^>]*class=["\'][^"\']*\btop-nav\b[^"\']*["\'][^>]*>[\s\S]*?</nav>', text, re.I)
    if match and 'href="/privacidad/"' not in match.group(0):
        nav = re.sub(r'</nav>\s*$', NAV_LINKS + '</nav>', match.group(0), flags=re.I)
        text = text[:match.start()] + nav + text[match.end():]

    # Pie común con acceso a las páginas informativas.
    if 'class="legal-footer-links"' not in text:
        if re.search(r'</footer>', text, re.I):
            text = re.sub(r'</footer>', FOOTER_LINKS + '</footer>', text, count=1, flags=re.I)
        elif re.search(r'</body>', text, re.I):
            footer = '<footer><strong>imagenesypostales.com</strong><span>Frases, postales y herramientas para crear.</span>' + FOOTER_LINKS + '</footer>'
            text = re.sub(r'</body>', footer + '</body>', text, count=1, flags=re.I)

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False

def main():
    excluded = {"pinterest-4667b.html", "google939990971c7be018.html"}
    changed = []
    for path in ROOT.rglob("*.html"):
        if ".git" in path.parts or path.name in excluded:
            continue
        if update(path):
            changed.append(path.relative_to(ROOT).as_posix())
    print(f"Enlaces legales verificados. Archivos HTML modificados: {len(changed)}")
    for item in changed:
        print(item)

if __name__ == "__main__":
    main()
