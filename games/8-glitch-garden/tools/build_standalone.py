#!/usr/bin/env python3
"""Bundle index.html + css + js + images into ONE self-contained HTML file (no external requests)."""
import base64, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'glitch-garden-standalone.html'

def data_uri(rel):
    p = root / rel
    return 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode()

html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css' / 'style.css').read_text(encoding='utf-8')
css = re.sub(r'url\(\.\./(assets/[^)]+)\)', lambda m: 'url(' + data_uri(m.group(1)) + ')', css)
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')

def inline_js(m):
    src = (root / m.group(1)).read_text(encoding='utf-8')
    src = re.sub(r"'(assets/[^']+)'", lambda k: "'" + data_uri(k.group(1)) + "'", src)
    return '<script>\n' + src + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print('wrote', out, round(out.stat().st_size / 1024), 'KB')
