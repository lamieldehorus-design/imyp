(function(){
  let cache=null;

  function normalize(value){
    return (value||"")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9ñ\s-]/g," ")
      .replace(/\s+/g," ")
      .trim();
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
      ()=>topic ? topic.charAt(0).toUpperCase()+topic.slice(1)+": "+idea.charAt(0).toLowerCase()+idea.slice(1) : idea,
      ()=>idea.replace(/[.!?]+$/,"")+"."
    ];
    return templates[variant%templates.length]();
  }

  async function generate(intent,options={}){
    const db=await loadKnowledge();
    const tokens=normalize(intent).split(" ").filter(t=>t.length>2);
    if(!tokens.length||!Array.isArray(db.entries)||!db.entries.length)return null;

    const ranked=db.entries
      .map(entry=>({entry,score:scoreEntry(entry,tokens)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score);

    if(!ranked.length)return null;
    const topScore=ranked[0].score;
    const pool=ranked.filter(x=>x.score>=Math.max(1,topScore-2)).slice(0,5);
    const pick=pool[Math.floor(Math.random()*pool.length)];
    const variant=Math.floor(Math.random()*7);

    return {
      phrase:buildPhrase(pick.entry,intent,variant),
      entryId:pick.entry.id||null,
      score:pick.score
    };
  }

  window.PhraseEngine={generate,loadKnowledge};
})();