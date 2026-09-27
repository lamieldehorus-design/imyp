(function(){
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
      id=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
      localStorage.setItem(storageKey,id);
    }
    return id;
  }
  async function rpc(name,body){
    const r=await fetch(base()+"/rest/v1/rpc/"+name,{
      method:"POST",
      headers:{"apikey":key(),"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    const data=await r.json().catch(()=>null);
    if(!r.ok){
      const error=new Error(data?.message||data?.hint||data?.details||("HTTP "+r.status));
      error.status=r.status;
      throw error;
    }
    return data;
  }
  async function generate(intent,options={}){
    if(!configured())return null;
    const data=await rpc("generate_phrase_text",{
      p_intent:intent,
      p_tone:options.tone||"",
      p_variant:Number(options.variant||0),
      p_session_id:sessionId(),
      p_mode:options.mode||"public"
    });
    const row=Array.isArray(data)?data[0]:data;
    if(!row?.found||!row?.phrase)return null;
    return {
      phrase:row.phrase,
      generationId:row.generation_id||null,
      corpusBooks:Number(row.corpus_books||0),
      matchedBooks:Number(row.matched_books||0),
      matchedNodes:Number(row.matched_nodes||0)
    };
  }
  async function track(eventType,details={}){
    if(!configured())return false;
    try{
      await rpc("track_phrase_event",{
        p_event_type:eventType,
        p_generation_id:details.generationId||null,
        p_phrase_id:details.phraseId||null,
        p_intent:details.intent||null,
        p_session_id:sessionId(),
        p_metadata:details.metadata||{}
      });
      return true;
    }catch{return false}
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
  window.PhraseEngine={generate,track,loadPublished,configured,sessionId};
})();