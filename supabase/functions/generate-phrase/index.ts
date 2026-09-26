import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/client.ts";
import { embeddings, structuredResponse } from "../_shared/openai.ts";

function normalize(v:string){
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9ñ\s-]/g," ").replace(/\s+/g," ").trim();
}

Deno.serve(async (req) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders(req)});
  if(req.method!=="POST") return json(req,{error:"method_not_allowed"},405);

  try{
    const body=await req.json();
    const intent=String(body.intent||"").trim().slice(0,300);
    const tone=String(body.tone||"").trim().slice(0,40);
    const source=body.source==="admin"?"admin":"public";
    const sessionId=String(body.sessionId||"").trim().slice(0,100) || null;
    let count=Math.max(1,Math.min(Number(body.count||1),10));
    if(!intent) return json(req,{error:"intent_required"},400);

    let adminUser:any=null;
    if(source==="admin" || count>1){
      const auth=await requireAdmin(req);
      if(!auth.ok) return json(req,{error:auth.error},auth.status);
      adminUser=auth.user;
    }else{
      count=1;
    }

    const db=adminClient();

    if(source==="public" && sessionId){
      const since=new Date(Date.now()-60_000).toISOString();
      const {count:recent}=await db.from("visitor_intents")
        .select("id",{count:"exact",head:true})
        .eq("session_id",sessionId)
        .gte("created_at",since);
      if((recent||0)>=10) return json(req,{error:"rate_limited"},429);
    }

    const vector=(await embeddings([intent]))[0];
    const {data:nodes,error:matchError}=await db.rpc("match_knowledge_nodes",{
      query_embedding:vector,match_count:10,min_similarity:0.18
    });
    if(matchError) throw matchError;

    if(!nodes?.length){
      if(source==="public"){
        await db.from("visitor_intents").insert({
          intent,normalized_intent:normalize(intent),had_result:false,session_id:sessionId
        });
      }
      return json(req,{error:"no_knowledge",phrases:[]},404);
    }

    const context=nodes.map((n:any,i:number)=>
      `[${i+1}] IDEA: ${n.idea}\nCONTEXTO: ${n.context||""}\nTEMAS: ${(n.themes||[]).join(", ")}`
    ).join("\n\n");

    const prompt=[
      `INTENCIÓN DEL USUARIO: ${intent}`,
      tone?`TONO PEDIDO: ${tone}`:"TONO: elegí el más apropiado para la intención.",
      `CANTIDAD: ${count}`,
      "CONOCIMIENTO RECUPERADO:",
      context
    ].join("\n\n");

    const result=await structuredResponse({
      developer:[
        "Sos el redactor de imagenesypostales.com.",
        "Creá frases originales en español rioplatense neutro a partir EXCLUSIVAMENTE de las ideas conceptuales recibidas.",
        "No cites, no copies textualmente, no nombres libros, autores, documentos, fuentes, doctrinas ni páginas.",
        "La frase debe funcionar por sí sola para una postal o mensaje y sonar humana, natural y compartible.",
        "Evitá frases genéricas de autoayuda, moralinas y afirmaciones médicas o legales.",
        "Cada frase debe ser distinta de las demás y normalmente tener entre 8 y 32 palabras."
      ].join("\n"),
      content:[{type:"input_text",text:prompt}],
      schemaName:"generated_phrases",
      schema:{
        type:"object",additionalProperties:false,required:["phrases"],
        properties:{
          phrases:{type:"array",minItems:1,maxItems:10,items:{type:"string"}}
        }
      }
    });

    const phrases=(result.phrases||[]).map((x:any)=>String(x).trim()).filter(Boolean).slice(0,count);
    if(!phrases.length) throw new Error("generation_empty");

    const nodeIds=nodes.map((n:any)=>n.id);
    const generationRows=phrases.map((phrase:string)=>({
      intent,tone:tone||null,phrase,source,matched:true,source_node_ids:nodeIds,
      created_by:adminUser?.id||null
    }));
    const {data:generations,error:genError}=await db.from("phrase_generations")
      .insert(generationRows).select("id,phrase");
    if(genError) throw genError;

    if(source==="public"){
      const primary=generations?.[0];
      await db.from("visitor_intents").insert({
        intent,normalized_intent:normalize(intent),had_result:true,
        generation_id:primary?.id||null,session_id:sessionId
      });
      await db.from("visitor_events").insert({
        event_type:"generate",generation_id:primary?.id||null,intent,session_id:sessionId
      });
    }

    const payload=(generations||[]).map((g:any)=>({phrase:g.phrase,generationId:g.id}));
    return json(req,{
      phrase:payload[0]?.phrase||phrases[0],
      generationId:payload[0]?.generationId||null,
      phrases:payload
    });
  }catch(error){
    return json(req,{error:String(error?.message||error)},500);
  }
});
