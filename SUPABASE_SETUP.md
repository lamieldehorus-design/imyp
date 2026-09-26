# Supabase para imagenesypostales.com

La web pública sigue en GitHub Pages. Supabase queda como backend privado.

## 1. Crear el proyecto
En Supabase, crear un proyecto nuevo. No poner ninguna clave secreta en GitHub.

## 2. Base de datos
Abrir **SQL Editor** y ejecutar:

`supabase/migrations/202609260001_imyp_backend.sql`

Luego crear tu usuario en **Authentication > Users** (o registrarte por email).

Copiar el UUID de tu usuario y ejecutar en SQL Editor:

```sql
insert into public.admin_users (user_id) values ('TU-UUID-DE-AUTH');
```

## 3. Configuración pública
En **Project Settings > API**, copiar:
- Project URL
- Publishable key (o anon key si el proyecto usa las claves legacy)

Esos dos valores son públicos por diseño y quedan protegidos por RLS. Colocarlos en `supabase-config.js`.

Nunca colocar una secret key/service role key en el repositorio.

## 4. Clave del modelo
Las Edge Functions necesitan una clave privada del proveedor de IA. Configurar como secreto:

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_GENERATION_MODEL=gpt-5.6-luna
supabase secrets set OPENAI_KNOWLEDGE_MODEL=gpt-5.6-terra
supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## 5. Desplegar funciones

```bash
supabase functions deploy process-book
supabase functions deploy generate-phrase
supabase functions deploy track-event
supabase functions deploy admin-api
```

## 6. Flujo terminado

### Admin
1. Entrar a `/admin/`.
2. Iniciar sesión.
3. Biblioteca -> subir PDF.
4. Procesar.
5. El backend crea nodos conceptuales y embeddings.
6. Redactor -> generar variantes.
7. Editar metadatos.
8. Publicar.

### Visitante
1. Escribe una intención.
2. El backend hace búsqueda semántica.
3. Redacta una frase desde los conceptos recuperados.
4. El visitante puede regenerar, copiar, personalizar, descargar o compartir.
5. Se registran métricas agregadas de uso.

Los PDFs y la relación libro -> concepto nunca se exponen en la web pública.
