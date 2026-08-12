#!/usr/bin/env python3
"""Build script: pre-extract EPUBs into static files under ./dist/"""

import shutil, os, json, base64, warnings, re
from pathlib import Path

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from PIL import Image

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
BOOKS_DIR = ROOT / "books"
COVERS_DIR = BOOKS_DIR / "covers"

IMG_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
}

THUMB_MAX_W = 600
COMPRESS_QUALITY = 85


def extract_book(epub_path: Path):
    book = epub.read_epub(str(epub_path), {"ignore_ncx": False})

    title = epub_path.stem
    dc_titles = book.get_metadata("DC", "title")
    if dc_titles:
        title = dc_titles[0][0]

    toc_entries = _flatten_toc(book.toc)

    if not toc_entries:
        toc_entries = [
            epub.Link(href=name, title=f"Chapter {i + 1}")
            for i, (name, _) in enumerate(book.spine)
        ]

    spine_items = []
    for spine_id, _ in book.spine:
        item = book.get_item_with_id(spine_id)
        if item and item.get_type() == ebooklib.ITEM_DOCUMENT:
            spine_items.append(item)

    href_index = {}
    for idx, item in enumerate(spine_items):
        name = item.get_name()
        href_index.setdefault(name, idx)
        href_index.setdefault(os.path.basename(name), idx)

    chapter_dir = DIST / "api" / "book" / epub_path.name / "chapter"
    chapter_dir.mkdir(parents=True, exist_ok=True)

    chapters = []
    for toc_idx, link in enumerate(toc_entries):
        title_text = getattr(link, "title", "Untitled")
        href = str(getattr(link, "href", ""))
        chapters.append({"title": str(title_text), "src": href})

        doc, anchor = _split_anchor(href)
        idx = href_index.get(doc) or href_index.get(os.path.basename(doc))

        if idx is None:
            (chapter_dir / f"{toc_idx}.html").write_text(
                '<p style="text-align:center;color:#8a7faf;padding:3rem;">未能解析章节</p>',
                encoding="utf-8",
            )
            continue

        content = spine_items[idx].get_content().decode("utf-8", errors="replace")
        content = _slice_from_anchor(content, anchor)
        content = _inline_images(content, book)
        content = _add_paragraph_anchors(content, toc_idx)
        (chapter_dir / f"{toc_idx}.html").write_text(content, encoding="utf-8")

    return {
        "filename": epub_path.name,
        "title": title,
        "chapters": chapters,
        "spine_count": len(spine_items),
    }


def _split_anchor(href):
    if "#" in href:
        doc, anchor = href.split("#", 1)
        return doc, anchor
    return href, None


def _slice_from_anchor(html_src, anchor):
    if not anchor:
        return html_src
    soup = BeautifulSoup(html_src, "xml")
    target = soup.find(id=anchor)
    if not target:
        return html_src

    root = soup.find("body") or soup
    chain = []
    node = target
    while node is not root:
        chain.append(node)
        node = node.parent
        if node is None:
            return html_src

    for node in chain:
        for sib in list(node.previous_siblings):
            sib.decompose()
    return str(soup)


def _add_paragraph_anchors(html_src, chapter_index):
    """Add id='pg-N' to each <p> tag for scroll-position tracking."""
    soup = BeautifulSoup(html_src, "xml")
    body = soup.find("body")
    if body is None:
        return html_src
    pg = 0
    for p in body.find_all("p"):
        pg += 1
        p["id"] = f"pg-{pg}"
    return str(soup)


def _flatten_toc(entry):
    links = []
    if isinstance(entry, (list, tuple)):
        for item in entry:
            links.extend(_flatten_toc(item))
    elif isinstance(entry, epub.Link):
        links.append(entry)
    elif isinstance(entry, epub.Section):
        if entry.href:
            links.append(entry)
        else:
            for sub in list(entry):
                links.extend(_flatten_toc(sub))
    return links


def _resolve_image_item(src, book):
    if not src or src.startswith("http:") or src.startswith("https:") or src.startswith("data:"):
        return None

    item = book.get_item_with_href(src)
    if item:
        return item

    fn = os.path.basename(src)
    for i in book.get_items_of_type(ebooklib.ITEM_IMAGE):
        if i.get_name().endswith(f"/{fn}") or i.get_name() == fn:
            return i
    return None


def _inline_data_uri(img_item):
    ext = os.path.splitext(img_item.get_name())[1].lower()
    mime = IMG_MIME.get(ext, "image/jpeg")
    b64 = base64.b64encode(img_item.get_content()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _inline_images(html_src, book):
    soup = BeautifulSoup(html_src, "xml")
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if src.startswith("data:"):
            continue
        img_item = _resolve_image_item(src, book)
        if img_item:
            img["src"] = _inline_data_uri(img_item)

    for svg in soup.find_all("svg"):
        image = svg.find("image")
        if image is None:
            continue
        src = image.get("xlink:href") or image.get("href") or ""
        img_item = _resolve_image_item(src, book)
        if img_item:
            img = soup.new_tag("img", src=_inline_data_uri(img_item), alt="cover")
            svg.replace_with(img)

    return str(soup)


def compress_image(src_path, dest_path):
    if not src_path.exists():
        return
    try:
        img = Image.open(src_path)
        img = img.convert("RGB") if img.mode in ("RGBA", "P") else img
        if dest_path.suffix.lower() in (".jpg", ".jpeg"):
            img.save(dest_path, "JPEG", quality=COMPRESS_QUALITY, optimize=True)
        else:
            img.save(dest_path, optimize=True)
    except Exception:
        shutil.copy2(src_path, dest_path)


def make_thumbnail(src_path, dest_path, max_w=THUMB_MAX_W):
    if not src_path.exists():
        return
    try:
        img = Image.open(src_path)
        img = img.convert("RGB") if img.mode in ("RGBA", "P") else img
        w = img.width
        if w > max_w:
            ratio = max_w / w
            new_h = int(img.height * ratio)
            img = img.resize((max_w, new_h), Image.LANCZOS)
        if dest_path.suffix.lower() in (".jpg", ".jpeg"):
            img.save(dest_path, "JPEG", quality=COMPRESS_QUALITY, optimize=True)
        else:
            img.save(dest_path, optimize=True)
    except Exception:
        shutil.copy2(src_path, dest_path)


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    shutil.copytree(ROOT / "images", DIST / "images")
    shutil.copy2(ROOT / "style.css", DIST / "style.css")

    # Keep originals for wallpaper links, then compress, then generate thumbs
    orig_dir = DIST / "images" / "orig"
    orig_dir.mkdir(exist_ok=True)
    image_exts = (".jpg", ".jpeg", ".png", ".gif")
    for img_path in sorted((DIST / "images").iterdir()):
        if img_path.is_dir() or img_path.suffix.lower() not in image_exts:
            continue
        shutil.copy2(img_path, orig_dir / img_path.name)
        compress_image(ROOT / "images" / img_path.name, img_path)

    thumbs_dir = DIST / "images" / "thumbs"
    thumbs_dir.mkdir(exist_ok=True)
    for img_path in sorted((DIST / "images").iterdir()):
        if img_path.is_dir() or img_path.suffix.lower() not in image_exts:
            continue
        make_thumbnail(ROOT / "images" / img_path.name, thumbs_dir / img_path.name)

    dist_books = DIST / "books"
    dist_books.mkdir()
    shutil.copytree(COVERS_DIR, dist_books / "covers")
    for jpeg_cover in (dist_books / "covers").glob("*.jpeg"):
        jpeg_cover.rename(jpeg_cover.with_suffix(".jpg"))

    for epub_path in sorted(BOOKS_DIR.glob("*.epub")):
        shutil.copy2(epub_path, dist_books / epub_path.name)

    # Compress book covers
    for cover_path in (dist_books / "covers").iterdir():
        if cover_path.suffix.lower() in image_exts:
            src_cover = ROOT / "books" / "covers" / cover_path.name
            if not src_cover.exists():
                src_cover = src_cover.with_suffix(".jpeg")
            if src_cover.exists():
                compress_image(src_cover, cover_path)

    books_list = []
    epub_files = sorted(BOOKS_DIR.glob("*.epub"))
    total_chapters = 0
    total_spine = 0

    for epub_path in epub_files:
        print(f"Processing {epub_path.name} ...")
        info = extract_book(epub_path)
        total_chapters += len(info["chapters"])
        total_spine += info["spine_count"]

        base = epub_path.stem.replace("book", "cover")
        cover = None
        for ext in (".jpg", ".jpeg", ".png"):
            if (COVERS_DIR / f"{base}{ext}").exists():
                cover = f"books/covers/{base}.jpg"
                break

        books_list.append({
            "filename": epub_path.name,
            "title": info["title"],
            "cover": cover,
        })

        chapters_dir = DIST / "api" / "book" / epub_path.name
        chapters_dir.mkdir(parents=True, exist_ok=True)
        chapters_json = {"chapters": info["chapters"]}
        (chapters_dir / "chapters.json").write_text(
            json.dumps(chapters_json, ensure_ascii=False), encoding="utf-8"
        )

    api_dir = DIST / "api"
    api_dir.mkdir(parents=True, exist_ok=True)
    (api_dir / "books.json").write_text(
        json.dumps(books_list, ensure_ascii=False), encoding="utf-8"
    )

    script_src = (ROOT / "script.js").read_text(encoding="utf-8")
    script_src = script_src.replace(
        "fetch('/api/books')",
        "fetch('api/books.json')"
    )
    script_src = script_src.replace(
        "fetch('/api/book/'+encodeURIComponent(fileName)+'/chapters')",
        "fetch('api/book/'+encodeURIComponent(fileName)+'/chapters.json')"
    )
    script_src = script_src.replace(
        "fetch('/api/book/'+encodeURIComponent(readerBook)+'/chapter/'+index)",
        "fetch('api/book/'+encodeURIComponent(readerBook)+'/chapter/'+index+'.html')"
    )
    (DIST / "script.js").write_text(script_src, encoding="utf-8")

    (DIST / "books.js").write_text(
        "// Books loaded dynamically from api/books.json\nvar BOOKS = null;\n",
        encoding="utf-8"
    )

    # Copy reader page
    shutil.copy2(ROOT / "reader.html", DIST / "reader.html")
    reader_js = (ROOT / "reader.js").read_text(encoding="utf-8")
    reader_js = reader_js.replace(
        "fetch('/api/book/'",
        "fetch('api/book/'"
    )
    reader_js = reader_js.replace(
        "fetch('api/book/'+encodeURIComponent(readerBook)+'/chapter/'+index)",
        "fetch('api/book/'+encodeURIComponent(readerBook)+'/chapter/'+index+'.html')"
    )
    reader_js = reader_js.replace(
        "fetch('api/book/'+encodeURIComponent(bookParam)+'/chapters')",
        "fetch('api/book/'+encodeURIComponent(bookParam)+'/chapters.json')"
    )
    (DIST / "reader.js").write_text(reader_js, encoding="utf-8")

    # Copy index.html
    (DIST / "index.html").write_text(
        (ROOT / "index.html").read_text(encoding="utf-8"),
        encoding="utf-8"
    )

    print(f"\nBuild complete! Output: {DIST}")
    print(f"  {len(books_list)} books processed")
    print(f"  {total_chapters} chapters extracted ({total_spine} spine items)")


if __name__ == "__main__":
    build()