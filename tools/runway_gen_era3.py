#!/usr/bin/env python3
"""Genera arte de la Era 3 con Runway a partir de docs/ARTE-RUNWAY-ERA3.prompts.json.
Uso: python3 tools/runway_gen_era3.py <gid> [<gid> ...] | --fase0   [--forzar]
Salida: art/runway/era3/_raw/<gid>.png (no regenera si existe, salvo --forzar). Las referencias (refs) se leen del repo:
las @ref de especie salen de tools/era3-refs.js; las @style/@prev, de generaciones anteriores (el orden importa).
La autenticación la inyecta el proxy del entorno: no hace falta clave. Cada generación cuesta créditos (ver el JSON)."""
import base64, json, sys, time, urllib.request, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.dev.runwayml.com/v1'
H = {'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06', 'Authorization': 'Bearer x'}
D = json.load(open(os.path.join(ROOT, 'docs/ARTE-RUNWAY-ERA3.prompts.json')))
G = {g['gid']: g for g in D['generaciones']}
FASE0 = ['ter.corazon.1', 'ins.corazon.1', 'acu.corazon.1', 'ave.corazon.1',
         'ter.uni.cazador.obrero-caminar', 'ins.uni.colmena.obrero-caminar', 'acu.uni.arrecife.obrero-caminar', 'ave.uni.rapaz.obrero-caminar',
         'ter.suelo.1', 'ins.suelo.1', 'acu.suelo.1', 'ave.suelo.1']
def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, headers=H)
    return json.load(urllib.request.urlopen(req, timeout=120))
def credits():
    try: return call('/organization').get('creditBalance')
    except Exception as e: return 'desconocido (' + str(e) + ')'
def gen(gid, forzar=False):
    g = G[gid]; out = os.path.join(ROOT, 'art/runway/era3/_raw', gid + '.png')
    if os.path.exists(out) and not forzar: return out + ' (ya existía)'
    refs = []
    for r in g['refs']:
        p = os.path.join(ROOT, r['path'])
        if not os.path.exists(p): raise SystemExit('falta la referencia ' + r['path'] + ' (generar antes su gid o correr tools/era3-refs.js)')
        refs.append({'uri': 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode(), 'tag': r['tag']})
    prompt = g['promptText']
    if not refs:   # gen4_image_turbo exige al menos una referencia: se le da el fondo magenta liso (neutro, no aporta estilo)
        refs.append({'uri': 'data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, 'art/runway/era3/_ref/_fondo.png'), 'rb').read()).decode(), 'tag': 'fondo'})
        prompt = ('Background color exactly like @fondo. ' if g['proc'] != 'tile' else 'Ignore the colors of @fondo. ') + prompt
    body = {'model': D['modelo'], 'ratio': g['ratio'], 'promptText': prompt[:1000], 'referenceImages': refs}
    t = call('/text_to_image', body)['id']
    while True:
        r = call('/tasks/' + t)
        if r['status'] == 'SUCCEEDED':
            os.makedirs(os.path.dirname(out), exist_ok=True); urllib.request.urlretrieve(r['output'][0], out); return out
        if r['status'] in ('FAILED', 'CANCELLED'): raise RuntimeError(gid + ' ' + json.dumps(r))
        time.sleep(3)
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; forzar = '--forzar' in sys.argv
    ids = FASE0 if '--fase0' in sys.argv else args
    print('créditos antes:', credits(), flush=True)
    for gid in ids:
        for intento in range(2):
            try: print(gen(gid, forzar), flush=True); break
            except RuntimeError as e: print('reintento', gid, e, flush=True)
    print('créditos después:', credits(), flush=True)
