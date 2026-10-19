#!/usr/bin/env python3
"""Maintain Statcounter, branding and favicon links on every HTML page."""

from pathlib import Path
import re
import sys

MARKER = "<!-- Default Statcounter code for IMAGENES Y POSTALES"
SNIPPET = """<!-- Default Statcounter code for IMAGENES Y POSTALES
https://imagenesypostales.com/ -->
<script type="text/javascript">
var sc_project=13359488;
var sc_invisible=1;
var sc_security="c65a5a39";
var sc_client_storage="disabled";
</script>
<script>
window.addEventListener("load",function(){window.setTimeout(function(){var s=document.createElement("script");s.src="https://www.statcounter.com/counter/counter.js";s.async=true;document.head.appendChild(s)},5000)},{once:true});
</script>
<noscript><div class="statcounter"><a title="Web Analytics" href="https://statcounter.com/" target="_blank" rel="noopener noreferrer"><img class="statcounter" src="https://c.statcounter.com/13359488/0/c65a5a39/1/" alt="Web Analytics" referrerPolicy="no-referrer-when-downgrade"></a></div></noscript>
<!-- End of Statcounter Code -->"""
FAVICON = '''<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2">
<link rel="shortcut icon" href="/favicon.svg?v=2">'''
SKIP_DIRS = {".git", ".github", "node_modules", "vendor", "_site"}

def is_skipped(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)

def maintain(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = original

    # Replace the old text-only initials with the new landscape symbol.
    updated = re.sub(r'<span class="brand-mark"[^>]*>IP</span>',
                     '<span class="brand-mark" aria-hidden="true"></span>', updated, flags=re.I)

    # Add a keyboard-accessible skip link on pages with a main landmark.
    main_match = re.search(r'<main\\b([^>]*)>', updated, flags=re.I)
    if main_match:
        main_attrs = main_match.group(1)
        main_id_match = re.search(r'\\bid=[\"\\']([^\"\\']+)[\"\\']', main_attrs, flags=re.I)
        if main_id_match:
            main_id = main_id_match.group(1)
        else:
            main_id = "main-content"
            updated = updated[:main_match.start()] + '<main id="main-content"' + main_attrs + '>' + updated[main_match.end():]
        if not re.search(r'class=[\"\\'][^\"\\']*\\bskip-link\\b', updated, flags=re.I):
            body_match = re.search(r'<body\\b[^>]*>', updated, flags=re.I)
            if body_match:
                skip_link = f'<a class="skip-link" href="#{main_id}">Saltar al contenido principal</a>\\n'
                updated = updated[:body_match.end()] + '\\n' + skip_link + updated[body_match.end():]

    # Normalize all existing icon declarations, then insert a single canonical set.
    updated = re.sub(r'<link\b[^>]*rel=["\'](?:icon|shortcut icon|apple-touch-icon)["\'][^>]*>\s*',
                     '', updated, flags=re.I)
    if re.search(r'</head\s*>', updated, flags=re.I):
        updated = re.sub(r'</head\s*>', FAVICON + '\n</head>', updated, count=1, flags=re.I)

    # Normalize tracking across every page: remove legacy snippets and all duplicate
    # managed blocks, then insert exactly one canonical snippet before </body>.
    tracker_pattern = re.compile(
        r'<!-- Default Statcounter code for IMAGENES Y POSTALES.*?<!-- End of Statcounter Code -->',
        flags=re.I | re.S,
    )
    updated = tracker_pattern.sub("", updated)

    legacy_pattern = re.compile(
        r'<script>\s*var sc_project=13359488;.*?'
        r'<noscript>.*?c\.statcounter\.com/13359488/0/c65a5a39/1/.*?</noscript>',
        flags=re.I | re.S,
    )
    updated = legacy_pattern.sub("", updated)

    match = re.search(r'</body\s*>', updated, flags=re.I) or re.search(r'</html\s*>', updated, flags=re.I)
    if match:
        updated = updated[:match.start()] + SNIPPET + '\n' + updated[match.start():]

    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False

def main() -> int:
    changed = []
    for path in sorted(Path(".").rglob("*.html")):
        if is_skipped(path):
            continue
        try:
            if maintain(path):
                changed.append(str(path))
        except (OSError, UnicodeError) as exc:
            print(f"ERROR procesando {path}: {exc}", file=sys.stderr)
            return 1
    print(f"Marca, favicon y Statcounter revisados en {len(changed)} páginas HTML.")
    for path in changed:
        print(f"  + {path}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
