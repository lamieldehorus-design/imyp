const $=s=>document.querySelector(s);
const cfg=()=>window.IMYP_CONFIG||{};
let session=null,selectedGenerationId=null,currentIntent="",sb=null,pdfTools=null,bucketPdfCount=0;

function configured(){
  return /^https:\/\//.test(cfg().supabaseUrl||"")&&String(cfg().supabasePublishableKey||"").length>10;
}
function base(){return String(cfg().supabaseUrl||"").replace(/\/$/,"")}
function key(){return String(cfg().supabasePublishableKey||"")}
function client(){
  if(!sb){
    if(!window.supabase?.createClient)throw new Error("No se pudo cargar el cliente de Supabase");
    sb=window.supabase.createClient(base(),key(),{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }
  return sb;
}
async function refreshSession(){
  const {data,error}=await client().auth.getSession();
  if(error)throw error;
  session=data.session||null;
  return !!session;
}
function splitList(v){return v.split(",").map(x=>x.trim()).filter(Boolean)}
function aggregate(rows,key){
  const map=new Map();
  rows.forEach(row=>{
    const value=String(row[key]||"").trim();
    if(value)map.set(value,(map.get(value)||0)+1);
  });
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20)
    .map(([value,count])=>({value,count}));
}
async function assertAdmin(){
  const {data,error}=await client().from("admin_users")
    .select("user_id,role")
    .eq("user_id",session.user.id)
    .maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("Este usuario no tiene permiso de administrador");
}
async function login(email,password){
  const {data,error}=await client().auth.signInWithPassword({email,password});
  if(error)throw error;
  session=data.session||null;
  if(!session)throw new Error("No se creó una sesión");
  await assertAdmin();
  showApp();
}
function showApp(){
  $("#loginPanel").hidden=true;$("#adminApp").hidden=false;$("#logoutButton").hidden=false;
  $("#bookStatus").textContent="Sincronizando biblioteca con Supabase Storage...";
  syncStorage(true).catch(()=>loadBooks());
  loadStats();
  loadPublished();
}
function showLogin(){
  $("#loginPanel").hidden=false;$("#adminApp").hidden=true;$("#logoutButton").hidden=true;
}
$("#loginForm").onsubmit=async e=>{
  e.preventDefault();$("#loginStatus").textContent="Entrando...";
  try{
    await login($("#adminEmail").value.trim(),$("#adminPassword").value);
    $("#loginStatus").textContent="";
  }catch(error){
    session=null;
    $("#loginStatus").textContent=error.message||"No se pudo iniciar sesión";
  }
};
$("#logoutButton").onclick=async()=>{
  try{await client().auth.signOut()}catch{}
  session=null;showLogin();
};

document.querySelectorAll("[data-tab]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-tab]").forEach(b=>{
    b.classList.toggle("active",b===btn);
    b.classList.toggle("ghost",b!==btn);
  });
  document.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==btn.dataset.tab);
  if(btn.dataset.tab==="stats")loadStats();
  if(btn.dataset.tab==="published")loadPublished();
});

function safeName(name){
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").slice(-120);
}
async function uploadBook(){
  const file=$("#bookFile").files[0];
  if(!file){$("#bookStatus").textContent="Elegí un PDF.";return}
  if(file.type&&file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){
    $("#bookStatus").textContent="El archivo debe ser PDF.";return;
  }
  const title=$("#bookTitle").value.trim()||file.name.replace(/\.pdf$/i,"");
  const path=crypto.randomUUID()+"-"+safeName(file.name);
  $("#uploadBook").disabled=true;$("#bookStatus").textContent="Subiendo PDF...";
  try{
    const {error:uploadError}=await client().storage.from("books").upload(path,file,{
      contentType:"application/pdf",upsert:false
    });
    if(uploadError)throw uploadError;
    const {data:book,error:bookError}=await client().from("books").insert({
      title,original_filename:file.name,storage_path:path,file_size:file.size,
      status:"uploaded",created_by:session.user.id
    }).select("*").single();
    if(bookError)throw bookError;
    $("#bookFile").value="";$("#bookTitle").value="";
    await loadBooks();
    await processExistingBook(book);
  }catch(error){
    $("#bookStatus").textContent="Error: "+error.message;
  }finally{$("#uploadBook").disabled=false}
}
$("#uploadBook").onclick=uploadBook;

async function syncStorage(silent=false){
  const syncButton=$("#syncBooks");
  if(syncButton)syncButton.disabled=true;
  if(!silent)$("#bookStatus").textContent="Buscando PDFs existentes en Storage...";
  try{
    const {data:existing,error:existingError}=await client().from("books").select("storage_path");
    if(existingError)throw existingError;
    const known=new Set((existing||[]).map(x=>x.storage_path));
    let offset=0,found=[],batch=[];
    do{
      const result=await client().storage.from("books").list("",{
        limit:1000,offset,sortBy:{column:"name",order:"asc"}
      });
      if(result.error)throw result.error;
      batch=result.data||[];
      found.push(...batch.filter(x=>x.id&&String(x.name||"").toLowerCase().endsWith(".pdf")));
      offset+=batch.length;
    }while(batch.length===1000);

    bucketPdfCount=found.length;
    const missing=found.filter(x=>!known.has(x.name));
    if(missing.length){
      const rows=missing.map(x=>({
        title:String(x.name).replace(/\.pdf$/i,""),
        original_filename:x.name,
        storage_path:x.name,
        file_size:Number(x.metadata?.size||0)||null,
        status:"uploaded",
        created_by:session.user.id
      }));
      const {error}=await client().from("books").insert(rows);
      if(error)throw error;
    }
    if(!silent){
      $("#bookStatus").textContent=`Encontrados ${found.length} PDFs. Agregados ${missing.length} a la biblioteca.`;
    }else{
      $("#bookStatus").textContent=missing.length
        ? `Biblioteca sincronizada: ${missing.length} PDF${missing.length===1?"":"s"} nuevo${missing.length===1?"":"s"} detectado${missing.length===1?"":"s"}.`
        : `Biblioteca sincronizada con ${found.length} PDF${found.length===1?"":"s"}.`;
    }
    await loadBooks();
  }catch(error){
    $("#bookStatus").textContent="Error al sincronizar: "+error.message;
    throw error;
  }finally{if(syncButton)syncButton.disabled=false}
}
$("#syncBooks").onclick=()=>syncStorage(false);
$("#refreshBooks").onclick=loadBooks;

const STOP=new Set(("a al algo algunas algunos ante antes aquel aquella aquellas aquellos aqui asi aun aunque bajo bastante bien cada casi como con contra cual cuando de del desde donde dos durante e el ella ellas ellos en entre era erais eran eras eres es esa esas ese eso esos esta estaba estaban estar estas este esto estos fue fueron ha hace hacia hasta hay la las le les lo los mas me mi mientras muy ni no nos nosotros o os otra otras otro otros para pero poco por porque que quien se sea ser si sin sobre solo son su sus tambien te tiene todo tras tu tus un una unas uno unos y ya yo").split(" "));
function normalizeWord(v){
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zñ]/g,"");
}
function displayWord(v){
  return v.toLowerCase().replace(/[^a-záéíóúüñ]/gi,"");
}
function keywords(text,limit=12){
  const freq=new Map();
  text.split(/\s+/).forEach(raw=>{
    const display=displayWord(raw);
    const keyWord=normalizeWord(display);
    if(keyWord.length<4||STOP.has(keyWord))return;
    const current=freq.get(keyWord)||{count:0,display};
    current.count++;
    if(!current.display)current.display=display;
    freq.set(keyWord,current);
  });
  return [...freq.values()].sort((a,b)=>b.count-a.count||a.display.localeCompare(b.display))
    .slice(0,limit).map(x=>x.display);
}
function chunksFromPages(pages,max=1900,overlap=220){
  const chunks=[];
  pages.forEach((page,pageIndex)=>{
    const clean=String(page||"").replace(/\s+/g," ").trim();
    if(clean.length<80)return;
    if(clean.length<=max){chunks.push({text:clean,page:pageIndex+1});return}
    let start=0;
    while(start<clean.length){
      let end=Math.min(start+max,clean.length);
      if(end<clean.length){
        const cut=clean.lastIndexOf(". ",end);
        if(cut>start+Math.floor(max*.55))end=cut+1;
      }
      const part=clean.slice(start,end).trim();
      if(part.length>=80)chunks.push({text:part,page:pageIndex+1});
      if(end>=clean.length)break;
      start=Math.max(end-overlap,start+1);
    }
  });
  return chunks;
}
async function getPdfTools(){
  if(pdfTools)return pdfTools;
  pdfTools=await import("https://cdn.jsdelivr.net/npm/unpdf@1.8.1/+esm");
  return pdfTools;
}
async function processExistingBook(book){
  $("#bookStatus").textContent="Preparando “"+book.title+"”...";
  try{
    await client().from("books").update({status:"processing",error_message:null}).eq("id",book.id);
    await loadBooks();

    $("#bookStatus").textContent="Descargando PDF privado...";
    const {data:blob,error:downloadError}=await client().storage.from("books").download(book.storage_path);
    if(downloadError)throw downloadError;

    $("#bookStatus").textContent="Extrayendo texto en este navegador...";
    const {extractText,getDocumentProxy}=await getPdfTools();
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const pdf=await getDocumentProxy(bytes);
    if(pdf.numPages>1200)throw new Error("El PDF supera 1200 páginas; dividilo en partes.");
    const extracted=await extractText(pdf,{mergePages:false});
    try{await pdf.destroy?.()}catch{}
    const pages=Array.isArray(extracted.text)?extracted.text:[String(extracted.text||"")];
    const chunks=chunksFromPages(pages);
    if(!chunks.length)throw new Error("No se encontró texto extraíble. Si es un PDF escaneado necesitaremos OCR.");

    $("#bookStatus").textContent=`Preparando ${chunks.length} fragmentos de conocimiento...`;
    const {error:deleteError}=await client().from("knowledge_nodes").delete().eq("book_id",book.id);
    if(deleteError)throw deleteError;

    const conceptSet=new Set();
    const rows=chunks.map((chunk,index)=>{
      const keys=keywords(chunk.text,12);
      keys.forEach(k=>conceptSet.add(k));
      return {
        book_id:book.id,
        node_index:index,
        source_text:chunk.text,
        idea:keys.slice(0,4).join(", ")||"concepto",
        context:"Página "+chunk.page,
        themes:keys.slice(0,6),
        keywords:keys
      };
    });

    for(let i=0;i<rows.length;i+=100){
      $("#bookStatus").textContent=`Guardando conocimiento ${Math.min(i+100,rows.length)} / ${rows.length}...`;
      const {error}=await client().from("knowledge_nodes").insert(rows.slice(i,i+100));
      if(error)throw error;
      await new Promise(r=>setTimeout(r,20));
    }

    const {error:updateError}=await client().from("books").update({
      status:"ready",node_count:rows.length,concept_count:conceptSet.size,
      processed_at:new Date().toISOString(),error_message:null
    }).eq("id",book.id);
    if(updateError)throw updateError;
    $("#bookStatus").textContent=`Listo: ${rows.length} fragmentos y ${conceptSet.size} palabras clave.`;
    await loadBooks();
  }catch(error){
    await client().from("books").update({
      status:"failed",error_message:String(error.message||error)
    }).eq("id",book.id);
    $("#bookStatus").textContent="Error de procesamiento: "+(error.message||error);
    await loadBooks();
  }
}

async function deleteBook(book){
  if(!confirm("¿Eliminar este libro y sus conceptos?"))return;
  try{
    await client().storage.from("books").remove([book.storage_path]);
    const {error}=await client().from("books").delete().eq("id",book.id);
    if(error)throw error;
    await loadBooks();
  }catch(error){$("#bookStatus").textContent="Error al eliminar: "+error.message}
}
function renderLibraryStats(books){
  const rows=books||[];
  const ready=rows.filter(x=>x.status==="ready").length;
  const failed=rows.filter(x=>x.status==="failed").length;
  const processing=rows.filter(x=>x.status==="processing").length;
  const uploaded=rows.filter(x=>x.status==="uploaded").length;
  const pending=uploaded+processing;
  const total=bucketPdfCount||rows.length;

  $("#bucketCount").textContent=String(total);
  $("#readyCount").textContent=String(ready);
  $("#pendingCount").textContent=String(pending);
  $("#failedCount").textContent=String(failed);
}

async function loadBooks(){
  if(!session)return;
  try{
    const {data,error}=await client().from("books")
      .select("id,title,original_filename,storage_path,file_size,status,node_count,concept_count,error_message,created_at,processed_at")
      .order("created_at",{ascending:false});
    if(error)throw error;
    const root=$("#bookList");root.innerHTML="";
    renderLibraryStats(data||[]);
    if(!data?.length){root.innerHTML='<p class="muted">Todavía no hay libros registrados.</p>';return}
    data.forEach(book=>{
      const row=document.createElement("div");row.className="admin-list-row";
      const info=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=book.title;
      const small=document.createElement("small");
      small.textContent=`${book.status} · ${book.node_count||0} fragmentos · ${book.concept_count||0} palabras clave${book.error_message?" · "+book.error_message:""}`;
      info.append(strong,small);
      const actions=document.createElement("div");actions.className="admin-actions";
      if(book.status==="uploaded"||book.status==="failed"){
        const process=document.createElement("button");process.type="button";
        process.textContent=book.status==="failed"?"Reprocesar":"Procesar";
        process.onclick=()=>processExistingBook(book);
        actions.appendChild(process);
      }
      const del=document.createElement("button");del.className="ghost";del.type="button";del.textContent="Eliminar";
      del.onclick=()=>deleteBook(book);actions.appendChild(del);
      row.append(info,actions);root.appendChild(row);
    });
  }catch(error){$("#bookStatus").textContent="No se pudo cargar la biblioteca: "+error.message}
}

$("#adminGenerate").onclick=generateVariants;
$("#adminIntent").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();generateVariants()}});
async function generateVariants(){
  const intent=$("#adminIntent").value.trim();
  if(!intent){$("#adminStatus").textContent="Escribí una intención.";return}
  currentIntent=intent;$("#adminGenerate").disabled=true;$("#adminStatus").textContent="Generando variantes...";
  try{
    const count=Number($("#adminCount").value);
    const tone=$("#adminTone").value;
    const results=[];
    for(let i=0;i<count;i++){
      const result=await window.PhraseEngine.generate(intent,{tone,variant:i});
      if(result?.phrase)results.push(result);
    }
    const unique=[...new Map(results.map(x=>[x.phrase,x])).values()];
    if(!unique.length){
      $("#variantList").innerHTML="";
      $("#adminStatus").textContent="No hay suficiente conocimiento procesado para esa intención.";
      return;
    }
    renderVariants(unique);
    $("#adminStatus").textContent=`${unique.length} variantes listas.`;
  }catch(error){$("#adminStatus").textContent="Error: "+error.message}
  finally{$("#adminGenerate").disabled=false}
}
function renderVariants(list){
  const root=$("#variantList");root.innerHTML="";
  list.forEach((item,index)=>{
    const row=document.createElement("div");row.className="variant-item";
    const p=document.createElement("p");p.textContent=item.phrase;
    const use=document.createElement("button");use.type="button";use.className=index===0?"":"ghost";use.textContent="Usar esta";
    use.onclick=()=>selectVariant(item);
    row.append(p,use);root.appendChild(row);
  });
  selectVariant(list[0]);
}
function selectVariant(item){
  selectedGenerationId=item.generationId||null;
  $("#publishPhrase").value=item.phrase;
  $("#publishEditor").hidden=false;
  $("#publishStatus").textContent="";
}
$("#publishButton").onclick=async()=>{
  const phrase=$("#publishPhrase").value.trim();
  if(!phrase){$("#publishStatus").textContent="La frase está vacía.";return}
  $("#publishButton").disabled=true;$("#publishStatus").textContent="Publicando...";
  try{
    const {error}=await client().from("published_phrases").insert({
      generation_id:selectedGenerationId,
      phrase,
      category:$("#publishCategory").value,
      recipients:splitList($("#publishRecipients").value),
      tones:splitList($("#publishTones").value),
      tags:splitList($("#publishTags").value),
      style:$("#publishStyle").value,
      source_intent:currentIntent,
      status:"published",
      created_by:session.user.id,
      published_at:new Date().toISOString()
    });
    if(error)throw error;
    $("#publishStatus").textContent="Publicada. Ya puede entrar al catálogo público.";
    loadPublished();
  }catch(error){$("#publishStatus").textContent="Error: "+error.message}
  finally{$("#publishButton").disabled=false}
};

async function loadStats(){
  if(!session)return;
  try{
    const since=new Date(Date.now()-30*86400_000).toISOString();
    const [intentRes,eventRes]=await Promise.all([
      client().from("visitor_intents").select("intent,normalized_intent,had_result,created_at").gte("created_at",since).limit(10000),
      client().from("visitor_events").select("event_type,created_at").gte("created_at",since).limit(10000)
    ]);
    if(intentRes.error)throw intentRes.error;
    if(eventRes.error)throw eventRes.error;
    const rows=intentRes.data||[],misses=rows.filter(x=>!x.had_result);
    const funnel={generate:0,copy:0,personalize:0,download:0,share:0,search:0};
    (eventRes.data||[]).forEach(e=>{if(e.event_type in funnel)funnel[e.event_type]++});
    $("#statCards").innerHTML=[
      ["Intenciones",rows.length],["Con resultado",rows.length-misses.length],["Sin resultado",misses.length]
    ].map(([label,value])=>`<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
    renderMetricList($("#topIntents"),aggregate(rows,"normalized_intent"));
    renderMetricList($("#missingIntents"),aggregate(misses,"normalized_intent"));
    $("#funnelStats").innerHTML=Object.entries(funnel).map(([label,value])=>`<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
  }catch(error){$("#statCards").innerHTML='<p class="muted">No se pudieron cargar estadísticas.</p>'}
}
function renderMetricList(root,list){
  root.innerHTML="";
  if(!list?.length){root.innerHTML='<p class="muted">Sin datos todavía.</p>';return}
  list.forEach(x=>{
    const row=document.createElement("div");row.className="metric-row";
    const label=document.createElement("span");label.textContent=x.value;
    const n=document.createElement("strong");n.textContent=x.count;
    row.append(label,n);root.appendChild(row);
  });
}

$("#refreshPublished").onclick=loadPublished;
async function loadPublished(){
  if(!session)return;
  try{
    const {data,error}=await client().from("published_phrases")
      .select("id,phrase,category,recipients,tones,tags,style,status,published_at")
      .order("published_at",{ascending:false}).limit(200);
    if(error)throw error;
    const root=$("#publishedList");root.innerHTML="";
    if(!data?.length){root.innerHTML='<p class="muted">Todavía no publicaste frases.</p>';return}
    data.forEach(item=>{
      const row=document.createElement("div");row.className="admin-list-row";
      const info=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=item.phrase;
      const small=document.createElement("small");small.textContent=`${item.category} · ${(item.tags||[]).join(", ")}`;
      info.append(strong,small);
      const archive=document.createElement("button");archive.type="button";archive.className="ghost";archive.textContent="Archivar";
      archive.onclick=async()=>{
        const {error}=await client().from("published_phrases").update({status:"archived"}).eq("id",item.id);
        if(!error)loadPublished();
      };
      row.append(info,archive);root.appendChild(row);
    });
  }catch(error){$("#publishedList").innerHTML='<p class="muted">No se pudo cargar el catálogo.</p>'}
}

(async()=>{
  if(!configured()){
    $("#configWarning").hidden=false;$("#loginPanel").hidden=true;return;
  }
  try{
    if(await refreshSession()){
      await assertAdmin();
      showApp();return;
    }
  }catch(error){
    session=null;
    $("#loginStatus").textContent=error.message||"No se pudo conectar con Supabase";
  }
  showLogin();
})();