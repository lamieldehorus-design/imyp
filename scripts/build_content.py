#!/usr/bin/env python3
from pathlib import Path
import json, re, html, unicodedata
from datetime import date

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
SITE="https://imagenesypostales.com"

def norm(s):
    s=unicodedata.normalize("NFD",s.lower())
    return "".join(c for c in s if unicodedata.category(c)!="Mn")

def slugify(s):
    s=norm(s)
    s=re.sub(r"[^a-z0-9]+","-",s).strip("-")
    return s or "sin-titulo"

def csv(v):
    return [x.strip() for x in (v or "").split(",") if x.strip()]

def parse_blocks(text, marker, multiline=None):
    parts=text.split(marker)[1:]
    out=[]
    for part in parts:
        obj={}
        active=None
        buf=[]
        for raw in part.strip().splitlines():
            line=raw.rstrip()
            if not line or line.lstrip().startswith("#"):
                if active and multiline and active in multiline and buf:
                    buf.append("")
                continue
            m=re.match(r"^([A-ZÁÉÍÓÚÑ_]+):\s*(.*)$",line)
            if m:
                if active and active in obj and isinstance(obj[active],list):
                    obj[active]="\n".join(obj[active]).strip()
                key,val=m.group(1),m.group(2)
                if multiline and key in multiline:
                    obj[key]=[val] if val else []
                    active=key
                else:
                    obj[key]=val.strip()
                    active=None
            elif active and multiline and active in multiline:
                obj[active].append(line)
        if active and active in obj and isinstance(obj[active],list):
            obj[active]="\n".join(obj[active]).strip()
        if obj:
            out.append(obj)
    return out

CATEGORY_RULES=[
    ("cumpleanos",["cumple","cumpleanos","cumpleaños","aniversario"]),
    ("viajes",["viaje","viajar","vacaciones","aventura"]),
    ("agradecer",["gracias","gratitud","agrade"]),
    ("saludar",["buenos dias","buen dia","buenas noches","saludo","mañana","manana"]),
    ("acompanar",["animo","ánimo","acompan","acompañ","momento dificil","momento difícil"]),
    ("familia",["familia","mama","mamá","papa","papá","hermana","hermano"]),
    ("humor",["humor","gracioso","risa","chiste"]),
    ("carino",["amor","carino","cariño","te quiero","te extrano","te extraño","pareja"]),
]
TAG_WORDS=[
    "cumpleaños","hermana","hermano","mamá","papá","familia","amor","amistad","cariño",
    "ánimo","gratitud","gracias","viaje","humor","reflexión","amor propio","buenos días",
    "buenas noches","pareja","distancia","recuerdos","aventura","acompañamiento"
]

def infer_phrase(obj,index):
    title=obj.get("TITULO","").strip()
    phrase=obj.get("FRASE","").strip()
    desc=obj.get("DESCRIPCION","").strip()
    source=f"{title} {phrase} {desc}"
    n=norm(source)
    need=obj.get("CATEGORIA","").strip().lower()
    if not need:
        need="expresar"
        for key,terms in CATEGORY_RULES:
            if any(norm(t) in n for t in terms):
                need=key; break
    tags=csv(obj.get("ETIQUETAS"))
    if not tags:
        tags=[w for w in TAG_WORDS if norm(w) in n][:6]
        if not tags: tags=[need]
    recipients=csv(obj.get("DESTINATARIOS"))
    if not recipients:
        for key,terms in [
            ("mama",["mama","mamá"]),("hermana",["hermana","hermano"]),
            ("familia",["familia"]),("pareja",["pareja","amor","novio","novia"]),
            ("amiga",["amiga","amigo"])]:
            if any(norm(t) in n for t in terms):
                recipients=[key]; break
    tones=csv(obj.get("TONO"))
    if not tones:
        tones=["gracioso"] if need=="humor" else ["sencillo"]
    style=(obj.get("ESTILO") or ["azul","minimalista","oscuro"][index%3]).strip().lower()
    if style not in {"azul","minimalista","oscuro"}: style="azul"
    return {
        "id": slugify(obj.get("ID") or title or phrase[:60]),
        "title": title or phrase[:60],
        "phrase": phrase,
        "description": desc,
        "need": need,
        "tags": tags,
        "recipients": recipients,
        "tones": tones,
        "style": style,
    }

def render_article_body(text):
    pieces=[]
    para=[]
    def flush():
        nonlocal para
        if para:
            pieces.append("<p>"+html.escape(" ".join(x.strip() for x in para if x.strip()))+"</p>")
            para=[]
    for line in (text or "").splitlines():
        if line.startswith("## "):
            flush(); pieces.append("<h2>"+html.escape(line[3:].strip())+"</h2>")
        elif not line.strip():
            flush()
        else:
            para.append(line)
    flush()
    return "\n".join(pieces)

BLOG_HEADER='''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'''

def blog_index(posts):
    cards="".join(
        f'''<article class="blog-card"><p class="eyebrow">{html.escape(p["category"].upper())}</p><h2><a href="/blog/{p["slug"]}/">{html.escape(p["title"])}</a></h2><p>{html.escape(p["description"])}</p><div class="tags">{"".join(f'<span class="tag">{html.escape(t)}</span>' for t in p["tags"])}</div></article>'''
        for p in posts
    ) or '<div class="collection-note"><h2>El blog está preparado</h2><p>Cuando publiques un artículo en <code>data/blog.txt</code>, aparecerá acá automáticamente.</p></div>'
    return BLOG_HEADER+'''<title>Blog de frases, vínculos y momentos | Imágenes y Postales</title><meta name="description" content="Artículos largos sobre frases, vínculos, emociones, saludos y momentos para encontrar mejores palabras."><link rel="canonical" href="https://imagenesypostales.com/blog/"><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/"><span class="brand-mark">IP</span><span>Imágenes y Postales</span></a><nav class="top-nav"><a href="/">Inicio</a><a href="/#categorias">Categorías</a><a href="/blog/">Blog</a></nav></header><main class="collection-page"><nav class="breadcrumbs"><a href="/">Inicio</a><span>›</span><span>Blog</span></nav><section class="collection-hero"><p class="eyebrow">BLOG</p><h1>Ideas, palabras y situaciones que merecen un poco más de espacio</h1><p class="hero-copy">Artículos largos para profundizar en vínculos, emociones, saludos y maneras de decir lo que importa.</p></section><section class="blog-grid">'''+cards+'''</section></main><footer><strong>imagenesypostales.com</strong><span>Encontrar, personalizar y compartir sin vueltas.</span></footer></body></html>'''

def article_html(p):
    schema=json.dumps({"@context":"https://schema.org","@type":"Article","headline":p["title"],"description":p["description"],"datePublished":p["date"],"mainEntityOfPage":f'{SITE}/blog/{p["slug"]}/',"publisher":{"@type":"Organization","name":"Imágenes y Postales"}},ensure_ascii=False)
    tags="".join(f'<span class="tag">{html.escape(t)}</span>' for t in p["tags"])
    return BLOG_HEADER+f'''<title>{html.escape(p["title"])} | Imágenes y Postales</title><meta name="description" content="{html.escape(p["description"],quote=True)}"><link rel="canonical" href="{SITE}/blog/{p["slug"]}/"><meta property="og:type" content="article"><meta property="og:title" content="{html.escape(p["title"],quote=True)}"><meta property="og:description" content="{html.escape(p["description"],quote=True)}"><meta property="og:url" content="{SITE}/blog/{p["slug"]}/"><script type="application/ld+json">{schema}</script><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/"><span class="brand-mark">IP</span><span>Imágenes y Postales</span></a><nav class="top-nav"><a href="/">Inicio</a><a href="/blog/">Blog</a></nav></header><main class="article-page"><nav class="breadcrumbs"><a href="/">Inicio</a><span>›</span><a href="/blog/">Blog</a><span>›</span><span>{html.escape(p["title"])}</span></nav><article class="long-article"><p class="eyebrow">{html.escape(p["category"].upper())}</p><h1>{html.escape(p["title"])}</h1><p class="article-lead">{html.escape(p["description"])}</p><div class="tags">{tags}</div><div class="article-content">{render_article_body(p["content"])}</div></article></main><footer><strong>imagenesypostales.com</strong><span>Encontrar, personalizar y compartir sin vueltas.</span></footer></body></html>'''

def build():
    phrase_blocks=parse_blocks((DATA/"frases.txt").read_text(encoding="utf-8"),"=== POSTAL ===")
    phrases=[]
    seen=set()
    for i,b in enumerate(phrase_blocks):
        if not b.get("FRASE","").strip(): continue
        item=infer_phrase(b,i)
        base=item["id"]; n=2
        while item["id"] in seen:
            item["id"]=f"{base}-{n}"; n+=1
        seen.add(item["id"]); phrases.append(item)
    (DATA/"frases.json").write_text(json.dumps(phrases,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    blog_blocks=parse_blocks((DATA/"blog.txt").read_text(encoding="utf-8"),"=== ARTICULO ===",{"CONTENIDO"})
    posts=[]
    for b in blog_blocks:
        if (b.get("ESTADO","publicado").strip().lower()!="publicado" or not b.get("TITULO") or not b.get("CONTENIDO")): continue
        p={"title":b["TITULO"].strip(),"slug":slugify(b.get("SLUG") or b["TITULO"]),"description":b.get("DESCRIPCION","").strip(),"category":b.get("CATEGORIA","ideas").strip(),"tags":csv(b.get("ETIQUETAS")),"date":b.get("FECHA",str(date.today())).strip(),"content":b.get("CONTENIDO","").strip()}
        posts.append(p)
    posts.sort(key=lambda x:x["date"],reverse=True)
    (DATA/"blog.json").write_text(json.dumps([{k:v for k,v in p.items() if k!="content"} for p in posts],ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    blog_dir=ROOT/"blog"; blog_dir.mkdir(exist_ok=True)
    (blog_dir/"index.html").write_text(blog_index(posts),encoding="utf-8")
    for p in posts:
        d=blog_dir/p["slug"]; d.mkdir(parents=True,exist_ok=True)
        (d/"index.html").write_text(article_html(p),encoding="utf-8")

    fixed=["/","/cumpleanos/","/cumpleanos/hermana/","/cumpleanos/amiga/","/buenos-dias/","/amor/","/familia/","/animo/","/viajes/","/humor/","/blog/"]
    urls=[]
    for path in fixed:
        priority="1.0" if path=="/" else ("0.9" if path=="/blog/" else "0.8")
        urls.append(f"  <url><loc>{SITE}{path}</loc><changefreq>weekly</changefreq><priority>{priority}</priority></url>")
    for p in posts:
        urls.append(f'  <url><loc>{SITE}/blog/{p["slug"]}/</loc><lastmod>{html.escape(p["date"])}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>')
    sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+"\n".join(urls)+"\n</urlset>\n"
    (ROOT/"sitemap.xml").write_text(sitemap,encoding="utf-8")

if __name__=="__main__":
    build()
