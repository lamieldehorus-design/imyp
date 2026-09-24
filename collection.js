const copyButtons=document.querySelectorAll("[data-copy]");
copyButtons.forEach(b=>b.addEventListener("click",async()=>{
  const text=b.dataset.copy;
  try{await navigator.clipboard.writeText(text);flash(b,"Copiado ✓")}catch{prompt("Copiá la frase:",text)}
}));
document.querySelectorAll("[data-download]").forEach(b=>b.addEventListener("click",()=>downloadPostal(b.dataset.download,b.dataset.style)));
function flash(btn,msg){const old=btn.textContent;btn.textContent=msg;setTimeout(()=>btn.textContent=old,1200)}
function wrap(ctx,text,maxWidth){const words=text.split(" "),lines=[];let line="";for(const w of words){const test=line?line+" "+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test}if(line)lines.push(line);return lines}
function downloadPostal(text,style="minimalista"){
 const c=document.createElement("canvas");c.width=1080;c.height=1080;const x=c.getContext("2d");
 const dark=style==="oscuro";x.fillStyle=dark?"#111827":style==="azul"?"#eaf2ff":"#ffffff";x.fillRect(0,0,1080,1080);
 x.fillStyle=dark?"#fff":style==="azul"?"#0b3d91":"#15171a";x.textAlign="center";x.textBaseline="middle";x.font="700 58px Arial";
 const lines=wrap(x,text,820),lh=78,start=540-(lines.length-1)*lh/2;lines.forEach((line,i)=>x.fillText(line,540,start+i*lh));
 x.font="700 30px Arial";x.fillStyle=dark?"#dbeafe":"#0b57d0";x.fillText("imagenesypostales.com",540,950);
 const a=document.createElement("a");a.download="postal-imagenesypostales.png";a.href=c.toDataURL("image/png");a.click();
}