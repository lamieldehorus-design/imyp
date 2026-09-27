const $=s=>document.querySelector(s);
const cfg=()=>window.IMYP_CONFIG||{};
let session=null,selectedGenerationId=null,currentIntent="",sb=null,pdfTools=null,bucketPdfCount=0,studySelected=null;

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
  if(btn.dataset.tab==="studio")loadStudyStats();
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
      resource_type:$("#bookResourceType").value||"content",
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
        resource_type:"content",
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
function languageTokens(text){
  return String(text||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zñ0-9]+/g," ").trim().split(/\s+/)
    .filter(w=>w.length>1);
}
function buildLexicon(pages,limit=15000){
  const map=new Map();
  pages.join("\n").split(/\s+/).forEach(raw=>{
    const display=displayWord(raw);
    const normalized=normalizeWord(display);
    if(normalized.length<2)return;
    const row=map.get(normalized)||{normalized,display:display||normalized,occurrences:0};
    row.occurrences++;
    if(!row.display&&display)row.display=display;
    map.set(normalized,row);
  });
  return [...map.values()]
    .sort((a,b)=>b.occurrences-a.occurrences||a.normalized.localeCompare(b.normalized))
    .slice(0,limit);
}
function buildNgrams(pages,resourceType,perSize=5000){
  const tokens=languageTokens(pages.join(" "));
  const rows=[];
  for(const n of [2,3]){
    const map=new Map();
    for(let i=0;i<=tokens.length-n;i++){
      const gram=tokens.slice(i,i+n).join(" ");
      map.set(gram,(map.get(gram)||0)+1);
    }
    const selected=[...map.entries()]
      .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
      .slice(0,perSize);
    selected.forEach(([gram,occurrences])=>rows.push({n,gram,occurrences,resource_type:resourceType}));
  }
  return rows;
}
async function insertBatches(table,rows,label,batchSize=500){
  for(let i=0;i<rows.length;i+=batchSize){
    $("#bookStatus").textContent=`${label} ${Math.min(i+batchSize,rows.length)} / ${rows.length}...`;
    const {error}=await client().from(table).insert(rows.slice(i,i+batchSize));
    if(error)throw error;
    await new Promise(r=>setTimeout(r,15));
  }
}

async function buildDictionaryFromPdf(pdf,limit=20000){
  const map=new Map();
  for(let pageNum=1;pageNum<=pdf.numPages;pageNum++){
    if(pageNum===1||pageNum%25===0||pageNum===pdf.numPages){
      $("#bookStatus").textContent=`Leyendo diccionario página ${pageNum} / ${pdf.numPages}...`;
    }
    const page=await pdf.getPage(pageNum);
    const content=await page.getTextContent();
    const text=(content.items||[]).map(item=>item.str||"").join(" ");
    text.split(/\s+/).forEach(raw=>{
      const display=displayWord(raw);
      const normalized=normalizeWord(display);
      if(normalized.length<2)return;
      const row=map.get(normalized)||{normalized,display:display||normalized,occurrences:0};
      row.occurrences++;
      if(!row.display&&display)row.display=display;
      map.set(normalized,row);
    });
    try{page.cleanup?.()}catch{}
    if(pageNum%50===0)await new Promise(r=>setTimeout(r,0));
  }
  return [...map.values()]
    .sort((a,b)=>b.occurrences-a.occurrences||a.normalized.localeCompare(b.normalized))
    .slice(0,limit);
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
    const type=book.resource_type||"content";

    let nonEmpty=[];
    let streamedDictionary=null;

    if(type==="dictionary"){
      if(pdf.numPages>10000)throw new Error("El diccionario supera 10.000 páginas; conviene dividirlo en tomos.");
      streamedDictionary=await buildDictionaryFromPdf(pdf,20000);
      if(!streamedDictionary.length)throw new Error("No se encontró texto extraíble en el diccionario. Si está escaneado necesitaremos OCR.");
    }else{
      const limit=type==="grammar"||type==="style"?2500:1200;
      if(pdf.numPages>limit){
        throw new Error(`El PDF supera ${limit} páginas para este tipo de recurso; dividilo en partes.`);
      }
      const extracted=await extractText(pdf,{mergePages:false});
      const pages=Array.isArray(extracted.text)?extracted.text:[String(extracted.text||"")];
      nonEmpty=pages.filter(x=>String(x||"").trim().length>20);
      if(!nonEmpty.length)throw new Error("No se encontró texto extraíble. Si es un PDF escaneado necesitaremos OCR.");
    }

    try{await pdf.destroy?.()}catch{}

    await Promise.all([
      client().from("knowledge_nodes").delete().eq("book_id",book.id),
      client().from("lexicon_terms").delete().eq("book_id",book.id),
      client().from("language_ngrams").delete().eq("book_id",book.id)
    ]).then(results=>{
      const failed=results.find(x=>x.error);
      if(failed?.error)throw failed.error;
    });

    let nodeCount=0,conceptCount=0,summary="";

    if(type==="dictionary"){
      $("#bookStatus").textContent="Construyendo léxico del diccionario...";
      const lexicon=(streamedDictionary||[]).map(x=>({...x,book_id:book.id}));
      if(!lexicon.length)throw new Error("No pude extraer vocabulario de este diccionario.");
      await insertBatches("lexicon_terms",lexicon,"Guardando vocabulario",500);
      nodeCount=lexicon.length;
      conceptCount=lexicon.length;
      summary=`${lexicon.length} palabras del diccionario`;
    }else if(type==="grammar"||type==="style"){
      $("#bookStatus").textContent=type==="grammar"
        ?"Aprendiendo patrones de gramática..."
        :"Aprendiendo patrones de estilo...";
      const ngrams=buildNgrams(nonEmpty,type).map(x=>({...x,book_id:book.id}));
      if(!ngrams.length)throw new Error("No pude extraer patrones lingüísticos de este PDF.");
      await insertBatches("language_ngrams",ngrams,"Guardando patrones");
      nodeCount=ngrams.length;
      conceptCount=new Set(ngrams.map(x=>x.gram)).size;
      summary=`${ngrams.length} patrones de lenguaje`;
    }else{
      const chunks=chunksFromPages(nonEmpty);
      if(!chunks.length)throw new Error("No se encontraron fragmentos utilizables.");
      $("#bookStatus").textContent=`Preparando ${chunks.length} fragmentos de conocimiento...`;

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
      await insertBatches("knowledge_nodes",rows,"Guardando conocimiento",100);
      nodeCount=rows.length;
      conceptCount=conceptSet.size;
      summary=`${rows.length} fragmentos y ${conceptSet.size} palabras clave`;
    }

    const {error:updateError}=await client().from("books").update({
      status:"ready",node_count:nodeCount,concept_count:conceptCount,
      processed_at:new Date().toISOString(),error_message:null
    }).eq("id",book.id);
    if(updateError)throw updateError;

    $("#bookStatus").textContent="Listo: "+summary+".";
    await loadBooks();
  }catch(error){
    await client().from("books").update({
      status:"failed",error_message:String(error.message||error)
    }).eq("id",book.id);
    const message=String(error.message||error);
    if(message.includes("lexicon_terms")||message.includes("language_ngrams")){
      $("#bookStatus").textContent="Falta activar el motor lingüístico en Supabase. Ejecutá la migración 202609260006_linguistic_corpus.sql y recargá el schema cache.";
    }else{
      $("#bookStatus").textContent="Error de procesamiento: "+message;
    }
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
    const [booksRes,lexiconRes,ngramRes]=await Promise.all([
      client().from("books")
        .select("id,title,original_filename,storage_path,file_size,resource_type,status,node_count,concept_count,error_message,created_at,processed_at")
        .order("created_at",{ascending:false}),
      client().from("lexicon_terms").select("*",{count:"exact",head:true}),
      client().from("language_ngrams").select("*",{count:"exact",head:true})
    ]);
    const {data,error}=booksRes
          if(error)throw error;
    if(lexiconRes.error)throw lexiconRes.error;
    if(ngramRes.error)throw ngramRes.error;
    $("#lexiconCount").textContent=String(lexiconRes.count||0);
    $("#ngramCount").textContent=String(ngramRes.count||0);
    const root=$("#bookList");root.innerHTML="";
    renderLibraryStats(data||[]);
    if(!data?.length){root.innerHTML='<p class="muted">Todavía no hay libros registrados.</p>';return}
    data.forEach(book=>{
      const row=document.createElement("div");row.className="admin-list-row";
      const info=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=book.title;
      const small=document.createElement("small");
      const typeNames={content:"contenido",dictionary:"diccionario",grammar:"gramática",style:"estilo"};
      small.textContent=`${typeNames[book.resource_type]||book.resource_type||"contenido"} · ${book.status} · ${book.node_count||0} fragmentos · ${book.concept_count||0} palabras clave${book.error_message?" · "+book.error_message:""}`;
      info.append(strong,small);

      const typeSelect=document.createElement("select");
      typeSelect.className="book-type-select";
      [["content","Contenido"],["dictionary","Diccionario"],["grammar","Gramática"],["style","Estilo"]].forEach(([value,label])=>{
        const o=document.createElement("option");o.value=value;o.textContent=label;
        if((book.resource_type||"content")===value)o.selected=true;
        typeSelect.appendChild(o);
      });
      typeSelect.onchange=async()=>{
        const {error}=await client().from("books").update({
          resource_type:typeSelect.value,status:"uploaded",node_count:0,concept_count:0,
          processed_at:null,error_message:null
        }).eq("id",book.id);
        if(error){$("#bookStatus").textContent="No se pudo cambiar el tipo: "+error.message;return}
        book.resource_type=typeSelect.value;
        book.status="uploaded";
        $("#bookStatus").textContent="Tipo actualizado. Reprocesá el PDF para aplicar su nueva función.";
        await loadBooks();
      };

      const actions=document.createElement("div");actions.className="admin-actions";
      actions.appendChild(typeSelect);
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
      const result=await window.PhraseEngine.generate(intent,{tone,variant:i,mode:"admin"});
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

async function loadStudyStats(){
  try{
    const [feedbackRes,examplesRes,templatesRes]=await Promise.all([
      client().from("writer_feedback").select("approved"),
      client().from("writer_examples").select("id",{count:"exact"}),
      client().from("writer_templates").select("id,tone,template,score,approvals,rejections,active").eq("active",true)
    ]);
    if(feedbackRes.error)throw feedbackRes.error;
    if(examplesRes.error)throw examplesRes.error;
    if(templatesRes.error)throw templatesRes.error;

    const feedback=feedbackRes.data||[];
    $("#studyApprovals").textContent=String(feedback.filter(x=>x.approved).length);
    $("#studyRejections").textContent=String(feedback.filter(x=>!x.approved).length);
    $("#studyExamples").textContent=String(examplesRes.count||0);

    const ranking=(templatesRes.data||[]).slice().sort((a,b)=>
      (b.score-a.score)||(b.approvals-a.approvals)||(a.rejections-b.rejections)
    ).slice(0,12);

    const root=$("#templateRanking");
    root.innerHTML="";
    if(!ranking.length){
      root.innerHTML='<p class="muted">Todavía no hay datos de entrenamiento.</p>';
      return;
    }
    ranking.forEach(t=>{
      const row=document.createElement("div");
      row.className="metric-row";
      const text=document.createElement("span");
      text.textContent=(t.tone?("["+t.tone+"] "):"")+t.template;
      const score=document.createElement("strong");
      score.textContent=`${t.score} · ✓${t.approvals} ✕${t.rejections}`;
      row.append(text,score);
      root.appendChild(row);
    });
  }catch(error){
    $("#studyStatus").textContent="No se pudieron cargar los datos de entrenamiento: "+error.message;
  }
}

$("#studyGenerate").onclick=generateStudyVariants;
$("#studyIntent").addEventListener("keydown",e=>{
  if(e.key==="Enter"){e.preventDefault();generateStudyVariants()}
});

async function generateStudyVariants(){
  const intent=$("#studyIntent").value.trim();
  if(!intent){$("#studyStatus").textContent="Escribí una intención para practicar.";return}

  $("#studyGenerate").disabled=true;
  $("#studyStatus").textContent="Generando ejemplos para estudiar...";
  $("#studyVariants").innerHTML="";
  $("#studyEditor").hidden=true;

  try{
    const tone=$("#studyTone").value;
    const results=[];
    const count=Number($("#studyCount")?.value||5);
    for(let i=0;i<count;i++){
      const result=await window.PhraseEngine.generate(intent,{tone,variant:i,mode:"study"});
      if(result?.phrase&&result?.generationId)results.push(result);
    }
    const unique=[...new Map(results.map(x=>[x.phrase,x])).values()];
    if(!unique.length){
      $("#studyStatus").textContent="No encontré suficiente conocimiento procesado para esa intención.";
      return;
    }
    renderStudyVariants(unique);
    $("#studyStatus").textContent=`${unique.length} de ${count} variantes distintas listas para evaluar.`;
  }catch(error){
    $("#studyStatus").textContent="Error: "+error.message;
  }finally{
    $("#studyGenerate").disabled=false;
  }
}

function renderStudyVariants(list){
  const root=$("#studyVariants");
  root.innerHTML="";
  list.forEach(item=>{
    const row=document.createElement("div");
    row.className="study-item";

    const p=document.createElement("p");
    p.textContent=item.phrase;

    const actions=document.createElement("div");
    actions.className="study-actions";

    const good=document.createElement("button");
    good.type="button";
    good.textContent="✓ Buena";
    good.onclick=()=>saveStudyFeedback(item,true);

    const bad=document.createElement("button");
    bad.type="button";
    bad.className="ghost";
    bad.textContent="✕ Mala";
    bad.onclick=()=>saveStudyFeedback(item,false);

    const correct=document.createElement("button");
    correct.type="button";
    correct.className="ghost";
    correct.textContent="✎ Corregir";
    correct.onclick=()=>openStudyCorrection(item);

    actions.append(good,bad,correct);
    row.append(p,actions);
    root.appendChild(row);
  });
}

async function saveStudyFeedback(item,approved,correctedPhrase="",notes=""){
  try{
    const {error}=await client().rpc("record_writer_feedback",{
      p_generation_id:item.generationId,
      p_approved:approved,
      p_corrected_phrase:correctedPhrase||null,
      p_notes:notes||null
    });
    if(error)throw error;
    $("#studyStatus").textContent=approved
      ?"Marcada como buena. Esa plantilla ganó peso."
      :(correctedPhrase
        ?"Corrección guardada. El redactor la usará como ejemplo para esta intención."
        :"Marcada como mala. Esa plantilla perdió peso.");
    $("#studyEditor").hidden=true;
    studySelected=null;
    await loadStudyStats();
  }catch(error){
    $("#studyStatus").textContent="No se pudo guardar el aprendizaje: "+error.message;
  }
}

function openStudyCorrection(item){
  studySelected=item;
  $("#studyOriginal").textContent=item.phrase;
  $("#studyCorrection").value=item.phrase;
  $("#studyNotes").value="";
  $("#studyEditor").hidden=false;
  $("#studyCorrection").focus();
}

$("#saveStudyCorrection").onclick=async()=>{
  if(!studySelected)return;
  const corrected=$("#studyCorrection").value.trim();
  const notes=$("#studyNotes").value.trim();
  if(!corrected){
    $("#studyStatus").textContent="Escribí una versión corregida.";
    return;
  }
  await saveStudyFeedback(studySelected,false,corrected,notes);
};

$("#cancelStudyCorrection").onclick=()=>{
  studySelected=null;
  $("#studyEditor").hidden=true;
};

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