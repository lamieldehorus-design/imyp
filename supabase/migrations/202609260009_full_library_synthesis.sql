-- Síntesis de biblioteca completa v6
-- Todos los libros de contenido READY son consultados.
-- Todos los fragmentos relevantes participan en el análisis conceptual.
-- Sólo se guarda una muestra de IDs en phrase_generations para no inflar cada fila.

alter table public.phrase_generations
  add column if not exists corpus_book_count integer not null default 0,
  add column if not exists matched_book_count integer not null default 0,
  add column if not exists matched_node_count integer not null default 0;

drop function if exists public.generate_phrase_text(text,text,integer,text,text);

create or replace function public.generate_phrase_text(
  p_intent text,
  p_tone text default '',
  p_variant integer default 0,
  p_session_id text default null,
  p_mode text default 'public'
)
returns table(
  phrase text,
  found boolean,
  generation_id uuid,
  corpus_books integer,
  matched_books integer,
  matched_nodes integer
)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_intent text:=trim(coalesce(p_intent,''));
  v_norm text;
  v_tone text:=lower(trim(coalesce(p_tone,'')));
  v_variant integer:=greatest(0,coalesce(p_variant,0));
  v_mode text:=lower(trim(coalesce(p_mode,'public')));
  v_query tsquery;

  v_all_node_ids bigint[];
  v_saved_node_ids bigint[];
  v_corpus_books integer:=0;
  v_matched_books integer:=0;
  v_matched_nodes integer:=0;

  v_topic record;
  v_subject text;
  v_about text;
  v_concept_core text;

  v_open text;
  v_core text;
  v_turn text;
  v_close text;
  v_phrase text;
  v_generation uuid;

  v_recent integer:=0;
  i integer;
  open_count integer;
  core_count integer;
  turn_count integer;
  close_count integer;
  oi integer;
  ci integer;
  ti integer;
  zi integer;
begin
  if v_intent='' then
    return query select ''::text,false,null::uuid,0,0,0;
    return;
  end if;

  if length(v_intent)>300 then v_intent:=left(v_intent,300); end if;

  v_norm:=trim(regexp_replace(
    lower(regexp_replace(extensions.unaccent(v_intent),'[^a-z0-9ñ]+',' ','g')),
    '\s+',' ','g'
  ));

  select count(*) into v_corpus_books
  from public.books
  where status='ready' and resource_type='content';

  if v_mode='public' and coalesce(p_session_id,'')<>'' then
    select count(*) into v_recent
    from public.visitor_intents
    where session_id=left(p_session_id,100)
      and created_at>=now()-interval '1 minute';
    if v_recent>=12 then raise exception 'rate_limited'; end if;
  end if;

  v_query:=websearch_to_tsquery('spanish',v_intent);

  -- Sin LIMIT: todos los fragmentos relevantes de todos los libros READY participan.
  select array_agg(k.id order by ts_rank_cd(k.search_vector,v_query) desc,k.id)
  into v_all_node_ids
  from public.knowledge_nodes k
  join public.books b on b.id=k.book_id
  where b.status='ready'
    and b.resource_type='content'
    and k.search_vector is not null
    and k.search_vector @@ v_query;

  -- Fallback léxico, también contra toda la biblioteca.
  if coalesce(array_length(v_all_node_ids,1),0)=0 then
    select array_agg(k.id order by k.id)
    into v_all_node_ids
    from public.knowledge_nodes k
    join public.books b on b.id=k.book_id
    where b.status='ready'
      and b.resource_type='content'
      and exists(
        select 1
        from regexp_split_to_table(v_norm,'\s+') w
        where length(w)>=4
          and lower(extensions.unaccent(
            coalesce(k.source_text,'')||' '||
            coalesce(k.idea,'')||' '||
            array_to_string(coalesce(k.themes,'{}'::text[]),' ')||' '||
            array_to_string(coalesce(k.keywords,'{}'::text[]),' ')
          )) like '%'||w||'%'
      );
  end if;

  v_matched_nodes:=coalesce(array_length(v_all_node_ids,1),0);

  if v_matched_nodes=0 then
    if v_mode='public' then
      insert into public.visitor_intents(intent,normalized_intent,had_result,session_id)
      values(v_intent,v_norm,false,left(p_session_id,100));
    end if;

    return query
      select ''::text,false,null::uuid,v_corpus_books,0,0;
    return;
  end if;

  select count(distinct k.book_id)
  into v_matched_books
  from public.knowledge_nodes k
  where k.id=any(v_all_node_ids);

  -- Los IDs guardados son sólo trazabilidad. El análisis de abajo usa TODOS.
  v_saved_node_ids:=v_all_node_ids[1:least(v_matched_nodes,64)];

  -- Elegimos ángulos conceptuales usando toda la evidencia.
  -- Primero pesa la diversidad de libros; luego cantidad de fragmentos.
  with concept_scores as(
    select
      cb.id,
      cb.text,
      cb.tone,
      cb.score,
      count(distinct k.book_id) as book_hits,
      count(*) as node_hits
    from public.writer_concept_blocks cb
    join public.knowledge_nodes k
      on k.id=any(v_all_node_ids)
    where cb.active=true
      and (cb.tone='' or cb.tone=v_tone)
      and exists(
        select 1
        from unnest(cb.triggers) tr
        where lower(extensions.unaccent(
          coalesce(k.idea,'')||' '||
          array_to_string(coalesce(k.themes,'{}'::text[]),' ')||' '||
          array_to_string(coalesce(k.keywords,'{}'::text[]),' ')
        )) like '%'||lower(extensions.unaccent(tr))||'%'
      )
    group by cb.id,cb.text,cb.tone,cb.score
  ),
  ranked as(
    select *,
      row_number() over(
        order by
          book_hits desc,
          node_hits desc,
          case when tone=v_tone and v_tone<>'' then 0 else 1 end,
          score desc,
          id
      ) as rn,
      count(*) over() as total
    from concept_scores
  )
  select text
  into v_concept_core
  from ranked
  where rn=((v_variant % greatest(least(total,8),1))+1)
  limit 1;

  select t.* into v_topic
  from public.writer_topics t
  where t.active=true
    and exists(
      select 1 from unnest(t.aliases) a
      where lower(extensions.unaccent(a))=v_norm
         or v_norm like '%'||lower(extensions.unaccent(a))||'%'
    )
  order by length(t.canonical) desc
  limit 1;

  if v_topic.id is not null then
    v_subject:=v_topic.subject_form;
    v_about:=v_topic.about_form;
  elsif v_norm ~ '^[a-zñ]+(ar|er|ir)$' then
    v_subject:=lower(v_intent);
    v_about:=lower(v_intent);
  else
    v_subject:='esto que estás viviendo';
    v_about:='esto que estás viviendo';
  end if;

  select count(*) into open_count
  from public.writer_fragments
  where active=true and role='opening' and tone in(v_tone,'');

  select count(*) into core_count
  from public.writer_fragments
  where active=true and role='core' and tone in(v_tone,'');

  select count(*) into turn_count
  from public.writer_fragments
  where active=true and role='turn' and tone in(v_tone,'');

  select count(*) into close_count
  from public.writer_fragments
  where active=true and role='closing' and tone in(v_tone,'');

  if least(open_count,core_count,turn_count,close_count)=0 then
    return query
      select ''::text,false,null::uuid,v_corpus_books,v_matched_books,v_matched_nodes;
    return;
  end if;

  for i in 0..59 loop
    oi:=((v_variant+i) % open_count);
    ci:=((v_variant*3+i*5+1) % core_count);
    ti:=((v_variant*5+i*7+2) % turn_count);
    zi:=((v_variant*7+i*11+3) % close_count);

    select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
    into v_open
    from public.writer_fragments
    where active=true and role='opening' and tone in(v_tone,'')
    order by
      case when tone=v_tone and v_tone<>'' then 0 else 1 end,
      score desc,id
    offset oi limit 1;

    if v_concept_core is not null and ((v_variant+i)%2)=0 then
      v_core:=v_concept_core;
    else
      select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
      into v_core
      from public.writer_fragments
      where active=true and role='core' and tone in(v_tone,'')
      order by
        case when tone=v_tone and v_tone<>'' then 0 else 1 end,
        score desc,id
      offset ci limit 1;
    end if;

    select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
    into v_turn
    from public.writer_fragments
    where active=true and role='turn' and tone in(v_tone,'')
    order by
      case when tone=v_tone and v_tone<>'' then 0 else 1 end,
      score desc,id
    offset ti limit 1;

    select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
    into v_close
    from public.writer_fragments
    where active=true and role='closing' and tone in(v_tone,'')
    order by
      case when tone=v_tone and v_tone<>'' then 0 else 1 end,
      score desc,id
    offset zi limit 1;

    v_phrase:=concat_ws(' ',v_open,v_core,v_turn,v_close);

    exit when not exists(
      select 1
      from public.phrase_generations g
      where lower(g.intent)=lower(v_intent)
        and coalesce(g.tone,'')=v_tone
        and g.phrase=v_phrase
        and g.created_at>=now()-interval '90 days'
    );
  end loop;

  insert into public.phrase_generations(
    intent,tone,phrase,source,matched,source_node_ids,template_id,
    corpus_book_count,matched_book_count,matched_node_count
  )
  values(
    v_intent,nullif(v_tone,''),v_phrase,
    case when v_mode in('admin','study') then 'admin' else 'public' end,
    true,v_saved_node_ids,null,
    v_corpus_books,v_matched_books,v_matched_nodes
  )
  returning id into v_generation;

  if v_mode='public' then
    insert into public.visitor_intents(
      intent,normalized_intent,had_result,generation_id,session_id
    )
    values(v_intent,v_norm,true,v_generation,left(p_session_id,100));

    insert into public.visitor_events(event_type,generation_id,intent,session_id)
    values('generate',v_generation,v_intent,left(p_session_id,100));
  end if;

  return query
    select v_phrase,true,v_generation,
           v_corpus_books,v_matched_books,v_matched_nodes;
end;
$$;

grant execute on function public.generate_phrase_text(text,text,integer,text,text)
to anon,authenticated;
