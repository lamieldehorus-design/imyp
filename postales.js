const PAGE_SIZE=12;
const categories=[
  {key:"cumpleanos",label:"Cumpleaños",icon:"🎂"},
  {key:"amor",label:"Amor",icon:"❤"},
  {key:"amistad",label:"Amistad",icon:"✦"},
  {key:"familia",label:"Familia",icon:"⌂"},
  {key:"buenos-dias",label:"Buenos días",icon:"☀"},
  {key:"viajes",label:"Viajes",icon:"✈"},
  {key:"animo",label:"Ánimo",icon:"↗"},
  {key:"salud",label:"Salud",icon:"✿"}
];
let items=[],visibleCount=PAGE_SIZE,selected=null;
const $=s=>document.querySelector(s);
const categoryFromPage=document.body.dataset.postalCategory||"";
let activeCategory=categoryFromPage;

async function loadPostales(){
  try{
    const r=await fetch("/data/postales.json",{cache:"default"});
    if(!r.ok)throw new Error("No se pudo cargar postales.json");
    items=await r.json();
    renderCategoryButtons();
    renderPostales();
  }catch(e){
    console.error(e);
    const root=$("#postalGrid");if(root)root.innerHTML='<p class="empty">No pude cargar las postales en este momento.</p>';
  }
}
function renderCategoryButtons(){
  const root=$("#postalCategories");if(!root)return;
  root.innerHTML="";
  categories.forEach(c=>{
    const a=document.createElement("a");
    a.className="postal-filter"+(activeCategory===c.key?" active":"");
    a.href="/postales/"+c.key+"/";
    a.textContent=c.icon+" "+c.label;
    root.appendChild(a);
  });
}
function currentItems(){return items.filter(i=>!activeCategory||i.category===activeCategory)}
function renderPostales(){
  const root=$("#postalGrid");if(!root)return;
  const list=currentItems();
  root.innerHTML="";
  list.slice(0,visibleCount).forEach(i=>root.appendChild(postalCard(i)));
  const count=$("#postalCount");if(count)count.textContent=`${list.length} postal${list.length===1?"":"es"}`;
  const sentinel=$("#postalSentinel");if(sentinel)sentinel.hidden=visibleCount>=list.length;
}
function postalCard(item){
  const article=document.createElement("article");article.className="postal-card";
  article.innerHTML='<div class="visual-postal"><div class="visual-decoration"></div><p></p><small>imagenesypostales.com</small></div><div class="postal-card-body"><h2></h2><p class="card-description"></p><div class="tags"></div><div class="actions"><button data-copy>Copiar</button><button class="secondary" data-download>Descargar</button><button class="secondary" data-personalize>Personalizar</button><button data-share>Compartir</button></div></div>';
  const visual=article.querySelector(".visual-postal");visual.classList.add("tpl-"+item.template);
  visual.querySelector("p").textContent=item.phrase;
  article.querySelector("h2").textContent=item.title;
  article.querySelector(".card-description").textContent=item.description||"";
  const tags=article.querySelector(".tags");
  (item.tags||[]).forEach(t=>{const s=document.createElement("span");s.className="tag";s.textContent=t;tags.appendChild(s)});
  article.querySelector("[data-copy]").onclick=()=>copyText(item.phrase);
  article.querySelector("[data-download]").onclick=()=>downloadVisualPostal(item);
  article.querySelector("[data-personalize]").onclick=()=>openPersonalize(item);
  article.querySelector("[data-share]").onclick=()=>shareText(item.phrase);
  return article;
}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast("Texto copiado")}catch{prompt("Copiá el texto:",text)}}
async function shareText(text){if(navigator.share){try{await navigator.share({title:"Imágenes y Postales",text,url:location.href});return}catch{}}copyText(text)}
function wrap(ctx,text,maxWidth){
  const words=String(text).split(/\s+/).filter(Boolean),lines=[];let line="";
  words.forEach(w=>{const test=line?line+" "+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test});
  if(line)lines.push(line);return lines;
}
function roundedRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);ctx.lineTo(x+rr,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();ctx.fill();
}
function heart(ctx,x,y,size,fill){
  ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ctx.beginPath();
  ctx.moveTo(0,28);ctx.bezierCurveTo(-50,-10,-46,-48,-18,-48);ctx.bezierCurveTo(0,-48,0,-30,0,-30);
  ctx.bezierCurveTo(0,-30,0,-48,18,-48);ctx.bezierCurveTo(46,-48,50,-10,0,28);ctx.fillStyle=fill;ctx.fill();ctx.restore();
}
function drawTemplate(ctx,t){
  const W=1080,H=1080;
  ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
  if(t==="cumple-confeti"){
    ctx.fillStyle="#fff8ed";ctx.fillRect(0,0,W,H);
    ["#0b57d0","#ef476f","#f9c74f","#43aa8b"].forEach((c,k)=>{ctx.fillStyle=c;for(let i=0;i<14;i++){const x=(79*i+137*k)%W,y=(113*i+181*k)%H;ctx.save();ctx.translate(x,y);ctx.rotate((i+k)*.4);ctx.fillRect(-7,-20,14,40);ctx.restore()}});
  }else if(t==="cumple-velas"){
    ctx.fillStyle="#fff7e8";ctx.fillRect(0,0,W,H);
    for(let i=0;i<7;i++){const x=240+i*100;ctx.fillStyle=i%2?"#0b57d0":"#f59e0b";ctx.fillRect(x,150,36,150);ctx.beginPath();ctx.fillStyle="#ef4444";ctx.ellipse(x+18,130,12,25,0,0,Math.PI*2);ctx.fill()}
  }else if(t==="amor-corazones"){
    ctx.fillStyle="#fff3f6";ctx.fillRect(0,0,W,H);heart(ctx,180,180,120,"#ef476f");heart(ctx,900,880,170,"#f7a8bd");heart(ctx,850,160,70,"#ef476f");
  }else if(t==="amor-luna"){
    ctx.fillStyle="#141b35";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff2b2";ctx.beginPath();ctx.arc(820,210,120,0,Math.PI*2);ctx.fill();ctx.fillStyle="#141b35";ctx.beginPath();ctx.arc(870,175,120,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffffff";for(let i=0;i<32;i++){ctx.globalAlpha=.35+((i*17)%60)/100;ctx.fillRect((i*173)%1080,(i*97)%600,4,4)}ctx.globalAlpha=1;
  }else if(t==="amistad-cintas"){
    ctx.fillStyle="#eef8ff";ctx.fillRect(0,0,W,H);ctx.strokeStyle="#0b57d0";ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(-50,180);ctx.bezierCurveTo(250,30,400,330,670,160);ctx.bezierCurveTo(850,50,940,100,1130,20);ctx.stroke();
  }else if(t==="amistad-estrellas"){
    ctx.fillStyle="#f8f5ff";ctx.fillRect(0,0,W,H);ctx.fillStyle="#7c3aed";ctx.font="70px Arial";[[160,180],[870,170],[910,820],[140,850]].forEach(([x,y])=>ctx.fillText("✦",x,y));
  }else if(t==="familia-hogar"){
    ctx.fillStyle="#fff8ef";ctx.fillRect(0,0,W,H);ctx.fillStyle="#c87941";ctx.beginPath();ctx.moveTo(150,300);ctx.lineTo(300,170);ctx.lineTo(450,300);ctx.closePath();ctx.fill();ctx.fillRect(195,300,210,150);
  }else if(t==="familia-marco"){
    ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,W,H);ctx.strokeStyle="#b7791f";ctx.lineWidth=14;ctx.strokeRect(70,70,940,940);ctx.lineWidth=3;ctx.strokeRect(95,95,890,890);
  }else if(t==="buenos-dias-sol"){
    ctx.fillStyle="#eef7ff";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(800,230,120,0,Math.PI*2);ctx.fill();ctx.fillStyle="#dff2ff";ctx.fillRect(0,650,W,430);
  }else if(t==="buenos-dias-cafe"){
    ctx.fillStyle="#fff8ee";ctx.fillRect(0,0,W,H);ctx.fillStyle="#8b5e3c";roundedRect(ctx,735,160,180,130,24);ctx.strokeStyle="#8b5e3c";ctx.lineWidth=20;ctx.beginPath();ctx.arc(910,225,58,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.strokeStyle="#c9a27e";ctx.lineWidth=8;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(780+i*45,130);ctx.bezierCurveTo(750+i*45,90,820+i*45,70,790+i*45,30);ctx.stroke()}
  }else if(t==="viaje-ruta"){
    ctx.fillStyle="#eff8f1";ctx.fillRect(0,0,W,H);ctx.strokeStyle="#334155";ctx.lineWidth=10;ctx.setLineDash([30,22]);ctx.beginPath();ctx.moveTo(180,950);ctx.bezierCurveTo(250,700,820,700,900,150);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#0b57d0";ctx.font="90px Arial";ctx.fillText("✈",780,180);
  }else if(t==="viaje-maleta"){
    ctx.fillStyle="#eef5ff";ctx.fillRect(0,0,W,H);ctx.fillStyle="#0b57d0";roundedRect(ctx,750,150,190,230,28);ctx.strokeStyle="#0b57d0";ctx.lineWidth=16;ctx.strokeRect(805,100,80,60);
  }else if(t==="animo-luz"){
    ctx.fillStyle="#f8fbff";ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(540,320,20,540,320,300);g.addColorStop(0,"#fff0a8");g.addColorStop(1,"rgba(255,240,168,0)");ctx.fillStyle=g;ctx.fillRect(180,0,720,650);
  }else if(t==="animo-camino"){
    ctx.fillStyle="#eef6f3";ctx.fillRect(0,0,W,H);ctx.fillStyle="#d6e8df";ctx.beginPath();ctx.moveTo(0,900);ctx.quadraticCurveTo(420,600,1080,760);ctx.lineTo(1080,1080);ctx.lineTo(0,1080);ctx.fill();ctx.strokeStyle="#7aa88e";ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(520,1080);ctx.quadraticCurveTo(600,780,760,650);ctx.stroke();
  }else if(t==="salud-flores"){
    ctx.fillStyle="#f8fff9";ctx.fillRect(0,0,W,H);[[170,180],[870,180],[150,850],[900,830]].forEach(([x,y],k)=>{for(let a=0;a<6;a++){ctx.save();ctx.translate(x,y);ctx.rotate(a*Math.PI/3);ctx.fillStyle=k%2?"#9bd3ae":"#f4b4c3";ctx.beginPath();ctx.ellipse(0,-35,18,40,0,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.fillStyle="#e3b341";ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill()});
  }else if(t==="salud-hojas"){
    ctx.fillStyle="#f3faf6";ctx.fillRect(0,0,W,H);ctx.strokeStyle="#6ea889";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(100,920);ctx.bezierCurveTo(240,760,260,420,410,180);ctx.stroke();ctx.fillStyle="#8ac29d";for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(160+i*45,820-i*110,35,70,-.5,0,Math.PI*2);ctx.fill()}
  }
}
function drawText(ctx,text,template){
  const dark=template==="amor-luna";
  ctx.fillStyle=dark?"#ffffff":"#172033";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="700 58px Arial";let lines=wrap(ctx,text,760);
  if(lines.length>7){ctx.font="700 48px Arial";lines=wrap(ctx,text,800)}
  const lh=lines.length>7?62:76,start=570-(lines.length-1)*lh/2;
  lines.forEach((line,i)=>ctx.fillText(line,540,start+i*lh));
  ctx.font="700 28px Arial";ctx.fillStyle=dark?"#dbeafe":"#0b57d0";ctx.fillText("imagenesypostales.com",540,995);
}
function downloadVisualPostal(item,textOverride){
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext("2d");
  drawTemplate(ctx,item.template);drawText(ctx,textOverride||item.phrase,item.template);
  const a=document.createElement("a");a.download=(item.id||"postal")+".png";a.href=canvas.toDataURL("image/png");a.click();
}
function ensureDialog(){
  if($("#postalPersonalizeDialog"))return;
  const d=document.createElement("dialog");d.id="postalPersonalizeDialog";
  d.innerHTML='<form method="dialog" class="dialog-card"><button class="dialog-close" value="cancel">×</button><h2>Personalizá la postal</h2><p id="postalBasePhrase" class="preview-phrase"></p><label>Nombre<input id="postalName" maxlength="40" placeholder="Ej.: Sofía"></label><label>Firma<input id="postalSignature" maxlength="50" placeholder="Ej.: Con cariño, Mauro"></label><label>Mensaje extra<textarea id="postalExtra" rows="3" maxlength="160" placeholder="Algo breve y personal"></textarea></label><div class="dialog-actions"><button type="button" class="ghost" id="postalCopyPersonalized">Copiar</button><button type="button" id="postalDownloadPersonalized">Descargar postal</button></div></form>';
  document.body.appendChild(d);
  $("#postalCopyPersonalized").onclick=()=>copyText(personalizedText());
  $("#postalDownloadPersonalized").onclick=()=>downloadVisualPostal(selected,personalizedText());
}
function personalizedText(){
  const name=$("#postalName").value.trim(),extra=$("#postalExtra").value.trim(),sign=$("#postalSignature").value.trim();
  return [name?`${name},`:"",selected?.phrase||"",extra,sign].filter(Boolean).join(" ");
}
function openPersonalize(item){
  ensureDialog();selected=item;$("#postalBasePhrase").textContent=item.phrase;
  $("#postalName").value="";$("#postalSignature").value="";$("#postalExtra").value="";
  $("#postalPersonalizeDialog").showModal();
}
function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1400)}

const sentinel=$("#postalSentinel");
if("IntersectionObserver" in window&&sentinel){
  new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){const total=currentItems().length;if(visibleCount<total){visibleCount=Math.min(visibleCount+PAGE_SIZE,total);renderPostales()}}
  },{rootMargin:"500px 0px"}).observe(sentinel);
}
loadPostales();
