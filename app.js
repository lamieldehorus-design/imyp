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

const items=[
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
needs.forEach(n=>{const b=document.createElement("button");b.type="button";b.className="quick-card";b.innerHTML=`<span class="emoji">${n.emoji}</span><span><strong>${n.title}</strong><small>${n.desc}</small></span>`;b.onclick=()=>{state.need=state.need===n.key?"":n.key;state.q="";$("#searchInput").value="";render()};quick.appendChild(b)});

function normalize(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function filtered(){
 const q=normalize(state.q);
 return items.filter(i=>{
   const hay=[i.phrase,...i.tags,...i.recipients,i.need,...i.tones].map(normalize).join(" ");
   return (!state.need||i.need===state.need)&&(!q||hay.includes(q))&&(!state.recipient||i.recipients.includes(state.recipient))&&(!state.tone||i.tones.includes(state.tone))&&(!state.style||i.style===state.style)
 })
}
function card(i){
 const el=document.createElement("article");el.className="card";
 el.innerHTML=`<div class="postal ${i.style}"><p>${i.phrase}</p></div><div class="card-body"><p>${i.phrase}</p><div class="tags">${i.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div><div class="actions"><button data-action="copy">Copiar</button><button class="secondary" data-action="download">Descargar</button><button class="secondary" data-action="personalize">Personalizar</button><button data-action="share">Compartir</button></div></div>`;
 el.querySelector('[data-action="copy"]').onclick=()=>copyText(i.phrase);
 el.querySelector('[data-action="download"]').onclick=()=>downloadPostal(i.phrase,i.style);
 el.querySelector('[data-action="personalize"]').onclick=()=>openPersonalize(i);
 el.querySelector('[data-action="share"]').onclick=()=>shareText(i.phrase);
 return el
}
function render(){
 const list=filtered();gallery.innerHTML="";list.forEach(i=>gallery.appendChild(card(i)));
 empty.hidden=list.length>0;count.textContent=`${list.length} resultado${list.length===1?"":"s"}`;
 const n=needs.find(x=>x.key===state.need);title.textContent=n?`Postales para ${n.title.toLowerCase()}`:"Postales para hoy";
}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast("Frase copiada")}catch{prompt("Copiá la frase:",text)}}
async function shareText(text){if(navigator.share){try{await navigator.share({title:"Imágenes y Postales",text,url:location.href});return}catch{}}copyText(text)}
function wrap(ctx,text,maxWidth){const words=text.split(" ");const lines=[];let line="";words.forEach(w=>{const test=line?line+" "+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test});if(line)lines.push(line);return lines}
function downloadPostal(text,style="minimalista"){
 const c=document.createElement("canvas");c.width=1080;c.height=1080;const x=c.getContext("2d");
 const dark=style==="oscuro";x.fillStyle=dark?"#111827":style==="azul"?"#eaf2ff":"#ffffff";x.fillRect(0,0,c.width,c.height);
 x.fillStyle=dark?"#ffffff":style==="azul"?"#0b3d91":"#15171a";x.textAlign="center";x.textBaseline="middle";x.font="700 58px Arial";
 const lines=wrap(x,text,820),lh=78,start=540-(lines.length-1)*lh/2;lines.forEach((l,j)=>x.fillText(l,540,start+j*lh));
 x.font="700 30px Arial";x.fillStyle=dark?"#dbeafe":"#0b57d0";x.fillText("imagenesypostales.com",540,950);
 const a=document.createElement("a");a.download="postal-imagenesypostales.png";a.href=c.toDataURL("image/png");a.click()
}
function toast(msg){const t=document.createElement("div");t.textContent=msg;Object.assign(t.style,{position:"fixed",bottom:"20px",left:"50%",transform:"translateX(-50%)",background:"#15171a",color:"#fff",padding:"10px 16px",borderRadius:"12px",zIndex:99});document.body.appendChild(t);setTimeout(()=>t.remove(),1400)}

$("#searchForm").onsubmit=e=>{e.preventDefault();state.q=$("#searchInput").value.trim();state.need="";render()};
["recipient","tone","style"].forEach(k=>{$("#"+k+"Filter").onchange=e=>{state[k]=e.target.value;render()}});
$("#clearFilters").onclick=()=>{state.need=state.q=state.recipient=state.tone=state.style="";$("#searchInput").value="";["recipient","tone","style"].forEach(k=>$("#"+k+"Filter").value="");render()};

const dialog=$("#personalizeDialog");
function personalizedText(){
 const base=state.selected?.phrase||"";const name=$("#personName").value.trim();const extra=$("#extraMessage").value.trim();const sign=$("#signature").value.trim();
 return [name?`${name},`:"",base,extra,sign].filter(Boolean).join("\n\n")
}
function openPersonalize(i){state.selected=i;$("#dialogBasePhrase").textContent=i.phrase;$("#personName").value="";$("#signature").value="";$("#extraMessage").value="";dialog.showModal()}
$("#copyPersonalized").onclick=()=>copyText(personalizedText());
$("#downloadPersonalized").onclick=()=>downloadPostal(personalizedText(),state.selected?.style||"minimalista");
$("#consciousButton").onclick=()=>{const v=$("#consciousIntent").value.trim();$("#consciousResult").textContent=v?`Intención guardada: “${v}”. Falta conectar la base documental de los libros para generar una frase fiel a esas fuentes.`:"Escribí primero una intención."};
render();