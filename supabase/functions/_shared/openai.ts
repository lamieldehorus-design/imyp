const API="https://api.openai.com/v1";

function key(){return Deno.env.get("OPENAI_API_KEY") || ""}

function outputText(data:any){
  if(typeof data?.output_text==="string") return data.output_text;
  const parts:string[]=[];
  for(const item of data?.output || []){
    for(const content of item?.content || []){
      if(typeof content?.text==="string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export async function embeddings(input:string[]) {
  if(!key()) throw new Error("OPENAI_API_KEY missing");
  const r=await fetch(API+"/embeddings",{
    method:"POST",
    headers:{"Authorization":"Bearer "+key(),"Content-Type":"application/json"},
    body:JSON.stringify({model:Deno.env.get("OPENAI_EMBEDDING_MODEL") || "text-embedding-3-small",input})
  });
  const data=await r.json();
  if(!r.ok) throw new Error(data?.error?.message || "embedding_failed");
  return data.data.map((x:any)=>x.embedding);
}

export async function structuredResponse(opts:{
  model?:string;
  developer:string;
  content:any[];
  schema:any;
  schemaName:string;
}) {
  if(!key()) throw new Error("OPENAI_API_KEY missing");
  const r=await fetch(API+"/responses",{
    method:"POST",
    headers:{"Authorization":"Bearer "+key(),"Content-Type":"application/json"},
    body:JSON.stringify({
      model:opts.model || Deno.env.get("OPENAI_GENERATION_MODEL") || "gpt-5.6-luna",
      input:[
        {role:"developer",content:[{type:"input_text",text:opts.developer}]},
        {role:"user",content:opts.content}
      ],
      text:{format:{
        type:"json_schema",
        name:opts.schemaName,
        strict:true,
        schema:opts.schema
      }}
    })
  });
  const data=await r.json();
  if(!r.ok) throw new Error(data?.error?.message || "response_failed");
  const text=outputText(data);
  return JSON.parse(text);
}
