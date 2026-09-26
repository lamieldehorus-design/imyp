(function(){
  let cache=null;

  function config(){return window.IMYP_CONFIG||{}}
  function configured(){
    const c=config();
    return /^https:\/\//.test(c.supabaseUrl||"") && String(c.supabasePublishableKey||"").length>10;
  }
  function base(){return String(config().supabaseUrl||"").replace(/\/$/,"")}
  function key(){return String(config().supabasePublishableKey||"")}

  function sessionId(){
    const storageKey="imyp_session_v1";
    let id=localStorage.getItem(storageKey);
    if(!id){
      id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
      localStorage.setItem(storageKey,id);
    }
    return id;
  }

  async function callFunction(name,body,authToken=""){
    const headers={"Content-Type":"application/json","apikey":key()};
    if(authToken) headers.Authorization="Bearer "+authToken;
    const r=await fetch(base()+"/functions/v1/"+name,{
      method:"POST",headers,body:JSON.stringify(body)
    });
    let data={};
    try{data=await r.json()}catch{}
    if(!r.ok){
      const err=new Error(data.error||("HTTP "+r.status));
      err.code=data.error||"request_failed";
      err.status=r.status;
      throw err;
    }
    return data;
  }

  function normalize(value){
    return (value||"").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9ñ\s-]/g," ")
      .replace(/\s+/g," ").trim();
  }

  async function loadKnowledge(){
    if(cache)return cache;
    const response=await fetch("/data/knowledge.json",{cache:"no-store"});
    if(!response.ok)throw new Error("knowledge unavailable");
    cache=await response.json();
    return cache;
  }

  function scoreEntry(entry,tokens){
    const keywords=(entry.keywords||[]).map(normalize);
    const themes=(entry.themes||[]).map(normalize);
    const text=normalize([entry.idea,entry.context,...keywords,...themes].filter(Boolean).join(" "));
    let score=0;
    for(const token of tokens){
      if(keywords.includes(token))score+=6;
      if(themes.includes(token))score+=4;
      if(text.includes(token))score+=2;
    }
    return score;
  }

  function buildPhrase(entry,intent,variant=0){
    const seeds=(entry.outputs||[]).filter(Boolean);
    if(seeds.length)return seeds[variant%seeds.length];
    const idea=(entry.idea||"").trim();
    if(!idea)return "";
    const topic=intent.trim().replace(/[.!?]+$/,"");
    const templates=[
      ()=>idea,
      ()=>topic?topic.charAt(0).toUpperCase()+topic.slice(1)+": "+idea.charAt(0).toLowerCase()+idea.slice(1):idea,
      ()=>idea.replace(/[.!?]+$/,"")+"."
    ];
    return templates[variant%templates.length]();
  }

  async function localGenerate(intent){
    const db=await loadKnowledge();
    const tokens=normalize(intent).split(" ").filter(t=>t.length>2);
    if(!tokens.length||!Array.isArray(db.entries)||!db.entries.length)return null;
    const ranked=db.entries.map(entry=>({entry,score:scoreEntry(entry,tokens)}))
      .filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    if(!ranked.length)return null;
    const top=ranked[0].score;
    const pool=ranked.filter(x=>x.score>=Math.max(1,top-2)).slice(0,5);
    const pick=pool[Math.floor(Math.random()*pool.length)];
    return {phrase:buildPhrase(pick.entry,intent,Math.floor(Math.random()*7)),generationId:null,phrases:[]};
  }

  async function generate(intent,options={}){
    if(!configured())return localGenerate(intent);
    try{
      return await callFunction("generate-phrase",{
        intent,
        tone:options.tone||"",
        source:options.source||"public",
        count:options.count||1,
        sessionId:sessionId()
      },options.authToken||"");
    }catch(error){
      if(error.code==="no_knowledge")return null;
      throw error;
    }
  }

  async function track(eventType,details={}){
    if(!configured())return;
    try{
      await callFunction("track-event",{
        eventType,
        generationId:details.generationId||null,
        phraseId:details.phraseId||null,
        intent:details.intent||null,
        sessionId:sessionId(),
        metadata:details.metadata||{}
      });
    }catch{}
  }

  async function loadPublished(){
    if(!configured())return [];
    const params=new URLSearchParams({
      select:"id,phrase,category,recipients,tones,tags,style,published_at",
      status:"eq.published",
      order:"published_at.desc",
      limit:"200"
    });
    const r=await fetch(base()+"/rest/v1/published_phrases?"+params.toString(),{
      headers:{"apikey":key()}
    });
    if(!r.ok)return [];
    return r.json();
  }

  window.PhraseEngine={generate,track,loadPublished,loadKnowledge,configured,sessionId};
})();