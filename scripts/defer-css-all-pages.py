#!/usr/bin/env python3
"""Defer non-critical stylesheets site-wide while preserving a no-JS fallback."""
from pathlib import Path
import re
import subprocess

ROOT = Path(".")
CRITICAL = """<style id="critical-shared-css">
:root{--blue:#0b57d0;--blue-dark:#083b8f;--blue-soft:#eef5ff;--ink:#172033;--text:#293241;--muted:#667085;--line:#dbe3ee;--surface:#fff}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:#fff;color:var(--text);font-family:"Segoe UI Variable","Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
img,svg{max-width:100%}
button,input,select,textarea{font:inherit}
button{cursor:pointer;min-height:44px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(11,87,208,.28);outline-offset:3px}
.skip-link{position:absolute;top:-80px;left:12px;z-index:1000;padding:.75rem 1rem;border:2px solid #0848ad;border-radius:10px;background:#fff;color:#0848ad;font-weight:750;box-shadow:0 3px 12px rgba(16,24,40,.15)}
.skip-link:focus{top:12px}
.site-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:68px;padding:.85rem max(5vw,18px);background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}
.brand{display:flex;align-items:center;gap:.7rem;color:var(--blue);font-size:1rem;font-weight:750;letter-spacing:-.015em;text-decoration:none}
.brand-mark{display:block;width:44px;height:44px;flex:0 0 44px;border-radius:50%;background:#fff url("/assets/logo-simbolo.svg") center/contain no-repeat;border:1px solid #dce8f7}
.top-nav{display:flex;align-items:center;gap:1.25rem}
.top-nav a{min-height:44px;display:inline-flex;align-items:center;color:#344054;font-size:.92rem;font-weight:650;text-decoration:none}
h1,h2,h3{margin:.1rem 0 .9rem;color:var(--ink);line-height:1.12;letter-spacing:-.035em}
h1{font-size:clamp(2rem,5vw,3.5rem)}
@media(max-width:700px){.site-header{flex-wrap:wrap;gap:.65rem;padding:.65rem 18px}.top-nav{gap:.7rem;flex-wrap:wrap}.top-nav a{min-height:44px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
</style>"""

LINK_RE = re.compile(r'<link\b(?=[^>]*\brel=["\']stylesheet["\'])[^>]*>', re.I)
HREF_RE = re.compile(r'\bhref=(["\'])(.*?)\1', re.I)

def defer_link(tag):
    # Leave already-deferred links unchanged.
    if re.search(r'\bmedia=["\']print["\']', tag, re.I) and "onload=" in tag.lower():
        return tag
    m = HREF_RE.search(tag)
    if not m:
        return tag
    href = m.group(2)
    clean = re.sub(r'\s+media=(["\']).*?\1', '', tag, flags=re.I)
    clean = re.sub(r'\s+onload=(["\']).*?\1', '', clean, flags=re.I)
    clean = clean[:-1].rstrip() + ' media="print" onload="this.media=\'all\'">'
    return clean

changed = []
for path in ROOT.rglob("*.html"):
    if any(part.startswith(".") for part in path.parts) or "node_modules" in path.parts:
        continue
    original = path.read_text(encoding="utf-8")
    # The homepage already has its own carefully tailored critical CSS.
    if path.as_posix() == "index.html" and 'id="critical-home-css"' in original:
        continue
    links = list(LINK_RE.finditer(original))
    if not links:
        continue
    updated = LINK_RE.sub(lambda m: defer_link(m.group(0)), original)
    # Ensure graceful rendering when JavaScript is unavailable.
    tags = [m.group(0) for m in LINK_RE.finditer(updated)]
    fallback = '<noscript>' + ''.join(re.sub(r'\s+media=(["\']).*?\1', '', t, flags=re.I) for t in tags) + '</noscript>'
    if not re.search(r'<noscript>\s*(?:<link\b[^>]*rel=["\']stylesheet["\'])', updated, re.I):
        first = LINK_RE.search(updated)
        if first:
            updated = updated[:first.start()] + fallback + updated[first.start():]
    # Put shared first-paint styles in the head without changing page content or metadata.
    if 'id="critical-shared-css"' not in updated:
        head_end = re.search(r'</head\s*>', updated, re.I)
        if head_end:
            updated = updated[:head_end.start()] + CRITICAL + '\n' + updated[head_end.start():]
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed.append(path.as_posix())

if changed:
    print("Modified", len(changed), "HTML files:")
    print("\n".join(changed))
else:
    print("No HTML changes needed.")

# Verify all stylesheet links in processed pages are deferred and have a no-JS fallback.
errors = []
for path in ROOT.rglob("*.html"):
    content = path.read_text(encoding="utf-8")
    if path.as_posix() == "index.html" and 'id="critical-home-css"' in content:
        continue
    if LINK_RE.search(content) and 'id="critical-shared-css"' in content:
        for m in LINK_RE.finditer(content):
            tag = m.group(0)
            if not ('media="print"' in tag and 'onload=' in tag):
                errors.append(f"{path}: blocking stylesheet {tag}")
        if not re.search(r'<noscript>\s*(?:<link\b[^>]*rel=["\']stylesheet["\'])', content, re.I):
            errors.append(f"{path}: missing noscript fallback")
if errors:
    raise SystemExit("\n".join(errors))
print("Validation passed.")
