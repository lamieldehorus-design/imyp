#!/usr/bin/env python3
"""Genera la versión PNG de la imagen social a partir del SVG maestro."""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parent.parent
source = ROOT / "assets" / "og-imagenesypostales.svg"
target = ROOT / "assets" / "og-imagenesypostales.png"

if not source.is_file():
    raise SystemExit(f"No existe la imagen social fuente: {source}")
cairosvg.svg2png(url=str(source), write_to=str(target), output_width=1200, output_height=630)
if not target.is_file() or target.stat().st_size < 1000:
    raise SystemExit("La imagen social PNG no se generó correctamente.")
print(f"Imagen social PNG generada: {target.relative_to(ROOT)} ({target.stat().st_size} bytes, 1200x630)")
