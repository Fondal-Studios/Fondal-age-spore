#!/usr/bin/env python3
"""Genera los cuerpos celulares pintados con Runway (gen4_image_turbo) usando un dibujo de art/png como referencia de estilo.
Uso: python3 tools/runway_gen.py <id> [<id> ...]   (ids de CELLS) ; salida en art/runway/raw/<id>.png
La autenticación la inyecta el proxy del entorno: no hace falta clave."""
import base64, json, sys, time, urllib.request, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.dev.runwayml.com/v1'
H = {'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06', 'Authorization': 'Bearer x'}
STYLE = ("hand-painted 2D game sprite of a single microscopic cell seen from above, centered, rich painterly gouache texture, "
         "bold dark plum outline, soft glowing translucent membrane, glossy highlight top-left, visible organelles inside, "
         "isolated on a flat plain white background, no text, no shadow, no scene")
STYLE_TR = ("hand-painted 2D game sprite, rich painterly gouache texture, bold dark plum outline, soft glossy highlight, "
            "isolated and centered on a flat plain white background, no cell body, no text, no shadow, no scene")
from cells_spec import CELLS
def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, headers=H)
    return json.load(urllib.request.urlopen(req, timeout=120))
def gen(cid):
    s = CELLS[cid]
    ref = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, 'art/png', s['ref'] + '.png'), 'rb').read()).decode()
    style = STYLE_TR if cid.startswith('tr_') else STYLE
    body = {'model': 'gen4_image_turbo', 'ratio': '1024:1024', 'promptText': 'In the style of @ref: ' + s['prompt'] + '. ' + style,
            'referenceImages': [{'uri': ref, 'tag': 'ref'}]}
    t = call('/text_to_image', body)['id']
    while True:
        r = call('/tasks/' + t)
        if r['status'] == 'SUCCEEDED':
            out = os.path.join(ROOT, 'art/runway/raw', cid + '.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
            urllib.request.urlretrieve(r['output'][0], out); return out
        if r['status'] in ('FAILED', 'CANCELLED'): raise SystemExit(cid + ' ' + json.dumps(r))
        time.sleep(3)
if __name__ == '__main__':
    for c in sys.argv[1:]:
        for intento in range(3):
            try: print(gen(c), flush=True); break
            except (SystemExit, Exception) as e: print('reintento', c, e, flush=True)
