import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/client.ts";

const allowed=new Set(["generate","copy","personalize","download","share","search"]);

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders(req)});
  if(req.method!=="POST") return json(req,{error:"method_not_allowed"},405);
  try{
    const body=await req.json();
    const eventType=String(body.eventType||"");
    if(!allowed.has(eventType)) return json(req,{error:"invalid_event"},400);

    const db=adminClient();
    const {error}=await db.from("visitor_events").insert({
      event_type:eventType,
      generation_id:body.generationId||null,
      phrase_id:body.phraseId||null,
      intent:body.intent?String(body.intent).slice(0,300):null,
      session_id:body.sessionId?String(body.sessionId).slice(0,100):null,
      metadata:body.metadata&&typeof body.metadata==="object"?body.metadata:{}
    });
    if(error) throw error;
    return json(req,{ok:true});
  }catch(error){
    return json(req,{error:String(error?.message||error)},500);
  }
});
