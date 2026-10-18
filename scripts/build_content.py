#!/usr/bin/env python3
from pathlib import Path
import json, re, html, unicodedata
from datetime import date

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
SITE="https://imagenesypostales.com"

# Criterio SEO global: consultar docs/seo-guidelines.md antes de generar o ampliar
# contenido. La longitud depende de la intención de búsqueda y de la utilidad real;
# nunca imponer mínimos mágicos de palabras ni añadir texto de relleno.

POSTAL_CATEGORIES={
    "cumpleanos":("Cumpleaños","Postales de cumpleaños listas para personalizar, descargar y compartir."),
    "amor":("Amor","Postales de amor y cariño con diseños visuales para dedicar."),
    "amistad":("Amistad","Postales para amigas y amigos, agradecimiento y compañía."),
    "familia":("Familia","Postales para mamá, papá, hermanos y personas que se sienten como hogar."),
    "buenos-dias":("Buenos días","Postales para saludar y empezar el día con un mensaje especial."),
    "viajes":("Viajes","Postales de buen viaje, vacaciones y nuevas aventuras."),
    "animo":("Ánimo","Postales para acompañar, dar fuerza y estar cerca en momentos difíciles."),
    "salud":("Salud y recuperación","Postales para desear pronta recuperación y acompañar con cariño."),
}

POSTAL_GUIDANCE = {
    "cumpleanos": ("Elegí un mensaje que encaje con la relación y la ocasión", "Para una amistad podés usar un tono cercano y alegre; para alguien del trabajo, una felicitación más breve. Revisá el texto antes de descargar la postal y cambiá cualquier frase que no suene a vos.", "Si querés escribir un saludo propio, empezá por el <a href=\"/crear/postal/\">creador de postales</a> o buscá ideas en las <a href=\"/frases/\">frases para dedicar</a>."),
    "amor": ("Una dedicatoria personal vale más que una frase genérica", "Pensá qué querés expresar: cariño cotidiano, agradecimiento, una fecha especial o amor a distancia. Elegí un diseño legible y un mensaje que represente la relación.", "Podés <a href=\"/crear/postal/\">crear una postal con tus propias palabras</a> o convertir una dedicatoria en imagen con la herramienta de <a href=\"/crear/frase-en-imagen/\">frases en imagen</a>."),
    "amistad": ("Compartí un recuerdo o algo concreto que valorás", "Las postales de amistad funcionan mejor cuando el mensaje reconoce la compañía, el humor compartido o el apoyo de esa persona. Ajustá el tono para que suene natural y no demasiado solemne.", "Encontrá una frase para acompañar el diseño en la <a href=\"/frases/\">biblioteca de frases</a> o armá una dedicatoria desde <a href=\"/crear/postal/\">crear postal</a>."),
    "familia": ("Adaptá el mensaje a la persona de tu familia", "Un saludo para mamá, papá, hermanos o abuelos puede tener un tono distinto. Sumá un recuerdo o agradecimiento específico si querés que la postal se sienta más personal.", "Para escribir tu propia dedicatoria, usá el <a href=\"/crear/postal/\">creador de postales</a>; también podés explorar las <a href=\"/frases/\">frases para compartir</a>."),
    "buenos-dias": ("Elegí un saludo breve y fácil de leer", "Para un mensaje de buenos días, una idea clara suele funcionar mejor que un párrafo largo. Pensá si buscás transmitir energía, ternura, humor o tranquilidad y elegí el diseño acorde.", "Podés personalizar el saludo en <a href=\"/crear/postal/\">crear postal</a> o escribirlo sobre una imagen con <a href=\"/herramientas/texto-en-imagen/\">texto en imagen</a>."),
    "viajes": ("Deseá un buen viaje según la aventura que empieza", "Podés transmitir entusiasmo, cuidado, descanso o ganas de reencontrarse. Si la persona viaja por trabajo, vacaciones o una mudanza, adaptá el mensaje a ese contexto.", "Personalizá una postal en <a href=\"/crear/postal/\">crear postal</a> y descubrí más ideas en la colección de <a href=\"/frases/\">frases para dedicar</a>."),
    "animo": ("Acompañá sin exigir que la otra persona esté bien", "En un momento difícil, evitá promesas absolutas o frases que minimicen lo que pasa. Un mensaje sencillo que ofrezca compañía puede ser más respetuoso que intentar resolverlo todo con palabras.", "Elegí una dedicatoria propia desde <a href=\"/crear/postal/\">crear postal</a> y ajustá el texto para que transmita apoyo sincero."),
    "salud": ("Transmití cariño sin presionar por una recuperación rápida", "Un saludo de recuperación puede ofrecer compañía, paciencia y buenos deseos sin exigir optimismo. Tené en cuenta la situación de la persona y evitá asegurar resultados que no podés conocer.", "Podés adaptar el mensaje en <a href=\"/crear/postal/\">crear postal</a> y descargarlo para enviarlo por el medio que prefieras."),
}

def norm(s):
    s=unicodedata.normalize("NFD",(s or "").lower())
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
        for raw in part.strip().splitlines():
            line=raw.rstrip()
            if not line or line.lstrip().startswith("#"):
                if active and multiline and active in multiline and isinstance(obj.get(active),list):
                    obj[active].append("")
                continue
            m=re.match(r"^([A-ZÁÉÍÓÚÑ_]+):\s*(.*)$",line)
            if m:
                if active and isinstance(obj.get(active),list):
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
        if active and isinstance(obj.get(active),list):
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
TAG_WORDS=["cumpleaños","hermana","hermano","mamá","papá","familia","amor","amistad","cariño","ánimo","gratitud","gracias","viaje","humor","reflexión","amor propio","buenos días","buenas noches","pareja","distancia","recuerdos","aventura","acompañamiento"]

def infer_phrase(obj,index):
    title=obj.get("TITULO","").strip()
    phrase=obj.get("FRASE","").strip()
    desc=obj.get("DESCRIPCION","").strip()
    n=norm(f"{title} {phrase} {desc}")
    need=obj.get("CATEGORIA","").strip().lower()
    if not need:
        need="expresar"
        for key,terms in CATEGORY_RULES:
            if any(norm(t) in n for t in terms):
                need=key
                break
    tags=csv(obj.get("ETIQUETAS"))
    if not tags:
        tags=[w for w in TAG_WORDS if norm(w) in n][:6] or [need]
    recipients=csv(obj.get("DESTINATARIOS"))
    if not recipients:
        for key,terms in [("mama",["mama","mamá"]),("hermana",["hermana","hermano"]),("familia",["familia"]),("pareja",["pareja","amor","novio","novia"]),("amiga",["amiga","amigo"])]:
            if any(norm(t) in n for t in terms):
                recipients=[key]
                break
    tones=csv(obj.get("TONO")) or (["gracioso"] if need=="humor" else ["sencillo"])
    style=(obj.get("ESTILO") or ["azul","minimalista","oscuro"][index%3]).strip().lower()
    if style not in {"azul","minimalista","oscuro"}:
        style="azul"
    return {
        "id":slugify(obj.get("ID") or title or phrase[:60]),
        "title":title or phrase[:60],
        "phrase":phrase,
        "description":desc,
        "need":need,
        "tags":tags,
        "recipients":recipients,
        "tones":tones,
        "style":style,
    }

def infer_visual_postal(obj,index):
    title=obj.get("TITULO","").strip()
    phrase=obj.get("FRASE","").strip()
    category=slugify(obj.get("CATEGORIA") or "otras")
    template=(obj.get("PLANTILLA") or f"{category}-base").strip().lower()
    return {
        "id":slugify(obj.get("ID") or f"{title}-{index+1}"),
        "title":title or phrase[:60],
        "phrase":phrase,
        "description":obj.get("DESCRIPCION","").strip(),
        "category":category,
        "tags":csv(obj.get("ETIQUETAS")) or [category],
        "template":template,
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
            flush()
            pieces.append("<h2>"+html.escape(line[3:].strip())+"</h2>")
        elif not line.strip():
            flush()
        else:
            para.append(line)
    flush()
    return "\n".join(pieces)

BLOG_HEADER='''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'''

def blog_index(posts):
    # Mantener enlazados los artículos editoriales existentes aunque todavía no
    # estén migrados a data/blog.txt. Los nuevos artículos siguen viniendo del TXT.
    curated = [
        {
            "slug": "crear-postales-personalizadas",
            "title": "Cómo crear postales personalizadas con fotos y frases",
            "description": "Descubrí cómo diseñar postales personalizadas con fotos, frases, colores y firmas para cumpleaños, viajes, amistad y otras ocasiones.",
            "category": "GUÍA PRÁCTICA",
            "tags": ["postales", "diseño", "frases"],
        },
        {
            "slug": "formatos-jpg-png-webp",
            "title": "JPG, PNG o WebP: qué formato de imagen elegir",
            "description": "Conocé las diferencias entre JPG, PNG y WebP para elegir el formato adecuado según la calidad, el peso, la transparencia y el uso de cada imagen.",
            "category": "IMÁGENES Y FORMATOS",
            "tags": ["JPG", "PNG", "WebP"],
        },
        {
            "slug": "optimizar-imagenes-para-web",
            "title": "Cómo optimizar imágenes para una página web",
            "description": "Aprendé a reducir el peso de las imágenes para una web, elegir formatos adecuados, ajustar dimensiones y cuidar la calidad visual.",
            "category": "GUÍA PRÁCTICA",
            "tags": ["optimización", "rendimiento web", "imágenes"],
        },
    ]
    merged = list(posts)
    known_slugs = {p["slug"] for p in merged}
    for item in curated:
        if item["slug"] not in known_slugs and (ROOT / "blog" / item["slug"] / "index.html").exists():
            merged.append(item)
            known_slugs.add(item["slug"])
    cards = "".join(
        f'''<article class="blog-card"><p class="eyebrow">{html.escape(p["category"].upper())}</p><h2><a href="/blog/{p["slug"]}/">{html.escape(p["title"])}</a></h2><p>{html.escape(p["description"])}</p><div class="tags">{"".join(f'<span class="tag">{html.escape(t)}</span>' for t in p["tags"])}</div></article>'''
        for p in merged
    ) or '<div class="collection-note"><h2>Próximamente, nuevas guías</h2><p>Estamos preparando artículos prácticos sobre frases, postales y herramientas para imágenes.</p></div>'
    return BLOG_HEADER+'''<title>Blog de imágenes, postales y guías prácticas | Imágenes y Postales</title><meta name="description" content="Guías prácticas para crear postales personalizadas, elegir formatos de imagen y optimizar fotos para la web. Consejos claros para resolver tareas concretas."><link rel="canonical" href="https://imagenesypostales.com/blog/"><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/"><span class="brand-mark">IP</span><span>Imágenes y Postales</span></a><nav class="top-nav" aria-label="Navegación principal"><a href="/herramientas/">Herramientas</a><a href="/crear/">Crear imágenes</a><a href="/frases/">Frases célebres</a><a href="/postales/">Postales</a><a href="/blog/" aria-current="page">Blog</a><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Privacidad</a></nav></header><main class="collection-page"><nav class="breadcrumbs" aria-label="Migas de pan"><a href="/">Inicio</a><span>›</span><span>Blog</span></nav><section class="collection-hero"><p class="eyebrow">BLOG Y GUÍAS</p><h1>Guías prácticas para crear, elegir y compartir imágenes</h1><p class="hero-copy">Artículos para crear postales personalizadas, elegir formatos y mejorar imágenes para la web, con pasos concretos y ejemplos útiles.</p></section><section class="blog-grid">'''+cards+'''</section></main><footer><strong>imagenesypostales.com</strong><span>Guías de imágenes, postales y herramientas para crear y compartir.</span></footer></body></html>'''

def article_html(p):
    schema=json.dumps({"@context":"https://schema.org","@type":"Article","headline":p["title"],"description":p["description"],"datePublished":p["date"],"mainEntityOfPage":f'{SITE}/blog/{p["slug"]}/',"publisher":{"@type":"Organization","name":"Imágenes y Postales"}},ensure_ascii=False)
    tags="".join(f'<span class="tag">{html.escape(t)}</span>' for t in p["tags"])
    return BLOG_HEADER+f'''<title>{html.escape(p["title"])} | Imágenes y Postales</title><meta name="description" content="{html.escape(p["description"],quote=True)}"><link rel="canonical" href="{SITE}/blog/{p["slug"]}/"><meta property="og:type" content="article"><meta property="og:title" content="{html.escape(p["title"],quote=True)}"><meta property="og:description" content="{html.escape(p["description"],quote=True)}"><meta property="og:url" content="{SITE}/blog/{p["slug"]}/"><script type="application/ld+json">{schema}</script><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><a class="brand" href="/"><span class="brand-mark">IP</span><span>Imágenes y Postales</span></a><nav class="top-nav"><a href="/frases/">Frases</a><a href="/blog/">Blog</a><a href="/postales/">Postales</a></nav></header><main class="article-page"><nav class="breadcrumbs"><a href="/">Inicio</a><span>›</span><a href="/blog/">Blog</a><span>›</span><span>{html.escape(p["title"])}</span></nav><article class="long-article"><p class="eyebrow">{html.escape(p["category"].upper())}</p><h1>{html.escape(p["title"])}</h1><p class="article-lead">{html.escape(p["description"])}</p><div class="tags">{tags}</div><div class="article-content">{render_article_body(p["content"])}</div></article></main><footer><strong>imagenesypostales.com</strong><span>Frases, postales y palabras para compartir.</span></footer></body></html>'''

def postal_category_links():
    return "".join(f'<a class="postal-category-link" href="/postales/{key}/"><strong>{html.escape(label)}</strong><span>→</span></a>' for key,(label,_) in POSTAL_CATEGORIES.items())

def static_postal_cards(category="", limit=12):
    """Renderizar contenido inicial en HTML para que las postales sean rastreables sin esperar al JS."""
    data_path=DATA/"postales.json"
    if not data_path.exists():
        return ""
    try:
        items=json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ""
    if category:
        items=[item for item in items if item.get("category")==category]
    cards=[]
    for item in items[:limit]:
        template=slugify(item.get("template") or "postal-base")
        title=html.escape(item.get("title") or "Postal para compartir")
        phrase=html.escape(item.get("phrase") or "")
        description=html.escape(item.get("description") or "")
        tags="".join(f'<span class="tag">{html.escape(tag)}</span>' for tag in (item.get("tags") or []))
        cards.append(
            f'<article class="postal-card">'
            f'<div class="visual-postal tpl-{template}" aria-label="{title}">'
            f'<div class="visual-decoration" aria-hidden="true"></div>'
            f'<p>{phrase}</p><small>imagenesypostales.com</small></div>'
            f'<div class="postal-card-body"><h2>{title}</h2>'
            f'<p class="card-description">{description}</p>'
            f'<div class="tags">{tags}</div></div></article>'
        )
    return "".join(cards)


def postales_page(category=""):
    label,desc=POSTAL_CATEGORIES.get(category,("Postales","Elegí una ocasión, personalizá el mensaje y descargá una postal lista para compartir."))
    canonical=f"{SITE}/postales/{category}/" if category else f"{SITE}/postales/"
    title=f"Postales de {label.lower()} para descargar | Imágenes y Postales" if category else "Postales para descargar y compartir | Imágenes y Postales"
    heading=f"Postales de {label.lower()}" if category else "Postales para cada momento"
    category_controls=postal_category_links()
    body_attr=f' data-postal-category="{html.escape(category,quote=True)}"' if category else ""
    guide_title,guide_text,guide_links=POSTAL_GUIDANCE.get(category,("Cómo elegir y personalizar una postal","Elegí primero la ocasión y el tono del mensaje; después revisá que el texto se lea bien en el diseño y que la imagen tenga el tamaño adecuado para compartirla. Podés explorar las categorías para encontrar una idea más concreta y personalizar el resultado antes de descargarlo.","Probá el <a href=\"/crear/postal/\">creador de postales</a>, buscá inspiración en las <a href=\"/frases/\">frases</a> o prepará una imagen con las <a href=\"/herramientas/\">herramientas de edición</a>."))
    schema=json.dumps({"@context":"https://schema.org","@type":"CollectionPage","name":heading,"description":desc,"url":canonical,"isPartOf":{"@type":"WebSite","name":"Imágenes y Postales","url":SITE+"/"}},ensure_ascii=False)
    return f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc,quote=True)}"><link rel="canonical" href="{canonical}"><meta property="og:type" content="website"><meta property="og:title" content="{html.escape(title,quote=True)}"><meta property="og:description" content="{html.escape(desc,quote=True)}"><meta property="og:url" content="{canonical}"><script type="application/ld+json">{schema}</script><link rel="stylesheet" href="/style.css"></head><body{body_attr}><header class="site-header"><a class="brand" href="/"><span class="brand-mark">IP</span><span>Imágenes y Postales</span></a><nav class="top-nav" aria-label="Navegación principal"><a href="/herramientas/">Herramientas</a><a href="/crear/">Crear imágenes</a><a href="/frases/">Frases célebres</a><a href="/postales/">Postales</a><a href="/blog/">Blog</a><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Privacidad</a></nav></header><main class="collection-page"><nav class="breadcrumbs"><a href="/">Inicio</a><span>›</span><a href="/postales/">Postales</a>{f'<span>›</span><span>{html.escape(label)}</span>' if category else ''}</nav><section class="collection-hero postal-hero"><p class="eyebrow">POSTALES VISUALES</p><h1>{html.escape(heading)}</h1><p class="hero-copy">{html.escape(desc)}</p>{category_controls}</section><section class="gallery-section collection-gallery"><div class="section-heading"><div><p class="eyebrow">LISTAS PARA DESCARGAR</p><h2>{html.escape(label if category else "Elegí una postal")}</h2></div><p id="postalCount" class="muted"></p></div><div id="postalGrid" class="postal-grid" aria-live="polite">{static_postal_cards(category)}</div><div id="postalSentinel" class="load-sentinel" aria-hidden="true"></div></section><section class="collection-note postal-guidance"><h2>{html.escape(guide_title)}</h2><p>{html.escape(guide_text)}</p><p>{guide_links}</p><h2>Más formas de crear y compartir</h2><p>Si querés cambiar el texto, los colores o la composición, usá el <a href="/crear/postal/">creador de postales personalizadas</a>. También podés explorar las <a href="/frases/">frases célebres y originales</a> o consultar las <a href="/herramientas/">herramientas para editar imágenes</a>.</p></section></main><footer><strong>imagenesypostales.com</strong><span>Frases, postales y palabras para compartir.</span><nav aria-label="Enlaces del sitio"><a href="/frases/">Frases</a><a href="/crear/">Crear imágenes</a><a href="/herramientas/">Herramientas</a><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Privacidad</a></nav></footer><script src="/postales.js" defer></script></body></html>'''

def build():
    quote_catalog=build_quote_pages()
    phrase_blocks=parse_blocks((DATA/"frases.txt").read_text(encoding="utf-8"),"=== POSTAL ===")
    phrases=[]
    seen=set()
    for i,b in enumerate(phrase_blocks):
        if not b.get("FRASE","").strip():
            continue
        item=infer_phrase(b,i)
        base=item["id"]
        n=2
        while item["id"] in seen:
            item["id"]=f"{base}-{n}"
            n+=1
        seen.add(item["id"])
        phrases.append(item)
    (DATA/"frases.json").write_text(json.dumps(phrases,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    postal_blocks=parse_blocks((DATA/"postales.txt").read_text(encoding="utf-8"),"=== POSTAL ===")
    postales=[]
    seen=set()
    for i,b in enumerate(postal_blocks):
        if not b.get("FRASE","").strip():
            continue
        item=infer_visual_postal(b,i)
        base=item["id"]
        n=2
        while item["id"] in seen:
            item["id"]=f"{base}-{n}"
            n+=1
        seen.add(item["id"])
        postales.append(item)
    (DATA/"postales.json").write_text(json.dumps(postales,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    blog_blocks=parse_blocks((DATA/"blog.txt").read_text(encoding="utf-8"),"=== ARTICULO ===",{"CONTENIDO"})
    posts=[]
    for b in blog_blocks:
        if b.get("ESTADO","publicado").strip().lower()!="publicado" or not b.get("TITULO") or not b.get("CONTENIDO"):
            continue
        p={"title":b["TITULO"].strip(),"slug":slugify(b.get("SLUG") or b["TITULO"]),"description":b.get("DESCRIPCION","").strip(),"category":b.get("CATEGORIA","ideas").strip(),"tags":csv(b.get("ETIQUETAS")),"date":b.get("FECHA",str(date.today())).strip(),"content":b.get("CONTENIDO","").strip()}
        posts.append(p)
    posts.sort(key=lambda x:x["date"],reverse=True)
    (DATA/"blog.json").write_text(json.dumps([{k:v for k,v in p.items() if k!="content"} for p in posts],ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    blog_dir=ROOT/"blog"
    blog_dir.mkdir(exist_ok=True)
    (blog_dir/"index.html").write_text(blog_index(posts),encoding="utf-8")
    for p in posts:
        d=blog_dir/p["slug"]
        d.mkdir(parents=True,exist_ok=True)
        (d/"index.html").write_text(article_html(p),encoding="utf-8")

    postales_dir=ROOT/"postales"
    postales_dir.mkdir(exist_ok=True)
    (postales_dir/"index.html").write_text(postales_page(),encoding="utf-8")
    for key in POSTAL_CATEGORIES:
        d=postales_dir/key
        d.mkdir(parents=True,exist_ok=True)
        (d/"index.html").write_text(postales_page(key),encoding="utf-8")

    # Sitemap automático: se construye desde las páginas HTML que existen en el sitio.
    # Así las altas, bajas y cambios de páginas no dependen de una lista manual.
    excluded_files = {
        "google939990971c7be018.html",
        "pinterest-4667b.html",
        "404.html",
    }
    excluded_dirs = {".git", ".github", "node_modules", "vendor", "dist", "build"}
    sitemap_urls = set()
    for page in ROOT.rglob("*.html"):
        rel = page.relative_to(ROOT)
        if rel.as_posix() in excluded_files or any(part in excluded_dirs or part.startswith(".") for part in rel.parts[:-1]):
            continue
        source = page.read_text(encoding="utf-8", errors="ignore")
        # No incluir páginas explícitamente excluidas de indexación.
        if re.search(r"<meta\s+name=['\"]robots['\"][^>]*content=['\"][^'\"]*noindex", source, re.I):
            continue
        # No incluir duplicados cuyo canonical apunte a otra URL.
        canonical = re.search(r"<link\s+rel=['\"]canonical['\"]\s+href=['\"]([^'\"]+)", source, re.I)
        if canonical and canonical.group(1).rstrip("/") != (SITE + ("/" if rel.as_posix() == "index.html" else "/" + rel.as_posix().removesuffix("index.html") if rel.name == "index.html" else "/" + rel.as_posix())).rstrip("/"):
            continue
        if rel.as_posix() == "index.html":
            path = "/"
        elif rel.name == "index.html":
            path = "/" + rel.parent.as_posix().strip("/") + "/"
        else:
            path = "/" + rel.as_posix()
        sitemap_urls.add(SITE + path)

    entries = "".join(
        f"  <url><loc>{html.escape(url)}</loc></url>\n"
        for url in sorted(sitemap_urls)
    )
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries + "</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")

def sync_quote_index_counts(catalog):
    """Keep the quote landing page's SEO metadata aligned with the real catalog."""
    index_path=ROOT/"frases"/"index.html"
    if not index_path.exists():
        return
    quotes=catalog.get("quotes",[])
    total=len(quotes)
    originals=sum(1 for q in quotes if q.get("slug")=="imagenes-y-postales" or q.get("author")=="Imágenes y Postales")
    historic=total-originals
    fmt=lambda n: f"{n:,}".replace(",",".")
    content=index_path.read_text(encoding="utf-8")
    replacements=[
        (r"\b[\d.]+(?=\s+frases célebres y originales)",fmt(total)),
        (r"\b[\d.]+(?=\s+frases en total)",fmt(total)),
        (r"\b[\d.]+(?=\s+frases:)",fmt(total)),
        (r"\b[\d.]+(?=\s+citas célebres)",fmt(historic)),
        (r"\b[\d.]+(?=\s+citas históricas)",fmt(historic)),
        (r"\b[\d.]+(?=\s+célebres\s*[+:])",fmt(historic)),
        (r"\b[\d.]+(?=\s+frases originales)",fmt(originals)),
        (r"\b[\d.]+(?=\s+originales\s*[+.:])",fmt(originals)),
    ]
    for pattern,value in replacements:
        content=re.sub(pattern,lambda _m:value,content)
    if content!=index_path.read_text(encoding="utf-8"):
        index_path.write_text(content,encoding="utf-8")


def quote_collection_page(slug,name,title,description,intro,kind,source="",tags=None,quotes=None):
    canonical=f"{SITE}/frases/{slug}/"
    schema=json.dumps({"@context":"https://schema.org","@type":"CollectionPage","name":title,"description":description,"url":canonical,"inLanguage":"es-AR"},ensure_ascii=False)
    tag_list=tags or []
    body_attr=f' data-author="{html.escape(slug,quote=True)}"' if kind=="author" else f' data-theme="{html.escape(",".join(tag_list),quote=True)}" data-theme-name="{html.escape(name,quote=True)}"'
    source_link=f'<a class="author-source" href="{html.escape(source,quote=True)}" target="_blank" rel="noopener noreferrer">Consultar la fuente de referencia ↗</a>' if source.startswith("https://") else ""
    static_cards=[]
    for q in (quotes or [])[:6]:
        qtext=html.escape(q.get("text",""))
        qauthor=html.escape(q.get("author",""))
        qslug=slugify(q.get("slug") or q.get("author",""))
        static_cards.append(f'<article class="quote-card"><blockquote>“{qtext}”</blockquote><p class="quote-author"><a href="/frases/{qslug}/">{qauthor}</a></p></article>')
    cards="".join(static_cards)
    breadcrumb=html.escape(name)
    return f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><meta name="description" content="{html.escape(description,quote=True)}"><link rel="canonical" href="{canonical}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#0b57d0"><meta property="og:type" content="website"><meta property="og:site_name" content="Imágenes y Postales"><meta property="og:title" content="{html.escape(title,quote=True)}"><meta property="og:description" content="{html.escape(description,quote=True)}"><meta property="og:url" content="{canonical}"><meta name="twitter:card" content="summary"><script type="application/ld+json">{schema}</script><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/frases-celebres.css"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2"><link rel="shortcut icon" href="/favicon.svg?v=2"></head><body class="famous-quotes-page"{body_attr}><header class="site-header"><a class="brand" href="/" aria-label="Imágenes y Postales, inicio"><span class="brand-mark" aria-hidden="true"></span><span>Imágenes y Postales</span></a><nav class="top-nav" aria-label="Navegación principal"><a href="/herramientas/">Herramientas</a><a href="/crear/">Crear imágenes</a><a href="/frases/" aria-current="page">Frases célebres</a><a href="/postales/">Postales</a><a href="/blog/">Blog</a><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Privacidad</a></nav></header><main class="famous-main"><nav class="breadcrumbs" aria-label="Migas de pan"><a href="/">Inicio</a><span>›</span><a href="/frases/">Frases célebres</a><span>›</span><span>{breadcrumb}</span></nav><section class="author-page-hero"><p class="eyebrow">{"FRASES CÉLEBRES POR AUTOR" if kind=="author" else "COLECCIÓN TEMÁTICA"}</p><h1>{html.escape(title.split(" | ")[0])}</h1><p class="hero-copy">{html.escape(intro)}</p><p>{html.escape(description)}</p>{source_link}<form id="quoteSearchForm" class="famous-search" action="/frases/" method="get"><label class="sr-only" for="quoteSearch">Buscar frases célebres</label><input id="quoteSearch" name="q" type="search" placeholder="Buscar una frase o a otra persona…" autocomplete="off"><button type="submit">Buscar en todas las frases</button></form><p id="quoteStatus" class="famous-status" aria-live="polite">Cargando colección de frases…</p></section><section class="quotes-section" aria-labelledby="quotes-title"><div class="famous-section-heading"><div><p class="eyebrow">COLECCIÓN DE CITAS</p><h2 id="quotes-title">{html.escape(name)}</h2></div><p>Copiá una frase o descargala como imagen.</p></div><div id="quoteResults" class="quote-grid">{cards}</div><p id="quoteEmpty" class="famous-status" hidden>No encontramos frases para esta selección.</p></section><section class="quote-navigation"><p><a href="/frases/">Ver todas las frases célebres y originales</a></p><p><a href="/frases/amor/">Frases de amor</a> · <a href="/frases/vida/">Frases de la vida</a> · <a href="/frases/sabiduria/">Frases de sabiduría</a></p></section></main><footer><div><strong>Imágenes y Postales</strong><p>Frases, postales y herramientas gratuitas para crear y compartir.</p></div><nav aria-label="Información del sitio"><a href="/sobre-nosotros/">Qué hacemos</a><a href="/privacidad/">Privacidad</a></nav></footer><script src="/frases-celebres.js" defer></script><script>var sc_project=13359488;var sc_invisible=1;var sc_security="c65a5a39";</script><script src="https://www.statcounter.com/counter/counter.js" async></script><noscript><img src="https://c.statcounter.com/13359488/0/c65a5a39/1/" alt="Web Analytics" referrerpolicy="no-referrer-when-downgrade"></noscript></body></html>'''


def build_quote_pages():
    """Generate missing author/topic pages from the shared quote catalog without overwriting curated pages."""
    catalog_path=DATA/"citas-celebres.json"
    if not catalog_path.exists():
        return {}
    catalog=json.loads(catalog_path.read_text(encoding="utf-8"))
    sync_quote_index_counts(catalog)
    quotes=catalog.get("quotes",[])
    counts={}
    for q in quotes:
        slug=q.get("slug") or slugify(q.get("author",""))
        counts[slug]=counts.get(slug,0)+1
    for author in catalog.get("authors",[]):
        name=(author.get("name") or "").strip()
        slug=(author.get("slug") or slugify(name)).strip()
        if not name or not slug:
            continue
        target=ROOT/"frases"/slug/"index.html"
        if target.exists():
            continue
        count=counts.get(slug,0)
        if not count:
            continue
        bio=(author.get("bio") or f"Una colección de frases atribuidas a {name}, con temas para leer, pensar y compartir.").strip()
        if name=="Imágenes y Postales":
            title="Frases originales para reflexionar | Imágenes y Postales"
            description=f"Leé {count} frases originales de Imágenes y Postales sobre la vida, el amor, la libertad, la calma y el crecimiento personal. Copiá o descargá cada frase gratis."
        else:
            title=f"Frases de {name}: citas célebres para leer y compartir | Imágenes y Postales"
            description=f"Leé {count} frases atribuidas a {name}. Explorá citas con fuentes de referencia, copialas o descargalas como imágenes gratis."
        selected=[q for q in quotes if (q.get("slug") or slugify(q.get("author","")))==slug]
        page=quote_collection_page(slug,name,title,description,bio,"author",author.get("source",""),quotes=selected)
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(page,encoding="utf-8")
    for topic in catalog.get("topics",[]):
        slug=(topic.get("slug") or slugify(topic.get("name",""))).strip()
        name=(topic.get("name") or slug).strip()
        if not slug:
            continue
        target=ROOT/"frases"/slug/"index.html"
        if target.exists():
            continue
        title=(topic.get("title") or name+" célebres para leer y compartir").strip()
        description=(topic.get("description") or f"Explorá frases sobre {name.lower()}, con citas de autores y temas relacionados.").strip()
        tags=topic.get("tags") or [slug]
        intro=(topic.get("intro") or description).strip()
        selected=[q for q in quotes if any(normalize_tag in [t.lower() for t in (q.get("tags") or [])] for normalize_tag in tags)]
        page=quote_collection_page(slug,name,title+" | Imágenes y Postales",description,intro,"topic",tags=tags,quotes=selected)
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(page,encoding="utf-8")
    return catalog


if __name__=="__main__":
    build()
