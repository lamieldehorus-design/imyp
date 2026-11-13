# Diagnóstico inicial de cobertura editorial

**Rama analizada:** `investigar-500-frases-celebres`  
**Fecha de corte:** 13 de noviembre de 2026  
**Alcance:** archivos fuente de datos presentes en esa rama. No equivale a una auditoría de todas las URL publicadas ni de Search Console.

## 1. Inventario de datos

| Fuente | Registros | Observación |
|---|---:|---|
| `data/citas-celebres.json` → citas | 1.381 | 500 atribuidas a autores externos y 881 atribuidas a Imágenes y Postales |
| Autores | 45 | Perfiles de autor incluidos en el archivo |
| Temas/hubs configurados | 13 | Amor, amistad, sabiduría, vida, libertad, superación, motivación, felicidad, esperanza, ciencia, poesía y literatura, educación y familia |
| `data/frases.json` | 12 | Registros de frases/dedicatorias de la colección complementaria |
| `data/postales.json` | 16 | 8 categorías actuales, con 2 postales en cada una |

Los datos de frases célebres y originales conviven en el mismo arreglo de citas. El campo de autor distingue actualmente los 881 registros editoriales propios (autor "Imágenes y Postales") de los 500 registros con autores externos.

## 2. Controles mecánicos iniciales

- 1.381 textos de citas analizados.
- 500 citas con autor externo y 881 originales según el campo de autor.
- 45 perfiles de autor.
- 13 hubs temáticos declarados.
- 0 citas de autor externo sin los campos `source` o `sourceName` en el conjunto revisado.
- 0 grupos de texto duplicado exacto después de normalizar mayúsculas, tildes, puntuación y espacios.

**Límite:** tener un campo de fuente completo no demuestra que el enlace respalde fielmente la cita. La comprobación de fuente y atribución requiere revisión de contenido y, cuando sea posible, contraste con una fuente primaria. Tampoco se evaluó aquí la similitud semántica o el posible origen externo de las frases originales.

## 3. Cobertura de los 13 hubs actuales

El archivo de citas define 13 hubs. Para estimar su cobertura se compararon las etiquetas de cada hub con las etiquetas de cada cita mediante coincidencia exacta, sinónimos ni inferencia semántica. Los resultados se superponen: una misma cita puede pertenecer a varios hubs.

| Hub actual | Citas con al menos una etiqueta coincidente |
|---|---:|
| Amor | 263 |
| Amistad | 172 |
| Sabiduría | 415 |
| Vida | 546 |
| Libertad | 255 |
| Superación | 294 |
| Motivación | 44 |
| Felicidad | 617 |
| Esperanza | 200 |
| Ciencia | 150 |
| Poesía y literatura | 217 |
| Educación | 253 |
| Familia | 347 |

Estos números son **recuentos de coincidencia de etiquetas**, no el número de páginas ni una medición de demanda SEO. No deben sumarse entre sí.

## 4. Cobertura de postales

Las 16 postales actuales se distribuyen así:

| Categoría actual | Postales |
|---|---:|
| Cumpleaños | 2 |
| Amor | 2 |
| Amistad | 2 |
| Familia | 2 |
| Buenos días | 2 |
| Viajes | 2 |
| Ánimo | 2 |
| Salud | 2 |

La colección es pequeña frente al catálogo propuesto. No debe generarse una página para cada una de las 351 categorías por el mero hecho de existir en el catálogo.

## 5. Qué significa para el catálogo de 351

1. Las 351 categorías son un vocabulario temático propuesto; no son 351 URLs ni 351 grupos ya cubiertos.
2. Los 13 hubs actuales son activos existentes y deben evaluarse antes de reemplazarlos, dividirlos o renombrarlos.
3. Hay áreas con representación explícita actual (amor, amistad, vida, sabiduría, libertad, superación, motivación, felicidad, esperanza, ciencia, literatura, educación y familia).
4. Muchas de las 351 propuestas son subtemas o dimensiones de esos hubs y probablemente funcionen mejor como etiquetas, filtros internos no indexables o secciones dentro de una página existente.
5. Los nuevos hubs que se propongan (por ejemplo, duelo, espiritualidad, naturaleza, humor, trabajo o emociones específicas) requieren revisar los textos y las consultas reales antes de decidir si merecen página propia.
6. Cumpleaños, buenos días, viajes, ánimo y salud ya aparecen en la colección de postales y/o frases. Se deben preservar y conectar contextualmente, no borrar por el cambio de identidad editorial.

## 6. Próxima matriz de decisión

Para cada categoría del catálogo maestro, completar estos campos antes de crear una página:

- `existing_url`: URL actual equivalente, si existe.
- `existing_hub`: hub actual que la cubre, si corresponde.
- `content_count`: número de piezas pertinentes revisadas manualmente.
- `gsc_queries`: consultas reales asociadas, si hay exportación de Search Console.
- `intent_distinct`: sí/no/pendiente.
- `decision`: mantener como etiqueta, integrar en hub, crear página, fusionar o descartar.
- `reviewed_by` y `reviewed_at`: trazabilidad editorial.

No completar demanda de búsqueda por intuición. Si no se dispone de exportación de Search Console o investigación de palabras clave, registrar "pendiente".

## 7. Decisión operativa

La fase siguiente es una auditoría de mapeo entre los 351 temas, los 13 hubs actuales, los datos de citas y las URL reales. No se deben crear rutas ni cambiar las existentes hasta terminar ese cruce. El objetivo es aprovechar el contenido ya trabajado y descubrir huecos reales, sin multiplicar páginas delgadas ni canibalizar las colecciones actuales.
