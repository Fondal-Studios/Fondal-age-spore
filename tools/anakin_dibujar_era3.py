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
       'acu': 'underwater coral reef building with seashells, pearls and seaweed', 'ave': 'huge bird nest of woven twigs on a thick tree branch, eggs and feathers'}
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
ICO = {'ter': {'comida': 'a roasted meat leg and red berries', 'mat1': 'three stacked wooden logs', 'mat2': 'a pile of grey rocks', 'saber': 'a glowing carved rune stone'},
       'ins': {'comida': 'jar of golden royal jelly', 'mat1': 'a ball of grey paper pulp fiber', 'mat2': 'a chunk of golden amber resin', 'saber': 'a glowing piece of honeycomb'},
       'acu': {'comida': 'a small blue fish with green seaweed', 'mat1': 'pink coral branch', 'mat2': 'iridescent mother of pearl seashell', 'saber': 'glowing spiral conch shell'},
       'ave': {'comida': 'a pile of sunflower seeds', 'mat1': 'a bundle of twigs tied with string', 'mat2': 'a lump of brown wet mud', 'saber': 'glowing golden feather'}}
AVE = {'corazon': 'great central nest hall', 'vivienda': 'cluster of small nest pods', 'almacen': 'nest full of stored seeds', 'granja': 'seed patch beside a nest',
       'cria': 'nest full of insect larvae', 'ext1': 'nest with piles of twigs', 'ext2': 'nest of dried mud', 'saber': 'nest with a lookout perch and a feather banner',
       'muro': 'low fence of woven twigs', 'torre': 'tall nest on top of a wooden pole', 'cuartel': 'big guard nest with sharp thorns', 'unico': 'roosting nest on a giant tree', 'maravilla': 'monumental nest arch crowned with feathers'}
ICON_IDS = [c + '.recurso.' + r for c in ICO for r in ICO[c]]
def game_id(gid):  # la biblia nombra unico/maravilla sin nivel; el juego, con .1
    p = gid.split('.'); return gid + '.1' if len(p) == 2 else gid
def prompt(gid):
    civ, slot, *l = gid.split('.')
    if civ == 'ave' and slot in AVE: return 'isometric mobile strategy game sprite, hand painted, stylized cartoon, thick dark outline, white background, huge bird nest of woven twigs with eggs and feathers, ' + {'1': 'small', '2': 'large', '3': 'huge'}[l[0] if l else '3'] + ' ' + AVE[slot]
    if slot == 'recurso': return 'hand painted game item, stylized cartoon, thick dark outline, single object on plain white background, ' + ICO[civ][l[0]]
    return f"{STY}, {LV[l[0] if l else '3']} {CIV[civ]}, {R[gid][3]}"
def nest_sketch(path, lv):
    # Boceto de nido (pasto, rama, cuenco de ramitas, huevos, plumas) para imagen-a-imagen: sin él, el modelo dibuja casas.
    import math, random
    from PIL import ImageDraw
    random.seed(3 + int(lv)); k = {'1': .8, '2': .95, '3': 1.1}[lv]
    im = Image.new('RGB', (384, 384), (255, 255, 255)); d = ImageDraw.Draw(im)
    d.polygon([(192, 250), (340, 300), (192, 350), (44, 300)], fill=(110, 170, 70), outline=(43, 34, 51))
    d.polygon([(44, 300), (192, 350), (192, 365), (44, 315)], fill=(120, 85, 50)); d.polygon([(340, 300), (192, 350), (192, 365), (340, 315)], fill=(95, 65, 40))
    d.line([(70, 280), (310, 240)], fill=(100, 70, 40), width=18)
    rx, ry = 100 * k, 70 * k
    d.ellipse([192 - rx, 220 - ry, 192 + rx, 220 + ry], fill=(140, 95, 55), outline=(43, 34, 51), width=3)
    d.ellipse([192 - rx * .8, 220 - ry, 192 + rx * .8, 220 - ry * .1], fill=(90, 60, 35))
    for i in range(160):
        a = random.uniform(0, math.pi * 2); r = random.uniform(.6, 1); x = 192 + math.cos(a) * rx * r; y = 220 + math.sin(a) * ry * r
        d.line([(x, y), (x + random.uniform(-25, 25), y + random.uniform(-8, 8))], fill=random.choice([(170, 120, 70), (120, 80, 45), (190, 150, 90)]), width=2)
    for ex in (165, 192, 219): d.ellipse([ex - 13, 220 - ry + 15, ex + 13, 220 - ry + 48], fill=(235, 235, 215), outline=(43, 34, 51), width=2)
    for fx, fy in ((192 - rx + 18, 220 - ry + 10), (192 + rx - 22, 220 - ry)): d.polygon([(fx, fy), (fx + 10, fy - 45), (fx + 18, fy)], fill=(220, 90, 60), outline=(43, 34, 51))
    im.save(path)
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
    extra = []; steps = '4'
    if gid.startswith('ave.') and '.recurso.' not in gid:   # aves: imagen-a-imagen desde el boceto de nido
        sk = os.path.join(RAW, '_nido_' + gi.split('.')[-1] + '.png'); nest_sketch(sk, gi.split('.')[-1]); extra = ['-i', sk, '--strength', '0.5']; steps = '8'
    subprocess.run([SD, '-m', MODEL, *extra, '-p', prompt(gid), '-n', NEG + (', house, roof' if extra else '') + (', circle, badge, button, app icon, coin, round frame' if '.recurso.' in gid else ''), '--sampling-method', 'lcm', '--steps', steps, '--cfg-scale', '1.5', '-W', '384', '-H', '384', '-s', str(seed + len(gid)), '-t', str(os.cpu_count()), '-o', raw], check=True, capture_output=True)
    ok = cutout(raw, dst); return ('ok' if ok else 'SIN OBJETO') + ' %.0fs' % (time.time() - t0)
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    ids = ICON_IDS if '--iconos' in sys.argv else args or sorted((k for k in R), key=lambda k: (k.split('.')[2] if len(k.split('.')) > 2 else '4', k))
    for g in ids:
        try: print(g, gen(g, '--forzar' in sys.argv), flush=True)
        except Exception as e: print(g, 'ERROR', e, flush=True)
        manifest()
    print('manifiesto:', manifest(), 'dibujos', flush=True)
