-- Motor gratuito de frases: búsqueda en español + plantillas.
-- Ejecutar después de 202609260001_imyp_backend.sql.

alter table public.knowledge_nodes
  add column if not exists source_text text;

alter table public.knowledge_nodes
  add column if not exists search_vector tsvector;

create or replace function public.refresh_knowledge_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    to_tsvector(
      'spanish',
      concat_ws(
        ' ',
        coalesce(new.source_text,''),
        coalesce(new.idea,''),
        coalesce(new.context,''),
        array_to_string(coalesce(new.themes,'{}'::text[]),' '),
        array_to_string(coalesce(new.keywords,'{}'::text[]),' ')
      )
    );
  return new;
end;
$$;

drop trigger if exists knowledge_nodes_search_vector_trigger
on public.knowledge_nodes;

create trigger knowledge_nodes_search_vector_trigger
before insert or update of source_text, idea, context, themes, keywords
on public.knowledge_nodes
for each row
execute function public.refresh_knowledge_search_vector();

update public.knowledge_nodes
set search_vector =
  to_tsvector(
    'spanish',
    concat_ws(
      ' ',
      coalesce(source_text,''),
      coalesce(idea,''),
      coalesce(context,''),
      array_to_string(coalesce(themes,'{}'::text[]),' '),
      array_to_string(coalesce(keywords,'{}'::text[]),' ')
    )
  )
where search_vector is null;

create index if not exists knowledge_nodes_search_vector_gin
on public.knowledge_nodes
using gin(search_vector);

create or replace function public.generate_phrase_text(
  p_intent text,
  p_tone text default '',
  p_variant integer default 0,
  p_session_id text default null
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
  v_tone text := lower(trim(coalesce(p_tone,'')));
  v_variant integer := greatest(0,coalesce(p_variant,0));
  v_query tsquery;
  v_node record;
  v_terms text[];
  v_k1 text := 'claridad';
  v_k2 text := 'presencia';
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

  if p_session_id is not null and p_session_id <> '' then
    select count(*) into v_recent
    from public.visitor_intents
    where session_id = left(p_session_id,100)
      and created_at >= now() - interval '1 minute';

    if v_recent >= 12 then
      raise exception 'rate_limited';
    end if;
  end if;

  v_query := websearch_to_tsquery('spanish',v_intent);

  with ranked as (
    select
      k.id,
      k.keywords,
      k.themes,
      k.idea,
      k.context,
      ts_rank_cd(k.search_vector,v_query) as rank
    from public.knowledge_nodes k
    join public.books b on b.id=k.book_id
    where b.status='ready'
      and k.search_vector is not null
      and k.search_vector @@ v_query
    order by rank desc,k.id
    limit 12
  )
  select r.*
  into v_node
  from ranked r
  order by md5(r.id::text || ':' || v_variant::text)
  limit 1;

  if v_node.id is null then
    select
      k.id,k.keywords,k.themes,k.idea,k.context,0::real as rank
    into v_node
    from public.knowledge_nodes k
    join public.books b on b.id=k.book_id
    where b.status='ready'
      and exists (
        select 1
        from regexp_split_to_table(lower(v_intent),'[^[:alnum:]áéíóúüñ]+') w
        where length(w) >= 4
          and lower(coalesce(k.source_text,'') || ' ' || coalesce(k.context,'') || ' ' || coalesce(k.idea,'')) like '%' || w || '%'
      )
    order by md5(k.id::text || ':' || v_variant::text)
    limit 1;
  end if;

  if v_node.id is null then
    insert into public.visitor_intents(intent,normalized_intent,had_result,session_id)
    values(v_intent,lower(v_intent),false,left(p_session_id,100));

    return query select ''::text,false,null::uuid;
    return;
  end if;

  v_terms := array_cat(
    coalesce(v_node.keywords,'{}'::text[]),
    coalesce(v_node.themes,'{}'::text[])
  );

  if coalesce(array_length(v_terms,1),0) >= 1 then
    v_k1 := lower(v_terms[1]);
  end if;
  if coalesce(array_length(v_terms,1),0) >= 2 then
    v_k2 := lower(v_terms[2]);
  else
    v_k2 := v_k1;
  end if;

  case v_tone
    when 'profundo' then
      v_phrase := 'A veces, ' || lower(v_intent) || ' no pide respuestas rápidas, sino una mirada más profunda sobre ' || v_k1 || '.';
    when 'amoroso' then
      v_phrase := 'Que en medio de ' || lower(v_intent) || ' no falte ' || v_k1 || ', porque también ahí puede empezar una forma más verdadera de cuidar.';
    when 'tierno' then
      v_phrase := 'Que ' || v_k1 || ' acompañe eso que hoy sentís cuando pensás en ' || lower(v_intent) || '.';
    when 'breve' then
      v_phrase := initcap(v_k1) || ' también puede cambiar la forma de vivir ' || lower(v_intent) || '.';
    when 'reflexivo' then
      v_phrase := 'Mirar ' || v_k1 || ' con más atención puede cambiar la manera de comprender ' || lower(v_intent) || '.';
    when 'espiritual' then
      v_phrase := 'A veces, ' || lower(v_intent) || ' empieza a transformarse cuando reconocemos ' || v_k1 || ' dentro de nosotros.';
    when 'gracioso' then
      v_phrase := 'Entre ' || v_k1 || ' y ' || lower(v_intent) || ', a veces también hace falta dejar un pequeño lugar para reír.';
    when 'familiar' then
      v_phrase := 'En los vínculos cercanos, ' || v_k1 || ' puede decir mucho cuando ' || lower(v_intent) || ' cuesta ponerlo en palabras.';
    else
      case (v_variant % 4)
        when 0 then v_phrase := 'Cuando aparece ' || lower(v_intent) || ', también puede abrirse un espacio para ' || v_k1 || '.';
        when 1 then v_phrase := 'A veces, entender ' || v_k1 || ' cambia la manera de atravesar ' || lower(v_intent) || '.';
        when 2 then v_phrase := 'No todo se resuelve enseguida: ' || v_k1 || ' también puede darle otra forma a ' || lower(v_intent) || '.';
        else v_phrase := 'Hay momentos en que ' || v_k1 || ' cambia la forma en que vivimos ' || lower(v_intent) || '.';
      end case;
  end case;

  v_phrase := upper(left(v_phrase,1)) || substr(v_phrase,2);

  insert into public.phrase_generations(
    intent,tone,phrase,source,matched,source_node_ids
  )
  values(
    v_intent,nullif(v_tone,''),v_phrase,'public',true,array[v_node.id]
  )
  returning id into v_generation;

  insert into public.visitor_intents(
    intent,normalized_intent,had_result,generation_id,session_id
  )
  values(
    v_intent,lower(v_intent),true,v_generation,left(p_session_id,100)
  );

  insert into public.visitor_events(
    event_type,generation_id,intent,session_id
  )
  values(
    'generate',v_generation,v_intent,left(p_session_id,100)
  );

  return query select v_phrase,true,v_generation;
end;
$$;

create or replace function public.track_phrase_event(
  p_event_type text,
  p_generation_id uuid default null,
  p_phrase_id uuid default null,
  p_intent text default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_event_type not in ('copy','personalize','download','share','search') then
    return false;
  end if;

  insert into public.visitor_events(
    event_type,generation_id,phrase_id,intent,session_id,metadata
  )
  values(
    p_event_type,
    p_generation_id,
    p_phrase_id,
    left(p_intent,300),
    left(p_session_id,100),
    coalesce(p_metadata,'{}'::jsonb)
  );
  return true;
end;
$$;

revoke all on function public.generate_phrase_text(text,text,integer,text) from public;
grant execute on function public.generate_phrase_text(text,text,integer,text) to anon, authenticated;

revoke all on function public.track_phrase_event(text,uuid,uuid,text,text,jsonb) from public;
grant execute on function public.track_phrase_event(text,uuid,uuid,text,text,jsonb) to anon, authenticated;
