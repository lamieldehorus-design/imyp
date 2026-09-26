import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/client.ts";
import { embeddings, structuredResponse } from "../_shared/openai.ts";

async function doProcess(auth:any,bookId:string,path:string,originalFilename:string){
  try{
    const {data:signed,error:signedError}=await auth.db.storage.from("books").createSignedUrl(path,900);
    if(signedError || !signed?.signedUrl) throw signedError || new Error("signed_url_failed");

    const knowledge=await structuredResponse({
      model:Deno.env.get("OPENAI_KNOWLEDGE_MODEL") || "gpt-5.6-terra",
      developer:[
        "Analizás documentos para construir una base privada de conocimiento destinada a redactar frases breves en español.",
        "Extraé ideas y relaciones conceptuales, no citas.",
        "Nunca copies pasajes textuales, nunca incluyas autor, título, capítulo, número de página ni referencia de procedencia.",
        "Cada nodo debe ser una paráfrasis autónoma y suficientemente general para reutilizarse al redactar mensajes.",
        "Priorizá temas humanos cuando el documento realmente los sostenga: emociones, vínculos, conciencia, transformación, calma, fortaleza, cariño, duelo, gratitud, propósito y reflexión.",
        "No inventes conceptos que no estén respaldados por el documento."
      ].join("\n"),
      content:[
        {type:"input_file",file_url:signed.signedUrl,filename:originalFilename},
        {type:"input_text",text:"Extraé entre 20 y 100 nodos conceptuales útiles. Evitá duplicados. Cada idea y contexto deben estar redactados con tus propias palabras."}
      ],
      schemaName:"knowledge_nodes",
      schema:{
        type:"object",additionalProperties:false,required:["nodes"],
        properties:{
          nodes:{type:"array",minItems:1,maxItems:100,items:{
            type:"object",additionalProperties:false,
            required:["idea","context","themes","keywords"],
            properties:{
              idea:{type:"string"},context:{type:"string"},
              themes:{type:"array",items:{type:"string"},maxItems:8},
              keywords:{type:"array",items:{type:"string"},maxItems:12}
            }
          }}
        }
      }
    });

    const nodes=(knowledge.nodes||[]).filter((n:any)=>String(n.idea||"").trim());
    if(!nodes.length) throw new Error("no_knowledge_extracted");

    const vectors:any[]=[];
    for(let i=0;i<nodes.length;i+=32){
      const batch=nodes.slice(i,i+32).map((n:any)=>
        [n.idea,n.context,(n.themes||[]).join(" "),(n.keywords||[]).join(" ")].filter(Boolean).join("\n")
      );
      vectors.push(...await embeddings(batch));
    }

    await auth.db.from("knowledge_nodes").delete().eq("book_id",bookId);
    const rows=nodes.map((n:any,i:number)=>({
      book_id:bookId,node_index:i,idea:String(n.idea).trim(),context:String(n.context||"").trim(),
      themes:(n.themes||[]).map((x:any)=>String(x).trim()).filter(Boolean).slice(0,8),
      keywords:(n.keywords||[]).map((x:any)=>String(x).trim()).filter(Boolean).slice(0,12),
      embedding:vectors[i]
    }));
    const {error:insertError}=await auth.db.from("knowledge_nodes").insert(rows);
    if(insertError) throw insertError;

    const uniqueConcepts=new Set(rows.flatMap((r:any)=>[...r.themes,...r.keywords].map((x:string)=>x.toLowerCase())));
    await auth.db.from("books").update({
      status:"ready",node_count:rows.length,concept_count:uniqueConcepts.size,
      processed_at:new Date().toISOString(),error_message:null
    }).eq("id",bookId);
  }catch(error){
    await auth.db.from("books").update({
      status:"failed",error_message:String(error?.message||error)
    }).eq("id",bookId);
  }
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders(req)});
  const auth=await requireAdmin(req);
  if(!auth.ok) return json(req,{error:auth.error},auth.status);

  try{
    const body=await req.json();
    const path=String(body.path||"").trim();
    const title=String(body.title||body.originalFilename||"Libro").trim();
    const originalFilename=String(body.originalFilename||title).trim();
    const fileSize=Number(body.fileSize||0)||null;
    if(!path || !path.toLowerCase().endsWith(".pdf")) return json(req,{error:"invalid_pdf"},400);

    const {data:existing}=await auth.db.from("books").select("id").eq("storage_path",path).maybeSingle();
    let bookId:string;
    if(existing?.id){
      bookId=existing.id;
      await auth.db.from("books").update({
        title,original_filename:originalFilename,file_size:fileSize,status:"processing",
        error_message:null,created_by:auth.user.id
      }).eq("id",bookId);
    }else{
      const {data:created,error:createError}=await auth.db.from("books").insert({
        title,original_filename:originalFilename,storage_path:path,file_size:fileSize,
        status:"processing",created_by:auth.user.id
      }).select("id").single();
      if(createError) throw createError;
      bookId=created.id;
    }

    EdgeRuntime.waitUntil(doProcess(auth,bookId,path,originalFilename));
    return json(req,{ok:true,bookId,status:"processing"},202);
  }catch(error){
    return json(req,{error:String(error?.message||error)},500);
  }
});
