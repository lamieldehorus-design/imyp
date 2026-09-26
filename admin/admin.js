const $=s=>document.querySelector(s);
const cfg=()=>window.IMYP_CONFIG||{};
const SESSION_KEY="imyp_admin_session_v2";
let session=null,selectedGenerationId=null,currentIntent="";

function configured(){return /^https:\/\//.test(cfg().supabaseUrl||"")&&String(cfg().supabasePublishableKey||"").length>10}
function base(){return String(cfg().supabaseUrl||"").replace(/\/$/,"")}
function key(){return String(cfg().supabasePublishableKey||"")}
function setSession(value){
  session=value;
  if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(SESSION_KEY);
}
function savedSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}}

async function authCall(path,body){
  const r=await fetch(base()+path,{method:"POST",headers:{"apikey":key(),"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.msg||data.error_description||data.error||"No se pudo iniciar sesión");
  return data;
}
async function refreshSession(){
  const saved=savedSession();
  if(!saved?.refresh_token)return false;
  try{
    const data=await authCall("/auth/v1/token?grant_type=refresh_token",{refresh_token:saved.refresh_token});
    setSession(data);return true;
  }catch{setSession(null);return false}
}
async function functionCall(name,body){
  if(!session?.access_token)throw new Error("Sesión no iniciada");
  const r=await fetch(base()+"/functions/v1/"+name,{
    method:"POST",
    headers:{"apikey":key(),"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await r.json().catch(()=>({}));
  if(r.status===401&&await refreshSession())return functionCall(name,body);
  if(!r.ok)throw new Error(data.error||("HTTP "+r.status));
  return data;
}
function splitList(v){return v.split(",").map(x=>x.trim()).filter(Boolean)}

async function login(email,password){
  const data=await authCall("/auth/v1/token?grant_type=password",{email,password});
  setSession(data);
  await functionCall("admin-api",{action:"list_books"});
  showApp();
}
function showApp(){
  $("#loginPanel").hidden=true;$("#adminApp").hidden=false;$("#logoutButton").hidden=false;
  loadBooks();loadStats();loadPublished();
}
function showLogin(){
  $("#loginPanel").hidden=false;$("#adminApp").hidden=true;$("#logoutButton").hidden=true;
}

$("#loginForm").onsubmit=async e=>{
  e.preventDefault();$("#loginStatus").textContent="Entrando...";
  try{await login($("#adminEmail").value.trim(),$("#adminPassword").value);$("#loginStatus").textContent=""}
  catch(error){setSession(null);$("#loginStatus").textContent=error.message}
};
$("#logoutButton").onclick=()=>{setSession(null);showLogin()};

document.querySelectorAll("[data-tab]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-tab]").forEach(b=>{b.classList.toggle("active",b===btn);b.classList.toggle("ghost",b!==btn)});
  document.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==btn.dataset.tab);
  if(btn.dataset.tab==="stats")loadStats();
  if(btn.dataset.tab==="published")loadPublished();
});

async function uploadBook(){
  const file=$("#bookFile").files[0];
  if(!file){$("#bookStatus").textContent="Elegí un PDF.";return}
  if(file.type&&file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){$("#bookStatus").textContent="El archivo debe ser PDF.";return}
  const title=$("#bookTitle").value.trim()||file.name.replace(/\.pdf$/i,"");
  const userId=session?.user?.id||"admin";
  const path=userId+"/"+crypto.randomUUID()+".pdf";
  const encoded=path.split("/").map(encodeURIComponent).join("/");
  $("#uploadBook").disabled=true;$("#bookStatus").textContent="Subiendo PDF...";
  try{
    const r=await fetch(base()+"/storage/v1/object/books/"+encoded,{
      method:"POST",
      headers:{"apikey":key(),"Authorization":"Bearer "+session.access_token,"Content-Type":"application/pdf","x-upsert":"false"},
      body:file
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.message||data.error||"No se pudo subir el PDF");
    $("#bookStatus").textContent="PDF subido. Iniciando procesamiento...";
    const result=await functionCall("process-book",{path,title,originalFilename:file.name,fileSize:file.size});
    $("#bookStatus").textContent="Procesando en segundo plano...";
    $("#bookFile").value="";$("#bookTitle").value="";
    loadBooks();
    pollBookStatus(result.bookId);
  }catch(error){$("#bookStatus").textContent="Error: "+error.message;loadBooks()}
  finally{$("#uploadBook").disabled=false}
}
$("#uploadBook").onclick=uploadBook;
$("#syncBooks").onclick=async()=>{
  $("#syncBooks").disabled=true;
  $("#bookStatus").textContent="Buscando PDFs existentes en Storage...";
  try{
    const result=await functionCall("admin-api",{action:"sync_storage"});
    $("#bookStatus").textContent=`Encontrados ${result.found||0} PDFs. Agregados ${result.added||0} a la biblioteca.`;
    await loadBooks();
  }catch(error){
    $("#bookStatus").textContent="Error al sincronizar: "+error.message;
  }finally{$("#syncBooks").disabled=false}
};
$("#refreshBooks").onclick=loadBooks;

async function pollBookStatus(bookId,attempt=0){
  if(!bookId||attempt>50)return;
  try{
    const data=await functionCall("admin-api",{action:"list_books"});
    const book=(data.books||[]).find(x=>x.id===bookId);
    if(!book)return;
    if(book.status==="ready"){
      $("#bookStatus").textContent=`Procesado: ${book.node_count||0} nodos y ${book.concept_count||0} conceptos.`;
      loadBooks();return;
    }
    if(book.status==="failed"){
      $("#bookStatus").textContent="Error de procesamiento: "+(book.error_message||"sin detalle");
      loadBooks();return;
    }
    $("#bookStatus").textContent="Procesando en segundo plano...";
    setTimeout(()=>pollBookStatus(bookId,attempt+1),3000);
  }catch{}
}

async function processExistingBook(book){
  $("#bookStatus").textContent="Iniciando procesamiento de “"+book.title+"”...";
  try{
    const result=await functionCall("process-book",{
      path:book.storage_path,
      title:book.title,
      originalFilename:book.original_filename,
      fileSize:book.file_size
    });
    $("#bookStatus").textContent="Procesando en segundo plano...";
    await loadBooks();
    pollBookStatus(result.bookId);
  }catch(error){
    $("#bookStatus").textContent="Error al iniciar procesamiento: "+error.message;
  }
}

async function loadBooks(){
  if(!session)return;
  try{
    const data=await functionCall("admin-api",{action:"list_books"});
    const root=$("#bookList");root.innerHTML="";
    if(!data.books.length){root.innerHTML='<p class="muted">Todavía no hay libros cargados.</p>';return}
    data.books.forEach(book=>{
      const row=document.createElement("div");row.className="admin-list-row";
      const info=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=book.title;
      const small=document.createElement("small");
      small.textContent=`${book.status} · ${book.node_count||0} nodos · ${book.concept_count||0} conceptos${book.error_message?" · "+book.error_message:""}`;
      info.append(strong,small);
      const actions=document.createElement("div");actions.className="admin-actions";
      if(book.status==="uploaded"||book.status==="failed"){
        const process=document.createElement("button");process.type="button";
        process.textContent=book.status==="failed"?"Reprocesar":"Procesar";
        process.onclick=()=>processExistingBook(book);
        actions.appendChild(process);
      }
      const del=document.createElement("button");del.className="ghost";del.type="button";del.textContent="Eliminar";
      del.onclick=async()=>{if(!confirm("¿Eliminar este libro y sus conceptos?"))return;await functionCall("admin-api",{action:"delete_book",id:book.id});loadBooks()};
      actions.appendChild(del);
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
    const result=await window.PhraseEngine.generate(intent,{
      tone:$("#adminTone").value,source:"admin",count:Number($("#adminCount").value),authToken:session.access_token
    });
    if(!result?.phrases?.length){$("#variantList").innerHTML="";$("#adminStatus").textContent="No hay suficiente conocimiento cargado para esa intención.";return}
    renderVariants(result.phrases);$("#adminStatus").textContent=`${result.phrases.length} variantes listas.`;
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
    await functionCall("admin-api",{
      action:"publish",generationId:selectedGenerationId,phrase,sourceIntent:currentIntent,
      category:$("#publishCategory").value,recipients:splitList($("#publishRecipients").value),
      tones:splitList($("#publishTones").value),tags:splitList($("#publishTags").value),style:$("#publishStyle").value
    });
    $("#publishStatus").textContent="Publicada. Ya puede entrar al catálogo público.";loadPublished();
  }catch(error){$("#publishStatus").textContent="Error: "+error.message}
  finally{$("#publishButton").disabled=false}
};

async function loadStats(){
  if(!session)return;
  try{
    const s=await functionCall("admin-api",{action:"stats"});
    $("#statCards").innerHTML=[
      ["Intenciones",s.totalIntents],["Con resultado",s.successfulIntents],["Sin resultado",s.missedIntents]
    ].map(([label,value])=>`<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
    renderMetricList($("#topIntents"),s.topIntents);
    renderMetricList($("#missingIntents"),s.missingIntents);
    $("#funnelStats").innerHTML=Object.entries(s.funnel).map(([label,value])=>`<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
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
    const data=await functionCall("admin-api",{action:"list_published"});
    const root=$("#publishedList");root.innerHTML="";
    if(!data.phrases.length){root.innerHTML='<p class="muted">Todavía no publicaste frases.</p>';return}
    data.phrases.forEach(item=>{
      const row=document.createElement("div");row.className="admin-list-row";
      const info=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=item.phrase;
      const small=document.createElement("small");small.textContent=`${item.category} · ${(item.tags||[]).join(", ")}`;
      info.append(strong,small);
      const archive=document.createElement("button");archive.type="button";archive.className="ghost";archive.textContent="Archivar";
      archive.onclick=async()=>{await functionCall("admin-api",{action:"archive_phrase",id:item.id});loadPublished()};
      row.append(info,archive);root.appendChild(row);
    });
  }catch(error){$("#publishedList").innerHTML='<p class="muted">No se pudo cargar el catálogo.</p>'}
}

(async()=>{
  if(!configured()){
    $("#configWarning").hidden=false;$("#loginPanel").hidden=true;return;
  }
  if(await refreshSession()){
    try{await functionCall("admin-api",{action:"list_books"});showApp();return}catch{setSession(null)}
  }
  showLogin();
})();