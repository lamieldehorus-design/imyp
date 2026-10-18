#!/usr/bin/env python3
"""Auditoría descriptiva de contenido, estructura y enlazado interno.
Los recuentos de palabras son señales para revisión humana, no objetivos SEO.
"""
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import xml.etree.ElementTree as ET

SITE = "https://imagenesypostales.com"
EXCLUDED = {"google939990971c7be018.html", "pinterest-4667b.html"}

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_main = 0
        self.in_hidden = 0
        self.in_title = False
        self.title = ""
        self.main_text = []
        self.links = []
        self.ids = set()
        self.images = []
        self.headings = []
        self._heading = None
        self.breadcrumbs = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if tag == "main":
            self.in_main += 1
        if tag in ("script", "style", "noscript", "svg"):
            self.in_hidden += 1
        if tag == "title":
            self.in_title = True
        if tag == "nav" and ("breadcrumb" in a.get("class", "").lower() or a.get("aria-label", "").lower() in ("migas de pan", "breadcrumbs")):
            self.breadcrumbs = True
        if tag == "a" and a.get("href"):
            self.links.append((a["href"].strip(), bool(self.in_main)))
        if tag == "img":
            self.images.append((a.get("src", ""), "alt" in a, a.get("alt", "")))
        if re.fullmatch(r"h[1-6]", tag):
            self._heading = (int(tag[1]), [])

    def handle_endtag(self, tag):
        if tag == "main" and self.in_main:
            self.in_main -= 1
        if tag in ("script", "style", "noscript", "svg") and self.in_hidden:
            self.in_hidden -= 1
        if tag == "title":
            self.in_title = False
        if re.fullmatch(r"h[1-6]", tag) and self._heading:
            level, bits = self._heading
            self.headings.append((level, " ".join(bits).strip()))
            self._heading = None

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self._heading is not None:
            self._heading[1].append(data)
        if self.in_main and not self.in_hidden:
            self.main_text.append(data)

def local_path(url_path, source):
    raw = unquote(url_path or "")
    if not raw:
        return Path("index.html")
    if raw.startswith("/"):
        target = Path(raw.lstrip("/"))
    else:
        target = source.parent / raw
    if str(target).endswith("/"):
        target = target / "index.html"
    elif not target.suffix:
        target = target / "index.html"
    return target

root = ET.fromstring(Path("sitemap.xml").read_text(encoding="utf-8"))
ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
urls = [n.text for n in root.findall(".//sm:loc", ns) if n.text]
url_to_file = {}
for url in urls:
    path = urlsplit(url).path
    local = local_path(path, Path("index.html"))
    url_to_file[url.rstrip("/") + ("/" if path.endswith("/") else "")] = local

pages = {}
all_links = defaultdict(int)
main_links = defaultdict(int)
broken_fragments = []
broken_files = []
missing_breadcrumbs = []
low_text = []
heading_jumps = []
missing_alt = []
empty_alt = []
section_counts = Counter()
word_counts = []
page_count = 0

for path in sorted(Path(".").rglob("*.html")):
    rel = path.as_posix().removeprefix("./")
    if rel in EXCLUDED or any(part.startswith(".") for part in path.parts[:-1]):
        continue
    source = path.read_text(encoding="utf-8", errors="ignore")
    parser = PageParser()
    parser.feed(source)
    page_count += 1
    pages[rel] = parser
    words = re.findall(r"\b[\wÁÉÍÓÚÜÑáéíóúüñ]+\b", " ".join(parser.main_text), re.UNICODE)
    word_counts.append((len(words), rel))
    section = rel.split("/", 1)[0] if "/" in rel else "inicio"
    section_counts[section] += 1
    if len(words) < 80:
        low_text.append((len(words), rel))
    if not parser.breadcrumbs and rel != "index.html":
        missing_breadcrumbs.append(rel)
    levels = [level for level, text in parser.headings]
    for prev, cur in zip(levels, levels[1:]):
        if cur > prev + 1:
            heading_jumps.append((rel, prev, cur))
            break
    for src, has_alt, alt in parser.images:
        if src and not has_alt:
            missing_alt.append((rel, src))
        elif src and not alt.strip():
            empty_alt.append((rel, src))

    for href, in_main in parser.links:
        if not href or href.startswith("#") or re.match(r"^(?:mailto:|tel:|javascript:|data:|blob:)", href, re.I):
            continue
        parsed = urlsplit(href)
        if parsed.scheme and parsed.scheme.lower() not in ("http", "https"):
            continue
        if parsed.netloc and parsed.netloc.lower() not in ("imagenesypostales.com", "www.imagenesypostales.com"):
            continue
        if parsed.netloc and not parsed.path and parsed.query:
            continue
        target = local_path(parsed.path, path)
        if not target.is_file():
            broken_files.append((rel, href, str(target)))
            continue
        checked_url = SITE + (parsed.path or "/")
        if checked_url.endswith("/"):
            checked_url = checked_url[:-1]
        all_links[str(target)] += 1
        if in_main:
            main_links[str(target)] += 1
        if parsed.fragment:
            target_html = target.read_text(encoding="utf-8", errors="ignore")
            if not re.search(r'\bid=["\']' + re.escape(unquote(parsed.fragment)) + r'["\']', target_html):
                broken_fragments.append((rel, href))

print(f"PASO 3 | Auditoría descriptiva de contenido y estructura")
print(f"Páginas HTML analizadas: {page_count}; URLs en sitemap: {len(urls)}")
print("Páginas por directorio: " + ", ".join(f"{k}={v}" for k, v in sorted(section_counts.items())))
if word_counts:
    vals = sorted(n for n, _ in word_counts)
    median = vals[len(vals)//2]
    print(f"Palabras visibles dentro de <main> (solo contexto, no objetivo): mínimo={min(vals)}, mediana={median}, máximo={max(vals)}")
print(f"Páginas con menos de 80 palabras visibles para revisión manual: {len(low_text)}")
for n, rel in sorted(low_text)[:25]:
    print(f"  REVISAR CONTENIDO ({n} palabras): {rel}")
print(f"Páginas sin migas de pan detectadas: {len(missing_breadcrumbs)}")
for rel in missing_breadcrumbs[:25]:
    print(f"  REVISAR NAVEGACIÓN: {rel}")
print(f"Saltos de jerarquía de encabezados detectados: {len(heading_jumps)}")
for rel, prev, cur in heading_jumps[:20]:
    print(f"  REVISAR ENCABEZADOS: {rel} pasa de H{prev} a H{cur}")
print(f"Imágenes sin atributo alt: {len(missing_alt)}; imágenes con alt vacío (puede ser decorativo): {len(empty_alt)}")
for rel, src in missing_alt[:20]:
    print(f"  REVISAR ALT: {rel}: {src}")
print(f"Enlaces internos a archivos inexistentes: {len(broken_files)}; enlaces a anclas no encontradas: {len(broken_fragments)}")
for rel, href, target in broken_files[:20]:
    print(f"  ENLACE ROTO: {rel}: {href} -> {target}")
for rel, href in broken_fragments[:20]:
    print(f"  ANCLA A REVISAR: {rel}: {href}")
main_orphans = []
for rel in pages:
    if rel != "index.html" and main_links.get(rel, 0) == 0:
        main_orphans.append(rel)
print(f"Páginas sin enlaces entrantes desde <main> (no necesariamente huérfanas; revisar rutas de navegación): {len(main_orphans)}")
for rel in main_orphans[:35]:
    print(f"  REVISAR ENLAZADO CONTEXTUAL: {rel}")
print("Fin del informe. Los avisos de contenido y estructura son pistas para revisión humana; no se aplican mínimos mágicos de palabras.")
