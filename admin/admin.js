const $=s=>document.querySelector(s);
const KEY="imyp_admin_drafts_v1";
let currentPhrase="";

function drafts(){
  try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}
}
function saveDrafts(value){localStorage.setItem(KEY,JSON.stringify(value))}
function renderDrafts(){
  const list=drafts();
  const root=$("#draftList");
  root.innerHTML="";
  if(!list.length){
    root.innerHTML='<p class="muted">Todavía no guardaste borradores.</p>';
    return;
  }
  list.slice().reverse().forEach(item=>{
    const el=document.createElement("div");
    el.className="draft-item";
    el.innerHTML='<p></p><small></small>';
    el.querySelector("p").textContent=item.phrase;
    el.querySelector("small").textContent=(item.intent||"")+" · "+new Date(item.createdAt).toLocaleString();
    root.appendChild(el);
  });
}
async function generate(){
  const intent=$("#adminIntent").value.trim();
  if(!intent){$("#adminStatus").textContent="Escribí una intención.";return}
  $("#adminGenerate").disabled=true;
  $("#adminStatus").textContent="Generando...";
  try{
    const result=await window.PhraseEngine.generate(intent,{tone:$("#adminTone").value});
    if(!result?.phrase){
      $("#adminResult").hidden=true;
      $("#adminStatus").textContent="No hay material suficiente para esa intención todavía.";
      return;
    }
    currentPhrase=result.phrase;
    $("#adminPhrase").textContent=currentPhrase;
    $("#adminResult").hidden=false;
    $("#adminStatus").textContent="";
  }catch{
    $("#adminResult").hidden=true;
    $("#adminStatus").textContent="No se pudo acceder a la base.";
  }finally{$("#adminGenerate").disabled=false}
}
$("#adminGenerate").onclick=generate;
$("#adminRegenerate").onclick=generate;
$("#adminIntent").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();generate()}});
$("#adminCopy").onclick=async()=>{
  if(!currentPhrase)return;
  try{await navigator.clipboard.writeText(currentPhrase);$("#adminStatus").textContent="Frase copiada."}catch{}
};
$("#adminSaveDraft").onclick=()=>{
  if(!currentPhrase)return;
  const list=drafts();
  list.push({phrase:currentPhrase,intent:$("#adminIntent").value.trim(),tone:$("#adminTone").value,createdAt:new Date().toISOString()});
  saveDrafts(list);
  renderDrafts();
  $("#adminStatus").textContent="Borrador guardado en este navegador.";
};
$("#exportDrafts").onclick=()=>{
  const blob=new Blob([JSON.stringify(drafts(),null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="imagenesypostales-borradores.json";
  a.click();
  URL.revokeObjectURL(a.href);
};
$("#clearDrafts").onclick=()=>{localStorage.removeItem(KEY);renderDrafts()};
renderDrafts();