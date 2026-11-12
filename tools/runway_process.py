#!/usr/bin/env python3
"""Convierte art/runway/raw/*.png (fondo blanco) en sprites con alfa: art/runway/cells/<id>.png (256x256, centrados)."""
import os, sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT = os.path.join(ROOT, 'art/runway/raw'), os.path.join(ROOT, 'art/runway/cells')
os.makedirs(OUT, exist_ok=True)
HOLES = {'colo2.png': 1500}   # solo estos sprites tienen huecos de fondo entre células
def process(fn):
    im = np.asarray(Image.open(os.path.join(RAW, fn)).convert('RGB')).astype(np.float32)
    dist = np.sqrt(((255 - im) ** 2).sum(2))            # distancia al blanco
    bg = dist < 34
    lab, n = ndi.label(bg)                               # solo el fondo conectado con el borde
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgm = np.isin(lab, list(edge))
    for i in range(1, n + 1):                            # huecos blancos grandes entre células (no brillos pequeños)
        if i not in edge and (lab == i).sum() > HOLES.get(fn, 10**9): bgm |= (lab == i)
    alpha = (~bgm).astype(np.float32)
    alpha = ndi.binary_opening(alpha > 0, iterations=1)
    cl, m = ndi.label(alpha)                             # descarta manchas sueltas (texto, motas)
    if m > 1:
        sz = ndi.sum(alpha, cl, range(1, m + 1)); keep = [i + 1 for i, v in enumerate(sz) if v > 0.02 * sz.max()]
        alpha = np.isin(cl, keep)
    alpha = alpha.astype(np.float32)
    a = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.4))
    rgba = Image.fromarray(im.astype(np.uint8)).convert('RGBA'); rgba.putalpha(a)
    bb = rgba.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    rgba = rgba.crop(bb); s = max(rgba.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(rgba, ((s - rgba.width) // 2, (s - rgba.height) // 2))
    pad = int(s * .04); big = Image.new('RGBA', (s + 2 * pad, s + 2 * pad), (0, 0, 0, 0)); big.paste(sq, (pad, pad))
    big.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, fn), optimize=True)
for fn in (sys.argv[1:] or sorted(os.listdir(RAW))):
    process(fn if fn.endswith('.png') else fn + '.png'); print('ok', fn)
