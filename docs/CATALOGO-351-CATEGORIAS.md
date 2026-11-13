# Catálogo editorial de 351 categorías

**Estado:** propuesta editorial versionada, todavía no publicada como páginas.  
**Idioma:** español (es-AR).  
**Total comprobado:** 351 categorías únicas, distribuidas en 19 pilares.

## Objetivo

Organizar el universo de contenidos de imagenesypostales.com: frases célebres y originales, reflexiones, pensamientos, dedicatorias, mensajes y postales. El catálogo amplía el sitio más allá de cumpleaños, que pasa a ser una ocasión dentro de un universo editorial mayor.

## Criterio de investigación y diseño

La propuesta combina la estructura real del repositorio (frases con etiquetas, destinatarios, tonos y necesidades; postales con categorías y etiquetas) con una arquitectura temática por pilares. Se evita confundir dimensiones distintas: **tema** (p. ej., amistad), **formato** (p. ej., dedicatoria), **destinatario** (p. ej., mamá), **tono** (p. ej., humor) y **ocasión** (p. ej., cumpleaños). Esas dimensiones pueden cruzarse en los datos, pero no deben producir automáticamente una página indexable por cada combinación.

La guía oficial de Google recomienda organizar el sitio de forma lógica, usar URL descriptivas, agrupar páginas relacionadas y evitar contenido duplicado. También advierte que las combinaciones de filtros pueden multiplicar URL sin aportar valor y perjudicar el rastreo. Referencias: [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) y [Managing crawling of faceted navigation URLs](https://developers.google.com/crawling/docs/faceted-navigation).

## Distribución

| Pilar | Categorías |
|---|---:|
| Amor y vínculos de pareja | 24 |
| Amistad | 20 |
| Familia y hogar | 20 |
| Emociones y estados de ánimo | 23 |
| Motivación y superación | 20 |
| Crecimiento personal y autoconocimiento | 22 |
| Filosofía y sabiduría | 22 |
| Vida cotidiana y relaciones humanas | 17 |
| Tiempo, recuerdos y etapas | 17 |
| Duelo, pérdidas y esperanza | 18 |
| Espiritualidad y fe | 18 |
| Gratitud, felicidad y bienestar | 18 |
| Trabajo, vocación y aprendizaje | 18 |
| Sociedad, humanidad y valores | 18 |
| Naturaleza y universo | 14 |
| Arte, literatura y creatividad | 14 |
| Dedicatorias y mensajes para compartir | 21 |
| Humor e ironía | 14 |
| Celebraciones y ocasiones | 13 |
| **Total** | **351** |

## Reglas de publicación

1. El JSON es el catálogo maestro, no una orden de crear 351 landing pages.
2. El estado inicial es `propuesta`; no se da por validado el volumen de búsqueda de cada tema.
3. La política inicial `noindex_hasta_auditoria` evita que una automatización publique páginas delgadas por defecto.
4. Antes de crear una URL, comprobar intención diferenciada, contenido disponible, demanda en Search Console/keyword research, solapamiento con páginas actuales y valor para el lector.
5. Las categorías cercanas pueden convivir como etiquetas o subtemas sin tener URL propia. No crear páginas casi iguales para sinónimos.
6. No eliminar ni cambiar slugs antiguos sin inventario de URL, enlaces, tráfico y redirecciones justificadas.
7. Cada categoría que llegue a página deberá tener título, descripción, introducción útil, selección editorial real, enlaces internos pertinentes y revisión móvil.
8. Las citas célebres requieren atribución verificable. Si no se puede confirmar la fuente, no atribuir.

## Estructura de datos

Cada registro contiene ID estable, nombre visible, slug, pilar, descripción editorial, formatos de contenido compatibles, estado editorial y política de indexación. El catálogo conserva 351 slugs únicos.

## Próxima fase

Cruzar estas categorías con `data/frases.json`, `data/citas-celebres.json`, `data/postales.json` y las URL existentes. El resultado debe ser una matriz de cobertura: categorías con contenido, categorías sin contenido, etiquetas que conviene fusionar y páginas existentes que deben conservarse. Después se decide qué categorías merecen página propia.
