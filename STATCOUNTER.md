# Statcounter: regla permanente del sitio

El proyecto **Imágenes y Postales** usa este contador en todas las páginas HTML:

- Proyecto: `13359488`
- Clave de seguridad: `c65a5a39`
- Script: `https://www.statcounter.com/counter/counter.js`
- Imagen alternativa sin JavaScript: `https://c.statcounter.com/13359488/0/c65a5a39/1/`

El workflow `.github/workflows/statcounter.yml` ejecuta `.github/scripts/inject_statcounter.py` cuando hay cambios en `main`. El script recorre las páginas `.html`, agrega el bloque oficial si falta y evita duplicarlo si ya existe.

**Regla de mantenimiento:** toda página HTML nueva debe incluir el mismo bloque. El workflow lo agrega automáticamente al actualizarse `main`, para que las páginas existentes y futuras compartan el contador. El bloque se inserta antes de `</body>` para mantener el fallback `noscript` dentro del cuerpo HTML.
