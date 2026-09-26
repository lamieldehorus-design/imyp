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

let items=[
{id:1,need:"saludar",recipients:["familia","amiga"],tones:["sencillo"],style:"azul",phrase:"Que hoy te encuentre algo bueno, aunque sea pequeño.",tags:["buenos días","cotidiano"]},
{id:2,need:"cumpleanos",recipients:["hermana"],tones:["tierno"],style:"minimalista",phrase:"Feliz cumpleaños, hermana. Que este año te devuelva un poco de todo lo lindo que das.",tags:["cumpleaños","hermana"]},
{id:3,need:"carino",recipients:["pareja"],tones:["profundo"],style:"oscuro",phrase:"Hay distancias que separan lugares, no afectos.",tags:["amor","te extraño"]},
{id:4,need:"acompanar",recipients:["amiga"],tones:["tierno"],style:"azul",phrase:"No tengo que arreglar lo que te pasa para poder quedarme a tu lado.",tags:["ánimo","amistad"]},
{id:5,need:"agradecer",recipients:["familia"],tones:["sencillo"],style:"minimalista",phrase:"Gracias por estar en esas cosas que parecen pequeñas y terminan siendo enormes.",tags:["gracias","familia"]},
{id:6,need:"expresar",recipients:["para-mi"],tones:["profundo"],style:"oscuro",phrase:"También es avanzar dejar de perseguir lo que ya no te hace bien.",tags:["reflexión","amor propio"]},
{id:7,need:"familia",recipients:["mama"],tones:["tierno"],style:"azul",phrase:"Mamá, tu forma de estar convirtió muchos días comunes en recuerdos importantes.",tags:["mamá","familia"]},
{id:8,need:"viajes",recipients:["amiga"],tones:["sencillo"],style:"minimalista",phrase:"Buen viaje. Que vuelvas con historias que todavía no sabés que vas a vivir.",tags:["viaje","amistad"]},
{id:9,need:"humor",recipients:["familia"],tones:["gracioso"],style:"azul",phrase:"Familia: ese grupo donde nadie lee todo, pero todos contestan igual.",tags:["humor","familia"]},
{id:10,need:"cumpleanos",recipients:["amiga"],tones:["gracioso"],style:"oscuro",phrase:"Feliz cumpleaños. La edad es un dato técnico; la torta es lo importante.",tags:["cumpleaños","humor"]},
{id:11,need:"carino",recipients:["amiga"],tones:["tierno"],style:"minimalista",phrase:"Qué suerte que la vida también tenga personas que se sienten como un lugar seguro.",tags:["amistad","cariño"]},
{id:12,need:"acompanar",recipients:["familia"],tones:["profundo"],style:"oscuro",phrase:"En los días difíciles, estar cerca también es una forma de decir te quiero.",tags:["acompañamiento","familia"]}
];

const state={need:"",q:"",recipient:"",tone:"",style:"",selected:null};
const $=s=>document.querySelector(s);
const quick=$("#quickNeeds"),gallery=$("#gallery"),empty=$("#emptyState"),count=$("#resultCount"),title=$("#resultTitle");

needs.forEach(n=>{
  const b=document.createElement("button");
  b.type="button";b.className="quick-card";
  b.innerHTML=`<span class="emoji">${n.emoji}</span><span><strong>${n.title}</strong><small>${n.desc}</small></span>`;
  b.onclick=()=>{state.need=state.need===n.key?"":n.key;state.q="";$("#searchInput").value="";render()};
  quick.appendChild(b);
});

function normalize(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function filtered(){
  const q=normalize(state.q).trim();
  const stop=new Set(["para","mi","un","una","de","del","la","el","los","las","con","a","al"]);
  const aliases={"cumple":"cumpleanos","cumpleanos":"cumpleanos","cumpleano":"cumpleanos","hermano":"hermana","amigo":"amiga","madre":"mama","novia":"pareja","novio":"pareja","esposa":"pareja","esposo":"pareja","graciosa":"gracioso","humor":"gracioso","profunda":"profundo"};
  const tokens=q.split(/\s+/).filter(Boolean).filter(t=>!stop.has(t)).map(t=>aliases[t]||t);
  return items.filter(i=>{
    const hay=normalize([i.phrase,...(i.tags||[]),...(i.recipients||[]),i.need,...(i.tones||[]),i.style].join(" "));
    return (!state.need||i.need===state.need)&&(!tokens.length||tokens.every(t=>hay.includes(t)))&&(!state.recipient||(i.recipients||[]).includes(state.recipient))&&(!state.tone||(i.tones||[]).includes(state.tone))&&(!state.style||i.style===state.style);
  });
}

function trackItem(eventType,i,extra={}){
  window.PhraseEngine?.track(eventType,{phraseId:i.phraseId||null,intent:state.q||null,metadata:{need:i.need,...extra}});
}

function card(i){
  const el=document.createElement("article");el.className="card";
  el.innerHTML=`<div class="postal ${i.style}"><p></p></div><div class="card-body"><p></p><div class="tags"></div><div class="actions"><button data-action="copy">Copiar</button><button class="secondary" data-action="download">Descargar</button><button class="secondary" data-action="personalize">Personalizar</button><button data-action="share">Compartir</button></div></div>`;
  el.querySelector(".postal p").textContent=i.phrase;
  el.querySelector(".card-body>p").textContent=i.phrase;
  const tags=el.querySelector(".tags");
  (i.tags||[]).forEach(t=>{const s=document.createElement("span");s.className="tag";s.textContent=t;tags.appendChild(s)});
  el.querySelector('[data-action="copy"]').onclick=()=>{trackItem("copy",i);copyText(i.phrase)};
  el.querySelector('[data-action="download"]').onclick=()=>{trackItem("download",i);downloadPostal(i.phrase,i.style)};
  el.querySelector('[data-action="personalize"]').onclick=()=>{trackItem("personalize",i);openPersonalize(i)};
  el.querySelector('[data-action="share"]').onclick=()=>{trackItem("share",i);shareText(i.phrase)};
  return el;
}
function render(){
  const list=filtered();gallery.innerHTML="";list.forEach(i=>gallery.appendChild(card(i)));
  empty.hidden=list.length>0;count.textContent=`${list.length} resultado${list.length===1?"":"s"}`;
  const n=needs.find(x=>x.key===state.need);title.textContent=n?`Postales para ${n.title.toLowerCase()}`:"Postales para hoy";
}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast("Frase copiada")}catch{prompt("Copiá la frase:",text)}}
async function shareText(text){if(navigator.share){try{await navigator.share({title:"Imágenes y Postales",text,url:location.href});return}catch{}}copyText(text)}
function wrap(ctx,text,maxWidth){const words=text.split(" "),lines=[];let line="";words.forEach(w=>{const test=line?line+" "+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test});if(line)lines.push(line);return lines}
function downloadPostal(text,style="minimalista"){
  const c=document.createElement("canvas");c.width=1080;c.height=1080;const x=c.getContext("2d");
  const dark=style==="oscuro";x.fillStyle=dark?"#111827":style==="azul"?"#eaf2ff":"#ffffff";x.fillRect(0,0,c.width,c.height);
  x.fillStyle=dark?"#ffffff":style==="azul"?"#0b3d91":"#15171a";x.textAlign="center";x.textBaseline="middle";x.font="700 58px Arial";
  const lines=wrap(x,text,820),lh=78,start=540-(lines.length-1)*lh/2;lines.forEach((l,j)=>x.fillText(l,540,start+j*lh));
  x.font="700 30px Arial";x.fillStyle=dark?"#dbeafe":"#0b57d0";x.fillText("imagenesypostales.com",540,950);
  const a=document.createElement("a");a.download="postal-imagenesypostales.png";a.href=c.toDataURL("image/png");a.click();
}
function toast(msg){const t=document.createElement("div");t.textContent=msg;Object.assign(t.style,{position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",background:"#15171a",color:"#fff",padding:"10px 16px",borderRadius:"12px",zIndex:99});document.body.appendChild(t);setTimeout(()=>t.remove(),1400)}

$("#searchForm").onsubmit=e=>{
  e.preventDefault();state.q=$("#searchInput").value.trim();state.need="";render();
  window.PhraseEngine?.track("search",{intent:state.q});
  document.querySelector(".gallery-section")?.scrollIntoView({behavior:"smooth",block:"start"});
};
["recipient","tone","style"].forEach(k=>{$("#"+k+"Filter").onchange=e=>{state[k]=e.target.value;render()}});
$("#clearFilters").onclick=()=>{state.need=state.q=state.recipient=state.tone=state.style="";$("#searchInput").value="";["recipient","tone","style"].forEach(k=>$("#"+k+"Filter").value="");render()};

const dialog=$("#personalizeDialog");
function personalizedText(){
  const base=state.selected?.phrase||"",name=$("#personName").value.trim(),extra=$("#extraMessage").value.trim(),sign=$("#signature").value.trim();
  return [name?`${name},`:"",base,extra,sign].filter(Boolean).join("\n\n");
}
function openPersonalize(i){state.selected=i;$("#dialogBasePhrase").textContent=i.phrase;$("#personName").value="";$("#signature").value="";$("#extraMessage").value="";dialog.showModal()}
$("#copyPersonalized").onclick=()=>copyText(personalizedText());
$("#downloadPersonalized").onclick=()=>downloadPostal(personalizedText(),state.selected?.style||"minimalista");

const initialParams=new URLSearchParams(location.search);
if(initialParams.get("q")){$("#searchInput").value=initialParams.get("q");state.q=initialParams.get("q")}

let generatedPhrase="",generatedId=null,currentIntent="",generatedVariant=0,lastGeneratorIntent="";
const generatorButton=$("#consciousButton"),generatorInput=$("#consciousIntent"),generatorOutput=$("#consciousOutput"),generatorResult=$("#consciousResult"),generatorStatus=$("#consciousStatus");

async function generatePublicPhrase(next=false){
  const intent=generatorInput.value.trim();
  if(!intent){generatorOutput.hidden=true;generatorStatus.textContent="Escribí primero una palabra, emoción o situación.";return}
  if(intent!==lastGeneratorIntent){generatedVariant=0;lastGeneratorIntent=intent}
  else if(next){generatedVariant++}
  currentIntent=intent;generatorButton.disabled=true;generatorStatus.textContent="Buscando una idea...";
  try{
    const result=await window.PhraseEngine.generate(intent,{variant:generatedVariant});
    if(!result?.phrase){generatorOutput.hidden=true;generatorStatus.textContent="Todavía no encontré suficiente material para esa idea. Probá con otra palabra.";return}
    generatedPhrase=result.phrase;generatedId=result.generationId||null;
    generatorResult.textContent=generatedPhrase;generatorOutput.hidden=false;generatorStatus.textContent="";
  }catch(error){
    generatorOutput.hidden=true;
    generatorStatus.textContent=error?.status===429?"Hiciste muchas solicitudes seguidas. Probá de nuevo en un momento.":"El generador no está disponible en este momento.";
  }finally{generatorButton.disabled=false}
}
generatorButton.onclick=()=>generatePublicPhrase(false);
$("#regenerateGenerated").onclick=()=>generatePublicPhrase(true);
generatorInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();generatePublicPhrase()}});
$("#copyGenerated").onclick=()=>{if(generatedPhrase){window.PhraseEngine.track("copy",{generationId:generatedId,intent:currentIntent});copyText(generatedPhrase)}};
$("#downloadGenerated").onclick=()=>{if(generatedPhrase){window.PhraseEngine.track("download",{generationId:generatedId,intent:currentIntent});downloadPostal(generatedPhrase,"azul")}};
$("#personalizeGenerated").onclick=()=>{if(generatedPhrase){window.PhraseEngine.track("personalize",{generationId:generatedId,intent:currentIntent});openPersonalize({phrase:generatedPhrase,style:"azul"})}};
$("#shareGenerated").onclick=()=>{if(generatedPhrase){window.PhraseEngine.track("share",{generationId:generatedId,intent:currentIntent});shareText(generatedPhrase)}};

async function loadPublished(){
  try{
    const remote=await window.PhraseEngine.loadPublished();
    if(!remote.length)return;
    const known=new Set(items.map(i=>i.phrase));
    const mapped=remote.filter(r=>!known.has(r.phrase)).map(r=>({
      id:"remote-"+r.id,phraseId:r.id,phrase:r.phrase,need:r.category||"expresar",
      recipients:r.recipients||[],tones:r.tones||[],tags:r.tags||[],style:r.style||"azul"
    }));
    items=[...mapped,...items];render();
  }catch{}
}

render();
loadPublished();