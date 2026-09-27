-- Redactor v2: banco de estilo + generación gramaticalmente segura
-- Ejecutar después de 202609260003_writer_studio.sql.

create unique index if not exists writer_examples_unique_phrase
on public.writer_examples(intent_pattern,tone,improved_phrase);

-- Las primeras plantillas usaban {intent} en lugares donde un sustantivo o una situación
-- podían quedar gramaticalmente mal. Las desactivamos, conservando su historial.
update public.writer_templates set active=false where active=true;

insert into public.writer_templates(tone,template,active) values
('', 'No todo necesita resolverse hoy; a veces alcanza con reconocer lo que sentís y darle un lugar.', true),
('', 'Hay momentos en los que entender lo que te pasa vale más que encontrar una respuesta rápida.', true),
('', 'A veces avanzar empieza por dejar de exigirte una claridad que todavía no llegó.', true),
('', 'Lo que sentís no siempre necesita una explicación perfecta para ser verdadero.', true),
('', 'También es una forma de avanzar aprender a escuchar lo que hoy necesita más tiempo.', true),
('profundo', 'Hay cosas que sólo empiezan a cambiar cuando dejamos de mirarlas desde el mismo lugar.', true),
('profundo', 'A veces una respuesta tarda porque primero necesitamos entender mejor la pregunta.', true),
('amoroso', 'Estar cerca también puede ser escuchar sin apurar, acompañar sin corregir y cuidar sin invadir.', true),
('amoroso', 'Hay cariño en esas presencias que no exigen explicaciones para quedarse.', true),
('tierno', 'Ojalá hoy encuentres un momento pequeño que te haga sentir un poco más acompañado.', true),
('tierno', 'No hace falta que todo esté bien para que algo bueno pueda hacerte compañía hoy.', true),
('breve', 'También cuenta seguir de a poco.', true),
('breve', 'No todo tiene que resolverse hoy.', true),
('reflexivo', 'Cambiar la forma de mirar algo también puede cambiar la forma de vivirlo.', true),
('reflexivo', 'A veces entendemos mejor una situación cuando dejamos de pedirle una respuesta inmediata.', true),
('espiritual', 'Hay silencios que no están vacíos; a veces son el lugar donde algo empieza a ordenarse.', true),
('espiritual', 'No todo lo importante hace ruido: algunos cambios empiezan mucho antes de que podamos nombrarlos.', true),
('gracioso', 'A veces el plan más realista es hacer lo que se pueda y dejarle el resto a mañana.', true),
('gracioso', 'No todo merece una crisis; algunas cosas apenas merecen un café.', true),
('familiar', 'En los vínculos cercanos, estar presente suele decir más que encontrar la frase perfecta.', true),
('familiar', 'Hay afectos que se construyen en gestos pequeños que casi nunca entran en una foto.', true)
on conflict (tone,template) do update set active=true;

-- Banco inicial de redacción humana.
-- Estos ejemplos enseñan estilo. El conocimiento temático sigue viniendo de los libros procesados.
insert into public.writer_examples
(intent_pattern,normalized_intent,tone,source_phrase,improved_phrase,notes,active)
values
('calma tranquilidad serenidad paz','calma','','',
 'La calma no siempre llega cuando todo se resuelve; a veces empieza cuando dejás de pelear con todo al mismo tiempo.',
 'Ejemplo de redacción natural para calma.',true),
('calma tranquilidad serenidad paz','calma','','',
 'A veces la calma empieza en algo mínimo: bajar el ruido, respirar más despacio y no exigir una respuesta inmediata.',
 'Ejemplo de redacción natural para calma.',true),
('calma tranquilidad serenidad paz','calma','breve','',
 'La calma también puede empezar de a poco.',
 'Ejemplo breve.',true),

('fuerza fortaleza coraje resistencia','fuerza','','',
 'La fuerza no siempre se siente como valentía; a veces es simplemente seguir cuando todavía no tenés todas las respuestas.',
 'Evita construcciones como “dar lugar a fuerza”.',true),
('fuerza fortaleza coraje resistencia','fuerza','','',
 'Hay días en los que ser fuerte significa avanzar mucho, y otros en los que significa no rendirte con vos mismo.',
 'Ejemplo de redacción natural para fuerza.',true),
('fuerza fortaleza coraje resistencia','fuerza','breve','',
 'Seguir también es una forma de fuerza.',
 'Ejemplo breve.',true),

('amor querer cariño pareja','amor','','',
 'Amar también es aprender a estar sin llenar cada silencio y a cuidar sin querer controlar todo.',
 'Ejemplo de amor.',true),
('amor querer cariño pareja','amor','','',
 'Hay afectos que no necesitan grandes discursos; se reconocen en la forma de estar cuando importa.',
 'Ejemplo de amor.',true),

('amistad amigo amiga amigos amigas','amistad','','',
 'Hay amistades que no necesitan hablar todos los días para seguir sintiéndose cerca.',
 'Ejemplo de amistad.',true),
('amistad amigo amiga amigos amigas','amistad','','',
 'Una buena amistad también se nota en la libertad de volver a hablar como si el tiempo no hubiera pasado.',
 'Ejemplo de amistad.',true),

('soledad solo sola sentirse solo sentirse sola','soledad','','',
 'A veces la soledad no pide ruido; pide una presencia que no obligue a explicar todo.',
 'Ejemplo de soledad.',true),
('soledad solo sola sentirse solo sentirse sola','soledad','','',
 'Estar solo y sentirse solo no siempre son lo mismo; a veces lo que falta no es gente, sino conexión.',
 'Ejemplo de soledad.',true),

('tristeza triste pena','tristeza','','',
 'Estar triste también puede ser una forma de reconocer que algo importó de verdad.',
 'Ejemplo de tristeza.',true),
('tristeza triste pena','tristeza','','',
 'No todos los días difíciles necesitan una lección; algunos sólo necesitan tiempo y un poco de cuidado.',
 'Ejemplo de tristeza.',true),

('ansiedad ansioso ansiosa nervios preocupación preocupacion','ansiedad','','',
 'Cuando todo parece urgente, volver a una sola cosa puede ser suficiente por ahora.',
 'Ejemplo prudente, sin consejo médico.',true),
('ansiedad ansioso ansiosa nervios preocupación preocupacion','ansiedad','','',
 'No hace falta resolver todo lo que tu cabeza intenta adelantar al mismo tiempo.',
 'Ejemplo prudente, sin afirmaciones médicas.',true),

('transformación transformacion cambio cambiar renacer','transformacion','','',
 'Cambiar no siempre se nota desde afuera; a veces empieza cuando dejás de responder igual a lo de siempre.',
 'Ejemplo de transformación.',true),
('transformación transformacion cambio cambiar renacer','transformacion','','',
 'Algunos cambios importantes empiezan mucho antes de que sepamos cómo nombrarlos.',
 'Ejemplo de transformación.',true),

('gratitud agradecer agradecimiento gracias','gratitud','','',
 'Agradecer también es reconocer esas cosas pequeñas que terminaron sosteniéndote más de lo que imaginabas.',
 'Ejemplo de gratitud.',true),
('gratitud agradecer agradecimiento gracias','gratitud','','',
 'Hay personas y momentos que merecen un gracias incluso mucho después de haber pasado.',
 'Ejemplo de gratitud.',true),

('familia hogar familiares','familia','','',
 'La familia también se construye en esos gestos pequeños que nadie anota y todos recuerdan.',
 'Ejemplo familiar.',true),
('familia hogar familiares','familia','','',
 'A veces sentirse en casa tiene menos que ver con un lugar y más con ciertas personas.',
 'Ejemplo familiar.',true),

('hermana hermanas','hermana','','',
 'Una hermana puede conocer versiones tuyas que nadie más llegó a ver y aun así seguir eligiendo estar.',
 'Ejemplo para hermana.',true),
('hermana hermanas','hermana','','',
 'Compartir una historia desde el principio crea un tipo de complicidad difícil de explicar.',
 'Ejemplo para hermana.',true),

('cumpleaños cumple cumpleanos feliz cumpleaños feliz cumple','cumpleanos','','',
 'Cumplir años también es mirar cuánto cambió tu historia sin dejar de reconocer todo lo que todavía querés vivir.',
 'Ejemplo de cumpleaños.',true),
('cumpleaños cumple cumpleanos feliz cumpleaños feliz cumple','cumpleanos','','',
 'Que este nuevo año tenga momentos que quieras guardar y personas con las que valga la pena compartirlos.',
 'Ejemplo de cumpleaños.',true),

('ánimo animo aliento seguir adelante','animo','','',
 'No necesitás tener todo claro para dar el próximo paso.',
 'Ejemplo de ánimo.',true),
('ánimo animo aliento seguir adelante','animo','','',
 'Hay días en los que avanzar significa correr y otros en los que significa simplemente no detenerte del todo.',
 'Ejemplo de ánimo.',true),

('esperanza esperar confiar','esperanza','','',
 'La esperanza a veces no hace ruido; simplemente evita que cierres una puerta demasiado pronto.',
 'Ejemplo de esperanza.',true),
('miedo temor asustado asustada','miedo','','',
 'El miedo puede acompañarte sin tener que decidir por vos.',
 'Ejemplo de miedo.',true),
('perdón perdon perdonar','perdon','','',
 'Perdonar no siempre borra lo que pasó; a veces sólo evita que siga ocupando todo el presente.',
 'Ejemplo de perdón.',true),
('autoestima amor propio valorarse','autoestima','','',
 'Hablarte con respeto también cuenta cuando todavía no te sale sentirte fuerte.',
 'Ejemplo de autoestima.',true),

('buenos días buen dia buenos dias mañana manana','buenos dias','','',
 'Que hoy tenga al menos un momento que valga la pena recordar.',
 'Ejemplo de buenos días.',true),
('buenas noches noche dormir descanso','buenas noches','','',
 'Que esta noche te encuentre un poco más liviano que el día.',
 'Ejemplo de buenas noches.',true),
('viaje viajar buen viaje vacaciones','viaje','','',
 'Buen viaje. Que vuelvas con historias que todavía no sabías que necesitabas vivir.',
 'Ejemplo de viaje.',true)
on conflict (intent_pattern,tone,improved_phrase) do nothing;

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
  v_example record;
  v_example_count integer := 0;
  v_template record;
  v_template_id uuid := null;
  v_template_count integer := 0;
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

  -- Los libros sólo determinan si existe contexto real relacionado.
  -- Nunca se inyectan palabras crudas del libro dentro de una plantilla.
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
      and exists(
        select 1
        from regexp_split_to_table(v_norm,'\s+') w
        where length(w)>=4
          and lower(extensions.unaccent(coalesce(k.source_text,'')||' '||coalesce(k.context,'')||' '||coalesce(k.idea,'')))
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

  -- Primero: ejemplos humanos aprendidos o sembrados.
  select count(*) into v_example_count
  from public.writer_examples e
  where e.active=true
    and (e.tone='' or v_tone='' or e.tone=v_tone)
    and (
      e.normalized_intent=v_norm
      or exists(
        select 1 from regexp_split_to_table(v_norm,'\s+') w
        where length(w)>=4
          and lower(extensions.unaccent(e.intent_pattern)) like '%'||w||'%'
      )
    );

  if v_example_count>0 then
    select e.* into v_example
    from public.writer_examples e
    where e.active=true
      and (e.tone='' or v_tone='' or e.tone=v_tone)
      and (
        e.normalized_intent=v_norm
        or exists(
          select 1 from regexp_split_to_table(v_norm,'\s+') w
          where length(w)>=4
            and lower(extensions.unaccent(e.intent_pattern)) like '%'||w||'%'
        )
      )
    order by
      case when e.normalized_intent=v_norm then 0 else 1 end,
      case when v_tone<>'' and e.tone=v_tone then 0 else 1 end,
      e.created_at desc,
      e.id
    offset (v_variant % v_example_count)
    limit 1;

    v_phrase:=v_example.improved_phrase;
    v_template_id:=null;
  else
    -- Segundo: plantilla segura que NO inserta la intención en lugares gramaticales.
    select count(*) into v_template_count
    from public.writer_templates t
    where t.active=true
      and ((v_tone<>'' and t.tone in (v_tone,'')) or (v_tone='' and t.tone=''));

    select t.* into v_template
    from public.writer_templates t
    where t.active=true
      and ((v_tone<>'' and t.tone in (v_tone,'')) or (v_tone='' and t.tone=''))
    order by
      case when v_tone<>'' and t.tone=v_tone then 0 else 1 end,
      t.score desc,t.approvals desc,t.rejections asc,t.id
    offset (v_variant % greatest(v_template_count,1))
    limit 1;

    if v_template.id is null then
      return query select ''::text,false,null::uuid;
      return;
    end if;

    v_phrase:=v_template.template;
    v_template_id:=v_template.id;
  end if;

  insert into public.phrase_generations(
    intent,tone,phrase,source,matched,source_node_ids,template_id
  )
  values(
    v_intent,nullif(v_tone,''),v_phrase,
    case when v_mode in ('admin','study') then 'admin' else 'public' end,
    true,array[v_node_id],v_template_id
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

grant execute on function public.generate_phrase_text(text,text,integer,text,text) to anon,authenticated;
