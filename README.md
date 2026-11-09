# Imágenes y Postales

Plataforma web gratuita de herramientas visuales. La primera entrega es una aplicación estática, sin dependencias de servidor, con procesamiento de imágenes directamente en el navegador.

## Funcionalidades incluidas

- Redimensionar, recortar, rotar y espejar imágenes.
- Convertir a PNG, JPEG y WebP.
- Comprimir imágenes con control de calidad.
- Agregar texto sobre una imagen.
- Crear collages de varias fotografías.
- Extraer una paleta de colores.
- Generar un favicon.
- Crear postales descargables.
- Filtro por categorías y buscador de herramientas.

## Arquitectura

- \`index.html\`: estructura semántica y metadatos SEO.
- \`styles.css\`: diseño responsive y sistema visual.
- \`app.js\`: catálogo y lógica de herramientas en el cliente.
- \`robots.txt\` y \`sitemap.xml\`: base de indexación.
- \`manifest.webmanifest\`: metadatos para instalación como aplicación web.

No requiere instalación ni proceso de compilación. Se puede publicar como sitio estático en GitHub Pages, Cloudflare Pages, Netlify o un hosting tradicional.

## Desarrollo local

Abrir con un servidor estático desde la raíz del proyecto. Por ejemplo:

\`\`\`bash
python -m http.server 8080
\`\`\`

Luego visitar \`http://localhost:8080\`.

## Privacidad

Las imágenes se procesan en el navegador mediante Canvas API. Esta versión no incorpora subida de archivos ni almacenamiento remoto.

## Próximas etapas

1. Ampliar el catálogo con herramientas reales y pruebas automatizadas.
2. Incorporar editor de postales con plantillas, tipografías y elementos.
3. Añadir páginas SEO individuales para cada herramienta.
4. Incorporar optimización de rendimiento, accesibilidad y analítica respetuosa con la privacidad.
5. Integrar funciones avanzadas opcionales que requieran servicios externos.
