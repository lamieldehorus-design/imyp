-- Centro de Estudio del Redactor
-- Corrige la generación mecánica y agrega aprendizaje por feedback del administrador.
-- Ejecutar después de 202609260002_spanish_text_engine.sql.

create extension if not exists unaccent with schema extensions;

create table if not exists public.writer_templates (
  id uuid primary key default gen_random_uuid(),
  tone text not null default '',
  template text not null,
  active boolean not null default true,
  score integer not null default 0,
  approvals integer not null default 0,
  rejections integer not null default 0,
  created_at timestamptz not null default now(),
  unique(tone,template)
);

create table if not exists public.writer_examples (
  id uuid primary key default gen_random_uuid(),
  intent_pattern text not null,
  normalized_intent text not null,
  tone text not null default '',
  source_phrase text,
  improved_phrase text not null,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists writer_examples_intent_idx
on public.writer_examples(normalized_intent,tone,active);

alter table public.phrase_generations
  add column if not exists template_id uuid references public.writer_templates(id) on delete set null;

create table if not exists public.writer_feedback (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid references public.phrase_generations(id) on delete set null,
  template_id uuid references public.writer_templates(id) on delete set null,
  approved boolean not null,
  corrected_phrase text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.writer_templates enable row level security;
alter table public.writer_examples enable row level security;
alter table public.writer_feedback enable row level security;

drop policy if exists "admins manage writer templates" on public.writer_templates;
create policy "admins manage writer templates"
on public.writer_templates for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage writer examples" on public.writer_examples;
create policy "admins manage writer examples"
on public.writer_examples for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage writer feedback" on public.writer_feedback;
create policy "admins manage writer feedback"
on public.writer_feedback for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.writer_templates(tone,template) values
('', 'A veces, {intent} cambia cuando dejamos de exigir una respuesta inmediata.'),
('', 'Hay momentos en los que {intent} necesita menos explicaciones y más espacio para ser comprendido.'),
('', 'Mirar {intent} con un poco más de distancia puede revelar algo que antes no veíamos.'),
('', 'No todo lo que sentimos alrededor de {intent} necesita resolverse de inmediato.'),
('', 'Dar lugar a {intent} también puede ser una forma de entender mejor lo que estamos viviendo.'),
('profundo', 'A veces, {intent} no pide una respuesta rápida, sino una mirada más honesta hacia adentro.'),
('profundo', 'Hay cosas que cambian cuando dejamos de pelear con {intent} y empezamos a escucharlo.'),
('amoroso', 'Que {intent} encuentre un lugar donde pueda sentirse acompañado, sin apuro y sin exigencias.'),
('amoroso', 'También hay cariño en aprender a estar cerca de {intent} sin querer corregirlo todo.'),
('tierno', 'Ojalá {intent} encuentre hoy un poco de calma, compañía y tiempo para acomodarse.'),
('breve', 'A veces, {intent} sólo necesita espacio.'),
('breve', 'Dar lugar a {intent} también es avanzar.'),
('reflexivo', 'Pensar en {intent} desde otro lugar puede cambiar la forma en que lo vivimos.'),
('reflexivo', 'A veces entendemos mejor {intent} cuando dejamos de buscar una única explicación.'),
('espiritual', 'Cuando hacemos silencio frente a {intent}, algunas respuestas empiezan a aparecer de otra manera.'),
('espiritual', 'Hay procesos que alrededor de {intent} sólo se vuelven claros cuando aprendemos a observarlos sin apuro.'),
('gracioso', 'Con {intent}, a veces el mejor plan es no tener un plan perfecto.'),
('familiar', 'En los vínculos cercanos, hablar de {intent} con honestidad puede acercarnos más.')
on conflict (tone,template) do nothing;

drop function if exists public.generate_phrase_text(text,text,integer,text);

create or replace function public.generate_phrase_text(
  p_intent text,
  p_tone text default '',
  p_variant integer default 0,
  p_session_id text default null,
  p_mode text default 'public'
)
returns table (
  phrase text,
  found boolean,
  generation_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent text := trim(coalesce(p_intent,''));
  v_norm text;
  v_tone text := lower(trim(coalesce(p_tone,'')));
  v_variant integer := greatest(0,coalesce(p_variant,0));
  v_mode text := lower(trim(coalesce(p_mode,'public')));
  v_query tsquery;
  v_node_id bigint;
  v_example record;
  v_template record;
  v_template_id uuid := null;
  v_template_count integer := 0;
  v_phrase text;
  v_generation uuid;
  v_recent integer := 0;
begin
  if v_intent = '' then
    return query select ''::text,false,null::uuid;
    return;
  end if;

  if length(v_intent) > 300 then
    v_intent := left(v_intent,300);
  end if;

  v_norm := lower(regexp_replace(extensions.unaccent(v_intent),'[^a-z0-9ñ]+',' ','g'));
  v_norm := trim(regexp_replace(v_norm,'\s+',' ','g'));

  if v_mode='public' and p_session_id is not null and p_session_id<>'' then
    select count(*) into v_recent
    from public.visitor_intents
    where session_id=left(p_session_id,100)
      and created_at >= now()-interval '1 minute';

    if v_recent >= 12 then
      raise exception 'rate_limited';
    end if;
  end if;

  v_query := websearch_to_tsquery('spanish',v_intent);

  select k.id into v_node_id
  from public.knowledge_nodes k
  join public.books b on b.id=k.book_id
  where b.status='ready'
    and k.search_vector is not null
    and k.search_vector @@ v_query
  order by ts_rank_cd(k.search_vector,v_query) desc,k.id
  limit 1;

  if v_node_id is null then
    select k.id into v_node_id
    from public.knowledge_nodes k
    join public.books b on b.id=k.book_id
    where b.status='ready'
      and exists (
        select 1
        from regexp_split_to_table(lower(v_intent),'[^[:alnum:]áéíóúüñ]+') w
        where length(w)>=4
          and lower(coalesce(k.source_text,'')||' '||coalesce(k.context,'')||' '||coalesce(k.idea,'')) like '%'||w||'%'
      )
    order by k.id
    limit 1;
  end if;

  if v_node_id is null then
    if v_mode='public' then
      insert into public.visitor_intents(intent,normalized_intent,had_result,session_id)
      values(v_intent,v_norm,false,left(p_session_id,100));
    end if;
    return query select ''::text,false,null::uuid;
    return;
  end if;

  select e.* into v_example
  from public.writer_examples e
  where e.active=true
    and (e.tone='' or e.tone=v_tone)
    and (
      e.normalized_intent=v_norm
      or to_tsvector('spanish',e.intent_pattern) @@ websearch_to_tsquery('spanish',v_intent)
      or to_tsvector('spanish',v_intent) @@ websearch_to_tsquery('spanish',e.intent_pattern)
    )
  order by
    case when e.normalized_intent=v_norm then 0 else 1 end,
    case when e.tone=v_tone and v_tone<>'' then 0 else 1 end,
    md5(e.id::text||':'||v_variant::text)
  limit 1;

  if v_example.id is not null then
    v_phrase := v_example.improved_phrase;
    v_template_id := null;
  else
    select count(*) into v_template_count
    from public.writer_templates t
    where t.active=true
      and (
        (v_tone<>'' and t.tone in (v_tone,''))
        or
        (v_tone='' and t.tone='')
      );

    select t.* into v_template
    from public.writer_templates t
    where t.active=true
      and (
        (v_tone<>'' and t.tone in (v_tone,''))
        or
        (v_tone='' and t.tone='')
      )
    order by
      case when v_tone<>'' and t.tone=v_tone then 0 else 1 end,
      t.score desc,
      t.approvals desc,
      t.rejections asc,
      t.id
    offset (v_variant % greatest(v_template_count,1))
    limit 1;

    if v_template.id is null then
      return query select ''::text,false,null::uuid;
      return;
    end if;

    v_template_id := v_template.id;
    v_phrase := replace(v_template.template,'{intent}',lower(v_intent));
    v_phrase := upper(left(v_phrase,1))||substr(v_phrase,2);
  end if;

  insert into public.phrase_generations(
    intent,tone,phrase,source,matched,source_node_ids,template_id
  )
  values(
    v_intent,nullif(v_tone,''),v_phrase,
    case when v_mode='admin' or v_mode='study' then 'admin' else 'public' end,
    true,array[v_node_id],v_template_id
  )
  returning id into v_generation;

  if v_mode='public' then
    insert into public.visitor_intents(
      intent,normalized_intent,had_result,generation_id,session_id
    )
    values(
      v_intent,v_norm,true,v_generation,left(p_session_id,100)
    );

    insert into public.visitor_events(
      event_type,generation_id,intent,session_id
    )
    values(
      'generate',v_generation,v_intent,left(p_session_id,100)
    );
  end if;

  return query select v_phrase,true,v_generation;
end;
$$;

create or replace function public.record_writer_feedback(
  p_generation_id uuid,
  p_approved boolean,
  p_corrected_phrase text default null,
  p_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g record;
  v_corrected text := trim(coalesce(p_corrected_phrase,''));
  v_norm text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  select * into g
  from public.phrase_generations
  where id=p_generation_id;

  if g.id is null then
    raise exception 'generation_not_found';
  end if;

  insert into public.writer_feedback(
    generation_id,template_id,approved,corrected_phrase,notes,created_by
  )
  values(
    g.id,g.template_id,p_approved,nullif(v_corrected,''),nullif(trim(coalesce(p_notes,'')),''),auth.uid()
  );

  if g.template_id is not null then
    update public.writer_templates
    set approvals=approvals+case when p_approved then 1 else 0 end,
        rejections=rejections+case when p_approved then 0 else 1 end,
        score=score+case when p_approved then 2 else -2 end
    where id=g.template_id;
  end if;

  if v_corrected<>'' then
    v_norm := lower(regexp_replace(extensions.unaccent(g.intent),'[^a-z0-9ñ]+',' ','g'));
    v_norm := trim(regexp_replace(v_norm,'\s+',' ','g'));

    insert into public.writer_examples(
      intent_pattern,normalized_intent,tone,source_phrase,improved_phrase,notes,created_by
    )
    values(
      g.intent,v_norm,coalesce(g.tone,''),g.phrase,v_corrected,nullif(trim(coalesce(p_notes,'')),''),auth.uid()
    );
  end if;

  return true;
end;
$$;

revoke all on function public.generate_phrase_text(text,text,integer,text,text) from public;
grant execute on function public.generate_phrase_text(text,text,integer,text,text) to anon, authenticated;

revoke all on function public.record_writer_feedback(uuid,boolean,text,text) from public;
grant execute on function public.record_writer_feedback(uuid,boolean,text,text) to authenticated;
