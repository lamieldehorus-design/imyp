# Diseño y experiencia interactiva de ImagenesYPostales.com

**Estado:** especificación de experiencia y diseño para implementar sobre el sitio estático existente. No afirma que los componentes estén ya desarrollados ni desplegados.

## 1. Dirección visual

La interfaz debe sentirse editorial, limpia, rápida y cercana. El contenido escrito es el protagonista; las imágenes acompañan, no compiten.

- Fondo blanco o casi blanco, títulos azules de la identidad actual y texto negro/gris muy legible.
- Una sola familia tipográfica principal, con jerarquía clara y pesos limitados. Evitar cargar muchas fuentes.
- Espaciado generoso en lectura, pero listados compactos para no obligar a recorrer pantallas vacías.
- Bordes finos y discretos; tarjetas simples, sin sombras pesadas, gradientes decorativos ni efectos constantes.
- Iconos funcionales y consistentes. No usar emojis como sustituto de iconografía de interfaz.
- Animaciones mínimas, breves y respetuosas con `prefers-reduced-motion`.
- Mantener coherencia visual entre portada, hubs, autores, reflexiones, postales y herramientas.

## 2. Navegación principal

Cabecera breve y estable:
1. Logotipo enlazado a inicio.
2. Navegación por grandes colecciones: Frases, Reflexiones, Pensamientos, Dedicatorias, Postales y Herramientas.
3. Búsqueda visible y fácil de abrir en móvil.
4. Menú compacto para enlaces secundarios: autores, temas, sobre nosotros y privacidad.

No colocar las 351 categorías en el menú. Mostrar primero los pilares y ofrecer exploración temática dentro de cada colección. El menú móvil debe poder abrirse y cerrarse con teclado, anunciar su estado a lectores de pantalla y no bloquear contenido de forma inesperada.

## 3. Portada

La portada debe orientar en pocos segundos:
- Buscador central con placeholder útil: “Buscá una frase, autor o tema”.
- Accesos directos a las colecciones principales.
- Una selección editorial breve y rotativa solo si existe criterio de selección real.
- Temas destacados, en una cantidad acotada y con acceso a “Explorar todos”.
- Un bloque claro para crear una postal o imagen con una frase.
- Enlaces a autores y a las últimas reflexiones cuando existan publicaciones reales.

Evitar un feed interminable, mosaicos gigantes, carruseles automáticos y bloques repetidos. Cada sección debe tener un propósito claro y un límite visible.

## 4. Listados y navegación por páginas: prohibido el scroll infinito

**Regla no negociable: no implementar scroll infinito ni carga automática al llegar al final.**

- Los listados se dividen en páginas numeradas, con anterior/siguiente y números de página cuando corresponda.
- Usar un tamaño inicial de 12 a 18 elementos por página; validar en móvil y escritorio según longitud de tarjetas y rendimiento.
- La paginación debe tener enlaces HTML reales, destinos estables y etiquetas claras (“Página 2”, “Siguiente”, “Anterior”).
- El usuario siempre debe ver dónde está y cuántos resultados hay cuando ese dato sea fiable.
- Al cambiar de página, llevar el foco o el encabezado del listado al inicio del nuevo conjunto de resultados, sin saltos bruscos.
- No cargar más resultados automáticamente. Un botón “Ver más” solo se admite como alternativa explícita, con límite y sin reemplazar la paginación rastreable en colecciones extensas.
- Evitar que los parámetros de paginación y filtros creen infinitas URL indexables. Definir canonical, indexación y enlaces según el contenido real.
- No esconder contenido esencial detrás de JavaScript; cada página debe ser accesible por URL directa.

## 5. Búsqueda y filtros

La búsqueda debe ser una de las interacciones centrales:
- Buscar por texto, autor, tema y tipo de contenido.
- Sugerencias mientras se escribe, con opción de desactivar/ignorar sugerencias y sin enviar automáticamente.
- Resaltar coincidencias de forma discreta y segura, sin insertar HTML arbitrario del usuario.
- Mostrar cantidad de resultados solo cuando el recuento sea exacto.
- Estados claros: buscando, resultados, sin resultados y error.
- En “sin resultados”, sugerir corregir términos o explorar temas cercanos; no crear páginas indexables para búsquedas internas.
- Los filtros deben ser comprensibles, combinables y fáciles de limpiar. Mostrar filtros activos como etiquetas removibles.
- Evitar paneles de filtros enormes. En móvil, desplegar filtros bajo un control con estado anunciado.
- Las combinaciones de filtros son una herramienta de la sesión, no nuevas landing pages por defecto.

## 6. Interacciones útiles en cada contenido

### Frases y citas
- Botón “Copiar” con confirmación accesible y breve.
- Compartir mediante Web Share API cuando esté disponible, con enlace copiable como alternativa.
- Enlace al autor y a la temática.
- Para citas célebres, enlace visible a la fuente y aviso si la atribución está en revisión.
- “Crear postal con esta frase” abre la herramienta con el texto ya cargado, sin perder la referencia de origen.

### Reflexiones y pensamientos
- Lectura limpia, ancho de línea cómodo y tipografía suficientemente grande.
- Acciones de copiar enlace y compartir al inicio o al final, no repetidas en cada párrafo.
- Índice interno solo si el texto es largo y tiene secciones reales.
- Al finalizar, ofrecer pocas lecturas relacionadas, seleccionadas por relación semántica y no por popularidad arbitraria.

### Dedicatorias
- Selector sencillo por destinatario, ocasión o tono cuando esos campos estén disponibles.
- Variantes cortas y largas solo cuando el contenido sea genuinamente distinto.
- Copiar, compartir y convertir en postal.
- No obligar a registrarse para funciones básicas.

### Postales y creador de imágenes
- Vista previa inmediata del resultado.
- Controles simples para texto, tipografía, tamaño, alineación, fondo y formato, según las capacidades reales de la herramienta.
- Botones claros para descargar y volver a editar.
- Validar texto vacío, límites y errores; nunca perder el texto por un error de descarga.
- Ofrecer tamaños adecuados para compartir, sin prometer compatibilidad universal.
- Mantener alternativa textual accesible para la vista previa.

## 7. Interlinking: malla editorial visible y contextual

Los enlaces internos deben ayudar a continuar la exploración, no decorar ni inflar SEO.

### Reglas
1. Cada página debe tener un enlace de regreso a su colección principal mediante migas o navegación equivalente.
2. Cada frase debe enlazar a su autor (si existe) y a uno o dos temas realmente relacionados.
3. Cada autor debe enlazar a sus citas y a temas que estén representados en su obra.
4. Cada hub temático debe enlazar a subtemas existentes, autores pertinentes y colecciones relacionadas.
5. Cada reflexión debe enlazar a un máximo orientativo de 3 a 6 piezas relacionadas, elegidas por relación temática real.
6. Cada postal debe enlazar a la frase o colección de origen y a la herramienta para crear otra.
7. Las herramientas deben enlazar a ejemplos y colecciones que ayuden a usarlas.
8. La portada enlaza a las colecciones principales y a una selección acotada de temas.

### Presentación
- Migas de pan compactas y legibles.
- Enlaces dentro del texto solo cuando el destino aporte contexto.
- Bloque final “También puede interesarte” con 3 a 6 enlaces, sin repetición de enlaces ya prominentes.
- Anchor text descriptivo y natural: evitar “hacé clic aquí”, anchors genéricos repetidos o listas de keywords.
- Nunca enlazar a una URL inexistente, vacía, no publicada o sin relación directa.
- Mantener registro automático de enlaces entrantes/salientes para detectar páginas huérfanas y destinos rotos.
- No crear enlaces cruzados masivos entre las 351 categorías. La relación debe tener sentido editorial.

## 8. Microinteracciones y feedback

- Estados hover, focus, active y disabled visibles, sin depender solo del color.
- Botones con verbos claros: “Copiar frase”, “Compartir”, “Crear postal”, “Descargar imagen”.
- Confirmaciones no intrusivas, anunciadas con `aria-live` cuando corresponda.
- Indicadores de carga solo durante operaciones reales.
- Deshabilitar acciones imposibles y explicar por qué.
- No usar pop-ups de entrada, reproducción automática, sonidos, notificaciones insistentes ni ventanas que tapen la lectura.
- Si una función falla, conservar el contenido y ofrecer una alternativa.

## 9. Accesibilidad y móvil

- HTML semántico, encabezados en orden, enlaces y botones con propósito claro.
- Navegación completa con teclado; foco visible y orden lógico.
- Contraste WCAG AA como objetivo mínimo para texto normal y controles.
- Áreas táctiles cómodas; objetivo de 44 × 44 CSS px cuando sea posible.
- Etiquetas accesibles para iconos y controles; texto alternativo descriptivo para imágenes informativas y alt vacío para decorativas.
- No comunicar estados solo mediante color.
- Respetar reducción de movimiento y zoom del navegador.
- El contenido, las acciones y los enlaces esenciales deben estar disponibles en móvil sin hover.
- Probar con teclado, lector de pantalla y viewport móvil real.

## 10. Rendimiento y estabilidad

- HTML renderizado estáticamente para páginas y paginación.
- JavaScript progresivo: búsqueda y herramientas mejoran la experiencia, pero el contenido esencial permanece accesible.
- Evitar dependencias grandes para interacciones simples.
- Imágenes con dimensiones explícitas, formatos modernos y carga diferida solo fuera del primer viewport.
- No cargar scripts de herramientas en páginas que no los necesitan.
- Evitar cambios de layout al cargar fuentes, imágenes, anuncios o controles.
- Medir Core Web Vitals y Lighthouse en móvil y escritorio antes y después de cada lote.

## 11. Componentes reutilizables propuestos

- Header compacto y menú móvil accesible.
- Buscador con sugerencias y estados.
- Breadcrumbs.
- Filtros y chips activos.
- Tarjeta editorial compacta.
- Bloque de frase con copiar/compartir/crear postal.
- Paginación numerada.
- Bloque de contenido relacionado.
- Selector de destinatario/tono.
- Editor visual y previsualización de postal.
- Mensajes de estado accesibles.
- Footer con navegación útil y políticas.

## 12. Criterios de aceptación

Una página o componente no se considera listo hasta que:
- [ ] Se entiende su propósito sin explicación externa.
- [ ] El diseño es minimalista y consistente con la identidad del sitio.
- [ ] No incorpora scroll infinito ni carga automática sin fin.
- [ ] Los listados tienen paginación o un límite claro.
- [ ] Los interlinks apuntan a destinos existentes y relacionados.
- [ ] Las acciones interactivas funcionan y dan feedback.
- [ ] Se puede usar con teclado y en móvil.
- [ ] No depende de hover, autoplay ni pop-ups.
- [ ] No pierde texto o estado ante un error.
- [ ] No crea URLs indexables por filtros o búsquedas internas.
- [ ] No empeora rendimiento, accesibilidad ni estabilidad visual.

## 13. Secuencia de implementación

1. Inventariar componentes y estilos existentes antes de modificar diseño.
2. Acordar tokens visuales y componentes base sin cambiar la identidad de golpe.
3. Mejorar cabecera, navegación, buscador y portada.
4. Implementar tarjetas, paginación, migas y enlaces relacionados.
5. Incorporar acciones de copiar/compartir y conexión con el creador de postales.
6. Mejorar filtros y búsqueda.
7. Probar todos los flujos en móvil, escritorio y teclado.
8. Auditar enlaces internos, páginas huérfanas, Core Web Vitals y SEO.
9. Publicar por lotes pequeños, conservando URLs y comparando métricas.

**Principio rector:** una web fácil de recorrer, no una web que obliga a desplazarse sin fin. Cada interacción debe ahorrar pasos o ayudar a encontrar, comprender, guardar o compartir contenido.
