-- Imágenes y Postales: backend privado, RAG, analítica y publicación
-- Ejecutar una vez en Supabase SQL Editor.

create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_filename text not null,
  storage_path text not null unique,
  file_size bigint,
  status text not null default 'uploaded'
    check (status in ('uploaded','processing','ready','failed')),
  node_count integer not null default 0,
  concept_count integer not null default 0,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.knowledge_nodes (
  id bigserial primary key,
  book_id uuid not null references public.books(id) on delete cascade,
  node_index integer not null,
  idea text not null,
  context text,
  themes text[] not null default '{}',
  keywords text[] not null default '{}',
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique(book_id,node_index)
);

create index if not exists knowledge_nodes_book_idx on public.knowledge_nodes(book_id);
create index if not exists knowledge_nodes_embedding_hnsw
  on public.knowledge_nodes using hnsw (embedding vector_cosine_ops);

create table if not exists public.phrase_generations (
  id uuid primary key default gen_random_uuid(),
  intent text not null,
  tone text,
  phrase text not null,
  source text not null default 'public' check (source in ('public','admin')),
  matched boolean not null default true,
  source_node_ids bigint[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.published_phrases (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid references public.phrase_generations(id) on delete set null,
  phrase text not null,
  category text not null default 'expresar',
  recipients text[] not null default '{}',
  tones text[] not null default '{}',
  tags text[] not null default '{}',
  style text not null default 'azul' check (style in ('minimalista','azul','oscuro')),
  source_intent text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists published_phrases_status_idx
  on public.published_phrases(status,published_at desc);

create table if not exists public.visitor_intents (
  id bigserial primary key,
  intent text not null,
  normalized_intent text not null,
  had_result boolean not null default false,
  generation_id uuid references public.phrase_generations(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists visitor_intents_created_idx on public.visitor_intents(created_at desc);
create index if not exists visitor_intents_normalized_idx on public.visitor_intents(normalized_intent);

create table if not exists public.visitor_events (
  id bigserial primary key,
  event_type text not null check (event_type in ('generate','copy','personalize','download','share','search')),
  generation_id uuid references public.phrase_generations(id) on delete set null,
  phrase_id uuid references public.published_phrases(id) on delete set null,
  intent text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visitor_events_created_idx on public.visitor_events(created_at desc);
create index if not exists visitor_events_type_idx on public.visitor_events(event_type,created_at desc);

create or replace function public.match_knowledge_nodes(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  min_similarity double precision default 0.18
)
returns table (
  id bigint,
  book_id uuid,
  idea text,
  context text,
  themes text[],
  keywords text[],
  similarity double precision
)
language sql
stable
as $$
  select
    k.id,
    k.book_id,
    k.idea,
    k.context,
    k.themes,
    k.keywords,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_nodes k
  join public.books b on b.id = k.book_id
  where b.status = 'ready'
    and k.embedding is not null
    and (1 - (k.embedding <=> query_embedding)) >= min_similarity
  order by k.embedding <=> query_embedding
  limit greatest(1,least(match_count,20));
$$;

alter table public.admin_users enable row level security;
alter table public.books enable row level security;
alter table public.knowledge_nodes enable row level security;
alter table public.phrase_generations enable row level security;
alter table public.published_phrases enable row level security;
alter table public.visitor_intents enable row level security;
alter table public.visitor_events enable row level security;

drop policy if exists "admin reads own admin row" on public.admin_users;
create policy "admin reads own admin row"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

drop policy if exists "admins manage books" on public.books;
create policy "admins manage books"
on public.books for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage knowledge" on public.knowledge_nodes;
create policy "admins manage knowledge"
on public.knowledge_nodes for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins read generations" on public.phrase_generations;
create policy "admins read generations"
on public.phrase_generations for select to authenticated
using (public.is_admin());

drop policy if exists "public reads published phrases" on public.published_phrases;
create policy "public reads published phrases"
on public.published_phrases for select to anon, authenticated
using (status = 'published');

drop policy if exists "admins manage phrases" on public.published_phrases;
create policy "admins manage phrases"
on public.published_phrases for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins read visitor intents" on public.visitor_intents;
create policy "admins read visitor intents"
on public.visitor_intents for select to authenticated
using (public.is_admin());

drop policy if exists "admins read visitor events" on public.visitor_events;
create policy "admins read visitor events"
on public.visitor_events for select to authenticated
using (public.is_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('books','books',false,52428800,array['application/pdf'])
on conflict (id) do update
set public=false,
    file_size_limit=52428800,
    allowed_mime_types=array['application/pdf'];

drop policy if exists "admins read books bucket" on storage.objects;
create policy "admins read books bucket"
on storage.objects for select to authenticated
using (bucket_id='books' and public.is_admin());

drop policy if exists "admins upload books bucket" on storage.objects;
create policy "admins upload books bucket"
on storage.objects for insert to authenticated
with check (bucket_id='books' and public.is_admin());

drop policy if exists "admins update books bucket" on storage.objects;
create policy "admins update books bucket"
on storage.objects for update to authenticated
using (bucket_id='books' and public.is_admin())
with check (bucket_id='books' and public.is_admin());

drop policy if exists "admins delete books bucket" on storage.objects;
create policy "admins delete books bucket"
on storage.objects for delete to authenticated
using (bucket_id='books' and public.is_admin());
