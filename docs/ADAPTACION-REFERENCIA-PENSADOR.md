# Adaptación de referencia: Pensador en español

Referencia analizada: https://www.pensador.com/es/

## Patrones estudiados
- Portada con buscador visible, novedades, populares y entradas a colecciones.
- Varias rutas de descubrimiento: temas, autores y contenidos editoriales.
- Páginas de colección con introducción, contenido principal y recomendaciones relacionadas.
- Autoría editorial visible y explicación del proceso de revisión.
- Enlaces de continuidad entre contenidos relacionados.
- Acciones de usuario para guardar, compartir y contribuir.

## Adaptación a Imágenes y Postales
- La portada prioriza frases, reflexiones y pensamientos. Las herramientas pasan a ser una acción complementaria.
- Búsqueda por texto, autor o tema mediante GET hacia /frases/.
- Accesos temáticos y perfiles de autores que ya existen en el repositorio.
- Diferenciación explícita entre citas célebres y frases originales.
- Puente hacia crear una imagen con una frase y explorar postales.
- Identidad propia: fondo blanco, azul de marca, texto oscuro, tipografía legible, bordes finos y tarjetas discretas.
- Navegación adaptable a móvil, sin ocultar todas las secciones.
- No se copian textos, imágenes, marca, código ni recursos gráficos de Pensador.

## SEO e interlinking
- H1 único y secciones con jerarquía H2.
- Canonical, robots, Open Graph, Twitter Cards y datos estructurados Organization, WebSite, WebPage e ItemList.
- Los temas enlazan únicamente a hubs existentes.
- Los autores enlazan únicamente a perfiles existentes.
- El buscador interno no genera landings indexables para cada consulta.
- Las páginas de listado deben conservar paginación HTML rastreable. No implementar scroll infinito.
- No se inventan métricas de popularidad ni se enlazan categorías que todavía no tengan página publicada.
- La verificación de fuentes y atribuciones se debe hacer cita por cita.

## Estado
La portada de esta rama se reorganiza para priorizar la biblioteca editorial, los temas, los autores y la creación de imágenes. Esta entrega no afirma que todas las páginas internas, la paginación o todas las interacciones del sitio ya hayan sido migradas o auditadas.
