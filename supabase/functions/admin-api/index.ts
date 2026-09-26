import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/client.ts";

function aggregate(values:any[],key:string){
  const map=new Map<string,number>();
  for(const row of values){
    const value=String(row[key]||"").trim();
    if(value) map.set(value,(map.get(value)||0)+1);
  }
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20)
    .map(([value,count])=>({value,count}));
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders(req)});
  const auth=await requireAdmin(req);
  if(!auth.ok) return json(req,{error:auth.error},auth.status);

  try{
    const body=req.method==="POST"?await req.json():{};
    const action=String(body.action||"dashboard");

    if(action==="list_books"){
      const {data,error}=await auth.db.from("books")
        .select("id,title,original_filename,storage_path,file_size,status,node_count,concept_count,error_message,created_at,processed_at")
        .order("created_at",{ascending:false});
      if(error) throw error;
      return json(req,{books:data||[]});
    }

    if(action==="stats"){
      const since=new Date(Date.now()-30*86400_000).toISOString();
      const [{data:intents,error:iErr},{data:events,error:eErr}]=await Promise.all([
        auth.db.from("visitor_intents").select("intent,normalized_intent,had_result,created_at").gte("created_at",since).limit(10000),
        auth.db.from("visitor_events").select("event_type,created_at").gte("created_at",since).limit(10000)
      ]);
      if(iErr) throw iErr;if(eErr) throw eErr;
      const rows=intents||[];
      const misses=rows.filter((x:any)=>!x.had_result);
      const funnel:any={generate:0,copy:0,personalize:0,download:0,share:0,search:0};
      for(const e of events||[]) if(e.event_type in funnel) funnel[e.event_type]++;
      return json(req,{
        periodDays:30,
        totalIntents:rows.length,
        successfulIntents:rows.length-misses.length,
        missedIntents:misses.length,
        topIntents:aggregate(rows,"normalized_intent"),
        missingIntents:aggregate(misses,"normalized_intent"),
        funnel
      });
    }

    if(action==="publish"){
      const phrase=String(body.phrase||"").trim();
      if(!phrase) return json(req,{error:"phrase_required"},400);
      const row={
        generation_id:body.generationId||null,
        phrase,
        category:String(body.category||"expresar"),
        recipients:Array.isArray(body.recipients)?body.recipients.filter(Boolean):[],
        tones:Array.isArray(body.tones)?body.tones.filter(Boolean):[],
        tags:Array.isArray(body.tags)?body.tags.filter(Boolean):[],
        style:["minimalista","azul","oscuro"].includes(body.style)?body.style:"azul",
        source_intent:body.sourceIntent?String(body.sourceIntent):null,
        status:"published",
        created_by:auth.user.id,
        published_at:new Date().toISOString()
      };
      const {data,error}=await auth.db.from("published_phrases").insert(row).select("*").single();
      if(error) throw error;
      return json(req,{ok:true,phrase:data});
    }

    if(action==="list_published"){
      const {data,error}=await auth.db.from("published_phrases")
        .select("id,phrase,category,recipients,tones,tags,style,status,published_at")
        .order("published_at",{ascending:false}).limit(200);
      if(error) throw error;
      return json(req,{phrases:data||[]});
    }

    if(action==="archive_phrase"){
      const {error}=await auth.db.from("published_phrases")
        .update({status:"archived"}).eq("id",body.id);
      if(error) throw error;
      return json(req,{ok:true});
    }

    if(action==="delete_book"){
      const {data:book,error:bookError}=await auth.db.from("books")
        .select("id,storage_path").eq("id",body.id).single();
      if(bookError) throw bookError;
      if(book?.storage_path) await auth.db.storage.from("books").remove([book.storage_path]);
      const {error}=await auth.db.from("books").delete().eq("id",body.id);
      if(error) throw error;
      return json(req,{ok:true});
    }

    return json(req,{error:"unknown_action"},400);
  }catch(error){
    return json(req,{error:String(error?.message||error)},500);
  }
});
