# Arquitectura propuesta: universo visual de ImagenesYPostales.com

**Estado:** planificación; no cambia la web publicada.  
**Fecha:** 2026-11-09  
**Repositorio:** `lamieldehorus-design/imyp` · rama de producción `main`  
**Dominio y hosting:** https://imagenesypostales.com/ · GitHub Pages  
**Modelo elegido:** máxima amplitud, todo gratuito con publicidad, universo visual completo.

## 1. Objetivo y reglas de preservación

Construir un gran portal de herramientas visuales: edición, conversión, optimización, fotografía, postales, composición, tipografía, recursos para redes, identidad visual, animación, análisis técnico y funciones creativas asistidas por IA. El catálogo será amplio; cada herramienta debe seguir siendo fácil de usar.

- Preservar dominio, GitHub Pages, repositorio, contenido, identidad visual y automatizaciones actuales.
- No migrar hosting ni cambiar DNS.
- No reconstruir ni reemplazar a ciegas portada, frases, postales ni editores existentes.
- No borrar, renombrar ni cambiar canonicals de URLs existentes sin auditoría, compatibilidad y motivo documentado.
- Mantener fondo claro, títulos azules, texto oscuro y diseño mobile-first.
- Acceso gratuito y sin registro obligatorio. Monetización publicitaria no intrusiva.
- Procesar archivos en el navegador siempre que sea viable. Informar claramente cuándo se necesita un proveedor externo.
- Nunca mostrar una herramienta como disponible hasta que la ruta exista y la función haya sido probada.
- Reservar espacios de anuncios para evitar saltos de diseño; los anuncios no deben tapar controles, resultados ni descargas.

## 2. Estructura actual detectada en el repositorio

Se identificaron estas rutas y módulos relevantes en el árbol actual de Git; la auditoría de producción debe confirmar estado y enlaces antes de cualquier cambio:

- `/` portada.
- `/herramientas/` directorio.
- `/herramientas/comprimir-imagenes/`, `/herramientas/redimensionar-imagenes/`, `/herramientas/recortar-imagen/`, `/herramientas/convertir-imagen/`, `/herramientas/girar-imagen/`.
- `/herramientas/texto-en-imagen/`, `/herramientas/marca-de-agua/`, `/herramientas/quitar-fondo/`, `/herramientas/generador-favicon/`.
- `/crear/`, `/crear/postal/`, `/crear/frase-en-imagen/`, `/crear/meme/`, `/crear/collage/`.
- `/data/postales.json`, `/herramientas/directorio.js`, `/herramientas/editor.js`, `/herramientas/editor.css`, `/crear/crear.js`, `/crear/crear.css`.

El catálogo JSON incluye un inventario inicial de 289 entradas entre rutas existentes y propuestas. Es un backlog, no significa que todas estén construidas. Antes de cambiar rutas, contrastar el árbol de Git, sitemap, HTML, enlaces internos y sitio publicado.

## 3. Arquitectura de información

### Navegación sugerida
1. Herramientas
2. Crear y diseñar
3. Postales
4. Frases
5. Recursos visuales
6. Guías

Se suman accesos nuevos sin retirar las secciones existentes. La portada debería incluir buscador, herramientas populares verificadas, categorías, accesos a postales y frases, y contenido editorial existente.

### Convención de rutas
- `/herramientas/`: catálogo, filtros y búsqueda.
- `/herramientas/{slug}/`: herramienta individual.
- `/crear/`: hub de composición.
- `/crear/{slug}/`: editores y generadores de composición compatibles con el esquema actual.
- `/postales/`, `/frases/` y URLs actuales: preservar.
- `/recursos/{slug}/` y `/guias/{slug}/`: solo para recursos/guías reales que aporten valor propio.

No indexar combinaciones vacías de filtros ni generar cientos de URLs por parámetros. Cada URL indexable debe responder a una intención clara y ofrecer funcionalidad o contenido útil.

## 4. Catálogo maestro

Fuente propuesta: `data/catalogo-herramientas.json`.

Campos por herramienta:
- `id`: identificador estable.
- `name`: nombre visible.
- `category`: identificador de categoría.
- `description`: propósito.
- `processing`: `local`, `hybrid`, `api` o `site`.
- `status`: `existing` o `proposed`.
- `path`: ruta existente conocida o null si aún no se aprueba.
- `seoStatus`: estado de auditoría.

El directorio público debe filtrar por estado y mostrar solo herramientas publicadas y comprobadas. Las propuestas se mantienen en el catálogo maestro, no como enlaces rotos en la web.

## 5. Capas técnicas

### A. Catálogo y navegación
JSON central, búsqueda por nombre/categoría/tarea/formato, filtros accesibles y enlaces HTML rastreables a herramientas reales. Evitar insertar contenido no confiable como HTML.

### B. Componentes de interfaz reutilizables
Carga de archivo, arrastrar/soltar, pegado cuando sea compatible, vista previa, controles etiquetados, progreso, error, restablecer, descargar, ayuda y aviso de privacidad. Controles táctiles cómodos en móvil; no depender de hover.

### C. Motores compartidos
- **ImageEngine:** Canvas, ImageBitmap, Blob y APIs compatibles del navegador.
- **FormatEngine:** detección, lectura y exportación de formatos realmente soportados.
- **CompositionEngine:** lienzo, texto, capas sencillas, plantillas y exportación.
- **ColorEngine:** muestreo de píxeles, paletas, contraste y conversión de color.
- **MetadataEngine:** lectura y limpieza solo para formatos que lo permitan.
- **AnimationEngine:** GIF/fotogramas con dependencias cargadas solo cuando hacen falta.
- **TemplateEngine:** plantillas para postales, frases y formatos sociales.
- **AI adapters:** proveedores aislados del frontend; jamás exponer claves secretas en JavaScript público.

Las librerías pesadas se cargan bajo demanda, no en todas las páginas. Revisar licencia, mantenimiento, seguridad y tamaño antes de adoptar cada dependencia.

### D. Privacidad y almacenamiento
Por defecto los archivos se procesan localmente y no se guardan. Favoritos y preferencias pueden permanecer en el navegador. No transmitir imágenes a analítica. Para procesamiento externo, explicar proveedor, finalidad y retención antes de la carga; no enviar archivos sin consentimiento informado. No almacenar claves privadas en GitHub ni en el cliente.

### E. Publicidad
Publicidad compatible con la plataforma seleccionada, no intrusiva y con espacios reservados para evitar CLS. No cubrir lienzo, botones, controles, resultados ni descarga. Medir rendimiento con anuncios habilitados.

## 6. Contrato mínimo de cada herramienta

Una herramienta no se considera lista hasta que incluya:
1. Tarea principal clara y controles accesibles.
2. Formatos de entrada/salida admitidos.
3. Validación y errores comprensibles.
4. Vista previa y comparación cuando resulte útil.
5. Descarga funcional y nombre de archivo correcto.
6. Aviso honesto de procesamiento local/externo y límites.
7. Instrucciones breves y preguntas frecuentes útiles.
8. Title, description, canonical, Open Graph y datos estructurados apropiados.
9. Enlaces contextuales a herramientas relacionadas que existan.
10. Pruebas en móvil/escritorio, teclado, accesibilidad y casos de error.

## 7. SEO y mantenimiento de URLs

- Mantener la generación automática de sitemap existente; incluir únicamente páginas canónicas reales y excluir 404, noindex, archivos de verificación y canonicals externos según las reglas del proyecto.
- Antes de proponer URL, revisar sitemap, HTML, catálogo y rutas actuales.
- No crear páginas puerta ni textos repetitivos que solo cambien una palabra.
- Un H1 principal, title/description únicos, canonical correcto y enlaces rastreables.
- Contenido y metadatos equivalentes en móvil y escritorio.
- Validar enlaces internos, sitemap, robots, 404 y redirecciones en CI.
- Agregar una URL al sitemap cuando la herramienta esté terminada y probada.

## 8. Rendimiento, accesibilidad y seguridad

- JavaScript mínimo en el directorio; motores avanzados bajo demanda.
- Evitar CLS reservando espacio para anuncios, imágenes y resultados.
- Buscar conformidad WCAG 2.2 AA: contraste, foco visible, teclado, etiquetas y mensajes de estado.
- Manejar límites de memoria y archivos grandes sin fallos silenciosos.
- Validar el tipo real y la decodificación; no confiar solo en la extensión.
- Tratar SVG como contenido potencialmente activo: sanitizarlo o rasterizarlo de forma segura.
- No ejecutar contenido HTML/SVG proporcionado por usuarios.
- No prometer uso offline hasta haberlo probado.

## 9. Flujo de desarrollo y despliegue

1. Auditar la herramienta, URL, canonical, enlaces, sitemap y pruebas actuales.
2. Actualizar estado real en el catálogo.
3. Elegir un grupo pequeño que comparta motor.
4. Implementar en rama de trabajo, sin editar producción directamente.
5. Ejecutar pruebas funcionales, enlaces, SEO, accesibilidad y móvil.
6. Revisar el diff y abrir PR hacia `main`.
7. Desplegar mediante GitHub Pages existente.
8. Verificar la URL publicada, sitemap, canonical, consola y experiencia móvil.
9. Actualizar catálogo y documentación según lo que realmente se haya entregado.

## 10. Etapas

- **Etapa 0:** auditoría y protección de las URLs existentes.
- **Etapa 1:** catálogo central y directorio con búsqueda/filtros.
- **Etapa 2:** motores locales de edición, conversión, dimensiones, color y exportación.
- **Etapa 3:** composición, postales, plantillas, tipografía y redes.
- **Etapa 4:** SVG, metadatos, GIF, impresión y funciones técnicas.
- **Etapa 5:** proveedores externos e IA, después de evaluar coste, privacidad, licencia y sostenibilidad.
- **Etapa 6:** expansión SEO basada en calidad y validación de cada URL.

## 11. Fuera de alcance de este cambio

Esta propuesta no modifica la portada, no publica nuevas páginas, no cambia DNS ni hosting, no activa anuncios ni proveedores de IA y no altera URLs indexadas. Esos cambios deben hacerse en entregas separadas y verificables.
