const PAGE_SIZE=12;
let allItems=[],visibleCount=PAGE_SIZE,currentList=[],selected=null;
const path=location.pathname.split("/").filter(Boolean);
const categoryMap={"cumpleanos":"cumpleanos","buenos-dias":"saludar","amor":"carino","familia":"familia","animo":"acompanar","viajes":"viajes","humor":"humor"};
const category=categoryMap[path[0]]||"";
const recipient=path[1]||"";
const gallery=document.querySelector(".masonry");
const count=document.querySelector(".section-heading .muted");

function matches(i){
  if(category&&i.need!==category)return false;
  if(recipient&&!(i.recipients||[]).includes(recipient))return false;
  return true;
}
async function load(){
  try{
    const r=await fetch("/data/frases.json",{cache:"default"});
    if(!r.ok)throw new Error();
    allItems=await r.json();
    currentList=allItems.filter(matches);
    render();
  }catch{
    if(count)count.textContent="No se pudo cargar el catálogo.";
  }
}
function card(i){
  const el=document.createElement("article");el.className="card";
  el.innerHTML='<div class="postal"><p></p></div><div class="card-body"><h3 class="card-title"></h3><p class="card-description"></p><div class="tags"></div><div class="actions"><button data-copy>Copiar</button><button class="secondary" data-download>Descargar</button><button class="secondary" data-personalize>Personalizar</button><button data-share>Compartir</button></div></div>';
  el.querySelector(".postal").classList.add(i.style||"minimalista");
  el.querySelector(".postal p").textContent=i.phrase;
  el.querySelector(".card-title").textContent=i.title||"Frase para compartir";
  el.querySelector(".card-description").textContent=i.description||i.phrase;
  const tags=el.querySelector(".tags");
  (i.tags||[]).slice(0,6).forEach(t=>{const s=document.createElement("span");s.className="tag";s.textContent=t;tags.appendChild(s)});
  el.querySelector("[data-copy]").onclick=()=>copyText(i.phrase);
  el.querySelector("[data-download]").onclick=()=>downloadPostal(i.phrase,i.style);
  el.querySelector("[data-personalize]").onclick=()=>openPersonalize(i);
  el.querySelector("[data-share]").onclick=()=>shareText(i.phrase);
  return el;
}
function render(){
  if(!gallery)return;
  gallery.innerHTML="";
  currentList.slice(0,visibleCount).forEach(i=>gallery.appendChild(card(i)));
  if(count)count.textContent=`${currentList.length} frase${currentList.length===1?"":"s"}`;
  let sentinel=document.querySelector(".load-sentinel");
  if(!sentinel){
    sentinel=document.createElement("div");sentinel.className="load-sentinel";
    gallery.insertAdjacentElement("afterend",sentinel);
    observe(sentinel);
  }
  sentinel.hidden=visibleCount>=currentList.length;
}
function observe(el){
  if(!("IntersectionObserver" in window))return;
  new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)&&visibleCount<currentList.length){
      visibleCount=Math.min(visibleCount+PAGE_SIZE,currentList.length);render();
    }
  },{rootMargin:"500px 0px"}).observe(el);
}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast("Frase copiada")}catch{prompt("Copiá la frase:",text)}}
async function shareText(text){if(navigator.share){try{await navigator.share({title:"Imágenes y Postales",text,url:location.href});return}catch{}}copyText(text)}
function wrap(ctx,text,maxWidth){const words=String(text).split(/\s+/),lines=[];let line="";words.forEach(w=>{const test=line?line+" "+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test});if(line)lines.push(line);return lines}
function downloadPostal(text,style="minimalista"){
  const c=document.createElement("canvas");c.width=1080;c.height=1080;const x=c.getContext("2d");
  const dark=style==="oscuro";x.fillStyle=dark?"#111827":style==="azul"?"#eaf2ff":"#fff";x.fillRect(0,0,1080,1080);
  x.fillStyle=dark?"#fff":style==="azul"?"#0b3d91":"#15171a";x.textAlign="center";x.textBaseline="middle";x.font="700 58px Arial";
  let lines=wrap(x,text,820);if(lines.length>9){x.font="700 46px Arial";lines=wrap(x,text,850)}
  const lh=lines.length>9?62:78,start=540-(lines.length-1)*lh/2;lines.forEach((l,j)=>x.fillText(l,540,start+j*lh));
  x.font="700 30px Arial";x.fillStyle=dark?"#dbeafe":"#0b57d0";x.fillText("imagenesypostales.com",540,950);
  const a=document.createElement("a");a.download="postal-imagenesypostales.png";a.href=c.toDataURL("image/png");a.click();
}
function ensureDialog(){
  if(document.querySelector("#personalizeDialog"))return;
  const d=document.createElement("dialog");d.id="personalizeDialog";
  d.innerHTML='<form method="dialog" class="dialog-card"><button class="dialog-close" value="cancel" aria-label="Cerrar">×</button><h2>Personalizá tu postal</h2><p id="dialogBasePhrase" class="preview-phrase"></p><label>Nombre<input id="personName" maxlength="40" placeholder="Ej.: Sofía"></label><label>Firma<input id="signature" maxlength="50" placeholder="Ej.: Con cariño, Mauro"></label><label>Mensaje extra<textarea id="extraMessage" rows="3" maxlength="160" placeholder="Algo breve y personal"></textarea></label><div class="dialog-actions"><button type="button" class="ghost" id="copyPersonalized">Copiar</button><button type="button" id="downloadPersonalized">Descargar</button></div></form>';
  document.body.appendChild(d);
  document.querySelector("#copyPersonalized").onclick=()=>copyText(personalizedText());
  document.querySelector("#downloadPersonalized").onclick=()=>downloadPostal(personalizedText(),selected?.style||"minimalista");
}
function personalizedText(){
  const name=document.querySelector("#personName").value.trim(),extra=document.querySelector("#extraMessage").value.trim(),sign=document.querySelector("#signature").value.trim();
  return [name?`${name},`:"",selected?.phrase||"",extra,sign].filter(Boolean).join("\n\n");
}
function openPersonalize(i){
  ensureDialog();selected=i;
  document.querySelector("#dialogBasePhrase").textContent=i.phrase;
  ["personName","signature","extraMessage"].forEach(id=>document.querySelector("#"+id).value="");
  document.querySelector("#personalizeDialog").showModal();
}
function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1400)}
load();
