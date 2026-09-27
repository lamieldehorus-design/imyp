-- Recursos lingüísticos + Redactor v3
-- Ejecutar después de 202609260004_writer_quality.sql.

alter table public.books
  add column if not exists resource_type text not null default 'content'
  check (resource_type in ('content','dictionary','grammar','style'));

create table if not exists public.writer_topics (
  id uuid primary key default gen_random_uuid(),
  canonical text not null unique,
  aliases text[] not null default '{}',
  subject_form text not null,
  about_form text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.writer_topics enable row level security;
drop policy if exists "admins manage writer topics" on public.writer_topics;
create policy "admins manage writer topics"
on public.writer_topics for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.writer_topics(canonical,aliases,subject_form,about_form) values
('calma',array['calma','tranquilidad','serenidad','paz'],'la calma','la calma'),
('fuerza',array['fuerza','fortaleza','coraje','resistencia'],'la fuerza','la fuerza'),
('amor',array['amor','querer','cariño','pareja'],'el amor','el amor'),
('amistad',array['amistad','amigo','amiga','amigos','amigas'],'la amistad','la amistad'),
('soledad',array['soledad','solo','sola','sentirse solo','sentirse sola'],'la soledad','la soledad'),
('tristeza',array['tristeza','triste','pena'],'la tristeza','la tristeza'),
('ansiedad',array['ansiedad','ansioso','ansiosa','nervios','preocupación','preocupacion'],'la ansiedad','la ansiedad'),
('transformacion',array['transformación','transformacion','cambio','cambiar','renacer'],'la transformación','la transformación'),
('gratitud',array['gratitud','agradecer','agradecimiento','gracias'],'la gratitud','la gratitud'),
('familia',array['familia','hogar','familiares'],'la familia','la familia'),
('hermana',array['hermana','hermanas'],'una hermana','una hermana'),
('cumpleanos',array['cumpleaños','cumpleanos','cumple','feliz cumpleaños','feliz cumple'],'un cumpleaños','un cumpleaños'),
('animo',array['ánimo','animo','aliento','seguir adelante'],'el ánimo','el ánimo'),
('esperanza',array['esperanza','esperar','confiar'],'la esperanza','la esperanza'),
('miedo',array['miedo','temor','asustado','asustada'],'el miedo','el miedo'),
('perdon',array['perdón','perdon','perdonar'],'el perdón','el perdón'),
('autoestima',array['autoestima','amor propio','valorarse'],'la autoestima','la autoestima'),
('viajar',array['viajar','viaje','viajes','buen viaje','vacaciones'],'viajar','viajar'),
('buenos dias',array['buenos días','buenos dias','buen día','buen dia'],'un nuevo día','un nuevo día'),
('buenas noches',array['buenas noches','noche','descanso'],'la noche','la noche')
on conflict (canonical) do update
set aliases=excluded.aliases,subject_form=excluded.subject_form,about_form=excluded.about_form,active=true;

-- Más variedad por tono. Estas plantillas sólo usan construcciones seguras.
insert into public.writer_templates(tone,template,active) values
('', 'Pensar en {about} también puede ayudarte a mirar lo que estás viviendo desde otro lugar.',true),
('', 'A veces, cuando aparece {subject}, lo más valioso es no apurarse a sacar conclusiones.',true),
('', 'Hay momentos en los que {subject} cambia de significado cuando cambia nuestra forma de mirarlo.',true),
('', 'Darle tiempo a {about} puede revelar algo que al principio no era tan fácil de ver.',true),
('', 'No siempre hace falta resolver {about}; a veces primero hace falta comprenderlo.',true),
('', 'Cuando pensás en {about}, también vale preguntarte qué necesitás realmente hoy.',true),
('', 'A veces {subject} no pide una respuesta, sino una forma distinta de estar presente.',true),
('', 'Mirar de frente {about} puede ser el comienzo de una conversación más honesta con vos mismo.',true),
('profundo','Pensar en {about} puede abrir preguntas que no aparecen cuando todo se mira desde la superficie.',true),
('profundo','A veces {subject} muestra algo de nosotros que sólo se entiende cuando dejamos de escaparle.',true),
('profundo','Cuando volvés una y otra vez a {about}, quizá no estés buscando una respuesta sino una comprensión más profunda.',true),
('profundo','Hay experiencias alrededor de {about} que cambian cuando dejamos de medirlas sólo por lo que duele o lo que falta.',true),
('amoroso','Hablar de {about} también puede ser una forma de cuidar lo que sentimos sin exigirle una solución inmediata.',true),
('amoroso','A veces {subject} necesita menos consejos y más una presencia que sepa quedarse.',true),
('amoroso','Cuando aparece {subject}, cuidar también puede significar escuchar sin apurar.',true),
('amoroso','Pensar en {about} con cariño no obliga a idealizarlo; alcanza con mirarlo con un poco más de ternura.',true),
('tierno','Ojalá {subject} encuentre hoy un lugar más suave dentro de vos.',true),
('tierno','A veces pensar en {about} sólo necesita un poco de tiempo, calma y compañía.',true),
('tierno','Que {subject} no te encuentre solo con todo lo que sentís.',true),
('tierno','También hay ternura en darle a {about} el tiempo que necesita.',true),
('breve','A veces {subject} también necesita tiempo.',true),
('breve','Pensar en {about} desde otro lugar puede cambiar mucho.',true),
('breve','No todo alrededor de {about} tiene que resolverse hoy.',true),
('breve','También se avanza cuando aprendemos a mirar {about} distinto.',true),
('reflexivo','Pensar en {about} desde otra perspectiva puede cambiar la manera de vivirlo.',true),
('reflexivo','A veces {subject} se entiende mejor cuando dejamos de buscar una única explicación.',true),
('reflexivo','Preguntarte qué significa {subject} para vos puede ser más útil que repetir respuestas ajenas.',true),
('reflexivo','No todo alrededor de {about} tiene el mismo sentido en todas las etapas de la vida.',true),
('espiritual','Pensar en {about} también puede convertirse en una invitación a mirar hacia adentro.',true),
('espiritual','A veces {subject} aparece para mostrarnos una parte de nosotros que todavía no habíamos escuchado.',true),
('espiritual','Cuando hacés silencio frente a {about}, algunas respuestas pueden empezar a ordenarse de otra manera.',true),
('espiritual','Hay experiencias alrededor de {about} que se comprenden mejor cuando dejamos de exigirles una explicación inmediata.',true),
('gracioso','Hablar de {about} puede ser muy serio, pero tampoco hace falta convocar una reunión de emergencia por todo.',true),
('gracioso','Con {subject}, a veces el primer paso es aceptar que no venía con manual de instrucciones.',true),
('gracioso','Pensar en {about} está bien; convertirlo en una saga de doce temporadas quizá ya sea demasiado.',true),
('gracioso','Si {subject} se complica, siempre queda una estrategia ancestral: café, pausa y volver a intentarlo.',true),
('familiar','Hablar de {about} en familia suele funcionar mejor cuando nadie intenta tener la última palabra.',true),
('familiar','A veces {subject} se vuelve más llevadero cuando se comparte con alguien que conoce nuestra historia.',true),
('familiar','En los vínculos cercanos, pensar en {about} también puede ser una forma de entendernos mejor.',true),
('familiar','Cuando aparece {subject}, estar presentes suele importar más que encontrar una frase perfecta.',true)
on conflict (tone,template) do update set active=true;

drop function if exists public.generate_phrase_text(text,text,integer,text,text);

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
  v_topic record;
  v_subject text;
  v_about text;
  v_candidate record;
  v_candidate_count integer := 0;
  v_phrase text;
  v_generation uuid;
  v_recent integer := 0;
begin
  if v_intent='' then
    return query select ''::text,false,null::uuid;
    return;
  end if;

  if length(v_intent)>300 then v_intent:=left(v_intent,300); end if;

  v_norm := lower(regexp_replace(extensions.unaccent(v_intent),'[^a-z0-9ñ]+',' ','g'));
  v_norm := trim(regexp_replace(v_norm,'\s+',' ','g'));

  if v_mode='public' and p_session_id is not null and p_session_id<>'' then
    select count(*) into v_recent
    from public.visitor_intents
    where session_id=left(p_session_id,100)
      and created_at>=now()-interval '1 minute';
    if v_recent>=12 then raise exception 'rate_limited'; end if;
  end if;

  -- Contexto: sólo libros de contenido. Diccionario/gramática/estilo quedan disponibles
  -- para ampliar el sistema lingüístico, pero no se usan como "sabiduría" temática.
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
        select 1 from regexp_split_to_table(v_norm,'\s+') w
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

  -- Resolver forma gramatical segura del tema.
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
    -- Para intenciones desconocidas o frases largas no arriesgamos gramática.
    v_subject:='esto que estás viviendo';
    v_about:='esto que estás viviendo';
  end if;

  -- Candidatos. Si hay tono explícito, los ejemplos genéricos NO pisan ese tono.
  with candidates as (
    select
      e.improved_phrase as text,
      null::uuid as template_id,
      0 as priority,
      e.created_at as created_at
    from public.writer_examples e
    where e.active=true
      and (
        (v_tone<>'' and e.tone=v_tone)
        or
        (v_tone='' and e.tone='')
      )
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
      replace(replace(t.template,'{subject}',v_subject),'{about}',v_about) as text,
      t.id as template_id,
      1 as priority,
      t.created_at
    from public.writer_templates t
    where t.active=true
      and (
        (v_tone<>'' and t.tone=v_tone)
        or
        (v_tone='' and t.tone='')
      )

    union all

    select
      e.improved_phrase,
      null::uuid,
      2,
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
      t.created_at
    from public.writer_templates t
    where t.active=true
      and v_tone<>''
      and t.tone=''
  ),
  numbered as (
    select *,
      row_number() over(order by priority,created_at desc,text) - 1 as rn,
      count(*) over() as total
    from candidates
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
    case when v_mode in ('admin','study') then 'admin' else 'public' end,
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
