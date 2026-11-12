import json, math, os
OUT = '#2b2233'
S = {}   # id -> (defs, body)
NAMES = {}
def reg(id, name):
    def deco(f):
        S[id] = f; NAMES[id] = name; return f
    return deco
def g(i, a, b, cx=.35, cy=.3, r=.9): return f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></radialGradient>'
def lg(i, a, b, x1=0, y1=0, x2=0, y2=1): return f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'
def el(cx, cy, rx, ry, fill, sw=2.2, rot=0, op=1, stroke=OUT, extra=''): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" transform="rotate({rot} {cx} {cy})" {extra}/>'
def ci(cx, cy, r, fill, sw=2.2, stroke=OUT, op=1): return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}"/>'
def pa(d, fill='none', sw=2.2, stroke=OUT, op=1, cap='round', extra=''): return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="{cap}" stroke-linejoin="round" opacity="{op}" {extra}/>'
def ln(x1, y1, x2, y2, sw=2.2, stroke=OUT, op=1): return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" opacity="{op}"/>'
def hl(cx, cy, rx, ry, op=.5, rot=-25): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" opacity="{op}" transform="rotate({rot} {cx} {cy})"/>'
def poly(pts, fill, sw=2.2): return f'<polygon points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="{fill}" stroke="{OUT}" stroke-width="{sw}" stroke-linejoin="round"/>'
def ngon(cx, cy, r, n, fill, rot=0, sw=2.2): return poly([(round(cx + r * math.cos(rot + i * 2 * math.pi / n), 1), round(cy + r * math.sin(rot + i * 2 * math.pi / n), 1)) for i in range(n)], fill, sw)

# ---------- Depredador ----------
@reg('flagelo', 'Flagelo (axonema 9+2)')
def _():
    d = g('a', '#d8e4ff', '#7a90d8') + g('b', '#ffe9a8', '#e0a020') + lg('c', '#6a7ad0', '#2a3a90', 0, 0, 1, 0)
    b = pa('M22 60 C 36 40, 46 78, 62 56 S 84 40, 94 22', 'none', 7, '#2b2233') + pa('M22 60 C 36 40, 46 78, 62 56 S 84 40, 94 22', 'none', 4, '#9db4ff')
    b += ci(20, 62, 9, 'url(#b)') + hl(17, 59, 3.5, 2.2, .7) + ci(20, 62, 3, '#8a5a10', 1.4)
    b += ci(76, 80, 17, 'url(#a)') + ''.join(ci(round(76 + 11 * math.cos(i * 2 * math.pi / 9), 1), round(80 + 11 * math.sin(i * 2 * math.pi / 9), 1), 2.6, 'url(#c)', 1.2) for i in range(9)) + ci(74, 79, 2.3, '#2a3a90', 1) + ci(79, 82, 2.3, '#2a3a90', 1)
    return d, b
@reg('mandibula', 'Pseudópodos fagocíticos')
def _():
    d = g('a', '#f4fff0', '#9bd68a') + g('p', '#ffd0d0', '#e05a5a')
    b = pa('M18 52 C 8 36, 24 18, 40 24 C 52 10, 74 16, 74 34 C 90 34, 94 58, 78 68 C 76 86, 40 90, 30 74 C 14 74, 10 62, 18 52 Z', 'url(#a)', 2.6)
    b += pa('M70 30 C 90 24, 98 44, 88 56', 'none', 2.4) + ci(84, 44, 8, 'url(#p)', 2) + hl(81, 41, 3, 2, .7)
    b += el(34, 52, 9, 7, '#6fa8e8', 2, 0, .85) + ci(34, 52, 3, '#2a4a90', 1.4) + hl(30, 49, 3, 2, .8)
    return d, b
@reg('absorcion', 'Vacuola digestiva')
def _():
    d = g('a', '#e8fff4', '#8ad0b0') + g('v', '#e2f4ff', '#6ab0e0') + g('f', '#ffd9a0', '#e0802a')
    b = ci(50, 50, 40, 'url(#a)', 2.8) + ci(56, 54, 22, 'url(#v)', 2.6) + hl(48, 44, 8, 4, .6)
    b += pa('M44 54 C 44 44, 60 42, 66 50 C 72 58, 62 68, 52 64 C 46 62, 44 58, 44 54 Z', 'url(#f)', 2) + pa('M52 52 L58 58 M58 52 L52 58', 'none', 1.6, '#7a3a10')
    b += ''.join(ci(x, y, r, '#fff', 1.2, '#4a90c0', .8) for x, y, r in [(70, 44, 3), (74, 56, 2.2), (64, 70, 2.6), (48, 66, 1.8)])
    b += ci(22, 36, 7, '#c9a0ff', 1.8) + ci(26, 66, 5, '#c9a0ff', 1.6)
    return d, b
@reg('manada', 'Quimiotaxis colectiva')
def _():
    d = '<radialGradient id="q" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe14d" stop-opacity=".95"/><stop offset="1" stop-color="#ffe14d" stop-opacity="0"/></radialGradient>' + g('a', '#c9f0e0', '#4aa890')
    b = ci(78, 20, 28, 'url(#q)', 0, 'none') + ci(78, 20, 6, '#ffd23a', 2)
    for (x, y, rot) in [(20, 74, -50), (38, 54, -42), (22, 40, -30)]:
        b += el(x, y, 11, 8, 'url(#a)', 2.4, rot) + hl(x - 3, y - 3, 4, 2.4, .6, rot) + pa(f'M{x+6} {y-8} q 9 -10 17 -8', 'none', 2.2) + ci(x, y, 3, '#2a6a58', 1.2)
    b += pa('M44 66 C 56 62, 64 52, 66 38', 'none', 2.4, '#e07a10') + poly([(66, 30), (60, 40), (72, 40)], '#e07a10', 1.6)
    return d, b
@reg('zarpazo', 'Tricocistos')
def _():
    d = g('a', '#fff0e0', '#e0b080') + lg('t', '#7a2a2a', '#3a1010', 0, 0, 1, 0)
    b = el(40, 60, 34, 22, 'url(#a)', 2.8, -20) + hl(28, 50, 9, 4, .6)
    for (x, y, r) in [(18, 64, -70), (28, 74, -50), (46, 78, -20), (58, 70, 10), (24, 50, -90)]:
        b += f'<rect x="{x-3}" y="{y-6}" width="6" height="12" rx="2.5" fill="#f4d8b8" stroke="{OUT}" stroke-width="1.5" transform="rotate({r} {x} {y})"/>'
    b += pa('M62 50 C 70 40, 80 36, 90 18', 'none', 3, '#7a2a2a') + ''.join(poly([(round(66 + i * 7, 1), round(46 - i * 8.2, 1)), (round(72 + i * 7, 1), round(44 - i * 8.2, 1)), (round(68 + i * 7, 1), round(38 - i * 8.2, 1))], '#c0392b', 1.2) for i in range(3))
    b += ci(40, 60, 9, '#c9a0e0', 2) + ci(40, 60, 3, '#6a3a90', 1.2)
    return d, b
@reg('frenesi', 'Ráfaga de ATP')
def _():
    d = g('m', '#ffd09a', '#e0661e')
    b = el(46, 56, 34, 22, 'url(#m)', 2.8, -18) + pa('M22 60 q 6 -10 12 0 t 12 0 t 12 0 t 12 0', 'none', 2, '#a04010') + pa('M24 70 q 6 -9 12 0 t 12 0 t 12 0', 'none', 2, '#a04010') + hl(34, 46, 10, 4, .55)
    b += poly([(64, 6), (44, 40), (58, 40), (46, 72), (80, 30), (64, 30), (76, 6)], '#ffe83a', 2.4)
    b += ci(24, 30, 5, '#ffe83a', 1.6) + ci(14, 42, 3.5, '#ffe83a', 1.4) + ci(84, 78, 5, '#ffe83a', 1.6)
    return d, b
@reg('digestion', 'Lisosomas hidrolíticos')
def _():
    d = g('l', '#e8d0ff', '#8a5cd0') + g('f', '#ffd9a0', '#e0802a')
    b = ci(30, 30, 20, 'url(#l)', 2.6) + ci(70, 38, 17, 'url(#l)', 2.6) + ci(44, 74, 15, 'url(#l)', 2.6)
    for (x, y, rot) in [(30, 30, 40), (70, 38, 200), (44, 74, 300)]:
        b += f'<path d="M{x} {y} L{x+9} {y-6} A 10 10 0 1 0 {x+9} {y+6} Z" fill="#fff4c0" stroke="{OUT}" stroke-width="1.8" transform="rotate({rot} {x} {y})"/>'
    b += ngon(52, 52, 9, 6, 'url(#f)', .3, 2) + hl(26, 22, 6, 3, .6) + hl(66, 32, 5, 2.4, .6)
    return d, b
@reg('apex', 'Citoesqueleto de actina y miosina')
def _():
    d = lg('r', '#ff9a9a', '#c0392b', 0, 0, 0, 1) + lg('t', '#fff0d0', '#d8b080', 0, 0, 0, 1)
    b = ''.join(ln(x, 16, x, 84, 5, '#7a2a2a') for x in (14, 86))
    b += ''.join(f'<rect x="14" y="{y-3}" width="72" height="6" rx="3" fill="url(#t)" stroke="{OUT}" stroke-width="1.6"/>' for y in (26, 50, 74))
    for y in (38, 62):
        b += f'<rect x="26" y="{y-6}" width="48" height="12" rx="6" fill="url(#r)" stroke="{OUT}" stroke-width="2"/>'
        for x in range(32, 70, 9):
            b += pa(f'M{x} {y-6} l 4 -8 M{x+4} {y+6} l -4 8', 'none', 2.2, '#c0392b')
    return d, b

# ---------- Parásito ----------
@reg('ventosas', 'Haustorios')
def _():
    d = g('h', '#d8c8ff', '#7a5cc8') + g('p', '#ffe0e0', '#d88a8a')
    b = pa('M2 96 C 18 62, 82 62, 98 96 Z', 'url(#p)', 2.6) + ci(50, 24, 17, 'url(#h)', 2.6) + hl(44, 18, 6, 3, .6)
    for (x0, x1) in [(36, 26), (50, 50), (64, 74)]:
        b += pa(f'M{x0} 38 C {x0-6} 52, {x1+4} 56, {x1} 70', 'none', 4, '#5a3ca8') + ci(x1, 72, 7, '#e8dcff', 2.2) + ci(x1, 72, 3.2, '#5a3ca8', 1.4)
    return d, b
@reg('toxina', 'Extrusomas con toxina')
def _():
    d = g('a', '#f4ffe0', '#a8d870') + g('v', '#d4ff7a', '#58c43a')
    b = ci(46, 54, 36, 'url(#a)', 2.8) + hl(34, 40, 10, 5, .55)
    for (x, y) in [(22, 50), (30, 72), (50, 82), (68, 70)]:
        b += ci(x, y, 7, 'url(#v)', 2) + ci(x - 2, y - 2, 2, '#fff', 0, 'none', .8)
    b += pa('M76 36 C 82 30, 86 34, 84 40', 'none', 2.2) + ci(88, 24, 6, 'url(#v)', 1.8) + ci(94, 40, 3.4, 'url(#v)', 1.6) + ci(80, 14, 3, 'url(#v)', 1.4)
    b += ngon(46, 52, 8, 6, '#6a3a90', .2, 1.8) + pa('M42 52 h8 M46 48 v8', 'none', 1.6, '#d4ff7a')
    return d, b
@reg('mimetismo', 'Cubierta antigénica variable')
def _():
    d = g('a', '#e0f0ff', '#8ab0d8')
    b = ci(50, 52, 28, 'url(#a)', 2.6) + hl(40, 40, 8, 4, .55)
    cols = ['#ff6b6b', '#ffd23a', '#4dd6a8', '#6b8cff', '#ff7bd1', '#a97bff', '#ff9a3a', '#4dc3ff']
    for i in range(16):
        a = i * 2 * math.pi / 16; x = 50 + 28 * math.cos(a); y = 52 + 28 * math.sin(a); x2 = 50 + 40 * math.cos(a); y2 = 52 + 40 * math.sin(a)
        b += ln(round(x, 1), round(y, 1), round(x2, 1), round(y2, 1), 2) + ci(round(x2, 1), round(y2, 1), 4.2, cols[i % 8], 1.6)
    b += pa('M38 56 a 12 12 0 1 1 6 10', 'none', 2.4, '#4a6a90') + poly([(40, 68), (50, 66), (44, 58)], '#4a6a90', 1)
    return d, b
@reg('esporas', 'Quistes y esporas')
def _():
    d = g('c1', '#fff4d0', '#d8b060') + g('c2', '#f0ffd8', '#a8d070')
    b = ci(50, 50, 40, 'url(#c1)', 3) + ci(50, 50, 33, 'none', 1.6, '#8a6a2a') + ci(50, 50, 26, 'url(#c2)', 2.2)
    for (x, y) in [(42, 42), (58, 44), (50, 58), (38, 58), (62, 60)]:
        b += ci(x, y, 5.5, '#6a9a2a', 1.8) + ci(x - 1.5, y - 1.5, 1.6, '#e0ffb0', 0, 'none', .9)
    b += hl(36, 30, 9, 4, .5)
    return d, b
@reg('saqueo', 'Transportadores de membrana')
def _():
    d = lg('m', '#ffe9c8', '#e0a860', 0, 0, 0, 1) + lg('p', '#9ad0ff', '#3a80d0', 0, 0, 1, 0)
    b = f'<rect x="2" y="42" width="96" height="16" rx="8" fill="url(#m)" stroke="{OUT}" stroke-width="2.4"/>' + ''.join(ci(x, 50, 3, '#fff', 0, 'none', .6) for x in (12, 28, 44, 62, 78, 92))
    for x in (24, 52, 78):
        b += f'<rect x="{x-9}" y="30" width="18" height="40" rx="9" fill="url(#p)" stroke="{OUT}" stroke-width="2.2"/>' + f'<rect x="{x-3}" y="30" width="6" height="40" fill="#1a2a50" opacity=".55"/>'
        b += ci(x, 14, 4, '#e03a3a', 1.6) + ci(x, 82 if x != 52 else 90, 3.4, '#e03a3a', 1.4) + pa(f'M{x} 22 v-3', 'none', 1.6, '#e03a3a')
    b += poly([(24, 24), (20, 30), (28, 30)], OUT, 1) + poly([(78, 24), (74, 30), (82, 30)], OUT, 1)
    return d, b
@reg('neurotoxina', 'Toxina de canales iónicos')
def _():
    d = g('p', '#b8d4ff', '#4a74c8') + g('t', '#e0a8ff', '#7a2ab0')
    b = f'<rect x="2" y="38" width="96" height="24" rx="12" fill="#ffe9c8" stroke="{OUT}" stroke-width="2.4"/>'
    b += el(30, 50, 22, 26, 'url(#p)', 2.6, 0) + el(70, 50, 22, 26, 'url(#p)', 2.6, 0) + hl(24, 38, 7, 3, .55) + hl(64, 38, 7, 3, .55)
    b += poly([(50, 10), (58, 30), (50, 26), (42, 30)], 'url(#t)', 2) + ln(50, 26, 50, 50, 5, '#7a2ab0') + ci(50, 52, 5, 'url(#t)', 2)
    b += ''.join(ci(x, y, 3.4, '#ffd23a', 1.4) for x, y in [(30, 14), (70, 12), (20, 86), (82, 84), (50, 90)])
    b += pa('M44 74 l12 12 M56 74 l-12 12', 'none', 3, '#c0392b')
    return d, b
@reg('huesped', 'Manipulación del huésped')
def _():
    d = g('h', '#e8ffe8', '#6ab86a') + g('p', '#d8c8ff', '#7a5cc8')
    b = ln(14, 14, 86, 14, 3.4, '#5a3ca8') + ci(50, 14, 8, 'url(#p)', 2.2) + ci(47, 11, 2, '#fff', 0, 'none', .9)
    for x in (24, 40, 60, 76):
        b += pa(f'M{x} 18 C {x+4} 40, {x-6} 52, {x} 62', 'none', 1.6, '#5a3ca8')
    b += ci(50, 74, 22, 'url(#h)', 2.8) + hl(42, 66, 7, 3.4, .6) + ci(42, 72, 3.2, '#2a4a2a', 1.2) + ci(58, 72, 3.2, '#2a4a2a', 1.2) + pa('M42 82 q8 6 16 0', 'none', 2.2)
    return d, b
@reg('enjambre', 'Esquizogonia')
def _():
    d = g('a', '#f4e0ff', '#b070d8') + g('m', '#ffd0f0', '#d058a8')
    b = ci(50, 50, 40, 'url(#a)', 2.8)
    for i in range(8):
        a = i * 2 * math.pi / 8
        b += ln(50, 50, round(50 + 40 * math.cos(a + .39), 1), round(50 + 40 * math.sin(a + .39), 1), 1.8, '#7a2a90') + el(round(50 + 26 * math.cos(a), 1), round(50 + 26 * math.sin(a), 1), 9, 6, 'url(#m)', 1.8, round(a * 180 / math.pi)) + ci(round(50 + 26 * math.cos(a), 1), round(50 + 26 * math.sin(a), 1), 2.2, '#7a2a90', 1)
    b += ci(50, 50, 8, '#fff0b0', 2) + hl(36, 34, 8, 3.4, .5)
    return d, b

# ---------- Fotosintético ----------
@reg('cloroplasto', 'Cloroplasto')
def _():
    d = g('a', '#d4ffb0', '#5cb84a') + g('t', '#8fe070', '#2f7d32') + g('s', '#ffffff', '#e8e0c0')
    b = el(50, 52, 44, 32, 'url(#a)', 3, -12) + el(50, 52, 38, 26, 'none', 1.4, -12, .7, '#2a6a2a')
    for (x, y) in [(30, 54), (50, 44), (66, 60), (42, 66)]:
        for k in range(4):
            b += f'<rect x="{x-9}" y="{y-9+k*4.6}" width="18" height="4" rx="2" fill="url(#t)" stroke="{OUT}" stroke-width="1.2"/>'
    b += pa('M34 56 L44 46 M54 46 L64 58 M44 62 L60 62', 'none', 1.6, '#2a6a2a', .8) + ci(74, 40, 6, 'url(#s)', 1.6) + hl(34, 36, 10, 3.4, .5)
    return d, b
@reg('pigmento', 'Clorofila y carotenoides')
def _():
    d = g('p', '#b8f080', '#3f9b3a') + lg('s', '#ff4d4d', '#4d6bff', 0, 0, 1, 0) + g('m', '#fff8c0', '#e0b020')
    b = ''
    for (x, y) in [(34, 30), (66, 30), (66, 62), (34, 62)]:
        b += ci(x, y, 13, 'url(#p)', 2.2)
    b += pa('M34 30 L66 30 L66 62 L34 62 Z', 'none', 1.8, '#2a6a2a') + ci(50, 46, 10, 'url(#m)', 2.2) + pa('M46 46 h8 M50 42 v8', 'none', 1.6, '#7a5a10')
    b += f'<rect x="10" y="80" width="80" height="12" rx="6" fill="url(#s)" stroke="{OUT}" stroke-width="2"/>' + ''.join(pa(f'M{x} 78 l0 -6', 'none', 1.4, '#ffd23a') for x in (22, 40, 60, 78))
    return d, b
@reg('membrana', 'Pared celular de celulosa')
def _():
    d = g('a', '#f0ffd8', '#a0d070') + lg('w', '#e8d0a0', '#b08848', 0, 0, 1, 1)
    b = ci(50, 50, 42, 'url(#w)', 3) + ci(50, 50, 33, 'url(#a)', 2.4)
    for i in range(-40, 90, 8):
        b += f'<path d="M{50+i-30} 12 L{50+i+30} 88" stroke="#7a5a28" stroke-width="1.3" opacity=".55" clip-path="url(#cl)"/>'
    for i in range(-40, 90, 8):
        b += f'<path d="M{50+i+30} 12 L{50+i-30} 88" stroke="#a07a38" stroke-width="1.3" opacity=".45" clip-path="url(#cl)"/>'
    d += '<clipPath id="cl"><path d="M50 8 a42 42 0 1 1 -0.1 0 Z M50 17 a33 33 0 1 0 0.1 0 Z" clip-rule="evenodd"/></clipPath>'
    b += ci(50, 50, 33, 'none', 1.4, '#4a7a2a') + ci(44, 44, 10, '#d4e8ff', 1.8) + hl(36, 34, 9, 4, .5)
    return d, b
@reg('latencia', 'Granos de almidón')
def _():
    d = g('a', '#f0ffd0', '#b0d880') + g('s', '#ffffff', '#ddd0a8')
    b = el(50, 52, 44, 34, 'url(#a)', 2.8, 8)
    for (x, y, r) in [(34, 52, 17), (64, 44, 14), (60, 70, 11)]:
        b += ci(x, y, r, 'url(#s)', 2) + ''.join(ci(x, y, r * k, 'none', 1, '#a89860') for k in (.72, .46, .2))
    b += hl(26, 36, 9, 3.4, .55)
    return d, b
@reg('fotosintesis', 'Tilacoides apilados (granas)')
def _():
    d = g('t', '#8fe070', '#2f7d32') + '<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a0" stop-opacity=".9"/><stop offset="1" stop-color="#fff2a0" stop-opacity="0"/></linearGradient>'
    b = ''.join(f'<polygon points="{x-5},0 {x+5},0 {x+14},46 {x-14},46" fill="url(#ray)"/>' for x in (22, 50, 78))
    for k in range(5):
        y = 38 + k * 11
        b += f'<rect x="22" y="{y}" width="56" height="9" rx="4.5" fill="url(#t)" stroke="{OUT}" stroke-width="2"/>' + hl(34, y + 3, 10, 1.6, .5, 0)
    b += pa('M22 44 q-14 2 -16 14 M78 44 q14 2 16 14', 'none', 2.2) + ''.join(ci(x, 33, 3, '#ffd23a', 1.4) + ln(x, 36, x, 41, 1.6) for x in (30, 50, 70))
    return d, b
@reg('quietud', 'Rizoides')
def _():
    d = g('a', '#d8ffd0', '#6ab860') + lg('g', '#a8825a', '#6a4a2a', 0, 0, 0, 1)
    b = f'<rect x="0" y="52" width="100" height="48" fill="url(#g)"/>' + ''.join(ci(x, y, 2.4, '#8a6a42', 0, 'none', .8) for x, y in [(14, 70), (80, 62), (60, 90), (28, 84)])
    b += ci(50, 30, 22, 'url(#a)', 2.8) + hl(42, 22, 7, 3, .55) + ci(46, 28, 3, '#2a6a2a', 1.2)
    for (x0, x1, y1) in [(40, 14, 92), (50, 46, 96), (60, 84, 90), (46, 28, 80), (56, 66, 82)]:
        b += pa(f'M{x0} 50 C {x0} 66, {x1} 72, {x1} {y1}', 'none', 3.2, '#c8a878') + pa(f'M{x0} 50 C {x0} 66, {x1} 72, {x1} {y1}', 'none', 1.4, '#6a4a2a')
    return d, b
@reg('biopelicula', 'Matriz de polisacáridos')
def _():
    d = g('s', '#fffbd8', '#e8d080') + g('c', '#d8ffe0', '#6ab880')
    b = pa('M8 60 C 4 30, 30 10, 52 16 C 76 8, 96 30, 92 58 C 98 80, 66 94, 48 88 C 24 94, 6 84, 8 60 Z', 'url(#s)', 2.8, OUT, .95)
    for (x, y) in [(28, 44), (50, 36), (70, 52), (38, 64), (58, 72)]:
        b += ci(x, y, 7, 'url(#c)', 1.8)
    b += pa('M16 78 q4 -8 8 0 t 8 0 t 8 0', 'none', 1.6, '#c09820') + pa('M60 24 q4 -8 8 0 t 8 0', 'none', 1.6, '#c09820') + hl(26, 28, 9, 3, .5)
    return d, b
@reg('floracion', 'Fotosistemas ampliados')
def _():
    d = g('p', '#fff2a0', '#98c83a') + g('r', '#ffffff', '#ffd23a')
    b = ''.join(el(round(50 + 26 * math.cos(i * math.pi / 3), 1), round(50 + 26 * math.sin(i * math.pi / 3), 1), 17, 9, 'url(#p)', 2, i * 60) for i in range(6))
    b += ci(50, 50, 14, 'url(#r)', 2.4) + poly([(50, 40), (54, 48), (62, 50), (54, 54), (50, 62), (46, 54), (38, 50), (46, 48)], '#e0a020', 1.4)
    return d, b

# ---------- Colonial ----------
@reg('adhesion', 'Uniones celulares')
def _():
    d = g('a', '#ffe8c8', '#e0a060') + g('b', '#d8ecff', '#6aa0d8')
    b = el(26, 50, 24, 34, 'url(#a)', 2.8) + el(74, 50, 24, 34, 'url(#b)', 2.8)
    for y in (24, 36, 48, 60, 72):
        b += ln(46, y, 54, y, 2.4, '#7a5a3a') + ci(50, y, 3.2, '#fff', 1.6) + ln(49, y - 2, 51, y + 2, 1)
    b += hl(18, 36, 6, 3, .55) + hl(66, 36, 6, 3, .55) + ci(20, 54, 6, '#c9a0ff', 1.6) + ci(80, 54, 6, '#c9a0ff', 1.6)
    return d, b
@reg('colonial', 'Gemación')
def _():
    d = g('a', '#fff0d8', '#e0b878') + g('b', '#ffe8c0', '#e8a850')
    b = pa('M44 40 C 54 36, 60 36, 70 30', 'none', 8, '#e8c898') + ci(38, 62, 30, 'url(#a)', 2.8) + ci(74, 28, 17, 'url(#b)', 2.6)
    b += pa('M54 44 C 60 42, 64 40, 66 36', 'none', 2.2) + hl(28, 50, 9, 4, .55) + ci(32, 66, 8, '#c9a0e0', 1.8) + ci(70, 26, 5, '#c9a0e0', 1.6) + ci(60, 60, 4, 'none', 1.2, '#7a5a2a')
    return d, b
@reg('citoplasma', 'Plasmodesmos')
def _():
    d = g('a', '#fff2e0', '#e8c090') + lg('w', '#d8c090', '#a08850', 0, 0, 1, 0) + lg('t', '#bfe8ff', '#5aa8d8', 0, 0, 0, 1)
    b = el(24, 50, 22, 36, 'url(#a)', 2.8) + el(76, 50, 22, 36, 'url(#a)', 2.8) + f'<rect x="42" y="6" width="16" height="88" rx="3" fill="url(#w)" stroke="{OUT}" stroke-width="2.4"/>'
    for y in (26, 52, 78):
        b += f'<rect x="34" y="{y-6}" width="32" height="12" rx="6" fill="url(#t)" stroke="{OUT}" stroke-width="2"/>' + ln(36, y, 64, y, 3, '#2a4a90') + poly([(60, y - 4), (66, y), (60, y + 4)], '#2a4a90', 1)
    return d, b
@reg('tejido', 'Matriz extracelular')
def _():
    d = g('a', '#ffe0e8', '#e08aa0') + g('pg', '#ffd0f0', '#d058a8')
    b = ''.join(pa(f'M{-4} {y} C 24 {y-14}, 40 {y+14}, 60 {y-4} S 90 {y+10}, 104 {y-6}', 'none', 3.4, '#d8b078') + pa(f'M{-4} {y} C 24 {y-14}, 40 {y+14}, 60 {y-4} S 90 {y+10}, 104 {y-6}', 'none', 1.3, '#fff4d8') for y in (16, 38, 62, 84))
    b += ''.join(ci(x, y, 5, 'url(#pg)', 1.6) for x, y in [(12, 28), (88, 30), (14, 74), (90, 72), (50, 10)])
    b += el(50, 52, 24, 17, 'url(#a)', 2.8) + hl(42, 46, 8, 3.4, .55) + ci(54, 54, 7, '#c9a0e0', 1.8)
    return d, b
@reg('quorum', 'Vesículas de señalización (Golgi)')
def _():
    d = lg('c', '#ffd0e0', '#d9588a', 0, 0, 1, 0) + '<radialGradient id="sg" cx=".5" cy=".5" r=".5"><stop offset="0.6" stop-color="#ffd23a" stop-opacity="0"/><stop offset="1" stop-color="#ffd23a" stop-opacity=".5"/></radialGradient>'
    b = ''.join(ci(76, 38, r, 'none', 1.8, '#e0a020', op) for r, op in [(10, .9), (18, .7), (26, .5), (34, .3)])
    for k in range(5):
        b += pa(f'M{12+k*2} {22+k*12} C {22} {16+k*12}, {52} {16+k*12}, {62-k*2} {22+k*12}', 'none', 7, '#d9588a') + pa(f'M{12+k*2} {22+k*12} C {22} {16+k*12}, {52} {16+k*12}, {62-k*2} {22+k*12}', 'none', 3.4, '#ffc0d6')
    b += ''.join(ci(x, y, 5, '#fff', 1.8, '#d9588a') + ci(x, y, 2, '#ffd23a', 0, 'none') for x, y in [(70, 30), (76, 44), (68, 54)])
    return d, b
@reg('matriz', 'Biofilm')
def _():
    d = lg('l1', '#fff0b0', '#e8c860', 0, 0, 0, 1) + lg('l2', '#d8f0d8', '#88c888', 0, 0, 0, 1) + lg('l3', '#e0d0f0', '#a890d0', 0, 0, 0, 1)
    b = ''
    for (y, f) in [(10, 'l1'), (38, 'l2'), (64, 'l3')]:
        b += pa(f'M2 {y+8} C 20 {y-2}, 40 {y+16}, 60 {y+6} S 90 {y}, 98 {y+8} L98 {y+26} L2 {y+26} Z', f'url(#{f})', 2.4)
    b += ''.join(ci(x, y, 4.4, '#fff', 1.6, '#4a7a4a') + ci(x, y, 1.6, '#3a8a5a', 0, 'none') for x, y in [(16, 28), (38, 24), (62, 30), (82, 26), (24, 54), (52, 58), (76, 52), (34, 80), (66, 84)])
    b += pa('M44 12 C 46 30, 40 48, 48 66 S 44 84, 50 92', 'none', 2, '#4aa8e0', .9) + pa('M70 18 C 66 36, 74 52, 68 70', 'none', 2, '#4aa8e0', .9)
    return d, b
@reg('diferenciacion', 'Diferenciación celular')
def _():
    d = g('s', '#ffffff', '#d8d0e8') + g('m', '#ff9a9a', '#c0392b') + g('n', '#a8c8ff', '#4a6ad0') + g('e', '#b8f0a8', '#4aa840')
    b = ci(50, 22, 15, 'url(#s)', 2.8) + ci(50, 22, 5, '#8a7ac8', 1.4) + hl(44, 16, 5, 2.4, .7)
    b += pa('M42 36 L20 62 M50 38 L50 62 M58 36 L80 62', 'none', 2.4, '#7a6aa8') + poly([(18, 56), (26, 56), (22, 66)], '#7a6aa8', 1) + poly([(46, 58), (54, 58), (50, 68)], '#7a6aa8', 1) + poly([(76, 58), (84, 58), (80, 68)], '#7a6aa8', 1)
    b += el(20, 82, 8, 16, 'url(#m)', 2.4, 0) + ''.join(ln(20, y, 20, y + 3, 1.2, '#7a1a10') for y in (74, 82, 90))
    b += ci(50, 80, 9, 'url(#n)', 2.4) + ''.join(pa(f'M{50+9*math.cos(a):.1f} {80+9*math.sin(a):.1f} l{9*math.cos(a):.1f} {9*math.sin(a):.1f}', 'none', 2, '#2a3a90') for a in [0, 1.2, 2.4, 3.6, 4.8, 6])
    b += ngon(80, 80, 11, 6, 'url(#e)', 0, 2.4) + ci(80, 80, 3, '#2a6a2a', 1.2)
    return d, b
@reg('grancolonia', 'Colonia esférica')
def _():
    d = g('c', '#d8ffc8', '#58b848') + g('d', '#eaffe0', '#88d078')
    b = ci(50, 50, 42, 'none', 1.6, '#2a6a2a', .6)
    for i in range(18):
        a = i * 2 * math.pi / 18; b += ci(round(50 + 38 * math.cos(a), 1), round(50 + 38 * math.sin(a), 1), 6.4, 'url(#c)', 1.8) + ci(round(50 + 38 * math.cos(a), 1), round(50 + 38 * math.sin(a), 1), 1.6, '#2a6a2a', 0, 'none')
    for (x, y, r) in [(40, 42, 11), (62, 48, 9), (48, 64, 8)]:
        b += ci(x, y, r, 'url(#d)', 2) + ''.join(ci(round(x + (r - 2.4) * math.cos(k * 1.57), 1), round(y + (r - 2.4) * math.sin(k * 1.57), 1), 1.6, '#3a8a3a', 0, 'none') for k in range(4))
    return d, b

# ---------- General ----------
@reg('metabolismo', 'Glucólisis y fermentación')
def _():
    d = g('g', '#fff0c0', '#e8a830') + g('p', '#ffd9a0', '#e0802a') + g('t', '#ffffff', '#ffd23a')
    b = ngon(24, 50, 17, 6, 'url(#g)', 0, 2.6) + pa('M12 50 h24 M18 38 l12 24 M30 38 l-12 24', 'none', 1.2, '#a06a10', .6)
    b += pa('M44 50 h18', 'none', 3, '#7a5a10') + poly([(62, 42), (72, 50), (62, 58)], '#7a5a10', 1.4)
    b += ci(82, 32, 11, 'url(#p)', 2.4) + ci(82, 68, 11, 'url(#p)', 2.4) + hl(78, 28, 4, 2, .7) + hl(78, 64, 4, 2, .7)
    b += ci(52, 16, 7, 'url(#t)', 2) + ci(68, 12, 7, 'url(#t)', 2) + pa('M50 16 h4 M66 12 h4', 'none', 1.4, '#a06a10')
    return d, b
@reg('cilios', 'Cilios')
def _():
    d = lg('m', '#ffe0c8', '#e0a070', 0, 0, 0, 1)
    b = f'<rect x="0" y="74" width="100" height="26" fill="url(#m)" stroke="{OUT}" stroke-width="2.4"/>'
    for i, x in enumerate(range(10, 100, 16)):
        ph = i * 0.9
        b += ci(x, 78, 3.4, '#8a5a30', 1.4) + pa(f'M{x} 76 C {x+8*math.sin(ph):.1f} 54, {x+16*math.sin(ph+.6):.1f} 40, {x+14*math.sin(ph+1.2):.1f} 22', 'none', 4, OUT) + pa(f'M{x} 76 C {x+8*math.sin(ph):.1f} 54, {x+16*math.sin(ph+.6):.1f} 40, {x+14*math.sin(ph+1.2):.1f} 22', 'none', 2, '#ffd8a8')
    return d, b
@reg('nucleo', 'Envoltura nuclear con poros')
def _():
    d = g('a', '#d8d4ff', '#6a62d0') + g('n', '#8a82e0', '#2a2480')
    b = ci(50, 50, 42, 'url(#a)', 3.2) + ci(50, 50, 36, 'none', 1.6, '#3a34a0')
    for i in range(14):
        a = i * 2 * math.pi / 14; b += ci(round(50 + 39 * math.cos(a), 1), round(50 + 39 * math.sin(a), 1), 3.2, '#fff', 1.4)
    b += pa('M26 54 C 32 40, 44 66, 52 50 S 66 38, 72 52', 'none', 2.4, '#3a34a0') + pa('M30 36 C 40 28, 50 40, 60 30', 'none', 2.4, '#3a34a0') + pa('M30 70 C 42 62, 52 76, 66 66', 'none', 2.4, '#3a34a0')
    b += ci(54, 50, 10, 'url(#n)', 2.2) + hl(34, 32, 9, 4, .5)
    return d, b
@reg('mitocondrias', 'Mitocondrias')
def _():
    d = g('o', '#ffd9a8', '#e0701e') + g('i', '#ffeacc', '#f0a860')
    b = el(50, 50, 44, 28, 'url(#o)', 3) + el(50, 50, 39, 23, 'url(#i)', 1.6, 0, .9, '#a04010')
    b += pa('M20 40 C 24 54, 30 54, 30 40 C 34 54, 40 54, 40 40 C 44 54, 50 54, 50 40 C 54 54, 60 54, 60 40 C 64 54, 70 54, 70 40 C 74 54, 78 54, 80 40', 'none', 2.6, '#c05010')
    b += pa('M40 64 a 5 5 0 1 0 0.1 0', 'none', 1.8, '#7a3a10') + ''.join(ci(x, y, 1.8, '#7a3a10', 0, 'none') for x, y in [(62, 64), (68, 60), (72, 66)]) + hl(30, 34, 12, 3.4, .5)
    return d, b
@reg('mutrapida', 'Retículo rugoso con ribosomas')
def _():
    d = lg('r', '#f0d8b0', '#b07a48', 0, 0, 0, 1)
    b = ''
    for k, y in enumerate((20, 42, 64)):
        b += pa(f'M6 {y} C 24 {y-12}, 40 {y+12}, 58 {y} S 88 {y-8}, 94 {y+4} L94 {y+14} C 84 {y+4}, 70 {y+22}, 58 {y+12} S 22 {y}, 6 {y+12} Z', 'url(#r)', 2.4)
        b += ''.join(ci(x, round(y + 2 + 8 * math.sin(x / 14 + k), 1), 2.4, '#5a3a20', 0, 'none') for x in range(14, 90, 10))
    b += pa('M72 70 C 80 76, 74 84, 84 88 S 92 92, 96 96', 'none', 2, '#d9588a') + ''.join(ci(x, y, 2.2, '#ff9ac0', 1.2) for x, y in [(76, 74), (78, 82), (86, 88), (92, 93)])
    return d, b
@reg('citoesqueleto', 'Microtúbulos')
def _():
    d = g('c', '#fff4a8', '#e0b020') + g('v', '#cfeaff', '#5aa8d8')
    b = ''
    for i in range(10):
        a = i * 2 * math.pi / 10 + .2; b += pa(f'M30 62 Q {30+30*math.cos(a)*.6:.1f} {62+30*math.sin(a)*.6+8:.1f} {30+66*math.cos(a):.1f} {62+66*math.sin(a):.1f}', 'none', 3.4, OUT) + pa(f'M30 62 Q {30+30*math.cos(a)*.6:.1f} {62+30*math.sin(a)*.6+8:.1f} {30+66*math.cos(a):.1f} {62+66*math.sin(a):.1f}', 'none', 1.6, '#b8e0a0')
    b += ci(30, 62, 9, 'url(#c)', 2.4) + ci(66, 40, 11, 'url(#v)', 2.2) + ln(60, 50, 56, 60, 2.4) + ln(70, 50, 74, 60, 2.4) + ci(56, 62, 2.4, OUT, 0) + ci(74, 62, 2.4, OUT, 0) + hl(62, 36, 4, 2.4, .7)
    return d, b
@reg('vacuola', 'Vacuola central')
def _():
    d = g('v', '#e4f6ff', '#6ab4e8') + g('a', '#eaffd8', '#98c870')
    b = el(50, 50, 46, 40, 'url(#a)', 3) + el(52, 52, 32, 28, 'url(#v)', 2.6) + hl(40, 40, 10, 4.4, .6)
    b += ''.join(pa(f'M{x} {y-4} q4 5 0 9 q-4 -4 0 -9', '#fff', 1.4, '#3a80c0', .9) for x, y in [(60, 46), (46, 62), (66, 64), (42, 44)])
    b += ''.join(ci(x, y, 1.8, '#e05a5a', 0, 'none') + pa(f'M{x-3} {y} h6 M{x} {y-3} v6', 'none', 1.2, '#7a2a2a') for x, y in [(54, 40), (38, 56), (64, 56), (50, 66)])
    return d, b
@reg('reproduccion', 'Centriolos y huso mitótico')
def _():
    d = g('c', '#c8f0ff', '#4a90c0') + g('x', '#9aa8ff', '#3a3aa0') + g('y', '#ff9a9a', '#c03a3a')
    b = ''.join(pa(f'M12 50 Q 50 {50+k} 88 50', 'none', 1.6, '#4a90c0', .9) for k in (-34, -22, -10, 0, 10, 22, 34))
    b += ''.join(pa(f'M12 50 Q 50 {50+k} 88 50', 'none', .8, '#fff', .8) for k in (-34, -22, -10, 0, 10, 22, 34))
    for (x, y, f) in [(48, 38, 'x'), (52, 46, 'y'), (48, 58, 'y'), (52, 66, 'x')]:
        b += pa(f'M{x-6} {y-6} L{x+6} {y+6} M{x+6} {y-6} L{x-6} {y+6}', 'none', 4.4, OUT) + pa(f'M{x-6} {y-6} L{x+6} {y+6} M{x+6} {y-6} L{x-6} {y+6}', 'none', 2.4, f'url(#{f})')
    for x in (8, 92):
        b += f'<rect x="{x-5}" y="40" width="10" height="20" rx="3" fill="url(#c)" stroke="{OUT}" stroke-width="2"/>' + f'<rect x="{x-9}" y="44" width="18" height="10" rx="3" fill="url(#c)" stroke="{OUT}" stroke-width="2" transform="rotate(90 {x} 50)"/>'
    return d, b
@reg('deteccion', 'Mancha ocular (estigma)')
def _():
    d = g('a', '#e8ffd8', '#8ac870') + g('e', '#ff9a7a', '#c0302a') + '<linearGradient id="ry" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a0" stop-opacity=".95"/><stop offset="1" stop-color="#fff2a0" stop-opacity="0"/></linearGradient>'
    b = ''.join(f'<polygon points="{x},0 {x+9},0 {x+34},46 {x+20},50" fill="url(#ry)"/>' for x in (4, 22, 40))
    b += el(54, 60, 36, 28, 'url(#a)', 2.8, -10) + pa('M86 56 C 94 44, 98 34, 96 20', 'none', 3.2) + ci(40, 56, 11, 'url(#e)', 2.4) + ci(40, 56, 11, 'none', 4, '#fff', .35) + hl(36, 52, 4, 2.2, .8) + ci(46, 74, 7, '#c9a0e0', 1.8) + ci(66, 60, 5, '#4a9a40', 1.6)
    return d, b
@reg('resistencia', 'Endospora')
def _():
    d = g('c', '#fffbe8', '#e8d8a0') + g('k', '#ffe0c0', '#d09860') + g('x', '#d8e8ff', '#7aa0d0')
    b = el(50, 50, 44, 32, 'url(#c)', 3) + el(50, 50, 37, 25, 'url(#k)', 2.2) + el(50, 50, 28, 17, 'url(#x)', 2.4)
    b += ''.join(ci(x, y, 2.4, '#fff', 1.2, '#4a70a0') for x, y in [(38, 48), (46, 54), (54, 46), (62, 54), (50, 50)]) + pa('M40 42 q10 -6 20 0', 'none', 1.6, '#4a70a0') + hl(30, 38, 10, 3.4, .5)
    return d, b

# ---------- Híbridos ----------
@reg('hy_colo_foto', 'Alga colonial')
def _():
    d = g('c', '#d8ffc0', '#58b848') + g('t', '#8fe070', '#2f7d32')
    b = ''
    for (x, y, r) in [(32, 36, 22), (66, 34, 20), (50, 68, 24)]:
        b += ci(x, y, r, 'url(#c)', 2.6) + ''.join(el(round(x + 8 * math.cos(k * 2.1), 1), round(y + 8 * math.sin(k * 2.1), 1), 6, 3.6, 'url(#t)', 1.4, k * 40) for k in range(3)) + hl(x - 6, y - 8, 6, 3, .5)
    b += pa('M44 44 L54 50 M54 52 L44 58 M52 56 L60 62', 'none', 3, '#e8c060', .9)
    return d, b
@reg('hy_colo_para', 'Enjambre infeccioso')
def _():
    d = g('c', '#f0e0ff', '#a878d8') + g('v', '#e0ffa0', '#78b820')
    b = ''
    for (x, y, r) in [(30, 36, 20), (66, 32, 18), (48, 68, 22)]:
        b += ci(x, y, r, 'url(#c)', 2.6) + ''.join(ci(round(x + 8 * math.cos(k * 2.4), 1), round(y + 7 * math.sin(k * 2.4), 1), 3.4, '#6a2a90', 1.2) for k in range(3)) + hl(x - 6, y - 8, 5, 2.6, .5)
    b += ''.join(ngon(x, y, 4.4, 6, 'url(#v)', .3, 1.4) for x, y in [(52, 20), (82, 58), (14, 70), (62, 90)]) + ''.join(ln(x, y, x + 3, y - 7, 1.2) for x, y in [(52, 20)])
    return d, b
@reg('hy_colo_pred', 'Manada celular')
def _():
    d = g('c', '#ffe8d0', '#e0a070')
    b = ''
    for (x, y, rot) in [(30, 34, 20), (68, 32, -20), (50, 70, 0)]:
        b += ci(x, y, 20, 'url(#c)', 2.6) + hl(x - 6, y - 8, 6, 3, .5) + pa(f'M{x-12} {y+4} q12 14 24 0', '#8a1a1a', 2) + ''.join(poly([(x - 10 + k * 5, y + 5), (x - 7 + k * 5, y + 11), (x - 4 + k * 5, y + 5)], '#fff', 1.2) for k in range(4)) + ci(x - 6, y - 4, 2.6, OUT, 0) + ci(x + 6, y - 4, 2.6, OUT, 0)
    return d, b
@reg('hy_foto_para', 'Parásito fototrófico')
def _():
    d = g('c', '#d8ffc0', '#58b848') + g('t', '#8fe070', '#2f7d32')
    b = ci(50, 38, 28, 'url(#c)', 2.8) + ''.join(el(round(50 + 10 * math.cos(k * 2.1), 1), round(38 + 9 * math.sin(k * 2.1), 1), 7, 4, 'url(#t)', 1.4, k * 40) for k in range(3)) + hl(40, 28, 8, 3.4, .55)
    for (x0, x1) in [(32, 14), (50, 50), (68, 86)]:
        b += pa(f'M{x0} 62 C {x0-6} 76, {x1} 78, {x1} 92', 'none', 4, '#6a2ab0') + pa(f'M{x1-6} 92 q6 -10 12 0', 'none', 3.4, '#6a2ab0')
    return d, b
@reg('hy_foto_pred', 'Cazador de luz')
def _():
    d = '<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7a0" stop-opacity=".95"/><stop offset="1" stop-color="#fff7a0" stop-opacity="0"/></radialGradient>' + g('c', '#f4ffc0', '#a8d838')
    b = ci(50, 50, 46, 'url(#gl)', 0, 'none') + ci(50, 50, 30, 'url(#c)', 2.8) + hl(40, 38, 9, 4, .6)
    b += pa('M30 62 q20 20 40 0', '#7a1a1a', 2.4) + ''.join(poly([(34 + k * 8, 62), (38 + k * 8, 72), (42 + k * 8, 62)], '#fff', 1.2) for k in range(4)) + ci(40, 46, 4, OUT, 0) + ci(60, 46, 4, OUT, 0) + ci(41, 45, 1.4, '#fff', 0, 'none') + ci(61, 45, 1.4, '#fff', 0, 'none')
    return d, b
@reg('hy_para_pred', 'Depredador parasitario')
def _():
    d = g('c', '#e8d0ff', '#8a58c8') + g('v', '#d4ff7a', '#58c43a')
    b = pa('M18 62 C 8 74, 14 88, 4 94', 'none', 4, '#6a2ab0') + ci(50, 50, 32, 'url(#c)', 2.8) + hl(40, 38, 9, 4, .55)
    b += pa('M32 62 q18 18 36 0', '#4a0a3a', 2.4) + ''.join(poly([(36 + k * 9, 62), (40.5 + k * 9, 76), (45 + k * 9, 62)], '#fff', 1.2) for k in range(3)) + ci(40, 44, 4, OUT, 0) + ci(60, 44, 4, OUT, 0) + ci(41, 43, 1.4, '#fff', 0, 'none') + ci(61, 43, 1.4, '#fff', 0, 'none')
    b += ''.join(ci(x, y, 3.4, 'url(#v)', 1.4) for x, y in [(44, 82), (56, 88), (50, 96)]) + pa('M44 76 v4 M56 78 v6', 'none', 1.6, '#58c43a')
    return d, b

def svg_of(id, size=100):
    d, b = S[id]()
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}"><defs>{d}</defs>{b}</svg>'
if __name__ == '__main__':
    os.makedirs('svg', exist_ok=True)
    for k in S:
        open(f'svg/{k}.svg', 'w', encoding='utf-8').write(svg_of(k))
    json.dump({k: svg_of(k) for k in S}, open('sprites.json', 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(NAMES, open('names.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print(len(S), 'sprites')
