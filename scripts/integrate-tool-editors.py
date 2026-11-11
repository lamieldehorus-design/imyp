#!/usr/bin/env python3
from pathlib import Path
import html

root = Path(".")
pages = sorted((root / "herramientas").glob("*/index.html"))
updated = 0
skipped = 0
for page in pages:
    tool_id = page.parent.name
    content = page.read_text(encoding="utf-8")
    if 'id="editor-integrado"' in content:
        skipped += 1
        continue
    label = html.escape(tool_id.replace("-", " "))
    section = (
        '<section id="editor-integrado" style="margin:42px auto 56px;max-width:1240px;padding:0 4%">'
        f'<h2 style="font-size:clamp(26px,4vw,38px);margin:0 0 12px;color:#171925">Usá {label} ahora</h2>'
        '<p style="color:#77798a;line-height:1.7;margin:0 0 16px">Cargá tu imagen, ajustá las opciones, procesá el resultado y descargalo. El editor funciona directamente en esta página.</p>'
        f'<iframe title="Editor de {label}" src="/?tool={tool_id}&amp;embed=1#workspace" loading="eager" '
        'style="display:block;width:100%;height:900px;border:1px solid #e5e2e9;border-radius:12px;background:#f5f4f8" '
        'allow="clipboard-read; clipboard-write"></iframe></section>'
    )
    marker = '<div style="margin-top:55px'
    if marker not in content:
        raise SystemExit(f"No se encontró el punto de inserción en {page}")
    content = content.replace(marker, section + marker, 1)
    content = content.replace(f'href="/?tool={tool_id}#workspace"', 'href="#editor-integrado"')
    page.write_text(content, encoding="utf-8")
    updated += 1
print(f"Paginas encontradas: {len(pages)}; integradas ahora: {updated}; ya integradas: {skipped}")
if len(pages) != 310:
    raise SystemExit(f"Se esperaban 310 páginas y se encontraron {len(pages)}")
