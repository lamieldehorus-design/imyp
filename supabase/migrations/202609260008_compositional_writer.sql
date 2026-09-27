-- Redactor compositivo v5
-- Ejecutar después de 202609260006_linguistic_corpus.sql.

create table if not exists public.writer_fragments (
  id uuid primary key default gen_random_uuid(),
  tone text not null default '',
  role text not null check(role in ('opening','core','turn','closing')),
  text text not null,
  active boolean not null default true,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique(tone,role,text)
);

alter table public.writer_fragments enable row level security;
drop policy if exists "admins manage writer fragments" on public.writer_fragments;
create policy "admins manage writer fragments"
on public.writer_fragments for all to authenticated
using(public.is_admin())
with check(public.is_admin());

insert into public.writer_fragments(tone,role,text) values
('', 'opening', 'A veces, pensar en {about} cambia cuando bajamos un poco el ruido.'),
('', 'opening', 'Hay momentos en los que {subject} aparece sin pedir permiso.'),
('', 'opening', 'Cuando volvés una y otra vez a {about}, algo está buscando ser entendido.'),
('', 'opening', 'No todo alrededor de {about} se aclara enseguida.'),
('', 'opening', 'Mirar {about} desde otro lugar puede cambiar bastante la escena.'),
('', 'opening', 'Hay días en los que {subject} ocupa más espacio del que esperábamos.'),
('', 'opening', 'Pensar en {about} también puede abrir una pregunta nueva.'),
('', 'opening', 'A veces {subject} se vuelve más claro cuando dejamos de apurarlo.'),

('', 'core', 'Lo importante no siempre es encontrar una respuesta rápida, sino descubrir qué parte de esto realmente te está hablando.'),
('', 'core', 'Muchas veces, lo que sentimos cambia menos por lo que ocurre que por la forma en que lo estamos interpretando.'),
('', 'core', 'Entender algo no siempre significa resolverlo; a veces significa dejar de pelear con la necesidad de tenerlo todo claro.'),
('', 'core', 'Hay experiencias que recién muestran su sentido cuando pasa un poco de tiempo.'),
('', 'core', 'Lo que hoy parece confuso puede estar señalando una necesidad que todavía no sabías nombrar.'),
('', 'core', 'A veces la pregunta correcta vale más que una respuesta apurada.'),
('', 'core', 'Cambiar de perspectiva no borra lo que pasa, pero puede cambiar lo que hacemos con eso.'),
('', 'core', 'No todo lo que pesa necesita una solución inmediata; algunas cosas primero necesitan espacio.'),

('', 'turn', 'Y quizá ahí aparezca una forma distinta de mirarlo.'),
('', 'turn', 'Tal vez el cambio empiece justamente en esa pequeña diferencia.'),
('', 'turn', 'A veces alcanza con eso para que algo empiece a moverse.'),
('', 'turn', 'Y desde ahí, la misma situación puede sentirse de otra manera.'),
('', 'turn', 'Quizá no cambie todo, pero puede cambiar tu relación con lo que está pasando.'),
('', 'turn', 'Ahí puede aparecer una respuesta menos perfecta, pero más propia.'),
('', 'turn', 'Y eso ya modifica bastante la conversación interior.'),
('', 'turn', 'Puede parecer poco, pero a veces es el comienzo de algo importante.'),

('', 'closing', 'No hace falta resolverlo todo hoy.'),
('', 'closing', 'También se avanza cuando una pregunta empieza a hacerse más honesta.'),
('', 'closing', 'A veces comprender un poco mejor ya es una forma de avanzar.'),
('', 'closing', 'Darte tiempo también puede ser parte de la respuesta.'),
('', 'closing', 'No todo lo valioso llega con una conclusión inmediata.'),
('', 'closing', 'Lo importante es que la respuesta que aparezca también se parezca a vos.'),
('', 'closing', 'Incluso una mirada distinta puede abrir un camino nuevo.'),
('', 'closing', 'A veces el siguiente paso es simplemente mirar de nuevo.'),

('profundo','opening','Hay preguntas alrededor de {about} que no buscan una respuesta rápida.'),
('profundo','opening','A veces {subject} toca una parte de nosotros que no suele hablar demasiado.'),
('profundo','opening','Pensar en {about} puede llevarte más lejos de lo que parecía al principio.'),
('profundo','opening','Hay momentos en los que {subject} obliga a mirar debajo de la superficie.'),
('profundo','core','Lo que aparece ahí no siempre es cómodo, pero puede mostrar qué parte de vos está cambiando.'),
('profundo','core','A veces una experiencia revela más por lo que despierta que por lo que explica.'),
('profundo','core','Hay cosas que sólo se entienden cuando dejamos de mirarlas con las mismas preguntas de siempre.'),
('profundo','core','Lo profundo no siempre está en encontrar una respuesta, sino en descubrir por qué cierta pregunta sigue volviendo.'),
('profundo','turn','Y quizá ahí empiece una comprensión más difícil de explicar, pero más verdadera.'),
('profundo','turn','Tal vez por eso algunas respuestas sólo aparecen después de haber cambiado nosotros.'),
('profundo','turn','Ahí es donde una idea deja de ser teoría y empieza a tocar la experiencia.'),
('profundo','turn','Y en ese punto, mirar de nuevo ya no significa mirar lo mismo.'),
('profundo','closing','No todo lo importante necesita cerrarse con una conclusión.'),
('profundo','closing','A veces una buena pregunta acompaña más que una respuesta definitiva.'),
('profundo','closing','Hay comprensiones que llegan despacio, pero cambian mucho.'),
('profundo','closing','Quizá lo valioso sea seguir mirando sin mentirte.'),

('amoroso','opening','Pensar en {about} con cariño cambia el tono de la conversación.'),
('amoroso','opening','Cuando aparece {subject}, también puede aparecer la necesidad de cuidar.'),
('amoroso','opening','A veces {subject} pide menos explicación y más presencia.'),
('amoroso','opening','Hay momentos en los que hablar de {about} también es una forma de acompañar.'),
('amoroso','core','Cuidar no siempre significa solucionar; muchas veces significa quedarse sin apurar.'),
('amoroso','core','Hay afectos que se notan justamente en la libertad de no tener que explicar todo.'),
('amoroso','core','A veces el gesto más importante es hacer espacio para lo que el otro todavía no sabe decir.'),
('amoroso','core','La cercanía también puede construirse respetando silencios, tiempos y contradicciones.'),
('amoroso','turn','Y desde ahí, acompañar puede sentirse menos como una tarea y más como una presencia real.'),
('amoroso','turn','Tal vez por eso algunas palabras ayudan más cuando no intentan arreglar nada.'),
('amoroso','turn','Ahí puede aparecer una forma de cercanía más tranquila.'),
('amoroso','turn','Y eso puede hacer que lo difícil se vuelva un poco más habitable.'),
('amoroso','closing','A veces estar de verdad alcanza.'),
('amoroso','closing','Cuidar también puede ser saber quedarse.'),
('amoroso','closing','No todo cariño necesita un gran discurso.'),
('amoroso','closing','A veces una presencia sincera dice bastante más.'),

('reflexivo','opening','Pensar en {about} desde otra perspectiva puede cambiar la pregunta.'),
('reflexivo','opening','A veces {subject} se entiende mejor cuando revisamos desde dónde lo estamos mirando.'),
('reflexivo','opening','Hay situaciones alrededor de {about} que cambian cuando cambia el contexto.'),
('reflexivo','opening','Mirar {about} con curiosidad puede ser más útil que juzgarlo demasiado rápido.'),
('reflexivo','core','Lo que pensamos sobre una experiencia también forma parte de la experiencia.'),
('reflexivo','core','Distinguir hechos, interpretaciones y temores puede ordenar bastante lo que sentimos.'),
('reflexivo','core','A veces repetimos una explicación porque es conocida, no porque sea la única posible.'),
('reflexivo','core','Cambiar una pregunta puede abrir respuestas que antes ni siquiera entraban en escena.'),
('reflexivo','turn','Y ahí puede aparecer una lectura menos automática de lo que está pasando.'),
('reflexivo','turn','Tal vez la clave no esté en decidir rápido, sino en mirar mejor.'),
('reflexivo','turn','Eso no elimina la dificultad, pero permite pensarla con más espacio.'),
('reflexivo','turn','Y desde ahí, la situación puede empezar a ordenarse de otra manera.'),
('reflexivo','closing','Pensar distinto también puede ser una forma de avanzar.'),
('reflexivo','closing','A veces la claridad empieza por separar cosas que estaban mezcladas.'),
('reflexivo','closing','No todo necesita una respuesta inmediata para empezar a entenderse.'),
('reflexivo','closing','Una buena pregunta puede cambiar mucho.'),

('espiritual','opening','A veces {subject} invita a hacer un poco de silencio por dentro.'),
('espiritual','opening','Pensar en {about} también puede convertirse en una pausa.'),
('espiritual','opening','Hay momentos en los que {subject} se siente más como una señal que como una respuesta.'),
('espiritual','opening','Cuando aparece {subject}, puede ser útil escuchar qué mueve adentro.'),
('espiritual','core','No todo lo que importa llega en forma de explicación; algunas cosas aparecen primero como intuición, incomodidad o quietud.'),
('espiritual','core','Hay procesos que se entienden mejor cuando dejamos de exigirles una lógica inmediata.'),
('espiritual','core','A veces el sentido aparece después, cuando la experiencia ya empezó a transformarnos.'),
('espiritual','core','Escuchar hacia adentro no garantiza respuestas, pero puede cambiar la calidad de las preguntas.'),
('espiritual','turn','Y quizá desde ahí aparezca una forma más amplia de entender lo que estás viviendo.'),
('espiritual','turn','Tal vez no se trate de saber más, sino de escuchar mejor.'),
('espiritual','turn','Ahí puede empezar una comprensión que no depende sólo de las palabras.'),
('espiritual','turn','Y en ese silencio, algunas piezas empiezan a acomodarse.'),
('espiritual','closing','No todo lo profundo necesita explicación inmediata.'),
('espiritual','closing','A veces el sentido llega después del silencio.'),
('espiritual','closing','Escuchar también puede ser una forma de comprender.'),
('espiritual','closing','Hay respuestas que necesitan tiempo para tomar forma.'),

('gracioso','opening','Con {subject}, a veces uno entra buscando claridad y sale necesitando café.'),
('gracioso','opening','Pensar en {about} está bien, hasta que tu cabeza abre diecisiete pestañas mentales.'),
('gracioso','opening','Hay temas como {about} que llegan sin manual, sin tutorial y claramente sin soporte técnico.'),
('gracioso','opening','A veces {subject} aparece justo cuando ya habías decidido que hoy no querías complicarte.'),
('gracioso','core','La teoría suele ser elegante hasta que la vida decide hacer una prueba práctica sin avisar.'),
('gracioso','core','A veces el problema no es no tener respuestas, sino tener demasiadas respuestas discutiendo entre ellas.'),
('gracioso','core','Hay días en los que la gran estrategia consiste en hacer una cosa bien y no inventar tres dramas nuevos.'),
('gracioso','core','Pensar ayuda, pero después de cierto punto también puede convertirse en cardio mental.'),
('gracioso','turn','Y ahí quizá convenga recordar que no todo merece una temporada completa.'),
('gracioso','turn','Tal vez la solución no sea brillante, pero si evita una reunión imaginaria ya es progreso.'),
('gracioso','turn','A veces bajar dos cambios funciona mejor que fundar un comité interno.'),
('gracioso','turn','Y con suerte, mañana todo parece un poco menos dramático.'),
('gracioso','closing','Si nada funciona, siempre queda el café.'),
('gracioso','closing','No todo merece una crisis con banda sonora.'),
('gracioso','closing','A veces sobrevivir al día ya cuenta como estrategia.'),
('gracioso','closing','Mañana se puede filosofar de nuevo.'),

('familiar','opening','Cuando aparece {subject} dentro de una familia, cada uno suele vivirlo a su manera.'),
('familiar','opening','Hablar de {about} en familia puede ser más complejo de lo que parece.'),
('familiar','opening','A veces {subject} toca historias que cada integrante recuerda distinto.'),
('familiar','opening','En los vínculos cercanos, pensar en {about} también implica escuchar otras versiones.'),
('familiar','core','Compartir una historia no significa sentirla de la misma manera.'),
('familiar','core','A veces el vínculo mejora cuando dejamos de competir por quién tiene la interpretación correcta.'),
('familiar','core','Hay temas que se vuelven más llevaderos cuando cada uno puede hablar sin tener que defenderse todo el tiempo.'),
('familiar','core','En una familia, escuchar puede ordenar cosas que discutir sólo vuelve más ruidosas.'),
('familiar','turn','Y desde ahí puede aparecer una conversación menos defensiva.'),
('familiar','turn','Tal vez entender al otro no obligue a pensar igual.'),
('familiar','turn','Ahí puede empezar una forma distinta de estar cerca.'),
('familiar','turn','Y eso puede cambiar bastante el clima de la conversación.'),
('familiar','closing','A veces estar disponibles importa más que tener razón.'),
('familiar','closing','Escucharse también es una forma de cuidarse.'),
('familiar','closing','No todo vínculo se arregla hablando, pero muchos empeoran si nadie habla.'),
('familiar','closing','A veces acercarse empieza por escuchar mejor.')
on conflict(tone,role,text) do update set active=true;

drop function if exists public.generate_phrase_text(text,text,integer,text,text);

create or replace function public.generate_phrase_text(
  p_intent text,
  p_tone text default '',
  p_variant integer default 0,
  p_session_id text default null,
  p_mode text default 'public'
)
returns table(phrase text,found boolean,generation_id uuid)
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
  v_node_ids bigint[];
  v_topic record;
  v_subject text;
  v_about text;
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
  if v_intent='' then return query select ''::text,false,null::uuid; return; end if;
  if length(v_intent)>300 then v_intent:=left(v_intent,300); end if;

  v_norm:=trim(regexp_replace(
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

  v_query:=websearch_to_tsquery('spanish',v_intent);

  select array_agg(id order by rank desc) into v_node_ids
  from (
    select k.id,ts_rank_cd(k.search_vector,v_query) rank
    from public.knowledge_nodes k
    join public.books b on b.id=k.book_id
    where b.status='ready'
      and b.resource_type='content'
      and k.search_vector is not null
      and k.search_vector @@ v_query
    order by rank desc
    limit 8
  ) s;

  if coalesce(array_length(v_node_ids,1),0)=0 then
    select array_agg(id) into v_node_ids
    from (
      select k.id
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
      limit 8
    ) s;
  end if;

  if coalesce(array_length(v_node_ids,1),0)=0 then
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

  select count(*) into open_count from public.writer_fragments where active=true and role='opening' and tone in (v_tone,'');
  select count(*) into core_count from public.writer_fragments where active=true and role='core' and tone in (v_tone,'');
  select count(*) into turn_count from public.writer_fragments where active=true and role='turn' and tone in (v_tone,'');
  select count(*) into close_count from public.writer_fragments where active=true and role='closing' and tone in (v_tone,'');

  if least(open_count,core_count,turn_count,close_count)=0 then
    return query select ''::text,false,null::uuid;
    return;
  end if;

  -- Busca una combinación no usada recientemente para la misma intención/tono.
  for i in 0..39 loop
    oi:=((v_variant+i) % open_count);
    ci:=((v_variant*3+i*5+1) % core_count);
    ti:=((v_variant*5+i*7+2) % turn_count);
    zi:=((v_variant*7+i*11+3) % close_count);

    select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
      into v_open
    from public.writer_fragments
    where active=true and role='opening' and tone in (v_tone,'')
    order by case when tone=v_tone and v_tone<>'' then 0 else 1 end,score desc,id
    offset oi limit 1;

    select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
      into v_core
    from public.writer_fragments
    where active=true and role='core' and tone in (v_tone,'')
    order by case when tone=v_tone and v_tone<>'' then 0 else 1 end,score desc,id
    offset ci limit 1;

    select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
      into v_turn
    from public.writer_fragments
    where active=true and role='turn' and tone in (v_tone,'')
    order by case when tone=v_tone and v_tone<>'' then 0 else 1 end,score desc,id
    offset ti limit 1;

    select replace(replace(text,'{subject}',v_subject),'{about}',v_about)
      into v_close
    from public.writer_fragments
    where active=true and role='closing' and tone in (v_tone,'')
    order by case when tone=v_tone and v_tone<>'' then 0 else 1 end,score desc,id
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
    intent,tone,phrase,source,matched,source_node_ids,template_id
  )
  values(
    v_intent,nullif(v_tone,''),v_phrase,
    case when v_mode in('admin','study') then 'admin' else 'public' end,
    true,v_node_ids,null
  )
  returning id into v_generation;

  if v_mode='public' then
    insert into public.visitor_intents(intent,normalized_intent,had_result,generation_id,session_id)
    values(v_intent,v_norm,true,v_generation,left(p_session_id,100));

    insert into public.visitor_events(event_type,generation_id,intent,session_id)
    values('generate',v_generation,v_intent,left(p_session_id,100));
  end if;

  return query select v_phrase,true,v_generation;
end;
$$;

grant execute on function public.generate_phrase_text(text,text,integer,text,text)
to anon,authenticated;
