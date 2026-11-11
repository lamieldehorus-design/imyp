# Auditoría estática del portal

**Proyecto:** ImagenesYPostales.com  
**Fecha:** 11 de noviembre de 2026  
**Estado:** construcción editorial completa; auditoría estática ejecutada.

## Resultados verificados

| Control | Resultado |
|---|---:|
| Herramientas declaradas en `app.js` | 310 |
| IDs únicos en el motor | 310 |
| IDs coincidentes con `data/tools.json` | 310/310 |
| Páginas individuales presentes | 310/310 |
| Páginas de categorías | 11/11 |
| URLs del sitemap | 322 |
| URLs duplicadas en sitemap | 0 |
| URLs de herramientas en sitemap | 310 |
| URLs de categorías en sitemap | 11 |

## Motor de herramientas

Se encontraron 302 herramientas con ramas de ejecución específicas y 8 cubiertas por bloques compartidos de filtros. Las 310 herramientas están declaradas en el catálogo de ejecución y no hay IDs repetidos ni diferencias con el manifiesto.

## Navegación y catálogo

- La portada construye el catálogo desde el array de herramientas de `app.js`.
- La vista inicial agrupa herramientas por categoría y limita la primera presentación a seis tarjetas por grupo.
- El resto de cada grupo se puede desplegar, evitando una lista inicial interminable.
- Hay buscador complementario y filtros por categoría.
- Las 11 páginas de categoría tienen título y canonical. Sus enlaces internos suman exactamente 310 referencias a herramientas.

## Muestreo de páginas individuales

Se revisaron 12 páginas distribuidas entre el inicio, tramos intermedios y el último lote. Las 12 tienen canonical, meta description, JSON-LD, tres preguntas frecuentes y CTA que abre el editor con el ID correspondiente.

## Publicación

El último lote (301–310) está desplegado. Los workflows `Deploy static site` y `pages build and deployment` finalizaron con éxito.

## Límites de esta auditoría

Esta es una auditoría estática del repositorio, no una certificación completa del sitio en producción. Queda pendiente:
- Abrir y recorrer el dominio en un navegador real.
- Probar manualmente las 310 herramientas con imágenes de distintos formatos y tamaños.
- Revisar responsive en móvil, tablet y escritorio.
- Medir Core Web Vitals y rendimiento real.
- Comprobar errores HTTP, consola, accesibilidad y descargas en producción.

La consulta externa del dominio no estuvo disponible desde el entorno de auditoría, por lo que no se afirma que esas comprobaciones en vivo hayan sido realizadas.
