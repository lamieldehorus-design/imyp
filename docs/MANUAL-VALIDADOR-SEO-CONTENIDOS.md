# Manual operativo del validador editorial y anti-canibalización
## ImagenesYPostales.com: frases, citas, reflexiones, pensamientos y dedicatorias

Manual complementario al Plan maestro. Define para qué sirve el validador, cuándo debe ejecutarse y cómo actuar ante los avisos. Especifica el comportamiento esperado; no afirma que el script ya esté implementado.

## 1. Para qué sirve

Protege el sitio de errores que degradan la calidad, confunden a buscadores y debilitan la confianza del lector.

| Riesgo | Qué evita |
|---|---|
| Canibalización | Varias URLs intentan resolver la misma intención |
| Títulos duplicados | Colecciones que solo cambian una palabra |
| Contenido repetitivo | Frases o reflexiones con cambios cosméticos |
| Páginas doorway | Páginas de variantes de keywords sin valor propio |
| Atribución incorrecta | Frases originales presentadas como célebres o citas dudosas como confirmadas |
| Fuente ausente | Citas históricas sin referencia consultable |
| Enlaces rotos/huérfanos | Páginas aisladas o enlaces a URLs inexistentes |
| Metadatos incoherentes | Title, H1, description, canonical, schema y contenido no coinciden |

El objetivo: cada URL tiene intención identificable, contenido propio, clasificación correcta, autoría/fuente transparente y relaciones internas útiles. El validador detecta candidatos; no decide qué temas merece cubrir el sitio.

## 2. Qué valida

### Identidad y clasificación
- Tipo: cita célebre, frase original, reflexión, pensamiento, dedicatoria, poema, postal, artículo o herramienta.
- Tema, destinatario, tono, autor/fuente y estado editorial.
- IDs y slugs únicos.
- Recuentos calculados desde registros válidos, no escritos a mano.

### SEO y arquitectura
- Colisión de keyword/intención entre URLs.
- Títulos y H1 repetidos o demasiado parecidos.
- Meta descriptions duplicadas o no representativas.
- Canonicals incoherentes.
- URLs del sitemap inexistentes, noindex, redirigidas o con error.
- Enlaces internos rotos y páginas huérfanas.
- Schema inválido o distinto del contenido visible.

### Calidad editorial
- Duplicados exactos y similitud textual alta.
- Repetición de aperturas, cierres y estructuras.
- Contenido vacío o generado con plantillas sin personalización.
- Variantes de una misma frase publicadas como piezas independientes sin motivo.

### Integridad de citas célebres
- Toda cita publicada debe tener autor y fuente.
- La URL de fuente debe existir y ser consultable.
- El estado de atribución debe estar definido.
- Citas discutidas, apócrifas o sin respaldo no se presentan como verificadas.
- Las traducciones conservan sus notas cuando existan.
- Una cita sin atribución no se convierte en original por descarte.
- Que una URL responda correctamente no demuestra que respalde la cita: requiere revisión editorial.

### Derechos y originalidad
- Detectar coincidencias y marcarlas para revisión.
- No declarar plagio automáticamente por una coincidencia breve o frase común.
- Registrar estado de derechos de obras, traducciones e imágenes.
- Bloquear publicación si falta un campo obligatorio para ese tipo de contenido.

## 3. Tres modos de uso

| Modo | Quién | Cuándo | Resultado |
|---|---|---|---|
| 1. Editor | Redactor/editor | Al crear o modificar cada contenido/lote | Avisos antes de incorporarlo |
| 2. Build/gate | GitHub Actions | En cada build/publicación | Bloquea despliegue ante errores críticos |
| 3. Auditoría | Editor o tarea programada | Semanalmente | Detecta conflictos en páginas publicadas y consultas reales |

Editor = revisar mientras se escribe. Build = control final. Auditoría = mantenimiento del sitio publicado.

## 4. Escenarios de uso

Los comandos siguientes son una interfaz propuesta. Deben coincidir con el script definitivo antes de presentarse como comandos disponibles.

### A. Día de redacción (modo editor)

1. Guardar el registro/lote en su archivo fuente.
2. Ejecutar el modo editor.
3. Corregir antes de continuar.

Interfaz prevista:

    python scripts/validador_contenido.py editor data/nuevo-lote.json

- Sin errores: seguir con revisión editorial.
- Avisos leves: evaluar si el parecido es natural.
- Error de intención/duplicación: revisar URL objetivo, enfoque y estructura.
- Error de cita/fuente: detener publicación hasta verificar.
- Error de integridad: corregir ID, slug, campos, estado o relaciones.

Validar cada pieza al terminarla, no esperar a acumular decenas.

### B. Día de publicación (modo build)

1. Cargar contenidos aprobados.
2. Ejecutar el build habitual.
3. Cuando el gate esté integrado, el validador corre automáticamente.
4. Sin errores críticos, generar páginas y artefactos.
5. Si falla, corregir la fuente y repetir.

Interfaz prevista:

    python scripts/build_content.py
    python scripts/validador_contenido.py build

El orden final debe definirse en el workflow real. No afirmar que el gate está conectado hasta que existan script, configuración y ejecución exitosa comprobable.

### C. Auditoría semanal (modo auditoría)

1. Search Console → Rendimiento → Resultados de búsqueda.
2. Exportar consultas, páginas, clics, impresiones y posición para una ventana comparable (por ejemplo, 28 días).
3. Ejecutar auditoría con el CSV.
4. Revisar consultas donde dos o más URLs reciben impresiones para la misma intención.
5. Determinar si existe canibalización o si las URLs responden a necesidades distintas.
6. Registrar decisión: mantener, reoptimizar, fusionar, redirigir o canonicalizar.

Interfaz prevista:

    python scripts/validador_contenido.py auditoria gsc-export.csv

No toda consulta con varias URLs es un problema. Analizar intención, clics, posición, contenido y tipo de página.

## 5. Códigos de alerta

| Código | Nivel | Problema | Acción |
|---|---|---|---|
| R1 | Bloqueante | Keyword/URL principal asignada a otra página con la misma intención | Reasignar intención o fusionar duplicados |
| R2 | Bloqueante | Títulos/H1 o contenido casi duplicados | Diferenciar enfoque real o consolidar |
| R3 | Error | Aperturas, cierres o plantillas repetidas mecánicamente | Reescribir con voz propia |
| R4 | Error | Dos páginas del mismo clúster cumplen la misma función | Redefinir jerarquía o consolidar |
| R5 | Aviso | Similitud parcial o patrón repetido | Revisión humana |
| R6 | Aviso | Metadatos, enlaces, fuente o clasificación incompletos | Completar y validar |
| R7 | Bloqueante | Cita sin autor/fuente o atribución no aprobada | Verificar, marcar discutida o retirar |
| R8 | Bloqueante | Slug/ID duplicado o relación inexistente | Corregir integridad |
| R9 | Error | URL inválida en sitemap, canonical incorrecta o enlace crítico roto | Corregir y regenerar |
| R10 | Aviso | Página potencialmente huérfana | Añadir enlaces contextuales pertinentes |

La severidad puede configurarse, pero no rebajar automáticamente errores de autoría, atribución o integridad.

### Similitud
- Comparar dentro de la colección y entre colecciones cuando puedan confundirse.
- Normalizar mayúsculas, tildes, puntuación y espacios para duplicados exactos.
- La similitud semántica solo genera candidatos; no decide por sí sola.
- No penalizar automáticamente frases breves comunes.
- Conservar IDs y slugs existentes salvo migración documentada.

## 6. Protocolo cuando falla el gate

1. Identificar código, URL y registros afectados.
2. Confirmar si es duplicación real, relación válida o falsa alarma.
3. Corregir el registro fuente, no solo el HTML generado.
4. Reejecutar validador.
5. Ejecutar build completo.
6. Revisar página generada y enlaces.
7. Registrar decisión si hubo fusión, redirección, canonical o excepción.

Decisiones posibles:
- **Mantener separadas:** solo con intención y contenido distintos.
- **Reoptimizar:** si la página tiene valor, pero título/meta/enfoque no expresan su propósito.
- **Fusionar:** si dos URLs responden a la misma necesidad.
- **301:** si una URL deja de existir y otra la reemplaza de forma equivalente.
- **Canonical:** solo para variantes duplicadas que deben seguir accesibles por razón técnica.
- **Noindex:** para páginas que deben existir para usuarios pero no indexarse; no como solución automática a contenido débil.

No borrar una URL histórica sin revisar tráfico, enlaces entrantes, indexación y alternativas.

## 7. Semana tipo

| Momento | Actividad | Modo |
|---|---|---|
| Lunes a jueves | Redacción, verificación y revisión de lotes | Editor |
| Antes de publicar | Build, enlaces, metadatos, sitemap | Gate |
| Viernes | Search Console, consultas y registro de decisiones | Auditoría |
| Cada 30 días | Umbrales, falsas alarmas y rendimiento | Calibración |
| Cada trimestre | Taxonomía, autores, fuentes y URLs | Auditoría editorial |

La frecuencia se adapta al ritmo real. La calidad no depende de publicar una cantidad fija de páginas.

## 8. Registro de decisiones

Guardar fecha, código, URL/ID, consulta/keyword, URL competidora, evidencia, decisión, responsable y fecha de nueva comprobación. Evita repetir auditorías y permite explicar por qué se mantuvieron o modificaron páginas.

## 9. Preguntas frecuentes

**¿Se puede publicar sin validador?** Cuando el gate esté integrado como requisito del workflow, los errores bloqueantes deben cancelar el build. Antes de esa integración, este manual describe el comportamiento esperado.

**¿Qué ocurre con páginas ya publicadas?** Se analizan en auditoría. No se eliminan automáticamente.

**¿Reemplaza la revisión humana?** No. Automatiza comprobaciones mecánicas; intención, originalidad, contexto, autoría y calidad siguen siendo editoriales.

**¿Una cita enlazada a Wikiquote ya está verificada?** No necesariamente. Es una referencia consultable, pero conviene contrastar con obra, discurso o fuente primaria.

**¿Toda frase necesita URL individual?** No. Una frase corta puede formar parte de una colección. Crear URL individual solo si aporta contenido o intención diferenciada.

**¿Hay que tener siete enlaces por página?** No. Se prioriza relevancia; un enlace útil vale más que varios automáticos.

**¿Cuántas palabras debe tener una reflexión?** Las necesarias para desarrollar la idea. No hay mínimo universal.

**¿Dos URLs aparecen para una consulta?** Revisar intención, contenido, clics, impresiones y posición. Puede ser canibalización o cobertura legítima.

## 10. Señales de funcionamiento

| Señal | Medición | Objetivo operativo |
|---|---|---|
| Duplicados exactos nuevos | Validador | Ninguno sin justificar |
| R1/R2/R7/R8 | Build | Resolver antes de publicar |
| R5 | Informe editorial | Revisar y reducir falsas alarmas |
| Citas sin fuente aprobada | Catálogo | Cero presentadas como verificadas |
| URLs competidoras | Search Console | Investigar y registrar cada caso |
| Enlaces rotos | Auditoría | Corregir y evitar reincidencia |
| Páginas huérfanas | Rastreo interno | Incorporar rutas útiles |
| Sitemap | Build y Search Console | Solo URLs canónicas y válidas |
| Indexación | Search Console | Interpretar por calidad y tipo |

## 11. Criterio final

El validador debe ayudar a publicar menos contenido repetido y más contenido valioso. No es una máquina para fabricar páginas ni una autoridad automática sobre el criterio editorial.

**Primero intención y calidad; después publicación; finalmente medición y mejora.**
