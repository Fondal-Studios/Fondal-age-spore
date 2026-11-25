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
# --- Ciclo artístico 2: terreno, habitantes, obras y daño -------------------------------------------------------------
OBJ = 'hand painted game sprite, stylized cartoon, thick dark outline, single object on plain white background, '
TILE = 'seamless top-down ground texture, uniform small scale detail, no large shapes, hand painted, stylized cartoon, flat even lighting, fills the frame, no objects, '
TERR = {'ter': {'suelo': 'green grass meadow with small flowers', 'obstaculo': 'a leafy round oak tree', 'veta': 'a big grey boulder rock', 'arbusto': 'a green shrub plant with small red berries on its branches', 'nodo': 'a small stone cairn shrine with a red cloth pennant'},
        'ins': {'suelo': 'dark brown earth soil texture, sepia, small pebbles', 'obstaculo': 'a giant gnarled plant root arching out of the soil', 'veta': 'a translucent golden amber resin blob', 'arbusto': 'a cluster of orange and white mushrooms', 'nodo': 'a tall brown clay termite mound tower'},
        'acu': {'suelo': 'underwater sandy sea floor with ripples, blue green tint', 'obstaculo': 'a branching pink coral plant', 'veta': 'an open oyster shell with white pearls', 'arbusto': 'tall green kelp seaweed', 'nodo': 'a glowing spiral seashell shrine'},
        'ave': {'suelo': 'grassy cliff top meadow with small stones', 'obstaculo': 'a giant tree with a thick trunk and wide canopy', 'veta': 'a pile of wet brown clay mud', 'arbusto': 'a tall seed plant with yellow seed heads', 'nodo': 'a tall wooden perch pole with feathers tied on top'}}
HAB = {'ter_cazador': 'a grey wolf walking, four legs, bushy tail', 'ter_gigante': 'a big armored horned triceratops-like beast walking, four legs', 'ter_ingeniero': 'a brown beaver walking, flat paddle tail', 'ins_colmena': 'a honey bee insect with transparent wings and yellow black striped abdomen, six thin legs',
       'ins_enjambre': 'a green grasshopper insect with long hind legs', 'ins_parasito': 'a purple wasp insect with thin waist, wings and long legs', 'acu_abisal': 'a deep sea anglerfish fish with big teeth and a glowing lure', 'acu_arrecife': 'a tropical clownfish fish with orange and white stripes',
       'acu_anfibio': 'a green newt salamander walking, four legs, long tail', 'ave_rapaz': 'a brown eagle bird standing', 'ave_carronera': 'a black vulture bird with bald pink head standing', 'ave_migratoria': 'a blue swallow bird with forked tail standing'}
# fauna de los mundos de la Era 3 (presas y amenazas que no son especies del jugador)
HAB.update({'lobo': 'a grey wolf with open jaws walking, four legs', 'ciervo': 'a brown deer with antlers walking, four legs', 'conejo': 'a small brown rabbit', 'lucio': 'a grey shark fish swimming',
            'pez': 'a small blue silver fish swimming', 'escarabajo': 'a shiny green beetle insect, six legs'})
MAT = {'ter': 'stone and logs', 'ins': 'beeswax and paper pulp', 'acu': 'coral and seashells', 'ave': 'woven twigs and mud'}
OBRA = {'plano': 'construction site: wooden stakes and string marking a square foundation on bare dirt, a few {m} blocks', 'andamio': 'construction site: wooden scaffolding around low {m} walls',
        'mitad': 'half built small house of {m} wrapped in wooden scaffolding'}
DANO = {'escombros': 'a small pile of broken planks and stones rubble'}
EXTRA = {}
for c in TERR:
    for k, d in TERR[c].items(): EXTRA[c + '.terreno.' + k] = ('tile' if k == 'suelo' else 'obj', (TILE if k == 'suelo' else OBJ) + d)
    for k, d in OBRA.items(): EXTRA[c + '.obra.' + k] = ('obj', OBJ.replace('single object', 'isometric') + d.format(m=MAT[c]))
for sp, d in HAB.items(): EXTRA['hab.' + sp] = ('obj', 'side view game creature sprite facing right, full body, cute, hand painted, stylized cartoon, thick dark outline, single animal on plain white background, ' + d)
for k, d in DANO.items(): EXTRA['gen.dano.' + k] = ('obj', OBJ + d)
GRUPOS = {'--terreno': [k for k in EXTRA if '.terreno.' in k], '--habitantes': [k for k in EXTRA if k.startswith('hab.')], '--obras': [k for k in EXTRA if '.obra.' in k], '--dano': [k for k in EXTRA if k.startswith('gen.dano.')]}
def sketch(gid, path):
    # bocetos por código para piezas que el modelo no logra con texto solo (salían rojas, con cara o como medalla)
    import random
    from PIL import ImageDraw, ImageFilter
    random.seed(len(gid)); im = Image.new('RGB', (384, 384), (255, 255, 255)); d = ImageDraw.Draw(im)
    if gid == 'ins.terreno.suelo':
        im = Image.new('RGB', (384, 384), (120, 86, 52)); d = ImageDraw.Draw(im)
        for i in range(900): x, y, r = random.randint(0, 383), random.randint(0, 383), random.randint(1, 5); c = random.choice([(96, 66, 40), (140, 104, 66), (80, 56, 34), (150, 120, 80)]); d.ellipse([x - r, y - r, x + r, y + r], fill=c)
        for i in range(25): x, y = random.randint(0, 383), random.randint(0, 383); d.polygon([(x, y), (x + 14, y + 5), (x + 4, y + 16)], fill=(160, 110, 50))
        im = im.filter(ImageFilter.GaussianBlur(1))
    elif gid == 'ave.terreno.veta':
        d.ellipse([60, 170, 324, 300], fill=(110, 76, 44), outline=(43, 34, 51), width=4); d.ellipse([110, 195, 280, 270], fill=(84, 58, 34))
        for x in (140, 210, 250): d.ellipse([x, 215, x + 18, 227], fill=(150, 120, 90))
    elif gid == 'ter.terreno.arbusto':
        for cx, cy, r in ((150, 220, 70), (230, 215, 75), (190, 165, 70)): d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(60, 140, 60), outline=(43, 34, 51), width=4)
        for i in range(14): x, y = random.randint(110, 280), random.randint(130, 270); d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(210, 40, 50), outline=(43, 34, 51), width=2)
        d.rectangle([180, 280, 200, 320], fill=(110, 70, 40))
    im.save(path)
SKETCH = {'ins.terreno.suelo', 'ave.terreno.veta', 'ter.terreno.arbusto'}
def tile(src, dst, size=256):
    # baldosa continua sin simetría: se mezcla la imagen con su copia desplazada media baldosa, con peso 1 en el centro y 0 en los bordes
    a = np.array(Image.open(src).convert('RGB').resize((size, size), Image.LANCZOS)).astype(float); b = np.roll(np.roll(a, size // 2, 0), size // 2, 1)
    yy, xx = np.mgrid[0:size, 0:size] / (size - 1); w = (np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy)) * 2) ** .8
    Image.fromarray((a * w[..., None] + b * (1 - w[..., None])).astype(np.uint8)).save(dst)
def game_id(gid):  # la biblia nombra unico/maravilla sin nivel; el juego, con .1
    if gid in EXTRA: return gid
    p = gid.split('.'); return gid + '.1' if len(p) == 2 else gid
def prompt(gid):
    if gid in EXTRA: return EXTRA[gid][1]
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
    fp = os.path.join(OUT, 'face.json'); face = json.load(open(fp)) if os.path.exists(fp) else {}   # hacia dónde mira cada habitante pintado (1 derecha, -1 izquierda), revisado a mano
    box = {}   # caja del contenido de cada habitante (fracciones 0..1): la Era 3 ubica ahí los rasgos (alas, cuernos...)
    for i in ids:
        if not i.startswith('hab.'): continue
        a = np.array(Image.open(os.path.join(OUT, i + '.png')).convert('RGBA'))[..., 3] > 40; ys, xs = np.where(a)
        if len(xs): box[i[4:]] = [round(xs.min() / a.shape[1], 3), round(ys.min() / a.shape[0], 3), round((xs.max() + 1) / a.shape[1], 3), round((ys.max() + 1) / a.shape[0], 3)]
    open(os.path.join(OUT, 'manifest.js'), 'w').write('/* Generado por tools/anakin_dibujar_era3.py: dibujos de la Era 3 disponibles (motor de Anakin). */\nwindow.ERA3_ART = ' + json.dumps(ids) + ';\nwindow.ERA3_FACE = ' + json.dumps(face) + ';\nwindow.ERA3_BOX = ' + json.dumps(box) + ';\n')
    return len(ids)
def gen(gid, forzar=False, seed=int(os.environ.get('SD_SEED', 7))):
    gi = game_id(gid); dst = os.path.join(OUT, gi + '.png')
    if os.path.exists(dst) and not forzar: return 'ya existía'
    os.makedirs(RAW, exist_ok=True); raw = os.path.join(RAW, gi + '.png'); t0 = time.time()
    extra = []; mode = EXTRA[gid][0] if gid in EXTRA else 'b'; steps = '8' if gid.startswith('hab.') else '4'
    if gid in SKETCH:   # imagen-a-imagen desde un boceto hecho por código
        sk = os.path.join(RAW, '_boceto_' + gi + '.png'); os.makedirs(RAW, exist_ok=True); sketch(gid, sk); extra = ['-i', sk, '--strength', '0.5']; steps = '8'
    if mode == 'hab':   # habitantes: imagen-a-imagen desde el dibujo de la especie en la Era 2 (misma silueta, cenital, mirando a la derecha)
        extra = ['-i', os.path.join(ROOT, 'art/runway/era3/_ref', gid[4:] + '.png'), '--strength', '0.55']; steps = '8'
    if gid.startswith('ave.') and '.recurso.' not in gid and gid not in EXTRA:   # aves: imagen-a-imagen desde el boceto de nido
        sk = os.path.join(RAW, '_nido_' + gi.split('.')[-1] + '.png'); nest_sketch(sk, gi.split('.')[-1]); extra = ['-i', sk, '--strength', '0.5']; steps = '8'
    subprocess.run([SD, '-m', MODEL, *extra, '-p', prompt(gid), '-n', NEG + (', face, eyes, mouth, cute character, mascot, flag, national flag' if gid in EXTRA and not gid.startswith('hab.') else '') + (', house, roof' if extra else '') + (', circle, badge, button, app icon, coin, round frame, sphere, black ball, dark' if '.recurso.' in gid else ''), '--sampling-method', 'lcm', '--steps', steps, '--cfg-scale', '1.5', '-W', '384', '-H', '384', '-s', str(seed + len(gid)), '-t', str(os.cpu_count()), '-o', raw], check=True, capture_output=True)
    if mode == 'tile': tile(raw, dst); return 'ok %.0fs' % (time.time() - t0)
    ok = cutout(raw, dst); return ('ok' if ok else 'SIN OBJETO') + ' %.0fs' % (time.time() - t0)
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    grp = [g for f, L in GRUPOS.items() if f in sys.argv for g in L]
    ids = grp or (ICON_IDS if '--iconos' in sys.argv else args or sorted((k for k in R), key=lambda k: (k.split('.')[2] if len(k.split('.')) > 2 else '4', k)))
    for g in ids:
        try: print(g, gen(g, '--forzar' in sys.argv), flush=True)
        except Exception as e: print(g, 'ERROR', e, flush=True)
        manifest()
    print('manifiesto:', manifest(), 'dibujos', flush=True)
