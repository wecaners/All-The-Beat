"""docs/*.md 안의 Mermaid 블록을 모아 docs/diagrams.html 뷰어를 만든다.

사용법: python3 scripts/build_diagrams.py
문서를 고친 뒤 다시 실행하면 뷰어가 갱신된다.
"""

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUT = DOCS / "diagrams.html"
SOURCES = ["04-IA.md", "05-유저플로우.md"]

BLOCK = re.compile(r"^(#{2,3}) (.+?)$|```mermaid\n(.*?)```", re.M | re.S)


def collect(md_path):
    """문서에서 (가장 가까운 제목, mermaid 코드) 목록을 뽑는다."""
    text = md_path.read_text(encoding="utf-8")
    doc_title = text.splitlines()[0].lstrip("# ").strip()
    heading = doc_title
    items = []
    for m in BLOCK.finditer(text):
        if m.group(2):
            heading = m.group(2).strip()
        elif m.group(3):
            items.append((heading, m.group(3)))
    return doc_title, items


def build():
    nav, sections, n = [], [], 0
    for name in SOURCES:
        doc_title, items = collect(DOCS / name)
        nav.append(f'<li class="doc">{html.escape(doc_title)}</li>')
        for heading, code in items:
            n += 1
            anchor = f"d{n}"
            nav.append(f'<li><a href="#{anchor}">{html.escape(heading)}</a></li>')
            sections.append(
                f'<section id="{anchor}"><h2>{html.escape(heading)}</h2>'
                f'<p class="src">{html.escape(name)}</p>'
                f'<div class="canvas"><pre class="mermaid">{html.escape(code)}</pre></div></section>'
            )

    page = TEMPLATE.replace("{{NAV}}", "\n".join(nav)).replace("{{SECTIONS}}", "\n".join(sections))
    OUT.write_text(page, encoding="utf-8")
    print(f"{n} diagrams -> {OUT.relative_to(ROOT)}")


TEMPLATE = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>올빗 다이어그램</title>
<style>
  :root { --bg:#f7f7f8; --card:#fff; --text:#1d1d1f; --muted:#6e6e73; --line:#e3e3e8; --accent:#4a6fd1; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font-family:-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", sans-serif; }
  header { position:sticky; top:0; z-index:2; display:flex; align-items:center; gap:16px;
           padding:12px 20px; background:var(--card); border-bottom:1px solid var(--line); }
  header h1 { font-size:16px; margin:0; }
  header label { margin-left:auto; font-size:13px; color:var(--muted); display:flex; align-items:center; gap:8px; }
  .layout { display:grid; grid-template-columns:240px 1fr; }
  nav { position:sticky; top:49px; height:calc(100vh - 49px); overflow:auto; padding:16px 12px;
        border-right:1px solid var(--line); background:var(--card); }
  nav ul { list-style:none; margin:0; padding:0; }
  nav li { font-size:13px; }
  nav li.doc { font-weight:700; margin:16px 0 6px; color:var(--muted); }
  nav li.doc:first-child { margin-top:0; }
  nav a { display:block; padding:5px 8px; border-radius:6px; color:var(--text); text-decoration:none; }
  nav a:hover { background:var(--bg); color:var(--accent); }
  main { padding:24px; min-width:0; }
  section { background:var(--card); border:1px solid var(--line); border-radius:12px;
            padding:16px 20px 20px; margin-bottom:24px; scroll-margin-top:64px; }
  section h2 { font-size:17px; margin:0; }
  .src { font-size:12px; color:var(--muted); margin:4px 0 12px; }
  .canvas { overflow:auto; }
  .canvas pre { margin:0; transform-origin:top left; }
  .canvas svg { max-width:none !important; }
  @media (max-width:760px) {
    .layout { grid-template-columns:1fr; }
    nav { display:none; }
    main { padding:16px; }
  }
</style>
</head>
<body>
<header>
  <h1>올빗 · IA & 유저 플로우</h1>
  <label>확대 <input id="zoom" type="range" min="50" max="200" value="100" step="10"> <span id="zv">100%</span></label>
</header>
<div class="layout">
  <nav><ul>
{{NAV}}
  </ul></nav>
  <main>
{{SECTIONS}}
  </main>
</div>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad:false, theme:"default", flowchart:{ useMaxWidth:false } });
  await mermaid.run();
  const zoom = document.getElementById("zoom"), zv = document.getElementById("zv");
  zoom.addEventListener("input", () => {
    zv.textContent = zoom.value + "%";
    document.querySelectorAll(".canvas pre").forEach(p => p.style.zoom = zoom.value / 100);
  });
</script>
</body>
</html>
"""

if __name__ == "__main__":
    build()
