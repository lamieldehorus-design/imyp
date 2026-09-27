-- Motor lingüístico estadístico v4
-- Ejecutar después de 202609260005_language_resources.sql.

create table if not exists public.lexicon_terms (
  book_id uuid not null references public.books(id) on delete cascade,
  normalized text not null,
  display text not null,
  occurrences integer not null default 1,
  created_at timestamptz not null default now(),
  primary key(book_id,normalized)
);

create index if not exists lexicon_terms_normalized_idx
on public.lexicon_terms(normalized);

create table if not exists public.language_ngrams (
  book_id uuid not null references public.books(id) on delete cascade,
  resource_type text not null check(resource_type in ('grammar','style')),
  n smallint not null check(n in (2,3)),
  gram text not null,
  occurrences integer not null default 1,
  created_at timestamptz not null default now(),
  primary key(book_id,n,gram)
);

create index if not exists language_ngrams_lookup_idx
on public.language_ngrams(n,gram);

alter table public.lexicon_terms enable row level security;
alter table public.language_ngrams enable row level security;

drop policy if exists "admins manage lexicon terms" on public.lexicon_terms;
create policy "admins manage lexicon terms"
on public.lexicon_terms for all to authenticated
using(public.is_admin())
with check(public.is_admin());

drop policy if exists "admins manage language ngrams" on public.language_ngrams;
create policy "admins manage language ngrams"
on public.language_ngrams for all to authenticated
using(public.is_admin())
with check(public.is_admin());

create or replace function public.writer_language_score(p_phrase text)
returns double precision
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  words text[];
  l integer;
  i integer;
  g text;
  c bigint;
  total double precision := 0;
begin
  words := regexp_split_to_array(
    trim(lower(regexp_replace(extensions.unaccent(coalesce(p_phrase,'')),'[^a-z0-9ñ]+',' ','g'))),
    '\s+'
  );
  l := coalesce(array_length(words,1),0);
  if l<2 then return 0; end if;

  for i in 1..l-1 loop
    g := words[i]||' '||words[i+1];
    select coalesce(sum(occurrences),0) into c
    from public.language_ngrams
    where n=2 and gram=g;
    total := total + ln(1+c);
  end loop;

  if l>=3 then
    for i in 1..l-2 loop
      g := words[i]||' '||words[i+1]||' '||words[i+2];
      select coalesce(sum(occurrences),0) into c
      from public.language_ngrams
      where n=3 and gram=g;
      total := total + (2*ln(1+c));
    end loop;
  end if;

  return total;
end;
$$;

grant execute on function public.writer_language_score(text)
to anon,authenticated;


-- Ampliación del banco para garantizar variedad suficiente por tono.
insert into public.writer_templates(tone,template,active) values
('profundo','Hay momentos en los que {subject} obliga a mirar más allá de la primera respuesta.',true),
('profundo','Pensar en {about} puede cambiar cuando dejamos de buscar una explicación rápida.',true),
('profundo','A veces {subject} revela algo que sólo aparece cuando dejamos de defendernos de lo que sentimos.',true),
('profundo','No todo alrededor de {about} se entiende enseguida; algunas cosas necesitan experiencia antes que respuestas.',true),
('profundo','Volver sobre {about} desde otro lugar puede mostrar algo que antes estaba oculto por la costumbre.',true),
('profundo','Hay preguntas alrededor de {about} que valen más por lo que despiertan que por la respuesta que prometen.',true),
('profundo','A veces {subject} cambia de sentido cuando cambia la persona que lo está mirando.',true),
('profundo','Pensar en {about} también puede ser una forma de descubrir qué parte de vos está pidiendo atención.',true),

('amoroso','Cuando aparece {subject}, cuidar puede empezar por no exigir que todo se explique de inmediato.',true),
('amoroso','Pensar en {about} con cariño también implica dejar espacio para lo que todavía no sabemos cómo decir.',true),
('amoroso','A veces {subject} necesita una presencia tranquila más que una respuesta perfecta.',true),
('amoroso','Hay formas de acompañar {about} que empiezan simplemente por escuchar de verdad.',true),
('amoroso','Cuidar lo que sentimos alrededor de {about} también puede ser una forma de cuidarnos entre nosotros.',true),
('amoroso','Cuando {subject} ocupa mucho espacio, una presencia sincera puede hacerlo un poco más habitable.',true),
('amoroso','Pensar en {about} con ternura no borra lo difícil, pero cambia la manera de atravesarlo.',true),
('amoroso','A veces estar cerca de {about} significa no querer arreglarlo todo.',true),

('tierno','Que {subject} encuentre hoy un poco de paciencia, compañía y descanso.',true),
('tierno','Pensar en {about} también puede ser una forma de abrazar lo que todavía está buscando su lugar.',true),
('tierno','Ojalá {subject} pese un poco menos cuando puedas compartirlo con alguien.',true),
('tierno','Hay días en los que pensar en {about} necesita menos palabras y un poco más de cariño.',true),
('tierno','Que alrededor de {about} también haya espacio para algo amable.',true),
('tierno','A veces {subject} se vuelve más llevadero cuando dejamos de pedirnos tanto.',true),
('tierno','Pensar en {about} con suavidad también puede cambiar la forma de sentirlo.',true),
('tierno','Que {subject} no tape por completo las cosas pequeñas que todavía pueden hacerte bien.',true),

('breve','Pensar en {about} también puede abrir otra puerta.',true),
('breve','A veces {subject} cambia cuando lo mirás distinto.',true),
('breve','No todo alrededor de {about} necesita una respuesta inmediata.',true),
('breve','También podés darle tiempo a {about}.',true),
('breve','Mirar {about} de otra manera también es avanzar.',true),
('breve','A veces {subject} sólo necesita espacio.',true),
('breve','No hace falta entender {about} todo de una vez.',true),
('breve','También cuenta aprender de {about}.',true),

('reflexivo','Preguntarte qué lugar ocupa {subject} en tu vida puede cambiar la forma de entenderlo.',true),
('reflexivo','Pensar en {about} también implica revisar desde qué lugar lo estás mirando.',true),
('reflexivo','A veces {subject} dice tanto sobre la situación como sobre nuestra forma de interpretarla.',true),
('reflexivo','No siempre pensamos en {about} con las mismas preguntas, y eso también habla de cómo cambiamos.',true),
('reflexivo','Mirar {about} con curiosidad puede ser más útil que juzgarlo demasiado rápido.',true),
('reflexivo','Hay momentos en los que {subject} necesita contexto antes que conclusiones.',true),
('reflexivo','Pensar en {about} también puede ayudarte a distinguir lo que sentís de lo que imaginás.',true),
('reflexivo','A veces entender {about} empieza por reconocer qué parte depende de vos y cuál no.',true),

('espiritual','A veces {subject} invita a escuchar algo que el ruido cotidiano deja en segundo plano.',true),
('espiritual','Pensar en {about} también puede ser una forma de volver a una parte más silenciosa de vos.',true),
('espiritual','Cuando {subject} aparece, quizá también esté señalando algo que necesita ser mirado con más presencia.',true),
('espiritual','Hay experiencias alrededor de {about} que encuentran sentido cuando dejamos de querer controlarlas por completo.',true),
('espiritual','A veces {subject} abre una pregunta interior que no se responde sólo con palabras.',true),
('espiritual','Pensar en {about} puede convertirse en una pausa para escuchar qué está cambiando por dentro.',true),
('espiritual','No todo alrededor de {about} necesita una explicación; algunas cosas primero necesitan conciencia.',true),
('espiritual','Cuando hacés espacio para {about}, también puede aparecer una forma distinta de entenderte.',true),

('gracioso','Con {subject}, a veces el plan B es admitir que nunca hubo plan A.',true),
('gracioso','Pensar en {about} está perfecto, siempre que no termine necesitando una planilla de Excel.',true),
('gracioso','Si {subject} viniera con tutorial, seguramente igual saltaríamos la introducción.',true),
('gracioso','Hay días en los que {about} merece reflexión y otros en los que merece una merienda.',true),
('gracioso','Con {subject}, la teoría suele durar hasta que aparece la vida real.',true),
('gracioso','Pensar demasiado en {about} puede convertir una idea simple en una serie con demasiadas temporadas.',true),
('gracioso','Si {subject} se pone complicado, siempre se puede fingir que era parte del aprendizaje.',true),
('gracioso','A veces {about} no necesita una solución brillante; necesita que dejemos de complicarlo cinco minutos.',true),

('familiar','Cuando aparece {subject}, compartir lo que sentimos puede acercarnos más que fingir que no pasa nada.',true),
('familiar','Pensar en {about} con alguien que conoce tu historia puede cambiar mucho la perspectiva.',true),
('familiar','A veces {subject} se hace más fácil cuando deja de ser un asunto que cada uno carga por separado.',true),
('familiar','En familia, hablar de {about} también puede ser una forma de ordenar lo que todos sienten distinto.',true),
('familiar','Cuando {subject} toca a quienes queremos, estar disponibles suele importar más que saber qué decir.',true),
('familiar','Pensar juntos en {about} no obliga a estar de acuerdo; a veces alcanza con poder escucharse.',true),
('familiar','Hay temas alrededor de {about} que se vuelven más claros cuando cada uno puede contar cómo los vive.',true),
('familiar','A veces {subject} necesita menos opiniones y más espacio para que todos puedan hablar.',true)
on conflict (tone,template) do update set active=true;

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
  generation_id uuid
)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_intent text := trim(coalesce(p_intent,''));
  v_norm text;
  v_tone text := lower(trim(coalesce(p_tone,'')));
  v_variant integer := greatest(0,coalesce(p_variant,0));
  v_mode text := lower(trim(coalesce(p_mode,'public')));
  v_query tsquery;
  v_node_id bigint;
  v_topic record;
  v_subject text;
  v_about text;
  v_candidate record;
  v_phrase text;
  v_generation uuid;
  v_recent integer := 0;
begin
  if v_intent='' then
    return query select ''::text,false,null::uuid;
    return;
  end if;
  if length(v_intent)>300 then v_intent:=left(v_intent,300); end if;

  v_norm := trim(regexp_replace(
    lower(regexp_replace(extensions.unaccent(v_intent),'[^a-z0-9ñ]+',' ','g')),
    '\s+',' ','g'
  ));

  if v_mode='public' and coalesce(p_session_id,'')<>'' then
    select count(*) into v_recent
    from public.visitor_intents
    where session_id=left(p_session_id,100)
      and created_at>=now()-interval '1 minute';
    if v_recent>=12 then raise exception 'rate_limited'; end if;
  end if;

  v_query := websearch_to_tsquery('spanish',v_intent);

  select k.id into v_node_id
  from public.knowledge_nodes k
  join public.books b on b.id=k.book_id
  where b.status='ready'
    and b.resource_type='content'
    and k.search_vector is not null
    and k.search_vector @@ v_query
  order by ts_rank_cd(k.search_vector,v_query) desc,k.id
  limit 1;

  if v_node_id is null then
    select k.id into v_node_id
    from public.knowledge_nodes k
    join public.books b on b.id=k.book_id
    where b.status='ready'
      and b.resource_type='content'
      and exists(
        select 1
        from regexp_split_to_table(v_norm,'\s+') w
        where length(w)>=4
          and lower(extensions.unaccent(coalesce(k.source_text,'')||' '||coalesce(k.idea,'')))
            like '%'||w||'%'
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

  with candidates as(
    select
      e.improved_phrase as text,
      null::uuid as template_id,
      0 as priority,
      100::integer as feedback_score,
      public.writer_language_score(e.improved_phrase) as lang_score,
      e.created_at
    from public.writer_examples e
    where e.active=true
      and ((v_tone<>'' and e.tone=v_tone) or (v_tone='' and e.tone=''))
      and (
        e.normalized_intent=v_norm
        or exists(
          select 1 from regexp_split_to_table(v_norm,'\s+') w
          where length(w)>=4
            and lower(extensions.unaccent(e.intent_pattern)) like '%'||w||'%'
        )
      )

    union all

    select
      replace(replace(t.template,'{subject}',v_subject),'{about}',v_about),
      t.id,
      1,
      t.score,
      public.writer_language_score(
        replace(replace(t.template,'{subject}',v_subject),'{about}',v_about)
      ),
      t.created_at
    from public.writer_templates t
    where t.active=true
      and ((v_tone<>'' and t.tone=v_tone) or (v_tone='' and t.tone=''))

    union all

    select
      e.improved_phrase,
      null::uuid,
      2,
      50,
      public.writer_language_score(e.improved_phrase),
      e.created_at
    from public.writer_examples e
    where e.active=true
      and v_tone<>''
      and e.tone=''
      and (
        e.normalized_intent=v_norm
        or exists(
          select 1 from regexp_split_to_table(v_norm,'\s+') w
          where length(w)>=4
            and lower(extensions.unaccent(e.intent_pattern)) like '%'||w||'%'
        )
      )

    union all

    select
      replace(replace(t.template,'{subject}',v_subject),'{about}',v_about),
      t.id,
      3,
      t.score,
      public.writer_language_score(
        replace(replace(t.template,'{subject}',v_subject),'{about}',v_about)
      ),
      t.created_at
    from public.writer_templates t
    where t.active=true
      and v_tone<>''
      and t.tone=''
  ),
  distinct_candidates as(
    select distinct on(text)
      text,template_id,priority,feedback_score,lang_score,created_at
    from candidates
    where trim(text)<>''
    order by text,priority,feedback_score desc,lang_score desc
  ),
  numbered as(
    select *,
      row_number() over(
        order by priority,feedback_score desc,lang_score desc,created_at desc,text
      )-1 as rn,
      count(*) over() as total
    from distinct_candidates
  )
  select n.* into v_candidate
  from numbered n
  where n.rn=(v_variant % greatest(n.total,1))
  limit 1;

  if v_candidate.text is null then
    return query select ''::text,false,null::uuid;
    return;
  end if;

  v_phrase:=v_candidate.text;

  insert into public.phrase_generations(
    intent,tone,phrase,source,matched,source_node_ids,template_id
  )
  values(
    v_intent,nullif(v_tone,''),v_phrase,
    case when v_mode in('admin','study') then 'admin' else 'public' end,
    true,array[v_node_id],v_candidate.template_id
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

  return query select v_phrase,true,v_generation;
end;
$$;

grant execute on function public.generate_phrase_text(text,text,integer,text,text)
to anon,authenticated;
