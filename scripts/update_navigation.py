#!/usr/bin/env python3
"""Normaliza el menú y el pie de página común en todas las páginas HTML."""
from pathlib import Path
import html
import json
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
LEGAL_NAV = '<nav class="legal-footer-links" aria-label="Información del sitio"><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Privacidad</a></nav>'
FOOTER_DESCRIPTION = '<p class="footer-description">Herramientas online para editar fotos, crear imágenes y diseñar postales. Gratis y sin instalar programas.</p>'
SITE = "https://imagenesypostales.com"
SOCIAL_IMAGE = SITE + "/assets/og-imagenesypostales.png"
SOCIAL_IMAGE_ALT = "Imágenes y Postales: herramientas online para editar imágenes y crear postales"

def meta_content(text: str, key: str, attr: str = "name"):
    patterns = [
        rf"""<meta\b(?=[^>]*{attr}=["']{re.escape(key)}["'])[^>]*content=["']([^"']*)["']""",
        rf"""<meta\b(?=[^>]*content=["'][^"']*["'])[^>]*{attr}=["']{re.escape(key)}["']""",
    ]
    for index, pattern in enumerate(patterns):
        match = re.search(pattern, text, re.I)
        if match:
            if index == 0:
                return html.unescape(match.group(1))
            content = re.search(r"""content=["']([^"']*)["']""", match.group(0), re.I)
            return html.unescape(content.group(1)) if content else ""
    return None

def canonical_for(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        route = "/"
    elif rel.endswith("/index.html"):
        route = "/" + rel.removesuffix("index.html")
    else:
        route = "/" + rel
    return SITE + route

def ensure_seo_metadata(path: Path, text: str) -> str:
    """Completa metadatos técnicos ausentes sin pisar valores ya definidos."""
    head_end = re.search(r"</head>", text, re.I)
    if not head_end:
        return text
    title_match = re.search(r"""<title[^>]*>(.*?)</title>""", text, re.I | re.S)
    title = html.unescape(re.sub(r"<[^>]+>", "", title_match.group(1)).strip()) if title_match else ""
    description = meta_content(text, "description")
    canonical_match = re.search(r"""<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)["']""", text, re.I)
    canonical = html.unescape(canonical_match.group(1)) if canonical_match else canonical_for(path)
    additions = []
    if not canonical_match:
        additions.append(f'<link rel="canonical" href="{html.escape(canonical, quote=True)}">')
    if not meta_content(text, "robots"):
        additions.append('<meta name="robots" content="index,follow,max-image-preview:large">')
    if title:
        if not meta_content(text, "og:title", "property"):
            additions.append(f'<meta property="og:title" content="{html.escape(title, quote=True)}">')
        if not meta_content(text, "twitter:title"):
            additions.append(f'<meta name="twitter:title" content="{html.escape(title, quote=True)}">')
    if description:
        if not meta_content(text, "og:description", "property"):
            additions.append(f'<meta property="og:description" content="{html.escape(description, quote=True)}">')
        if not meta_content(text, "twitter:description"):
            additions.append(f'<meta name="twitter:description" content="{html.escape(description, quote=True)}">')
    if not meta_content(text, "og:type", "property"):
        og_type = "article" if "/blog/" in canonical and canonical.rstrip("/") != SITE + "/blog" else "website"
        additions.append(f'<meta property="og:type" content="{og_type}">')
    if not meta_content(text, "og:site_name", "property"):
        additions.append('<meta property="og:site_name" content="Imágenes y Postales">')
    if not meta_content(text, "og:url", "property"):
        additions.append(f'<meta property="og:url" content="{html.escape(canonical, quote=True)}">')
    if not meta_content(text, "og:image", "property"):
        additions.append(f'<meta property="og:image" content="{SOCIAL_IMAGE}">')
    if not meta_content(text, "og:image:alt", "property"):
        additions.append(f'<meta property="og:image:alt" content="{html.escape(SOCIAL_IMAGE_ALT, quote=True)}">')
    if not meta_content(text, "og:image:type", "property"):
        additions.append('<meta property="og:image:type" content="image/svg+xml">')
    if not meta_content(text, "og:image:width", "property"):
        additions.append('<meta property="og:image:width" content="1200">')
    if not meta_content(text, "og:image:height", "property"):
        additions.append('<meta property="og:image:height" content="630">')
    if not meta_content(text, "twitter:image"):
        additions.append(f'<meta name="twitter:image" content="{SOCIAL_IMAGE}">')
    if not meta_content(text, "twitter:image:alt"):
        additions.append(f'<meta name="twitter:image:alt" content="{html.escape(SOCIAL_IMAGE_ALT, quote=True)}">')
    if not meta_content(text, "twitter:card"):
        additions.append('<meta name="twitter:card" content="summary_large_image">')
    if not re.search(r"""<script\b[^>]*type=["']application/ld\+json["']""", text, re.I) and title and description:
        schema = {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": title,
            "description": description,
            "url": canonical,
            "inLanguage": "es-AR",
            "isPartOf": {"@type": "WebSite", "name": "Imágenes y Postales", "url": SITE + "/"},
        }
        additions.append('<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + '</script>')
    if additions:
        text = text[:head_end.start()] + "".join(additions) + text[head_end.start():]
    # Usar una tarjeta social grande para aprovechar la imagen de vista previa.
    card = re.search(r'<meta\b(?=[^>]*name=["\']twitter:card["\'])[^>]*>', text, re.I)
    if card:
        tag = card.group(0)
        if re.search(r'content=["\'][^"\']*["\']', tag, re.I):
            updated_tag = re.sub(r'content=(["\'])[^"\']*\1', 'content="summary_large_image"', tag, count=1, flags=re.I)
        else:
            updated_tag = tag[:-1] + ' content="summary_large_image">'
        if updated_tag != tag:
            text = text[:card.start()] + updated_tag + text[card.end():]
    # Migrar metadatos sociales antiguos de la imagen SVG propia al PNG compatible.
    # Se reemplaza solo el recurso social anterior del sitio, no imágenes editoriales personalizadas.
    def migrate_social_image(match):
        tag = match.group(0)
        if "og:image:type" in tag:
            return re.sub(r'content="[^"]*"', 'content="image/png"', tag, count=1, flags=re.I)
        if re.search(r'(?:og:image|twitter:image)', tag, re.I) and "/assets/og-imagenesypostales.svg" in tag:
            return re.sub(r'content="[^"]*og-imagenesypostales\.svg"', f'content="{SOCIAL_IMAGE}"', tag, count=1, flags=re.I)
        return tag
    text = re.sub(r'<meta\b[^>]*>', migrate_social_image, text, flags=re.I)
    return text

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

def normalize_footer(text: str) -> str:
    match = re.search(r'<footer\b[^>]*>[\s\S]*?</footer>', text, re.I)
    if not match:
        footer = '<footer><strong>imagenesypostales.com</strong>' + FOOTER_DESCRIPTION + LEGAL_NAV + '</footer>'
        if re.search(r'</body>', text, re.I):
            return re.sub(r'</body>', footer + '</body>', text, count=1, flags=re.I)
        return text
    footer = match.group(0)
    footer = re.sub(r'<p\b[^>]*class=["\'][^"\']*\bfooter-description\b[^"\']*["\'][^>]*>[\s\S]*?</p>', '', footer, flags=re.I)
    footer = re.sub(r'<span\b[^>]*>[\s\S]*?</span>', '', footer, flags=re.I)
    def clean_other_nav(nav_match):
        nav = nav_match.group(0)
        if re.search(r'class=["\'][^"\']*\blegal-footer-links\b[^"\']*["\']', nav, re.I):
            return ''
        nav = re.sub(r'<a\b(?=[^>]*href=["\']/(?:sobre-nosotros|privacidad)/["\'])[^>]*>[\s\S]*?</a>', '', nav, flags=re.I)
        return nav if re.search(r'<a\b', nav, re.I) else ''
    footer = re.sub(r'<nav\b[^>]*>[\s\S]*?</nav>', clean_other_nav, footer, flags=re.I)
    if not re.search(r'<strong\b[^>]*>\s*imagenesypostales\.com\s*</strong>', footer, re.I):
        footer = re.sub(r'(<footer\b[^>]*>)', r'\1<strong>imagenesypostales.com</strong>', footer, count=1, flags=re.I)
    footer = re.sub(r'</footer>', FOOTER_DESCRIPTION + LEGAL_NAV + '</footer>', footer, count=1, flags=re.I)
    return text[:match.start()] + footer + text[match.end():]

def update(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    if path.name in {"pinterest-4667b.html", "google939990971c7be018.html"}:
        return False
    text = ensure_seo_metadata(path, text)
    nav = standard_nav(text)
    pattern = r'<nav\b[^>]*class=["\'][^"\']*\btop-nav\b[^"\']*["\'][^>]*>[\s\S]*?</nav>'
    if re.search(pattern, text, re.I):
        text = re.sub(pattern, lambda _: nav, text, count=1, flags=re.I)
    elif re.search(r'<header\b', text, re.I):
        text = re.sub(r'(</a>\s*)(</header>)', lambda m: m.group(1) + nav + m.group(2), text, count=1, flags=re.I)
    text = normalize_footer(text)
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
    print(f"Menús y pies de página normalizados: {len(changed)} páginas")
    for item in changed:
        print(item)

if __name__ == "__main__":
    main()
