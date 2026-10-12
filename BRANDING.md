# Identidad visual oficial

- Logo completo: `/assets/logo.svg` (vectorial, 720 × 180).
- Símbolo del logo: `/assets/logo-simbolo.svg`.
- Favicon: `/favicon.svg`.
- Toda página HTML debe usar el símbolo en el encabezado, cargar el favicon con ruta absoluta y mantener Statcounter.
- El workflow `.github/workflows/statcounter.yml` ejecuta `.github/scripts/inject_statcounter.py` en cada actualización de `main`. Ese script normaliza marca, favicon y contador en todas las páginas HTML, incluidas las nuevas.


Última revisión automática de marca: 2026-10-12. El workflow aplica los cambios a todas las páginas HTML al actualizarse la rama principal.
