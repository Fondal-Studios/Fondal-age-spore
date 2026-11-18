#!/usr/bin/env python3
"""Dibuja los edificios de la Era 3 con el motor de imágenes de Anakin (stable-diffusion.cpp + DreamShaper 8 LCM),
gratis y local (sin Runway). Mismo motor y modelo que pc/imagenes.ps1 del repo Anakin; acá corre en CPU.
Uso: python3 tools/anakin_dibujar_era3.py [ids...]   (sin ids: los 140 edificios, primero nivel 1, después 2 y 3)
Requiere: SD_CLI (ruta a sd-cli) y SD_MODEL (DreamShaper8_LCM.safetensors). Salida: art/era3/<id>.png (256 px, fondo
transparente) y art/era3/manifest.js (lista de ids que la Era 3 registra al cargar). Descripciones: tablas de
docs/ARTE-RUNWAY-ERA3.md (columna en inglés). No regenera lo que ya existe salvo --forzar."""
import json, os, re, subprocess, sys, time
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'art/era3'); RAW = os.path.join(OUT, '_raw')
SD = os.environ.get('SD_CLI', '/home/user/sdtools/sdcpp/build/bin/sd-cli'); MODEL = os.environ.get('SD_MODEL', '/home/user/sdtools/modelos/DreamShaper8_LCM.safetensors')
CIV = {'ter': 'prehistoric tribal hut of stone, logs and animal hides', 'ins': 'insect hive architecture of beeswax, paper pulp and amber honeycomb',
       'acu': 'underwater coral reef building with seashells, pearls and seaweed', 'ave': 'bird nest architecture of woven twigs, mud and feathers'}
LV = {'1': 'small simple', '2': 'bigger improved', '3': 'grand ornate'}
STY = 'isometric mobile strategy game building sprite, hand painted, stylized cartoon, thick dark outline, single building on plain white background'
NEG = 'text, letters, watermark, people, human, photo, realistic, blurry, cropped, frame, dark background, colored background, scenery, landscape, sky, multiple buildings'
def rows():
    R = {}
    for l in open(os.path.join(ROOT, 'docs/ARTE-RUNWAY-ERA3.md'), encoding='utf8'):
        m = re.match(r'^\| `([a-z0-9_.\-]+)` \|(.*)\|\s*$', l)
        if m:
            c = [x.strip() for x in m.group(2).split('|')]
            if len(c) == 4 and re.match(r'F\d', c[0]) and re.search(r'[a-z]{3}', c[3]): R.setdefault(m.group(1), c)
    return R
R = rows()
ICO = {'ter': {'comida': 'raw meat and red berries', 'mat1': 'stack of wooden logs', 'mat2': 'pile of grey stones', 'saber': 'glowing carved rune stone'},
       'ins': {'comida': 'jar of golden royal jelly', 'mat1': 'ball of chewed plant fiber', 'mat2': 'chunk of amber resin and beeswax', 'saber': 'glowing honeycomb crystal'},
       'acu': {'comida': 'green seaweed and a small fish', 'mat1': 'pink coral branch', 'mat2': 'iridescent mother of pearl seashell', 'saber': 'glowing spiral conch shell'},
       'ave': {'comida': 'pile of seeds and beetles', 'mat1': 'bundle of twigs', 'mat2': 'clump of wet mud', 'saber': 'glowing golden feather'}}
ICON_IDS = [c + '.recurso.' + r for c in ICO for r in ICO[c]]
def game_id(gid):  # la biblia nombra unico/maravilla sin nivel; el juego, con .1
    p = gid.split('.'); return gid + '.1' if len(p) == 2 else gid
def prompt(gid):
    civ, slot, *l = gid.split('.')
    if slot == 'recurso': return 'game resource icon, hand painted, stylized cartoon, thick dark outline, single object on plain white background, ' + ICO[civ][l[0]]
    return f"{STY}, {LV[l[0] if l else '3']} {CIV[civ]}, {R[gid][3]}"
def cutout(src, dst, size=256, tol=34):
    im = np.array(Image.open(src).convert('RGB')).astype(np.int32); h, w, _ = im.shape
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]); ref = np.median(border, axis=0)
    near = np.sqrt(((im - ref) ** 2).sum(-1)) < tol
    lab, _ = ndimage.label(near); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # 2.ª pasada: el modelo suele poner una «nube» gris clara detrás del edificio; se quita lo gris claro y poco saturado
    # que toca el fondo (crece desde el fondo, así no come piedras grises del interior del edificio).
    mx, mn = im.max(-1), im.min(-1); grey = (mx - mn < 22) & (mx > 95)
    for _ in range(3):
        lab3, _n = ndimage.label(grey | bg); touch = set(np.unique(lab3[bg])) - {0}; bg2 = np.isin(lab3, list(touch))
        if bg2.sum() == bg.sum(): break
        bg = bg2
    fg = ~bg
    fg = ndimage.binary_opening(fg, iterations=2); lab2, n = ndimage.label(fg)
    if n > 1:  # se queda con el objeto principal (y piezas grandes pegadas)
        sz = ndimage.sum(fg, lab2, range(1, n + 1)); keep = [i + 1 for i, s in enumerate(sz) if s >= .08 * sz.max()]; fg = np.isin(lab2, keep)
    alpha = ndimage.gaussian_filter(fg.astype(float), .8)
    rgba = np.dstack([im.astype(np.uint8), (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])
    ys, xs = np.where(fg)
    if len(xs) < 50: return False
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); side = max(x1 - x0, y1 - y0) + 8
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    can = Image.new('RGBA', (side, side), (0, 0, 0, 0)); can.paste(Image.fromarray(rgba).crop((x0, y0, x1 + 1, y1 + 1)), (cx - x0 - (cx - side // 2) - (x0 - x0), 0))
    can = Image.new('RGBA', (side, side), (0, 0, 0, 0)); can.paste(Image.fromarray(rgba).crop((x0, y0, x1 + 1, y1 + 1)), ((side - (x1 - x0 + 1)) // 2, side - (y1 - y0 + 1) - 4))
    can.resize((size, size), Image.LANCZOS).save(dst); return True
def manifest():
    ids = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.png'))
    open(os.path.join(OUT, 'manifest.js'), 'w').write('/* Generado por tools/anakin_dibujar_era3.py: dibujos de la Era 3 disponibles (motor de Anakin). */\nwindow.ERA3_ART = ' + json.dumps(ids) + ';\n')
    return len(ids)
def gen(gid, forzar=False, seed=7):
    gi = game_id(gid); dst = os.path.join(OUT, gi + '.png')
    if os.path.exists(dst) and not forzar: return 'ya existía'
    os.makedirs(RAW, exist_ok=True); raw = os.path.join(RAW, gi + '.png'); t0 = time.time()
    subprocess.run([SD, '-m', MODEL, '-p', prompt(gid), '-n', NEG, '--sampling-method', 'lcm', '--steps', '4', '--cfg-scale', '1.5', '-W', '384', '-H', '384', '-s', str(seed), '-t', str(os.cpu_count()), '-o', raw], check=True, capture_output=True)
    ok = cutout(raw, dst); return ('ok' if ok else 'SIN OBJETO') + ' %.0fs' % (time.time() - t0)
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    ids = ICON_IDS if '--iconos' in sys.argv else args or sorted((k for k in R), key=lambda k: (k.split('.')[2] if len(k.split('.')) > 2 else '4', k))
    for g in ids:
        try: print(g, gen(g, '--forzar' in sys.argv), flush=True)
        except Exception as e: print(g, 'ERROR', e, flush=True)
        manifest()
    print('manifiesto:', manifest(), 'dibujos', flush=True)
