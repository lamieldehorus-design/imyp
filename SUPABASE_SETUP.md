# Supabase para imagenesypostales.com

La web pública sigue en GitHub Pages y Supabase guarda autenticación, PDFs, conocimiento, frases y métricas.

## Motor actual: gratis y sin API de IA

El sistema usa:
- PostgreSQL Full Text Search con configuración `spanish`
- extracción de texto PDF en el navegador del administrador
- palabras clave calculadas localmente
- plantillas de redacción
- Supabase Auth, Storage y Postgres

No necesita `OPENAI_API_KEY`.

## Migraciones

Ejecutar en SQL Editor, en este orden:

1. `supabase/migrations/202609260001_imyp_backend.sql`
2. `supabase/migrations/202609260002_spanish_text_engine.sql`

## Usuario administrador

El usuario debe existir en Supabase Authentication y su UUID debe estar en:

`public.admin_users`

## PDFs

Los PDFs se guardan en el bucket privado `books`.

Desde `/admin/`:
1. Detectar PDFs ya subidos.
2. Elegir **Procesar**.
3. El navegador autenticado descarga el PDF privado.
4. Extrae el texto localmente.
5. Lo divide en fragmentos.
6. Calcula palabras clave.
7. Guarda los nodos en `knowledge_nodes`.
8. PostgreSQL crea el índice de búsqueda en español.

Los PDFs y el texto fuente siguen privados.

## Generador público

La web llama a la función SQL `generate_phrase_text`.
Esta busca conocimiento relacionado y redacta mediante plantillas.
Al visitante sólo se le devuelve la frase final.

## Fase siguiente: Google Images sin almacenar PNG

Más adelante:
- cada frase publicada tendrá una URL estable;
- una ruta como `/imagen/frase-123.png` generará la imagen al vuelo;
- el PNG no tendrá que almacenarse permanentemente;
- la página publicada podrá exponer esa URL a buscadores.

Esa fase se implementará después del motor de texto.
