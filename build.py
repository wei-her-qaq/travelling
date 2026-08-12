#!/usr/bin/env python3
"""Build script: pre-extract EPUBs into static files under ./dist/"""

import shutil, os, json, base64, warnings
from pathlib import Path

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

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


def extract_book(epub_path: Path):
    book = epub.read_epub(str(epub_path), {"ignore_ncx": False})

    # Get title from dc:title
    title = epub_path.stem
    dc_titles = book.get_metadata("DC", "title")
    if dc_titles:
        title = dc_titles[0][0]

    # Build TOC
    toc_entries = _flatten_toc(book.toc)

    if not toc_entries:
        toc_entries = [
            epub.Link(href=name, title=f"Chapter {i + 1}")
            for i, (name, _) in enumerate(book.spine)
        ]

    # Extract spine documents with inline images
    spine_items = []
    for spine_id, _ in book.spine:
        item = book.get_item_with_id(spine_id)
        if item and item.get_type() == ebooklib.ITEM_DOCUMENT:
            spine_items.append(item)

    # Map normalized document href -> spine index (TOC and spine may not align 1:1)
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
        (chapter_dir / f"{toc_idx}.html").write_text(content, encoding="utf-8")

    return {
        "filename": epub_path.name,
        "title": title,
        "chapters": chapters,
        "spine_count": len(spine_items),
    }


def _split_anchor(href):
    """Split an href like 'a.xhtml#id' into ('a.xhtml', 'id')."""
    if "#" in href:
        doc, anchor = href.split("#", 1)
        return doc, anchor
    return href, None


def _slice_from_anchor(html_src, anchor):
    """Return content starting at the element with the given id (or the full content)."""
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


def _flatten_toc(entry):
    """Recursively extract all epub.Link items from a TOC tree."""
    links = []
    if isinstance(entry, (list, tuple)):
        for item in entry:
            links.extend(_flatten_toc(item))
    elif isinstance(entry, epub.Link):
        links.append(entry)
    elif isinstance(entry, epub.Section):
        # Section is iterable but also has href/title
        if entry.href:
            links.append(entry)
        else:
            for sub in list(entry):
                links.extend(_flatten_toc(sub))
    return links


def _resolve_image_item(src, book):
    """Resolve an image src (relative to the epub) to its manifest item."""
    if not src or src.startswith("http:") or src.startswith("https:") or src.startswith("data:"):
        return None

    # Try exact href match
    item = book.get_item_with_href(src)
    if item:
        return item

    # Try matching by filename
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

    # Replace <svg><image> wrappers (full-page EPUB covers) with inline <img>
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


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    shutil.copytree(ROOT / "images", DIST / "images")
    shutil.copy2(ROOT / "style.css", DIST / "style.css")

    dist_books = DIST / "books"
    dist_books.mkdir()
    shutil.copytree(COVERS_DIR, dist_books / "covers")
    for jpeg_cover in (dist_books / "covers").glob("*.jpeg"):
        jpeg_cover.rename(jpeg_cover.with_suffix(".jpg"))

    for epub_path in sorted(BOOKS_DIR.glob("*.epub")):
        shutil.copy2(epub_path, dist_books / epub_path.name)

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

    (DIST / "index.html").write_text(
        (ROOT / "index.html").read_text(encoding="utf-8"),
        encoding="utf-8"
    )

    print(f"\nBuild complete! Output: {DIST}")
    print(f"  {len(books_list)} books processed")
    print(f"  {total_chapters} chapters extracted ({total_spine} spine items)")


if __name__ == "__main__":
    build()
