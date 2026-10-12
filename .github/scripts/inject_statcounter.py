#!/usr/bin/env python3
"""Add the site's Statcounter tracking snippet to every HTML page, idempotently."""

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
</script>
<script type="text/javascript"
src="https://www.statcounter.com/counter/counter.js"
async></script>
<noscript><div class="statcounter"><a title="Web Analytics"
href="https://statcounter.com/" target="_blank"><img
class="statcounter"
src="https://c.statcounter.com/13359488/0/c65a5a39/1/"
alt="Web Analytics"
referrerPolicy="no-referrer-when-downgrade"></a></div></noscript>
<!-- End of Statcounter Code -->"""

SKIP_DIRS = {".git", ".github", "node_modules", "vendor", "_site"}


def is_skipped(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def inject(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    if MARKER in original:
        return False

    # Put the complete snippet at the end of the body so the noscript fallback
    # is valid HTML and the asynchronous tracker does not block page rendering.
    match = re.search(r"</body\s*>", original, flags=re.IGNORECASE)
    if match:
        updated = original[:match.start()] + SNIPPET + "\n" + original[match.start():]
    else:
        match = re.search(r"</html\s*>", original, flags=re.IGNORECASE)
        if not match:
            print(f"AVISO: no se encontró </body> ni </html>: {path}", file=sys.stderr)
            return False
        updated = original[:match.start()] + SNIPPET + "\n" + original[match.start():]

    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    changed = []
    skipped = []
    for path in sorted(Path(".").rglob("*.html")):
        if is_skipped(path):
            continue
        try:
            if inject(path):
                changed.append(str(path))
        except (OSError, UnicodeError) as exc:
            print(f"ERROR procesando {path}: {exc}", file=sys.stderr)
            return 1

    print(f"Statcounter añadido a {len(changed)} página(s) HTML.")
    for path in changed:
        print(f"  + {path}")
    if not changed:
        print("No había páginas pendientes; no se modificó ningún archivo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
