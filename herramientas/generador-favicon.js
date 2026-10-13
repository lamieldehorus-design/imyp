(() => {
"use strict";
const $=id=>document.getElementById(id);
const e={text:$("faviconText"),emoji:$("faviconEmoji"),image:$("faviconImage"),bg:$("bgColor"),fg:$("fgColor"),shape:$("shape"),padding:$("padding"),name:$("faviconName"),preview:$("faviconPreview"),tab:$("tabTitle"),status:$("faviconStatus"),code:$("faviconHtmlCode")};
if(Object.values(e).some(v=>!v)) return;
let uploadedImage=null,uploadedUrl="";
const cleanName=()=>((e.name.value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60))||"favicon");
const displayName=()=>e.name.value.trim()||"Mi sitio";
function status(t,error=false){e.status.textContent=t;e.status.classList.toggle("error",error);}
function rounded(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function draw(canvas,size){
 const ctx=canvas.getContext("2d",{alpha:true});if(!ctx)throw Error("Tu navegador no permite dibujar en canvas.");
 canvas.width=size;canvas.height=size;ctx.clearRect(0,0,size,size);
 const margin=Math.round(size*Number(e.padding.value)/100),x=margin,y=margin,w=size-2*margin,h=size-2*margin;
 if(e.shape.value!=="transparent"){ctx.fillStyle=e.bg.value;if(e.shape.value==="circle"){ctx.beginPath();ctx.arc(size/2,size/2,Math.min(w,h)/2,0,Math.PI*2);ctx.fill();}else if(e.shape.value==="rounded"){rounded(ctx,x,y,w,h,size*.2);ctx.fill();}else ctx.fillRect(x,y,w,h);}
 if(uploadedImage){const iw=uploadedImage.naturalWidth||uploadedImage.width,ih=uploadedImage.naturalHeight||uploadedImage.height;if(iw>0&&ih>0){const scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(uploadedImage,(size-dw)/2,(size-dh)/2,dw,dh);}}
 else{const value=e.emoji.value||e.text.value.trim().slice(0,3)||"★";ctx.fillStyle=e.fg.value;ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="700 "+Math.round(size*(value.length>2?.42:.58))+"px system-ui, 'Segoe UI Emoji', sans-serif";ctx.fillText(value,size/2,size*.53,size*.86);}
 return canvas;
}
function updateCode(){const n=cleanName();e.code.textContent=[
'<link rel="icon" href="/'+n+'.ico" sizes="any">',
'<link rel="icon" type="image/png" sizes="32x32" href="/'+n+'-32.png">',
'<link rel="icon" type="image/png" sizes="16x16" href="/'+n+'-16.png">',
'<link rel="apple-touch-icon" sizes="180x180" href="/'+n+'-180.png">',
'<link rel="manifest" href="/site.webmanifest">'
].join("\n");}
function render(){try{draw(e.preview,64);document.querySelectorAll("[data-size]").forEach(c=>draw(c,Number(c.dataset.size)));e.tab.textContent=displayName();updateCode();status(uploadedImage?"Imagen cargada. Se procesa solo en este navegador.":"Vista previa actualizada.");}catch(err){status(err.message||"No se pudo generar la vista previa.",true);}}
function blobCanvas(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("El navegador no pudo exportar el PNG.")),"image/png"));}
async function pngBytes(size){const c=document.createElement("canvas");draw(c,size);return new Uint8Array(await (await blobCanvas(c)).arrayBuffer());}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++){crc^=bytes[i];for(let k=0;k<8;k++)crc=(crc&1)?(crc>>>1)^0xedb88320:crc>>>1;}return (crc^0xffffffff)>>>0;}
function makeZip(files){
 const encoder=new TextEncoder(),local=[],central=[];let offset=0;
 const date=new Date(),dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|Math.floor(date.getSeconds()/2),dosDate=((Math.max(1980,date.getFullYear())-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
 for(const file of files){
  const name=encoder.encode(file.name),bytes=file.bytes instanceof Uint8Array?file.bytes:new Uint8Array(file.bytes),crc=crc32(bytes);
  const lh=new Uint8Array(30+name.length),lv=new DataView(lh.buffer);
  lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);lv.setUint16(10,dosTime,true);lv.setUint16(12,dosDate,true);lv.setUint32(14,crc,true);lv.setUint32(18,bytes.length,true);lv.setUint32(22,bytes.length,true);lv.setUint16(26,name.length,true);lv.setUint16(28,0,true);lh.set(name,30);
  local.push(lh,bytes);
  const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);cv.setUint16(12,dosTime,true);cv.setUint16(14,dosDate,true);cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true);cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=lh.length+bytes.length;
 }
 const centralOffset=offset,centralSize=central.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
 ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,centralOffset,true);ev.setUint16(20,0,true);
 return new Blob([...local,...central,end],{type:"application/zip"});
}
function makeIco(items){const count=items.length,base=6+16*count,total=base+items.reduce((n,p)=>n+p.bytes.length,0),out=new Uint8Array(total),view=new DataView(out.buffer);view.setUint16(0,0,true);view.setUint16(2,1,true);view.setUint16(4,count,true);let offset=base;items.forEach((p,i)=>{const pos=6+i*16;out[pos]=p.size===256?0:p.size;out[pos+1]=p.size===256?0:p.size;out[pos+2]=0;out[pos+3]=0;view.setUint16(pos+4,1,true);view.setUint16(pos+6,32,true);view.setUint32(pos+8,p.bytes.length,true);view.setUint32(pos+12,offset,true);out.set(p.bytes,offset);offset+=p.bytes.length;});return new Blob([out],{type:"image/x-icon"});}
async function pngList(sizes){const list=[];for(const size of sizes)list.push({size,bytes:await pngBytes(size)});return list;}
$("refreshFavicon").addEventListener("click",render);
[e.text,e.emoji,e.bg,e.fg,e.shape,e.padding,e.name].forEach(el=>{el.addEventListener("input",render);el.addEventListener("change",render);});
e.image.addEventListener("change",async()=>{const f=e.image.files&&e.image.files[0];if(!f){uploadedImage=null;render();return;}if(!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(f.type)){e.image.value="";uploadedImage=null;status("Formato no compatible. Elegí PNG, JPG, WebP, GIF o SVG.",true);return;}if(f.size>8*1024*1024){e.image.value="";uploadedImage=null;status("La imagen supera los 8 MB. Elegí un archivo más pequeño.",true);return;}const url=URL.createObjectURL(f),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error("No se pudo abrir la imagen. Probá con PNG o JPG."));img.src=url;});if(uploadedUrl)URL.revokeObjectURL(uploadedUrl);uploadedUrl=url;uploadedImage=img;e.emoji.value="";render();}catch(err){URL.revokeObjectURL(url);uploadedImage=null;status(err.message,true);}});
$("downloadPackage").addEventListener("click",async()=>{
 try{
  status("Preparando ICO, seis PNG, manifest y código HTML…");
  const n=cleanName(),pngSizes=[16,32,48,180,192,512],pngs=await pngList(pngSizes);
  const files=[{name:n+".ico",bytes:new Uint8Array(await makeIco(pngs.filter(p=>p.size<=48)).arrayBuffer())}];
  for(const p of pngs)files.push({name:n+"-"+p.size+".png",bytes:p.bytes});
  const manifest={name:displayName(),short_name:displayName().slice(0,24),icons:[{src:"/"+n+"-192.png",sizes:"192x192",type:"image/png"},{src:"/"+n+"-512.png",sizes:"512x512",type:"image/png"}],theme_color:e.bg.value,background_color:e.bg.value,display:"standalone"};
  files.push({name:"site.webmanifest",bytes:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
  files.push({name:"instalar-favicon.html.txt",bytes:new TextEncoder().encode("Pegá estas líneas dentro de <head>:\\n\\n"+e.code.textContent+"\\n\\nSubí los archivos generados a la raíz de tu sitio web.")});
  download(makeZip(files),n+"-favicon-completo.zip");
  status("Paquete ZIP generado con favicon.ico, seis PNG, site.webmanifest y las instrucciones HTML.");
 }catch(err){status(err.message||"No se pudo crear el paquete ZIP.",true);}
});
$("downloadIco").addEventListener("click",async()=>{try{status("Generando favicon.ico en tamaños 16, 32 y 48 píxeles…");download(makeIco(await pngList([16,32,48])),cleanName()+".ico");status("favicon.ico descargado correctamente.");}catch(err){status(err.message||"No se pudo crear el ICO.",true);}});
$("downloadPngs").addEventListener("click",async()=>{try{const sizes=[16,32,48,180,192,512];status("Generando archivos PNG…");for(const size of sizes)download(new Blob([await pngBytes(size)],{type:"image/png"}),cleanName()+"-"+size+".png");status("PNG generados. Si el navegador bloquea descargas múltiples, autorizalas para esta página y volvé a intentar.");}catch(err){status(err.message||"No se pudieron generar los PNG.",true);}});
$("downloadManifest").addEventListener("click",()=>{const n=cleanName(),manifest={name:displayName(),short_name:displayName().slice(0,24),icons:[{src:"/"+n+"-192.png",sizes:"192x192",type:"image/png"},{src:"/"+n+"-512.png",sizes:"512x512",type:"image/png"}],theme_color:e.bg.value,background_color:e.bg.value,display:"standalone"};download(new Blob([JSON.stringify(manifest,null,2)],{type:"application/manifest+json"}),"site.webmanifest");status("site.webmanifest descargado. Subí también los PNG de 192 y 512 píxeles.");});
$("copyFaviconCode").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(e.code.textContent);status("Código HTML copiado.");}catch(err){const range=document.createRange();range.selectNodeContents(e.code);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);status("No se pudo copiar automáticamente. Seleccioná el código y copialo manualmente.",true);}});
window.addEventListener("beforeunload",()=>{if(uploadedUrl)URL.revokeObjectURL(uploadedUrl);});render();
})();