const needs=[
{key:"saludar",emoji:"☀️",title:"Saludar",desc:"Buenos días y buenas noches"},
{key:"cumpleanos",emoji:"🎂",title:"Felicitar",desc:"Cumpleaños, logros y aniversarios"},
{key:"carino",emoji:"❤️",title:"Demostrar cariño",desc:"Amor, amistad y te extraño"},
{key:"acompanar",emoji:"🤗",title:"Acompañar",desc:"Ánimo y momentos difíciles"},
{key:"agradecer",emoji:"🌷",title:"Agradecer",desc:"Gracias por estar"},
{key:"expresar",emoji:"💬",title:"Expresar lo que siento",desc:"Reflexión, vínculos y emociones"},
{key:"familia",emoji:"🏡",title:"Familia",desc:"Saludos y cariño familiar"},
{key:"viajes",emoji:"✈️",title:"Viajes",desc:"Buen viaje y recuerdos"},
{key:"humor",emoji:"😄",title:"Humor",desc:"Frases y memes cotidianos"}
];

const PAGE_SIZE=12;
let items=[];
let visibleCount=PAGE_SIZE;
const state={need:"",q:"",recipient:"",tone:"",style:"",selected:null};
const $=s=>document.querySelector(s);
const quick=$("#quickNeeds"),gallery=$("#gallery"),empty=$("#emptyState"),count=$("#resultCount"),title=$("#resultTitle"),sentinel=$("#loadSentinel");

function normalize(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function escapeText(v){return String(v??"")}
function filtered(){
  const q=normalize(state.q).trim();
  const stop=new Set(["para","mi","un","una","de","del","la","el","los","las","con","a","al"]);
  const aliases={"cumple":"cumpleanos","cumpleanos":"cumpleanos","cumpleano":"cumpleanos","hermano":"hermana","amigo":"amiga","madre":"mama","novia":"pareja","novio":"pareja","esposa":"pareja","esposo":"pareja","graciosa":"gracioso","humor":"gracioso","profunda":"profundo"};
  const tokens=q.split(/\s+/).filter(Boolean).filter(t=>!stop.has(t)).map(t=>aliases[t]||t);
  return items.filter(i=>{
    const hay=normalize([i.title,i.phrase,i.description,...(i.tags||[]),...(i.recipients||[]),i.need,...(i.tones||[]),i.style].join(" "));
    return (!state.need||i.need===state.need)&&(!tokens.length||tokens.every(t=>hay.includes(t)))&&(!state.recipient||(i.recipients||[]).includes(state.recipient))&&(!state.tone||(i.tones||[]).includes(state.tone))&&(!state.style||i.style===state.style);
  });
}

needs.forEach(n=>{
  const b=document.createElement("button");
  b.type="button";b.className="quick-card";
  b.innerHTML=`<span class="emoji">${n.emoji}</span><span><strong>${n.title}</strong><small>${n.desc}</small></span>`;
  b.onclick=()=>{state.need=state.need===n.key?"":n.key;state.q="";$("#searchInput").value="";resetAndRender()};
  quick?.appendChild(b);
});

async function loadContent(){
  try{
    const [phrasesRes,blogRes]=await Promise.all([
      fetch("/data/frases.json",{cache:"default"}),
      fetch("/data/blog.json",{cache:"default"})
    ]);
    if(!phrasesRes.ok)throw new Error("No se pudo cargar el catálogo");
    items=await phrasesRes.json();
    render();
    if(blogRes.ok)renderLatestBlog(await blogRes.json());
  }catch(error){
    console.error(error);
    if(empty){empty.hidden=false;empty.textContent="No pude cargar las postales en este momento."}
  }
}

function card(i){
  const el=document.createElement("article");el.className="card";
  el.innerHTML='<div class="postal"><p></p></div><div class="card-body"><h3 class="card-title"></h3><p class="card-description"></p><div class="tags"></div><div class="actions"><button data-action="copy">Copiar</button><button class="secondary" data-action="download">Descargar</button><button class="secondary" data-action="personalize">Personalizar</button><button data-action="share">Compartir</button></div></div>';
  el.querySelector(".postal").classList.add(i.style||"minimalista");
  el.querySelector(".postal p").textContent=i.phrase;
  el.querySelector(".card-title").textContent=i.title||"Frase para compartir";
  el.querySelector(".card-description").textContent=i.description||i.phrase;
  const tags=el.querySelector(".tags");
  (i.tags||[]).slice(0,6).forEach(t=>{const s=document.createElement("span");s.className="tag";s.textContent=t;tags.appendChild(s)});
  el.querySelector('[data-action="copy"]').onclick=()=>copyText(i.phrase);
  el.querySelector('[data-action="download"]').onclick=()=>downloadPostal(i.phrase,i.style);
  el.querySelector('[data-action="personalize"]').onclick=()=>openPersonalize(i);
  el.querySelector('[data-action="share"]').onclick=()=>shareText(i.phrase);
  return el;
}

function resetAndRender(){visibleCount=PAGE_SIZE;render()}
function render(){
  const list=filtered();
  if(!gallery)return;
  gallery.innerHTML="";
  list.slice(0,visibleCount).forEach(i=>gallery.appendChild(card(i)));
  if(empty)empty.hidden=list.length>0;
  if(count)count.textContent=`${list.length} resultado${list.length===1?"":"s"}`;
  const n=needs.find(x=>x.key===state.need);
  if(title)title.textContent=n?`Postales para ${n.title.toLowerCase()}`:"Postales para hoy";
  if(sentinel)sentinel.hidden=visibleCount>=list.length;
}

function loadMore(){
  const list=filtered();
  if(visibleCount>=list.length)return;
  visibleCount=Math.min(visibleCount+PAGE_SIZE,list.length);
  render();
}

if("IntersectionObserver" in window&&sentinel){
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting))loadMore();
  },{rootMargin:"500px 0px"});
  observer.observe(sentinel);
}

async function copyText(text){
  try{await navigator.clipboard.writeText(text);toast("Frase copiada")}
  catch{prompt("Copiá la frase:",text)}
}
async function shareText(text){
  if(navigator.share){
    try{await navigator.share({title:"Imágenes y Postales",text,url:location.href});return}catch{}
  }
  copyText(text);
}
function wrap(ctx,text,maxWidth){
  const paragraphs=String(text).split(/\n+/),lines=[];
  paragraphs.forEach((paragraph,pIndex)=>{
    const words=paragraph.split(/\s+/).filter(Boolean);let line="";
    words.forEach(w=>{
      const test=line?line+" "+w:w;
      if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test;
    });
    if(line)lines.push(line);
    if(pIndex<paragraphs.length-1)lines.push("");
  });
  return lines;
}
function downloadPostal(text,style="minimalista"){
  const c=document.createElement("canvas");c.width=1080;c.height=1080;const x=c.getContext("2d");
  const dark=style==="oscuro";
  x.fillStyle=dark?"#111827":style==="azul"?"#eaf2ff":"#ffffff";x.fillRect(0,0,c.width,c.height);
  x.fillStyle=dark?"#ffffff":style==="azul"?"#0b3d91":"#15171a";
  x.textAlign="center";x.textBaseline="middle";x.font="700 58px Arial";
  let lines=wrap(x,text,820);
  if(lines.length>9){x.font="700 46px Arial";lines=wrap(x,text,850)}
  const lh=lines.length>9?62:78,start=540-(lines.length-1)*lh/2;
  lines.forEach((l,j)=>x.fillText(l,540,start+j*lh));
  x.font="700 30px Arial";x.fillStyle=dark?"#dbeafe":"#0b57d0";x.fillText("imagenesypostales.com",540,950);
  const a=document.createElement("a");a.download="postal-imagenesypostales.png";a.href=c.toDataURL("image/png");a.click();
}
function toast(msg){
  const t=document.createElement("div");t.textContent=msg;t.className="toast";
  document.body.appendChild(t);setTimeout(()=>t.remove(),1400);
}

$("#searchForm").onsubmit=e=>{
  e.preventDefault();state.q=$("#searchInput").value.trim();state.need="";resetAndRender();
  document.querySelector(".gallery-section")?.scrollIntoView({behavior:"smooth",block:"start"});
};
["recipient","tone","style"].forEach(k=>{
  const el=$("#"+k+"Filter");
  if(el)el.onchange=e=>{state[k]=e.target.value;resetAndRender()};
});
$("#clearFilters").onclick=()=>{
  state.need=state.q=state.recipient=state.tone=state.style="";
  $("#searchInput").value="";
  ["recipient","tone","style"].forEach(k=>{const el=$("#"+k+"Filter");if(el)el.value=""});
  resetAndRender();
};

const dialog=$("#personalizeDialog");
function personalizedText(){
  const base=state.selected?.phrase||"",name=$("#personName").value.trim(),extra=$("#extraMessage").value.trim(),sign=$("#signature").value.trim();
  return [name?`${name},`:"",base,extra,sign].filter(Boolean).join("\n\n");
}
function openPersonalize(i){
  state.selected=i;$("#dialogBasePhrase").textContent=i.phrase;
  $("#personName").value="";$("#signature").value="";$("#extraMessage").value="";
  dialog?.showModal();
}
$("#copyPersonalized").onclick=()=>copyText(personalizedText());
$("#downloadPersonalized").onclick=()=>downloadPostal(personalizedText(),state.selected?.style||"minimalista");

function renderLatestBlog(posts){
  const root=$("#latestBlog");if(!root)return;
  root.innerHTML="";
  (posts||[]).slice(0,3).forEach(p=>{
    const a=document.createElement("article");a.className="blog-card";
    const eyebrow=document.createElement("p");eyebrow.className="eyebrow";eyebrow.textContent=(p.category||"Blog").toUpperCase();
    const h=document.createElement("h3"),link=document.createElement("a");link.href="/blog/"+p.slug+"/";link.textContent=p.title;h.appendChild(link);
    const d=document.createElement("p");d.textContent=p.description||"";
    a.append(eyebrow,h,d);root.appendChild(a);
  });
  if(!root.children.length)root.innerHTML='<article class="blog-card"><p class="eyebrow">BLOG</p><h3>Próximamente</h3><p>Los artículos publicados desde blog.txt van a aparecer acá automáticamente.</p></article>';
}

const initialParams=new URLSearchParams(location.search);
if(initialParams.get("q")){$("#searchInput").value=initialParams.get("q");state.q=initialParams.get("q")}
loadContent();
