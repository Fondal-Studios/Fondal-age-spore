/* ============================================================================================
   Fondal Age Spore · Era 2 · módulo ARTE / ANIMACIÓN (Calidad 2.0)
   Todo procedural en canvas (sin imágenes), estilo vector de la casa: contorno oscuro #2b2233,
   degradado radial claro arriba a la izquierda, brillo blanco translúcido, sin texto dentro del dibujo.

   Contrato (lo usa eras/era2-animales.html):
     Era2Arte.drawAnimal(x, sp, o)   o = { px, py, a, s, tt, ph, mv, flash, cloth, traits, vars,   (los de siempre)
                                          st, lunge, born, dead, lin }                              (nuevos, todos opcionales)
         st    estado del animal (a.st: idle|forage|eat|hunt|flee|rest|lay|stun|move|build|dig)
         lunge 0..1 embestida breve al atacar            born 0..1 escala de nacimiento (1 = adulto)
         dead  0..1 progreso de la muerte (inclina y desvanece)
         lin   { col, tier } cinta de la rama heredada (solo la especie del jugador)
     Era2Arte.attach(Bus)            suscribe: eat hit dmg kill lay born hazard season ability scarcity migration
     Era2Arte.opts(a, S, tt, r, extra)  arma `o` desde un animal (lee, no modifica la simulación)
     Era2Arte.groundDetail / topDetail  detalle estático por bioma (se llaman desde drawStatic: respetan su caché)
     Era2Arte.under / over              ambiente animado bajo / sobre los animales
     Era2Arte.drawFX                    números de daño, impactos, flechas de ventaja, fantasmas, partículas
   Nada de esto toca G ni usa R(): solo Math.random / performance.now para lo cosmético.
   ========================================================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, INK = '#2b2233';
  const W = 960, H = 600;
  const _sh = {};
  function shade(hex, f) { const k = hex + f; if (_sh[k]) return _sh[k]; const n = parseInt(hex.slice(1), 16), c = v => clamp(Math.round(v * f), 0, 255); return _sh[k] = '#' + ((1 << 24) + (c(n >> 16) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1); }
  const hr = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };   // hash cosmético determinista
  const BRCOL = { pred: '#e0453a', para: '#a35bd6', foto: '#4fbf5a', colo: '#f0a93a' };

  /* ---------------------------------------------------------------- poses */
  function pose(o, tt, ph) {
    const st = o.st || 'idle', mv = o.mv ? 1 : 0, flee = st === 'flee', eat = st === 'eat', rest = st === 'rest', lay = st === 'lay', hunt = st === 'hunt';
    const gait = flee ? 16 : mv ? 10 : 5.5, chew = eat ? Math.sin(tt * 13 + ph) : 0, lunge = o.lunge || 0;
    return {
      tt, ph, st, mv, flee, eat, rest, lay, hunt, stun: st === 'stun', lunge,
      sw: Math.sin(tt * gait + ph) * (mv ? (flee ? 1.15 : 1) : .12), br: Math.sin(tt * 2.4 + ph),
      chew, hd: (eat ? .16 + .08 * chew : 0) + .5 * lunge + (hunt && mv ? .1 : 0) - (rest ? .12 : 0),
      jaw: clamp((eat ? .45 + .5 * chew : 0) + lunge * 1.1, 0, 1), legK: rest ? .4 : lay ? .55 : 1,
      hurt: o.flash > 0 ? clamp(o.flash / .14, 0, 1) : 0
    };
  }

  /* ---------------------------------------------------------------- utilidades de dibujo */
  function mkH(x, r, col, P) {
    const lw = Math.max(1, r * .1), h = { x, r, col, P, lw, A: {} };
    h.lit = (rx, ry, cx, cy, c0) => { c0 = c0 || col; cx = cx || 0; cy = cy || 0; const q = x.createRadialGradient(cx - rx * .3, cy - ry * .45, Math.min(rx, ry) * .1, cx, cy, Math.max(rx, ry) * 1.15); q.addColorStop(0, shade(c0, 1.4)); q.addColorStop(.55, c0); q.addColorStop(1, shade(c0, .66)); return q; };
    h.E = (cx, cy, rx, ry, fill, rot) => { x.fillStyle = fill; x.beginPath(); x.ellipse(cx, cy, Math.max(.01, Math.abs(rx)), Math.max(.01, Math.abs(ry)), rot || 0, 0, TAU); x.fill(); x.lineWidth = lw; x.strokeStyle = INK; x.stroke(); };
    h.Lit = (cx, cy, rx, ry, c0, rot) => h.E(cx, cy, rx, ry, h.lit(rx, ry, cx, cy, c0), rot);
    h.eye = (px, py, er, iris) => { x.fillStyle = iris || '#111'; x.beginPath(); x.arc(px, py, er, 0, TAU); x.fill(); if (iris) { x.fillStyle = '#111'; x.beginPath(); x.arc(px, py, er * .55, 0, TAU); x.fill(); } x.fillStyle = '#fff'; x.beginPath(); x.arc(px + er * .3, py - er * .35, er * .38, 0, TAU); x.fill(); };
    h.poly = (pts, fill, stroke) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fillStyle = fill; x.fill(); if (stroke !== false) { x.lineWidth = lw; x.strokeStyle = INK; x.stroke(); } };
    h.limb = (x0, y0, x1, y1, w, c) => { x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.lineWidth = w + lw * 1.3; x.strokeStyle = INK; x.stroke(); x.lineWidth = w; x.strokeStyle = c; x.stroke(); };
    h.gloss = (cx, cy, rx, ry, a) => { x.fillStyle = 'rgba(255,255,255,' + (a || .3) + ')'; x.beginPath(); x.ellipse(cx, cy, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); x.fill(); };
    return h;
  }

  /* ================================================================ ESPECIES ================================================================ */
  const DRAW = {};

  /* --- Terrestres --- */
  DRAW.ter_cazador = h => {   // lobo: esbelto, hocico largo, cola poblada
    const { x, r, col, P } = h, dark = shade(col, .5), pale = shade(col, 1.3), ts = Math.sin(P.tt * (P.mv ? 9 : 3) + P.ph) * (P.flee ? .15 : .35), K = P.legK;
    x.beginPath(); x.moveTo(-r * .9, -r * .13); x.quadraticCurveTo(-r * 1.7, -r * .5 + ts * r * .4, -r * 2.4, ts * r * 1.1); x.quadraticCurveTo(-r * 1.8, r * .42 + ts * r * .4, -r * .9, r * .13); x.closePath();
    x.fillStyle = h.lit(r * 1.2, r * .4, -r * 1.6, 0); x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.fillStyle = dark; x.beginPath(); x.ellipse(-r * 2.1, ts * r * .9, r * .3, r * .17, ts * .9, 0, TAU); x.fill();
    for (const s of [-1, 1]) for (const f of [0, 1]) { const px = f ? .62 : -.58, sg = (f ? 1 : -1) * s * P.sw, fx = px * r + sg * r * .34 * K; h.limb(px * r, s * r * .3, fx, s * r * (.34 + .5 * K), r * .17, shade(col, .72)); x.fillStyle = dark; x.beginPath(); x.arc(fx, s * r * (.34 + .55 * K), r * .12, 0, TAU); x.fill(); }
    h.Lit(0, 0, r * 1.08, r * (.46 + .03 * P.br), col);
    h.Lit(r * .62, 0, r * .6, r * .5, col);
    x.globalAlpha = .55; x.strokeStyle = dark; x.lineWidth = r * .2; x.beginPath(); x.moveTo(-r * .95, 0); x.lineTo(r * .8, 0); x.stroke(); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 1; x.beginPath(); for (let i = -3; i <= 3; i++) { x.moveTo(i * r * .24, -r * .3); x.lineTo(i * r * .24 + r * .07, -r * .16); x.moveTo(i * r * .24, r * .3); x.lineTo(i * r * .24 + r * .07, r * .16); } x.stroke();
    const hx = r * (1.3 + P.hd), hs = P.eat ? .9 : 1, back = P.flee ? .62 : .38;
    for (const s of [-1, 1]) h.poly([hx - r * .1, s * r * .2, hx - r * back, s * r * (P.flee ? .42 : .62), hx - r * .02, s * r * .46], shade(col, .7));
    h.Lit(hx, 0, r * .44, r * .33 * hs, col);
    h.Lit(hx + r * .55, 0, r * .45, r * (.19 + .05 * P.jaw) * hs, pale);
    if (P.jaw > .08) { x.fillStyle = '#5a1a26'; x.beginPath(); x.ellipse(hx + r * .8, 0, r * .22, r * .12 * P.jaw, 0, 0, TAU); x.fill(); x.fillStyle = '#fff'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(hx + r * .72, s * r * .1 * P.jaw); x.lineTo(hx + r * .8, s * r * .2 * P.jaw); x.lineTo(hx + r * .86, s * r * .1 * P.jaw); x.fill(); } }
    x.fillStyle = '#16121a'; x.beginPath(); x.ellipse(hx + r * 1.0, 0, r * .1, r * .09, 0, 0, TAU); x.fill();
    for (const s of [-1, 1]) { x.fillStyle = '#f2cf45'; x.beginPath(); x.ellipse(hx + r * .17, s * r * .17, r * .1, r * .065, s * .45, 0, TAU); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(hx + r * .2, s * r * .17, r * .04, 0, TAU); x.fill(); }
    h.gloss(-r * .1, -r * .15, r * .5, r * .1, .25);
    h.A = { fx: hx / r + 1.0, hx: hx / r, eyeY: .17, bw: .5, bl: 1.1, bx: -1.0, tx: -2.3, neck: .95, hr: .35 };
  };

  DRAW.ter_gigante = h => {   // macizo: joroba, cabeza baja, garras
    const { x, r, col, P } = h, dark = shade(col, .5), K = P.legK;
    x.fillStyle = dark; x.beginPath(); x.ellipse(-r * 1.3, P.sw * r * .1, r * .25, r * .16, 0, 0, TAU); x.fill(); x.stroke();
    for (const s of [-1, 1]) for (const f of [0, 1]) { const px = f ? .72 : -.66, fx = px * r + (f ? 1 : -1) * s * P.sw * r * .24, fy = s * r * (.7 + .3 * K); h.limb(px * r, s * r * .55, fx, fy, r * .4, shade(col, .62)); x.fillStyle = '#efe6cc'; x.strokeStyle = INK; x.lineWidth = h.lw * .8; for (const k of [-1, 0, 1]) { x.beginPath(); x.moveTo(fx + r * .12, fy + s * k * r * .1); x.lineTo(fx + r * .42, fy + s * k * r * .16); x.lineTo(fx + r * .12, fy + s * k * r * .1 + r * .08); x.closePath(); x.fill(); x.stroke(); } }
    h.Lit(0, 0, r * 1.22, r * (.98 + .02 * P.br), col);
    h.Lit(r * .3, 0, r * .8, r * .74, col, 0);
    x.fillStyle = 'rgba(30,18,10,.2)'; x.beginPath(); x.ellipse(r * .35, 0, r * .62, r * .55, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(30,20,10,.55)'; x.lineWidth = Math.max(1, r * .06); x.beginPath();
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18, rx = r * 1.2, ry = r * .96; x.moveTo(Math.cos(a) * rx * .8, Math.sin(a) * ry * .8); x.lineTo(Math.cos(a) * rx * 1.04, Math.sin(a) * ry * 1.04); } x.stroke();
    h.gloss(-r * .15, -r * .45, r * .55, r * .13, .22);
    const hx = r * (1.5 + P.hd), hs = P.eat ? .92 : 1;
    x.strokeStyle = '#f3ead2'; x.lineCap = 'round';
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(hx - r * .1, s * r * .3); x.quadraticCurveTo(hx + r * .1, s * r * 1.05, hx + r * .8, s * r * .72); x.lineWidth = r * .24 + h.lw * 1.2; x.strokeStyle = INK; x.stroke(); x.lineWidth = r * .24; x.strokeStyle = '#f3ead2'; x.stroke(); }
    h.Lit(hx, 0, r * .52, r * .44 * hs, shade(col, .85));
    h.Lit(hx + r * .42, 0, r * .32, r * (.32 + .05 * P.jaw) * hs, shade(col, 1.1));
    x.fillStyle = '#1a1218'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(hx + r * .68, s * r * .13, r * .06, r * .05, 0, 0, TAU); x.fill(); }
    h.eye(hx + r * .15, -r * .3, r * .08); h.eye(hx + r * .15, r * .3, r * .08);
    h.A = { fx: hx / r + .7, hx: hx / r, eyeY: .3, bw: .98, bl: 1.22, bx: -1.2, tx: -1.5, neck: 1.0, hr: .5 };
  };

  DRAW.ter_ingeniero = h => {   // castor: cola plana, dientes, rama
    const { x, r, col, P } = h, dark = shade(col, .55), K = P.legK, ts = Math.sin(P.tt * (P.mv ? 8 : 2.5) + P.ph) * .12;
    x.save(); x.rotate(ts); x.beginPath(); x.moveTo(-r * .85, -r * .16); x.bezierCurveTo(-r * 1.5, -r * .62, -r * 2.4, -r * .55, -r * 2.42, 0); x.bezierCurveTo(-r * 2.4, r * .55, -r * 1.5, r * .62, -r * .85, r * .16); x.closePath();
    x.fillStyle = h.lit(r * 1.5, r * .5, -r * 1.6, 0, shade(col, .6)); x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.save(); x.clip(); x.strokeStyle = 'rgba(255,230,190,.28)'; x.lineWidth = 1; x.beginPath(); for (let i = -3; i <= 3; i++) { x.moveTo(-r * .9, i * r * .18 - r * .3); x.lineTo(-r * 2.5, i * r * .18 + r * .3); x.moveTo(-r * .9, i * r * .18 + r * .3); x.lineTo(-r * 2.5, i * r * .18 - r * .3); } x.stroke(); x.restore(); x.restore();
    for (const s of [-1, 1]) { const fx = -r * .55 + s * P.sw * r * .2 * K; h.poly([-r * .5, s * r * .45, fx - r * .2, s * r * (.62 + .45 * K), fx + r * .05, s * r * (.62 + .45 * K), fx + r * .3, s * r * .62, fx + r * .25, s * r * .4], dark);
      const hx2 = r * .85 - s * P.sw * r * .18 * K; h.limb(r * .85, s * r * .4, hx2 + r * .1, s * r * (.4 + .4 * K), r * .2, shade(col, .75)); }
    h.Lit(0, 0, r * 1.02, r * (.74 + .03 * P.br), col);
    h.E(r * .1, r * .12, r * .6, r * .4, shade(col, 1.18), 0);
    h.gloss(-r * .15, -r * .35, r * .5, r * .12, .26);
    const hx = r * (1.2 + P.hd), hs = P.eat ? .92 : 1;
    if (!P.eat) { x.strokeStyle = INK; x.lineCap = 'round'; x.beginPath(); x.moveTo(hx + r * .58, -r * 1.08); x.lineTo(hx + r * .68, r * 1.1); x.lineWidth = r * .22 + h.lw * 1.3; x.stroke(); x.strokeStyle = '#a77a45'; x.lineWidth = r * .22; x.stroke();
      x.strokeStyle = '#6b4a2a'; x.lineWidth = Math.max(1, r * .07); x.beginPath(); x.moveTo(hx + r * .62, -r * .5); x.lineTo(hx + r * .92, -r * .7); x.moveTo(hx + r * .66, r * .4); x.lineTo(hx + r * .96, r * .62); x.stroke(); x.fillStyle = '#5aa545'; x.beginPath(); x.ellipse(hx + r * .98, -r * .72, r * .17, r * .09, -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(hx + r * 1.0, r * .64, r * .16, r * .08, .5, 0, TAU); x.fill(); }
    for (const s of [-1, 1]) h.E(hx - r * .22, s * r * .4, r * .15, r * .15, dark);
    h.Lit(hx, 0, r * .52, r * .47 * hs, col);
    h.Lit(hx + r * .48, 0, r * .28, r * .25 * hs, shade(col, 1.15));
    x.fillStyle = '#ffd470'; x.strokeStyle = INK; x.lineWidth = h.lw * .8; const jo = r * .1 * P.jaw; for (const s of [-1, 1]) { x.beginPath(); x.rect(hx + r * .68, s * r * .075 - r * .06 + s * jo, r * .26, r * .12); x.fill(); x.stroke(); }
    x.fillStyle = '#16121a'; x.beginPath(); x.ellipse(hx + r * .74, 0, r * .07, r * .06, 0, 0, TAU); x.fill();
    h.eye(hx + r * .2, -r * .26, r * .08); h.eye(hx + r * .2, r * .26, r * .08);
    h.A = { fx: hx / r + .95, hx: hx / r, eyeY: .26, bw: .74, bl: 1.0, bx: -.9, tx: -2.4, neck: .8, hr: .5 };
  };

  /* --- Insectos --- */
  function wingPair(h, rootX, span, chord, fl, a0, fill, vein) {
    const { x, r } = h;
    for (const s of [-1, 1]) { x.save(); x.translate(rootX * r, s * r * .3); x.rotate(a0 * s + fl * s * .5); x.fillStyle = fill; x.beginPath(); x.ellipse(-chord * r * .35, s * span * r * .5, chord * r, span * r * .5, s * .2, 0, TAU); x.fill(); x.lineWidth = Math.max(.8, h.lw * .8); x.strokeStyle = INK; x.stroke();
      x.strokeStyle = vein; x.lineWidth = .8; x.beginPath(); x.moveTo(0, 0); x.lineTo(-chord * r * .35, s * span * r * .95); x.moveTo(0, s * span * r * .2); x.lineTo(-chord * r * .8, s * span * r * .6); x.stroke(); x.restore(); }
  }
  DRAW.ins_colmena = h => {   // abeja: abdomen rayado, alas rápidas
    const { x, r, col, P } = h, buzz = Math.sin(P.tt * 42 + P.ph), fold = P.rest || (!P.mv && !P.flee && P.st !== 'eat' && P.st !== 'forage') ? .7 : 0;
    wingPair(h, .35, 1.25 * (1 - fold * .5), .7, buzz * (1 - fold), .55 + fold * .5, 'rgba(235,245,255,.6)', 'rgba(70,90,110,.5)');
    wingPair(h, .2, .95 * (1 - fold * .45), .55, -buzz * (1 - fold), .85 + fold * .35, 'rgba(235,245,255,.5)', 'rgba(70,90,110,.4)');
    x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .1); for (const px of [-.1, .35, .75]) for (const s of [-1, 1]) { x.beginPath(); x.moveTo(px * r, s * r * .3); x.lineTo(px * r + s * P.sw * r * .2 * (px > .3 ? -1 : 1), s * r * (.9 + .1 * Math.abs(P.sw))); x.stroke(); }
    x.beginPath(); x.moveTo(-r * 1.55, 0); x.lineTo(-r * 2.15, r * .06 * P.br); x.lineTo(-r * 1.55, r * .12); x.closePath(); x.fillStyle = '#3a2a1a'; x.fill(); x.stroke();
    h.Lit(-r * .98, 0, r * .85, r * (.6 + .02 * P.br), col);
    x.save(); x.beginPath(); x.ellipse(-r * .98, 0, r * .85, r * .6, 0, 0, TAU); x.clip(); x.fillStyle = 'rgba(43,34,51,.92)'; for (const k of [-1.35, -.95, -.55]) x.fillRect(r * k, -r, r * .22, r * 2); x.restore(); x.beginPath(); x.ellipse(-r * .98, 0, r * .85, r * .6, 0, 0, TAU); x.stroke();
    h.Lit(r * .12, 0, r * .6, r * .52, shade(col, 1.12)); x.fillStyle = 'rgba(255,240,170,.55)'; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(r * (-.2 + hr(i + 1) * .6), r * (hr(i + 9) - .5) * .8, r * .05, 0, TAU); x.fill(); }
    h.Lit(r * .88, 0, r * .36, r * .33, '#4a3320'); h.eye(r * .98, -r * .2, r * .14); h.eye(r * .98, r * .2, r * .14);
    x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .08); x.beginPath(); x.moveTo(r * 1.15, -r * .1); x.quadraticCurveTo(r * 1.6, -r * .2, r * 1.85, -r * .6); x.moveTo(r * 1.15, r * .1); x.quadraticCurveTo(r * 1.6, r * .2, r * 1.85, r * .6); x.stroke(); x.fillStyle = INK; for (const s of [-1, 1]) { x.beginPath(); x.arc(r * 1.87, s * r * .62, r * .08, 0, TAU); x.fill(); }
    h.A = { fx: 1.9, hx: .88, eyeY: .2, bw: .6, bl: .9, bx: -1.8, tx: -2.15, neck: .5, hr: .35 };
  };
  DRAW.ins_enjambre = h => {   // langosta: diminuta, cuerpo alargado, patas traseras de salto
    const { x, r, col, P } = h, buzz = Math.sin(P.tt * 36 + P.ph), fly = P.mv || P.flee, dk = shade(col, .5);
    for (const s of [-1, 1]) { const z = P.sw * .3; h.limb(-r * .1, s * r * .26, -r * .85, s * r * (.95 + z * .2), r * .2, dk); h.limb(-r * .85, s * r * (.95 + z * .2), -r * 1.65 + z * r * .3, s * r * .5, r * .13, shade(col, .75)); h.limb(r * .4, s * r * .25, r * .6 + s * P.sw * r * .15, s * r * .9, r * .1, dk); h.limb(r * .8, s * r * .2, r * 1.0 - s * P.sw * r * .15, s * r * .75, r * .1, dk); }
    if (fly) { for (const s of [-1, 1]) { x.save(); x.translate(r * .1, s * r * .2); x.rotate((.85 + buzz * .3) * s + 0); x.fillStyle = 'rgba(235,225,170,.62)'; x.beginPath(); x.ellipse(-r * .9, s * r * .35, r * 1.2, r * .26, 0, 0, TAU); x.fill(); x.strokeStyle = INK; x.lineWidth = h.lw * .8; x.stroke(); x.restore(); } }
    else { for (const s of [-1, 1]) { x.fillStyle = 'rgba(214,196,130,.8)'; x.beginPath(); x.ellipse(-r * .95, s * r * .13, r * 1.2, r * .17, 0, 0, TAU); x.fill(); x.strokeStyle = INK; x.lineWidth = h.lw * .8; x.stroke(); } }
    x.beginPath(); x.moveTo(r * .1, -r * .27); x.quadraticCurveTo(-r * 1.2, -r * .35, -r * 2.0, 0); x.quadraticCurveTo(-r * 1.2, r * .35, r * .1, r * .27); x.closePath(); x.fillStyle = h.lit(r * 1.4, r * .3, -r * .8, 0); x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 6; i++) { const px = -r * (.3 + i * .26); x.moveTo(px, -r * (.26 - i * .025)); x.lineTo(px, r * (.26 - i * .025)); } x.stroke();
    x.strokeStyle = 'rgba(40,70,20,.7)'; x.lineWidth = r * .12; x.beginPath(); x.moveTo(r * .2, 0); x.lineTo(-r * 1.8, 0); x.stroke();
    h.Lit(r * .45, 0, r * .42, r * .3, shade(col, 1.1)); h.Lit(r * 1.0 + P.hd * r * .3, 0, r * .36, r * .31, col);
    h.eye(r * 1.15, -r * .22, r * .12, '#d8c050'); h.eye(r * 1.15, r * .22, r * .12, '#d8c050');
    x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .08); x.beginPath(); x.moveTo(r * 1.32, -r * .1); x.lineTo(r * 1.85, -r * .35); x.moveTo(r * 1.32, r * .1); x.lineTo(r * 1.85, r * .35); x.stroke();
    h.A = { fx: 1.7, hx: 1.0, eyeY: .22, bw: .3, bl: 1.2, bx: -1.9, tx: -2.0, neck: .55, hr: .3 };
  };
  DRAW.ins_parasito = h => {   // avispa parasitoide: cintura fina, ovipositor largo, patas largas colgantes
    const { x, r, col, P } = h, buzz = Math.sin(P.tt * 40 + P.ph), fold = P.rest ? .6 : 0, leg = '#e8a43a';
    for (const s of [-1, 1]) for (const px of [.1, .45, .8]) { const sw = P.sw * s * (px > .4 ? -1 : 1) * .25; x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .09) + h.lw * .8; x.beginPath(); x.moveTo(px * r, s * r * .2); x.lineTo(px * r + sw * r + r * .15, s * r * .95); x.lineTo(px * r + sw * r * 1.6 - r * .1, s * r * 1.45); x.stroke(); x.strokeStyle = leg; x.lineWidth = Math.max(.8, r * .09); x.stroke(); }
    for (const s of [-1, 1]) { x.save(); x.translate(r * .3, s * r * .18); x.rotate((.55 + fold * .5) * s + buzz * (1 - fold) * .3 * s); x.fillStyle = 'rgba(70,60,95,.45)'; x.beginPath(); x.ellipse(-r * .9, s * r * .5, r * 1.15, r * .3, s * .15, 0, TAU); x.fill(); x.strokeStyle = INK; x.lineWidth = h.lw * .8; x.stroke(); x.restore(); }
    x.strokeStyle = shade(col, .45); x.lineWidth = Math.max(1, r * .08); x.beginPath(); x.moveTo(-r * .15, 0); x.lineTo(-r * .6, 0); x.stroke();
    x.strokeStyle = INK; x.lineWidth = Math.max(.8, r * .05) + h.lw * .5; x.beginPath(); x.moveTo(-r * 1.95, 0); x.lineTo(-r * 2.6, r * .1 * P.br + r * .08); x.stroke(); x.strokeStyle = '#d8d0e8'; x.lineWidth = Math.max(.7, r * .05); x.stroke();
    x.beginPath(); x.moveTo(-r * .55, -r * .08); x.bezierCurveTo(-r * 1.0, -r * .42, -r * 1.7, -r * .3, -r * 2.0, 0); x.bezierCurveTo(-r * 1.7, r * .3, -r * 1.0, r * .42, -r * .55, r * .08); x.closePath(); x.fillStyle = h.lit(r * 1.2, r * .3, -r * 1.2, 0); x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.strokeStyle = 'rgba(255,220,120,.7)'; x.lineWidth = Math.max(1, r * .07); x.beginPath(); for (const px of [-.95, -1.3, -1.62]) { x.moveTo(r * px, -r * .24 * (1 - Math.abs(px + 1.2) * .3)); x.lineTo(r * px, r * .24 * (1 - Math.abs(px + 1.2) * .3)); } x.stroke();
    h.Lit(r * .3, 0, r * .46, r * .36, shade(col, 1.1)); h.Lit(r * .98, 0, r * .32, r * .3, shade(col, .85));
    h.eye(r * 1.08, -r * .19, r * .11, '#e8a43a'); h.eye(r * 1.08, r * .19, r * .11, '#e8a43a');
    x.strokeStyle = leg; x.lineWidth = Math.max(.8, r * .07); x.beginPath(); x.moveTo(r * 1.2, -r * .12); x.bezierCurveTo(r * 1.9, -r * .1, r * 2.2, -r * .4, r * 2.5, -r * .95); x.moveTo(r * 1.2, r * .12); x.bezierCurveTo(r * 1.9, r * .1, r * 2.2, r * .4, r * 2.5, r * .95); x.stroke();
    h.A = { fx: 1.5, hx: .98, eyeY: .19, bw: .32, bl: 1.0, bx: -2.0, tx: -2.6, neck: .5, hr: .3 };
  };

  /* --- Acuáticos --- */
  function fishTail(h, bx, len, wid, col, sway, forked) {
    const { x } = h, r = h.r; x.beginPath(); x.moveTo(bx * r, -r * .16);
    if (forked) { x.bezierCurveTo((bx - len * .4) * r, -wid * r * .9 + sway * r * .2, (bx - len) * r, -wid * r * 1.0 + sway * r, (bx - len) * r, -wid * r * 1.0 + sway * r); x.quadraticCurveTo((bx - len * .62) * r, sway * r * .5, (bx - len) * r, wid * r * 1.0 + sway * r); x.bezierCurveTo((bx - len) * r, wid * r * 1.0 + sway * r, (bx - len * .4) * r, wid * r * .9 + sway * r * .2, bx * r, r * .16); }
    else { x.bezierCurveTo((bx - len * .5) * r, -wid * r * .5, (bx - len) * r, -wid * r + sway * r, (bx - len) * r, sway * r); x.bezierCurveTo((bx - len) * r, wid * r + sway * r, (bx - len * .5) * r, wid * r * .5, bx * r, r * .16); }
    x.closePath(); x.fillStyle = col; x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
  }
  DRAW.acu_abisal = h => {   // abisal: señuelo luminoso, boca grande
    const { x, r, col, P } = h, sway = Math.sin(P.tt * (P.mv ? 7 : 3) + P.ph) * .4, tw = sway * (P.flee ? 1.4 : 1), open = Math.max(.25, P.jaw), dk = shade(col, .6), pulse = .6 + .4 * Math.sin(P.tt * 3 + P.ph);
    x.save(); x.rotate(-tw * .15);
    fishTail(h, -1.0, 1.35, .72, shade(col, .75), tw * .8, false);
    for (const s of [-1, 1]) { x.save(); x.translate(r * .05, s * r * .6); x.rotate(s * (.5 + P.sw * .2)); h.poly([0, 0, -r * .4, s * r * .95, -r * .75, s * r * .5], 'rgba(60,110,150,.85)'); x.restore(); }
    h.Lit(-r * .05, 0, r * 1.25, r * .86, col);
    x.fillStyle = 'rgba(120,230,255,' + (.55 + .25 * pulse) + ')'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(-r * (.6 - i * .32), -r * (.62 - Math.abs(i - 2.5) * .06), r * .05, 0, TAU); x.arc(-r * (.6 - i * .32), r * (.62 - Math.abs(i - 2.5) * .06), r * .05, 0, TAU); x.fill(); }
    x.fillStyle = 'rgba(20,40,70,.35)'; for (const [px, py, k] of [[-.5, -.2, .17], [-.1, .25, .14], [.2, -.3, .15], [-.8, .15, .12]]) { x.beginPath(); x.arc(px * r, py * r, r * k, 0, TAU); x.fill(); }
    h.gloss(-r * .2, -r * .45, r * .65, r * .14, .2);
    x.beginPath(); x.moveTo(r * .75, -r * .62); x.quadraticCurveTo(r * 1.75, -r * (.55 + .2 * open), r * 1.78, 0); x.quadraticCurveTo(r * 1.75, r * (.55 + .2 * open), r * .75, r * .62); x.quadraticCurveTo(r * 1.1, 0, r * .75, -r * .62); x.closePath(); x.fillStyle = '#2a0f1c'; x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.fillStyle = '#f4f0e0'; x.strokeStyle = INK; x.lineWidth = h.lw * .6; for (let i = 0; i < 6; i++) { const u = i / 5, a = -1.1 + u * 2.2, px = r * (1.0 + Math.cos(a) * .72), py = r * Math.sin(a) * (.6 + .2 * open); x.beginPath(); x.moveTo(px, py - r * .08); x.lineTo(px - r * .3, py * .8 + r * .02); x.lineTo(px, py + r * .08); x.closePath(); x.fill(); x.stroke(); }
    h.E(r * .78, -r * .5, r * .13, r * .13, '#e8f4f8'); h.E(r * .78, r * .5, r * .13, r * .13, '#e8f4f8'); x.fillStyle = '#111'; for (const s of [-1, 1]) { x.beginPath(); x.arc(r * .8, s * r * .5, r * .06, 0, TAU); x.fill(); }
    x.restore();
    const lx = r * (2.0 + P.hd * .3), ly = Math.sin(P.tt * 2.2 + P.ph) * r * .3;
    x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .06) + h.lw * .7; x.beginPath(); x.moveTo(r * .75, 0); x.quadraticCurveTo(r * 1.5, -r * 1.1, lx, ly); x.stroke(); x.strokeStyle = shade(col, .8); x.lineWidth = Math.max(.8, r * .06); x.stroke();
    const gl = x.createRadialGradient(lx, ly, 0, lx, ly, r * (.9 + .25 * pulse)); gl.addColorStop(0, 'rgba(255,255,200,.95)'); gl.addColorStop(.3, 'rgba(120,255,230,.55)'); gl.addColorStop(1, 'rgba(60,200,255,0)'); x.fillStyle = gl; x.beginPath(); x.arc(lx, ly, r * (.9 + .25 * pulse), 0, TAU); x.fill();
    x.fillStyle = '#fffbd0'; x.strokeStyle = INK; x.lineWidth = h.lw * .7; x.beginPath(); x.arc(lx, ly, r * .2, 0, TAU); x.fill(); x.stroke();
    h.A = { fx: 1.75, hx: .8, eyeY: .5, bw: .86, bl: 1.25, bx: -1.0, tx: -2.35, neck: .45, hr: .5, fin: 1 };
  };
  DRAW.acu_arrecife = h => {   // arrecife: aletas vistosas, franjas
    const { x, r, col, P } = h, sway = Math.sin(P.tt * (P.mv ? 8 : 3.4) + P.ph) * .35 * (P.flee ? 1.3 : 1), fin = '#ffcf4a';
    x.save(); x.rotate(-sway * .12);
    fishTail(h, -.8, 1.15, .78, fin, sway * .8, true);
    for (const s of [-1, 1]) { x.save(); x.translate(r * .15, s * r * .62); x.rotate(s * (.4 + P.sw * .25 + (P.flee ? .3 : 0))); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-r * .2, s * r * .9, -r * .9, s * r * 1.2, -r * .95, s * r * .45); x.closePath(); x.fillStyle = 'rgba(255,210,90,.88)'; x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke(); x.strokeStyle = 'rgba(200,90,30,.6)'; x.lineWidth = 1; x.beginPath(); for (const k of [.3, .55, .8]) { x.moveTo(0, 0); x.lineTo(-r * (.3 + k * .6), s * r * (.4 + k * .65)); } x.stroke(); x.restore(); }
    h.Lit(0, 0, r * 1.02, r * (.78 + .02 * P.br), col);
    x.save(); x.beginPath(); x.ellipse(0, 0, r * 1.02, r * .78, 0, 0, TAU); x.clip(); for (const [bx, bw] of [[-.55, .2], [.05, .18], [.55, .16]]) { x.fillStyle = INK; x.fillRect(r * (bx - bw / 2 - .05), -r, r * (bw + .1), r * 2); x.fillStyle = '#fff'; x.fillRect(r * (bx - bw / 2), -r, r * bw, r * 2); } x.restore();
    x.beginPath(); x.ellipse(0, 0, r * 1.02, r * .78, 0, 0, TAU); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.strokeStyle = 'rgba(255,215,90,.9)'; x.lineWidth = r * .11; x.beginPath(); x.moveTo(-r * .85, 0); x.lineTo(r * .75, 0); x.stroke();
    h.gloss(-r * .1, -r * .42, r * .6, r * .12, .28);
    const mo = r * .08 * P.jaw; h.E(r * 1.0, 0, r * .17 + mo, r * .13 + mo, shade(col, .7));
    h.E(r * .68, -r * .42, r * .2, r * .2, '#fff6c8'); h.E(r * .68, r * .42, r * .2, r * .2, '#fff6c8'); x.fillStyle = '#111'; for (const s of [-1, 1]) { x.beginPath(); x.arc(r * .72, s * r * .42, r * .1, 0, TAU); x.fill(); }
    x.restore();
    h.A = { fx: 1.15, hx: .68, eyeY: .42, bw: .78, bl: 1.0, bx: -.8, tx: -1.95, neck: .45, hr: .4 };
  };
  DRAW.acu_anfibio = h => {   // anfibio tipo ajolote: patas con dedos, cola de salamandra, branquias
    const { x, r, col, P } = h, w = P.tt * (P.mv ? 9 : 3) + P.ph, K = P.legK, dk = shade(col, .55), gill = '#e0506a';
    const spine = t => Math.sin(w - t * 2.2) * r * (P.mv ? .16 : .06);
    x.beginPath(); x.moveTo(-r * .6, -r * .34); const tp = [[-1.2, .3], [-1.75, .2], [-2.3, .1], [-2.7, 0]]; let first = true;
    for (const [px, wd] of tp) x.lineTo(r * px, -r * wd * .9 + spine(-px));
    for (let i = tp.length - 1; i >= 0; i--) x.lineTo(r * tp[i][0], r * tp[i][1] * .9 + spine(-tp[i][0])); x.lineTo(-r * .6, r * .34); x.closePath();
    x.fillStyle = h.lit(r * 1.5, r * .4, -r * 1.5, 0, shade(col, .85)); x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = r * .08; x.beginPath(); x.moveTo(-r * .8, spine(.8)); x.lineTo(-r * 2.5, spine(2.5)); x.stroke();
    for (const s of [-1, 1]) for (const f of [0, 1]) { const px = f ? .8 : -.45, sg = (f ? 1 : -1) * s * P.sw, ex = px * r + sg * r * .28 * K, ey = s * r * (.5 + .5 * K), fx = ex + sg * r * .12, fy = s * r * (.8 + .5 * K);
      x.strokeStyle = INK; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = r * .22 + h.lw * 1.3; x.beginPath(); x.moveTo(px * r, s * r * .3); x.lineTo(ex, ey); x.lineTo(fx, fy); x.stroke(); x.strokeStyle = shade(col, .85); x.lineWidth = r * .22; x.stroke();
      x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .08); x.beginPath(); for (const k of [-1, 0, 1]) { x.moveTo(fx, fy); x.lineTo(fx + k * r * .2 + sg * r * .06, fy + s * r * .3); } x.stroke(); }
    h.Lit(.1, 0, r * .95, r * (.44 + .02 * P.br), col, 0); h.Lit(-r * .5, 0, r * .55, r * .4, col);
    x.fillStyle = 'rgba(20,50,30,.4)'; for (const [px, py, k] of [[-.4, -.15, .13], [.2, .15, .1], [.5, -.12, .11], [-.9, .1, .09], [-1.4, spine(1.4) / r - .02, .08], [-1.9, spine(1.9) / r, .07]]) { x.beginPath(); x.arc(px * r, py * r, r * k, 0, TAU); x.fill(); }
    h.gloss(0, -r * .18, r * .6, r * .08, .25);
    const hx = r * (1.45 + P.hd);
    for (const s of [-1, 1]) { x.strokeStyle = INK; x.lineWidth = r * .08 + h.lw; x.lineCap = 'round'; for (const k of [0, 1, 2]) { const gx = hx - r * .45 - k * r * .1, a = s * (.7 + k * .3 + Math.sin(w * 1.3 + k) * .08); x.beginPath(); x.moveTo(hx - r * .3, s * r * .3); x.lineTo(gx + Math.sin(a * 0) * 0, s * r * (.75 + k * .2)); x.stroke(); } x.strokeStyle = gill; x.lineWidth = r * .08; for (const k of [0, 1, 2]) { const gx = hx - r * .45 - k * r * .1; x.beginPath(); x.moveTo(hx - r * .3, s * r * .3); x.lineTo(gx, s * r * (.75 + k * .2)); x.stroke(); } }
    h.Lit(hx, 0, r * .5, r * .44, col); h.Lit(hx + r * .38, 0, r * .3, r * (.3 + .04 * P.jaw), shade(col, 1.1));
    x.strokeStyle = 'rgba(30,15,20,.7)'; x.lineWidth = Math.max(1, r * .05); x.beginPath(); x.arc(hx + r * .38, 0, r * .22, -.9, .9); x.stroke();
    h.eye(hx + r * .12, -r * .26, r * .11); h.eye(hx + r * .12, r * .26, r * .11);
    h.A = { fx: hx / r + .65, hx: hx / r, eyeY: .26, bw: .5, bl: 1.1, bx: -.6, tx: -2.7, neck: 1.0, hr: .44 };
  };

  /* --- Aves --- */
  function birdWing(h, s, f, o) {   // ala por un lado (s = ±1); f = -1..1 batida; o: root,span,sweep,fingers,fold,fill,edge
    const { x, r } = h, sp = o.span * (.72 + .28 * f) * (1 - o.fold * .55), sw = o.sweep + o.fold * .3, n = o.fingers;
    const pts = [[o.rx, s * r * .32], [o.rx - .1, s * sp * .45]];
    x.save(); x.translate(0, 0);
    x.beginPath(); x.moveTo(o.rx * r, s * r * .32); x.lineTo((o.rx - .18 - sw * .3) * r, s * sp * .5 * r / r);
    // borde de ataque
    x.lineTo((o.rx - .35 - sw * .75) * r, s * sp * r);
    // dedos de la punta (primarias)
    for (let i = 0; i < n; i++) { const u = i / Math.max(1, n - 1); x.lineTo((o.rx - .55 - sw * .8 - u * (.9 + o.chord * .4)) * r, s * sp * r * (1 - u * u * .28 + .05)); x.lineTo((o.rx - .5 - sw * .8 - u * (.9 + o.chord * .4) - .16) * r, s * sp * r * (1 - u * u * .3 - .1 * (n > 3 ? 1 : .4))); }
    x.lineTo((o.rx - 1.15 - o.chord * .5) * r, s * r * .5); x.closePath();
    const g = x.createLinearGradient(0, 0, 0, s * sp * r); g.addColorStop(0, shade(h.col, 1.15)); g.addColorStop(1, o.edge || shade(h.col, .62)); x.fillStyle = g; x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.beginPath(); for (let i = 1; i < 4; i++) { const u = i / 4; x.moveTo((o.rx - .2) * r, s * (r * .35 + sp * u * .6)); x.lineTo((o.rx - .85 - o.chord * .3) * r, s * (r * .45 + sp * u * .85)); } x.stroke();
    x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse((o.rx - .3) * r, s * sp * .35, r * .35, sp * .3, s * -.3, 0, TAU); x.fill();
    x.restore();
  }
  function birdFold(P) { return P.rest || P.lay || (!P.mv && !P.flee && (P.eat || P.st === 'forage' || P.st === 'idle')) ? .6 : 0; }
  function birdFlap(P) { return Math.sin(P.tt * (P.flee ? 20 : P.mv ? 15 : 5.5) + P.ph) * (birdFold(P) ? .5 : 1); }
  function talons(h, P) { if (P.lunge < .15 && !P.hunt) return; const { x, r } = h, e = .5 + P.lunge; for (const s of [-1, 1]) { x.strokeStyle = '#f0b020'; x.lineWidth = r * .11; x.lineCap = 'round'; x.beginPath(); x.moveTo(r * .5, s * r * .2); x.lineTo(r * (1.2 + e * .5), s * r * .3); x.stroke(); x.strokeStyle = INK; x.lineWidth = Math.max(.8, r * .05); for (const k of [-1, 0, 1]) { x.beginPath(); x.moveTo(r * (1.2 + e * .5), s * r * .3); x.lineTo(r * (1.55 + e * .5), s * r * (.3 + k * .13)); x.stroke(); } } }
  DRAW.ave_rapaz = h => {   // rapaz: alas anchas con dedos, pico curvo, cola barrada
    const { x, r, col, P } = h, f = birdFlap(P), fold = birdFold(P);
    for (let k = -2; k <= 2; k++) { const a = k * .2; h.poly([-r * .7, k * r * .12, -r * 1.95 - Math.abs(k) * -r * .05, k * r * .45 + Math.sin(a) * r * .2, -r * 1.8, k * r * .45 + r * .22], shade(col, k % 2 ? .72 : .6)); }
    talons(h, P);
    for (const s of [-1, 1]) birdWing(h, s, f, { rx: .5, span: 2.35, sweep: .1, chord: 1.1, fingers: 4, fold });
    h.Lit(0, 0, r * 1.0, r * (.5 + .02 * P.br), col);
    x.fillStyle = 'rgba(255,235,200,.55)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(r * (.4 - i * .3), 0, r * .1, r * .2, 0, 0, TAU); x.fill(); }
    h.gloss(-r * .1, -r * .22, r * .45, r * .1, .28);
    const hx = r * (1.0 + P.hd * .6);
    h.Lit(hx, 0, r * .38, r * .35, shade(col, 1.2));
    x.fillStyle = INK; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(hx + r * .02, s * r * .3); x.lineTo(hx + r * .34, s * r * .12); x.lineTo(hx + r * .3, s * r * .24); x.closePath(); x.fill(); }
    const jo = r * .06 * P.jaw;
    x.beginPath(); x.moveTo(hx + r * .3, -r * .15 - jo); x.quadraticCurveTo(hx + r * .8, -r * .14, hx + r * .95, r * .1); x.quadraticCurveTo(hx + r * .8, r * .1, hx + r * .3, r * .15 + jo); x.closePath(); x.fillStyle = '#f0b020'; x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.fillStyle = '#3a3a42'; x.beginPath(); x.moveTo(hx + r * .72, -r * .09); x.quadraticCurveTo(hx + r * .9, -r * .06, hx + r * .95, r * .1); x.quadraticCurveTo(hx + r * .85, r * .08, hx + r * .72, r * .08); x.fill();
    h.eye(hx + r * .12, -r * .19, r * .09, '#f2b820'); h.eye(hx + r * .12, r * .19, r * .09, '#f2b820');
    h.A = { fx: hx / r + .95, hx: hx / r, eyeY: .19, bw: .5, bl: 1.0, bx: -.8, tx: -1.95, neck: .6, hr: .36, wing: 2.35 };
  };
  DRAW.ave_carronera = h => {   // carroñera: cuello pelado y gorguera, pico pesado
    const { x, r, col, P } = h, f = birdFlap(P), fold = birdFold(P), skin = '#cf8f86';
    for (let k = -1; k <= 1; k++) h.poly([-r * .7, k * r * .15, -r * 1.5, k * r * .5, -r * 1.45, k * r * .5 + r * .25], shade(col, .7));
    for (const s of [-1, 1]) birdWing(h, s, f, { rx: .4, span: 2.5, sweep: -.05, chord: 1.5, fingers: 6, fold, edge: shade(col, .5) });
    h.Lit(0, 0, r * .98, r * (.62 + .02 * P.br), col);
    h.gloss(-r * .15, -r * .28, r * .45, r * .1, .2);
    const nx = r * (1.25 + P.hd * .6);
    h.E((.7 + .5) * r, 0, r * .3, r * .2, skin);
    x.fillStyle = '#efeeea'; x.strokeStyle = INK; x.lineWidth = h.lw * .7; for (let i = -4; i <= 4; i++) { const a = i * .36; x.beginPath(); x.ellipse(r * .78 - Math.cos(a) * r * .02, Math.sin(a) * r * .44, r * .2, r * .13, a + Math.PI / 2 * 0, 0, TAU); x.fill(); x.stroke(); }
    h.Lit(nx, 0, r * .3, r * .27, skin, 0);
    x.strokeStyle = 'rgba(90,30,40,.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(nx - r * .1, -r * .12); x.lineTo(nx + r * .1, -r * .05); x.moveTo(nx - r * .1, r * .12); x.lineTo(nx + r * .1, r * .05); x.stroke();
    const jo = r * .08 * P.jaw;
    x.beginPath(); x.moveTo(nx + r * .2, -r * .17 - jo); x.quadraticCurveTo(nx + r * .75, -r * .2, nx + r * .98, r * .04); x.quadraticCurveTo(nx + r * .75, r * .16, nx + r * .2, r * .17 + jo); x.closePath(); x.fillStyle = '#d8d0b8'; x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.fillStyle = '#5a5648'; x.beginPath(); x.moveTo(nx + r * .78, -r * .12); x.quadraticCurveTo(nx + r * .95, -r * .05, nx + r * .98, r * .04); x.quadraticCurveTo(nx + r * .9, r * .1, nx + r * .78, r * .08); x.fill();
    h.eye(nx + r * .08, -r * .15, r * .07, '#7a3a2a'); h.eye(nx + r * .08, r * .15, r * .07, '#7a3a2a');
    h.A = { fx: nx / r + .95, hx: nx / r, eyeY: .15, bw: .62, bl: .98, bx: -.8, tx: -1.5, neck: .75, hr: .3, wing: 2.5 };
  };
  DRAW.ave_migratoria = h => {   // migratoria: aerodinámica, alas largas hacia atrás, cola en horquilla
    const { x, r, col, P } = h, f = birdFlap(P), fold = birdFold(P);
    for (const s of [-1, 1]) h.poly([-r * .8, s * r * .1, -r * 2.15, s * r * .55, -r * 1.4, s * r * .04], shade(col, .7));
    for (const s of [-1, 1]) {
      const sp = 2.3 * (.74 + .26 * f) * (1 - fold * .5);
      x.beginPath(); x.moveTo(r * .55, s * r * .22); x.lineTo(r * .05, s * sp * r * .55); x.lineTo(-r * .85, s * sp * r); x.lineTo(-r * 1.2, s * sp * r * .96); x.lineTo(-r * .85, s * sp * r * .55); x.lineTo(-r * .7, s * r * .35); x.closePath();
      const g = x.createLinearGradient(0, 0, 0, s * sp * r); g.addColorStop(0, shade(col, 1.2)); g.addColorStop(1, shade(col, .6)); x.fillStyle = g; x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = r * .09; x.beginPath(); x.moveTo(-r * .1, s * sp * r * .3); x.lineTo(-r * .55, s * sp * r * .72); x.stroke();
    }
    x.beginPath(); x.ellipse(0, 0, r * 1.1, r * (.36 + .02 * P.br), 0, 0, TAU); x.fillStyle = h.lit(r * 1.1, r * .36); x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    x.fillStyle = 'rgba(250,250,255,.85)'; x.beginPath(); x.ellipse(-r * .65, 0, r * .28, r * .22, 0, 0, TAU); x.fill();
    h.gloss(0, -r * .15, r * .6, r * .07, .35);
    const hx = r * (1.1 + P.hd * .5); h.Lit(hx, 0, r * .27, r * .24, shade(col, 1.15));
    const jo = r * .04 * P.jaw; x.beginPath(); x.moveTo(hx + r * .2, -r * .09 - jo); x.lineTo(hx + r * .72, 0); x.lineTo(hx + r * .2, r * .09 + jo); x.closePath(); x.fillStyle = '#26262e'; x.fill(); x.lineWidth = h.lw * .8; x.strokeStyle = INK; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = r * .05; x.beginPath(); x.moveTo(hx - r * .05, -r * .17); x.lineTo(hx + r * .2, -r * .12); x.stroke();
    h.eye(hx + r * .07, -r * .12, r * .07); h.eye(hx + r * .07, r * .12, r * .07);
    h.A = { fx: hx / r + .72, hx: hx / r, eyeY: .12, bw: .36, bl: 1.1, bx: -1.0, tx: -2.15, neck: .75, hr: .25, wing: 2.3 };
  };

  /* --- Genéricos para fauna salvaje (conejo, ciervo, pez, lucio, escarabajo) --- */
  DRAW.gen_ter = (h, sp) => {
    const { x, r, col, P } = h, K = P.legK;
    x.strokeStyle = shade(col, .5); x.lineWidth = r * .26; x.lineCap = 'round';
    for (const s of [-1, 1]) for (const px of [-.6, .62]) { x.beginPath(); x.moveTo(px * r, s * r * .42); x.lineTo(px * r + P.sw * r * .3 * s * K, s * r * (.42 + .56 * K)); x.stroke(); }
    h.E(-r * 1.3, P.sw * r * .22, r * .36, r * .22, shade(col, .8), P.sw * .4);
    h.Lit(0, 0, r * 1.15, r * (.78 + .02 * P.br), col);
    h.gloss(-r * .1, -r * .3, r * .6, r * .12, .22);
    const hx = r * (1.28 + P.hd * .4);
    if (sp.key === 'conejo') { for (const s of [-1, 1]) h.E(hx - r * .25, s * r * .3, r * .5, r * .13, shade(col, 1.05), s * .3 * (P.flee ? .3 : 1)); }
    if (sp.key === 'ciervo') { x.strokeStyle = '#d8c8a0'; x.lineWidth = Math.max(1, r * .1); for (const s of [-1, 1]) { x.beginPath(); x.moveTo(hx - r * .1, s * r * .25); x.lineTo(hx + r * .3, s * r * .8); x.moveTo(hx + r * .1, s * r * .5); x.lineTo(hx - r * .1, s * r * .9); x.moveTo(hx + r * .2, s * r * .66); x.lineTo(hx + r * .65, s * r * .62); x.stroke(); } }
    h.Lit(hx, 0, r * .56, r * .46, col); h.E(hx + r * .44, 0, r * .22, r * .17, shade(col, 1.3)); x.fillStyle = '#222'; x.beginPath(); x.arc(hx + r * .62, 0, r * .07, 0, TAU); x.fill();
    h.eye(hx + r * .22, -r * .2, r * .09); h.eye(hx + r * .22, r * .2, r * .09);
    h.A = { fx: hx / r + .65, hx: hx / r, eyeY: .2, bw: .78, bl: 1.15, bx: -1.2, tx: -1.65, neck: .9, hr: .5 };
  };
  DRAW.gen_acu = h => {
    const { x, r, col, P } = h, tw = Math.sin(P.tt * (P.mv ? 8 : 3.5) + P.ph) * .4;
    x.fillStyle = shade(col, .78); x.beginPath(); x.moveTo(-r * .9, 0); x.quadraticCurveTo(-r * 1.5, -r * .2 + tw * .5 * r, -r * 1.95, -r * .78 + tw * r); x.quadraticCurveTo(-r * 1.6, tw * r * .2, -r * 1.95, r * .78 + tw * r); x.quadraticCurveTo(-r * 1.5, r * .2 + tw * .5 * r, -r * .9, 0); x.closePath(); x.fill(); x.lineWidth = h.lw; x.strokeStyle = INK; x.stroke();
    for (const s of [-1, 1]) h.poly([r * .1, s * r * .5, -r * .4, s * r * 1.1 + tw * r * .2, -r * .5, s * r * .5], shade(col, .68));
    h.Lit(0, 0, r * 1.3, r * .72, col);
    h.gloss(r * .2, r * .3, r * 1.0, r * .2, .22);
    h.eye(r * .88, -r * .3, r * .13); h.eye(r * .88, r * .3, r * .13);
    h.A = { fx: 1.4, hx: .88, eyeY: .3, bw: .72, bl: 1.3, bx: -.9, tx: -1.95, neck: .5, hr: .4 };
  };
  DRAW.escarabajo = h => {
    const { x, r, col, P } = h; x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .12);
    for (const px of [-.5, 0, .5]) for (const s of [-1, 1]) { x.beginPath(); x.moveTo(px * r, s * r * .5); x.lineTo(px * r + s * P.sw * r * .25 + r * .2, s * r * 1.15); x.stroke(); }
    h.Lit(-r * .1, 0, r * 1.0, r * .8, col); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(r * .75, 0); x.lineTo(-r * 1.0, 0); x.stroke(); h.gloss(-r * .3, -r * .3, r * .5, r * .15, .35);
    h.Lit(r * 1.0, 0, r * .34, r * .3, shade(col, .6)); h.A = { fx: 1.4, hx: 1.0, eyeY: .2, bw: .8, bl: 1.0, bx: -1.0, tx: -1.1, neck: .6, hr: .3 };
  };
  const KEYMAP = { lobo: 'ter_cazador', oso: 'ter_gigante', lucio: 'gen_acu', pez: 'gen_acu', conejo: 'gen_ter', ciervo: 'gen_ter', escarabajo: 'escarabajo' };
  const GMAP = { ter: 'gen_ter', acu: 'gen_acu', ave: 'ave_rapaz', ins: 'ins_enjambre' };

  /* ================================================================ RASGOS (TV): se anclan a la anatomía de cada especie (h.A) ================================================================ */
  const TV = {
    alas: (x, r, t, A, v, h) => { if (h.sp.g === 'ave' || h.sp.g === 'ins') { x.fillStyle = 'rgba(255,255,255,.32)'; x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(-r * .3, s * r * 1.5, r * .5, r * 1.0, s * .5, 0, TAU); x.fill(); x.stroke(); } return; } const f = Math.sin(t * 10) * .3; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(r * .3, s * r * .3); x.bezierCurveTo(r * .1, s * r * (1.2 + f), -r * .7, s * r * (1.9 + f), -r * 1.1, s * r * (1.5 + f)); x.bezierCurveTo(-r * .9, s * r * .9, -r * .6, s * r * .5, -r * .3, s * r * .35); x.closePath(); x.fillStyle = v === 'B' ? 'rgba(255,214,140,.82)' : 'rgba(255,255,255,.8)'; x.fill(); x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .08); x.stroke(); } },
    aletas: (x, r, t, A, v, h) => { x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .08); const c = v === 'B' ? 'rgba(255,170,120,.85)' : 'rgba(120,200,240,.85)'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(r * .35, s * A.bw * r * .8); x.lineTo(-r * .55, s * (A.bw + .85) * r); x.lineTo(-r * .85, s * A.bw * r * .6); x.closePath(); x.fillStyle = c; x.fill(); x.stroke(); } x.strokeStyle = c; x.lineWidth = r * .22; x.beginPath(); x.moveTo(-r * .7, 0); x.lineTo(r * .5, 0); x.stroke(); },
    patas: (x, r, t, A, v) => { x.lineCap = 'round'; for (const s of [-1, 1]) for (const px of [-.55, .6]) { const e = r * (1.7 + (v === 'A' ? .35 : 0)), sw = Math.sin(t * 8 + px * 3) * r * .3; x.strokeStyle = INK; x.lineWidth = r * .16 + 2; x.beginPath(); x.moveTo(px * r, s * A.bw * r * .8); x.lineTo(px * r + sw, s * e); x.stroke(); x.strokeStyle = '#d8c8a8'; x.lineWidth = r * .16; x.stroke(); } },
    caparazon: (x, r, t, A, v) => { x.beginPath(); x.ellipse(-r * .1, 0, r * (A.bl * .8), r * A.bw * .9, 0, 0, TAU); const g = x.createRadialGradient(-r * .4, -r * .3, r * .1, 0, 0, r * 1.1); g.addColorStop(0, v === 'B' ? '#b9a07a' : '#a98a63'); g.addColorStop(1, '#4a3626'); x.fillStyle = g; x.fill(); x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .09); x.stroke(); x.strokeStyle = 'rgba(20,10,5,.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-r * A.bl * .75, 0); x.lineTo(r * A.bl * .6, 0); for (const k of [-.45, 0, .45]) { x.moveTo(r * k, -r * A.bw * .85); x.lineTo(r * k, r * A.bw * .85); } x.stroke(); if (v === 'B') { x.fillStyle = '#e8dcc0'; for (const k of [-.5, 0, .5]) for (const s of [-1, 1]) { x.beginPath(); x.moveTo(r * k, s * A.bw * r * .85); x.lineTo(r * k + r * .12, s * (A.bw + .35) * r); x.lineTo(r * k - r * .12, s * A.bw * r * .85); x.fill(); } } },
    exo: (x, r, t, A, v) => { x.strokeStyle = 'rgba(30,22,40,.75)'; x.lineWidth = Math.max(1.2, r * .1); for (const k of [-.65, -.1, .45]) { x.beginPath(); x.ellipse(k * r, 0, r * .3, r * A.bw * .95, 0, -1.4, 1.4); x.stroke(); } x.fillStyle = v === 'B' ? 'rgba(255,255,255,.3)' : 'rgba(255,230,160,.35)'; x.beginPath(); x.ellipse(-r * .1, -r * A.bw * .45, r * A.bl * .55, r * .08, 0, 0, TAU); x.fill(); },
    piel: (x, r, t, A, v) => { x.strokeStyle = v === 'B' ? 'rgba(235,235,230,.8)' : 'rgba(60,42,28,.8)'; x.lineWidth = Math.max(1, r * .08); x.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16; if (Math.cos(a) > .85) continue; const rx = r * A.bl, ry = r * A.bw; x.moveTo(Math.cos(a) * rx * .98, Math.sin(a) * ry * .98); x.lineTo(Math.cos(a) * (rx + r * .3), Math.sin(a) * (ry + r * .3)); } x.stroke(); },
    garras: (x, r, t, A, v) => { x.fillStyle = '#f6f2e6'; x.strokeStyle = INK; x.lineWidth = Math.max(.8, r * .06); const e = A.fx * r - r * .1; for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { x.beginPath(); x.moveTo(e - r * .2, s * A.bw * r * .6 + k * r * .09); x.lineTo(e + r * (.5 + (v === 'A' ? .25 : 0)), s * A.bw * r * .72 + k * r * .15); x.lineTo(e - r * .2, s * A.bw * r * .6 + k * r * .09 + r * .1); x.closePath(); x.fill(); x.stroke(); } },
    cuernos: (x, r, t, A, v) => { x.lineCap = 'round'; const hx = A.hx * r; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(hx, s * r * A.hr * .8); if (v === 'B') { x.quadraticCurveTo(hx + r * .2, s * r * 1.3, hx + r * .9, s * r * 1.4); x.moveTo(hx + r * .05, s * r * 1.0); x.lineTo(hx - r * .25, s * r * 1.5); } else x.quadraticCurveTo(hx + r * .5, s * r * 1.15, hx + r * 1.05, s * r * .75); x.strokeStyle = INK; x.lineWidth = r * .22 + 2; x.stroke(); x.strokeStyle = '#f0e6cc'; x.lineWidth = r * .2; x.stroke(); } },
    aguijon: (x, r, t, A, v) => { const e = A.tx * r; x.beginPath(); x.moveTo(e + r * .5, -r * .16); x.lineTo(e - r * (.5 + (v === 'A' ? .3 : 0)), 0); x.lineTo(e + r * .5, r * .16); x.closePath(); x.fillStyle = v === 'B' ? '#6a2ac0' : '#d0582b'; x.fill(); x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .07); x.stroke(); },
    olfato: (x, r, t, A) => { x.fillStyle = '#16121a'; x.beginPath(); x.arc(A.fx * r, 0, r * .17, 0, TAU); x.fill(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const u = (t * 1.2 + k / 3) % 1; x.globalAlpha = 1 - u; x.beginPath(); x.moveTo(A.fx * r + r * (.4 + u), -r * .4 + k * r * .4); x.quadraticCurveTo(A.fx * r + r * (.7 + u), -r * .2 + k * r * .4, A.fx * r + r * (1 + u), -r * .4 + k * r * .4); x.stroke(); } x.globalAlpha = 1; },
    vision: (x, r, t, A, v) => { for (const s of [-1, 1]) { x.fillStyle = v === 'B' ? '#ffb84a' : '#fff7a0'; x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .06); x.beginPath(); x.arc(A.hx * r + r * .15, s * A.eyeY * r, r * .22, 0, TAU); x.fill(); x.stroke(); x.fillStyle = '#111'; x.beginPath(); x.ellipse(A.hx * r + r * .2, s * A.eyeY * r, r * .06, r * .16, 0, 0, TAU); x.fill(); } },
    eco: (x, r, t, A, v) => { x.strokeStyle = v === 'B' ? 'rgba(220,120,60,.8)' : 'rgba(90,100,230,.75)'; x.lineWidth = 1.3; for (let k = 0; k < 3; k++) { const u = (t * 1.5 + k / 3) % 1; x.globalAlpha = 1 - u; x.beginPath(); x.arc(A.fx * r, 0, r * (.7 + u * 1.6), -.8, .8); x.stroke(); } x.globalAlpha = 1; },
    sangre: (x, r, t, A) => { const g = x.createRadialGradient(0, 0, r * .5, 0, 0, r * 2.1); g.addColorStop(0, 'rgba(255,90,60,0)'); g.addColorStop(.6, 'rgba(255,90,60,' + (.28 + .1 * Math.sin(t * 4)) + ')'); g.addColorStop(1, 'rgba(255,90,60,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r * 2.1, 0, TAU); x.fill(); },
    hiber: (x, r, t, A, v) => { x.strokeStyle = 'rgba(150,200,255,.9)'; x.lineWidth = 2; x.setLineDash([3, 3]); x.beginPath(); x.ellipse(0, 0, r * (A.bl + .4), r * (A.bw + .35), 0, 0, TAU); x.stroke(); x.setLineDash([]); x.fillStyle = 'rgba(210,235,255,.9)'; for (let i = 0; i < 3; i++) { const a = t * .6 + i * 2.09; x.beginPath(); x.arc(Math.cos(a) * r * A.bl * 1.2, Math.sin(a) * r * (A.bw + .4), r * .1, 0, TAU); x.fill(); } },
    digest: (x, r, t, A) => { x.beginPath(); x.ellipse(-r * .1, r * A.bw * .45, r * .6, r * .3, 0, 0, TAU); x.fillStyle = 'rgba(140,210,110,.85)'; x.fill(); x.strokeStyle = '#2a5a2a'; x.lineWidth = 1; x.stroke(); x.strokeStyle = 'rgba(40,100,40,.6)'; x.beginPath(); x.moveTo(-r * .4, r * A.bw * .45); x.quadraticCurveTo(-r * .2, r * A.bw * .2, 0, r * A.bw * .45); x.quadraticCurveTo(r * .2, r * A.bw * .7, r * .3, r * A.bw * .45); x.stroke(); },
    camadas: (x, r, t, A) => { x.fillStyle = '#f6efd8'; x.strokeStyle = '#6a5a3a'; x.lineWidth = .9; for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(A.tx * r + r * .3 - (k % 2) * r * .5, (k - 1.5) * r * .32, r * .2, r * .26, 0, 0, TAU); x.fill(); x.stroke(); } },
    cuidado: (x, r, t, A, v) => { x.fillStyle = v === 'B' ? '#ffe08a' : '#f6a8c0'; x.strokeStyle = INK; x.lineWidth = .8; x.beginPath(); x.ellipse(-r * .4, r * A.bw * .4, r * .38, r * .28, 0, 0, TAU); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-r * .32, r * A.bw * .38, r * .1, 0, TAU); x.fill(); x.beginPath(); x.arc(-r * .5, r * A.bw * .45, r * .07, 0, TAU); x.fill(); },
    metamorfosis: (x, r, t, A, v) => { x.strokeStyle = 'rgba(160,100,220,.9)'; x.lineWidth = 1.6; x.setLineDash([4, 3]); x.beginPath(); x.ellipse(0, 0, r * (A.bl + .5), r * (A.bw + .4), 0, 0, TAU); x.stroke(); x.setLineDash([]); x.fillStyle = 'rgba(190,140,240,.8)'; x.beginPath(); x.ellipse(-r * A.bl * .4, 0, r * .25, r * .14, 0, 0, TAU); x.fill(); },
    manada: (x, r, t, A) => { x.fillStyle = 'rgba(40,30,50,.35)'; for (const s of [-1, 1]) { x.beginPath(); x.arc(-r * 1.2, s * (A.bw + .9) * r, r * .38, 0, TAU); x.fill(); x.beginPath(); x.arc(-r * 2.0, s * (A.bw + 1.5) * r, r * .28, 0, TAU); x.fill(); } },
    colmena: (x, r, t, A, v) => { x.strokeStyle = 'rgba(130,80,0,.9)'; x.lineWidth = Math.max(1, r * .08); x.fillStyle = 'rgba(255,200,60,.35)'; for (const k of [-.4, .1, .6]) { x.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * TAU / 6, px = k * r + Math.cos(a) * r * .3, py = -r * A.bw * .2 + Math.sin(a) * r * .3; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); x.stroke(); } },
    territorio: (x, r, t, A) => { x.strokeStyle = 'rgba(30,20,40,.5)'; x.setLineDash([2, 4]); x.lineWidth = 1.3; x.beginPath(); x.arc(0, 0, r * 2.4, 0, TAU); x.stroke(); x.setLineDash([]); x.fillStyle = 'rgba(120,70,30,.8)'; x.beginPath(); x.arc(r * 2.4, 0, r * .2, 0, TAU); x.fill(); },
    veneno: (x, r, t, A, v) => { x.fillStyle = v === 'B' ? '#c43aa8' : '#58d43a'; for (let k = 0; k < 3; k++) { const u = (t * 1.3 + k / 3) % 1; x.globalAlpha = 1 - u * .7; x.beginPath(); x.arc(A.fx * r + r * .1 + k * r * .15, r * (.1 + u * .9), r * .13 * (1 - u * .4), 0, TAU); x.fill(); } x.globalAlpha = 1; x.strokeStyle = 'rgba(60,160,40,.8)'; x.lineWidth = r * .07; x.beginPath(); x.arc(0, 0, r * (A.bl + .15), -.5, .5); x.stroke(); },
    feromonas: (x, r, t, A) => { x.strokeStyle = 'rgba(170,90,220,.85)'; x.lineWidth = 1.3; for (const s of [-1, 1]) { x.beginPath(); for (let i = 0; i <= 8; i++) { const u = i / 8, px = A.bx * r - u * r * 1.2, py = s * (r * .3 + Math.sin(t * 5 + u * 7) * r * .25 + u * r * .6); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } },
    defquim: (x, r, t, A, v) => { x.fillStyle = v === 'B' ? '#9ae6ff' : '#e6e040'; x.strokeStyle = INK; x.lineWidth = .8; for (const [px, py] of [[-.5, -.3], [.1, .3], [.5, -.2], [-.2, .05]]) { x.beginPath(); x.arc(px * r, py * r * A.bw / .6, r * .15, 0, TAU); x.fill(); x.stroke(); } },
    camuflaje: (x, r, t, A, v) => { x.fillStyle = v === 'B' ? 'rgba(120,115,105,.8)' : 'rgba(70,95,40,.8)'; for (const [px, py, k] of [[-.7, -.3, .3], [-.1, .35, .26], [.4, -.35, .3], [.7, .25, .22], [-.4, .4, .2]]) { x.beginPath(); x.ellipse(px * r * A.bl * .85, py * r * A.bw * 1.3, r * k, r * k * .75, px, 0, TAU); x.fill(); } },
    senuelo: (x, r, t, A, v) => { for (const s of [-1, 1]) { x.fillStyle = '#fff'; x.strokeStyle = INK; x.lineWidth = .8; x.beginPath(); x.arc(A.bx * r * .8, s * A.bw * r * .45, r * .24, 0, TAU); x.fill(); x.stroke(); x.fillStyle = v === 'B' ? '#d33' : '#111'; x.beginPath(); x.arc(A.bx * r * .8 + r * .04, s * A.bw * r * .45, r * .11, 0, TAU); x.fill(); } },
    imitacion: (x, r, t, A, v) => { x.strokeStyle = v === 'B' ? '#e85a1b' : '#f2d21b'; x.lineWidth = r * .2; x.save(); x.beginPath(); x.ellipse(-r * .1, 0, r * A.bl * .85, r * A.bw * .85, 0, 0, TAU); x.clip(); for (const k of [-.6, -.15, .3]) { x.beginPath(); x.moveTo(k * r - r * .2, -r); x.lineTo(k * r + r * .2, r); x.stroke(); } x.restore(); },
    madriguera: (x, r, t, A) => { x.fillStyle = '#7b5a3a'; x.strokeStyle = INK; x.lineWidth = 1; x.beginPath(); x.arc(0, r * (A.bw + .35), r * .65, Math.PI, TAU); x.fill(); x.stroke(); x.fillStyle = '#2a1a0e'; x.beginPath(); x.arc(0, r * (A.bw + .35), r * .3, Math.PI, TAU); x.fill(); },
    nido: (x, r, t, A) => { x.strokeStyle = '#6b4a2a'; x.lineWidth = Math.max(1, r * .1); for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-r * .55, -r * (A.bw + .35) + i * r * .12); x.lineTo(r * .55, -r * (A.bw + .5) + i * r * .12 + (i % 2) * r * .1); x.stroke(); } x.fillStyle = '#f6efd8'; x.beginPath(); x.ellipse(0, -r * (A.bw + .5), r * .16, r * .2, 0, 0, TAU); x.fill(); },
    ingenieria: (x, r, t, A, v) => { x.strokeStyle = '#3a8a2a'; x.lineWidth = Math.max(1.2, r * .12); x.beginPath(); x.moveTo(-r * .2, -r * A.bw * .6); x.lineTo(-r * .2, -r * (A.bw + .9)); x.stroke(); x.fillStyle = v === 'B' ? '#e0a040' : '#5cc04a'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(-r * .2 + s * r * .26, -r * (A.bw + .8), r * .28, r * .13, s * .5, 0, TAU); x.fill(); x.stroke(); } },
    migracion: (x, r, t, A) => { x.strokeStyle = 'rgba(40,30,60,.55)'; x.lineWidth = Math.max(1, r * .1); for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { x.beginPath(); x.moveTo(A.bx * r - k * r * .5, s * r * .3); x.lineTo(A.bx * r - r * (1.1 + k * .5), s * (A.bw + .6 + k * .3) * r); x.stroke(); } },
    reserva: (x, r, t, A, v) => { x.fillStyle = v === 'B' ? '#e0b04a' : '#4aa8e0'; x.strokeStyle = INK; x.lineWidth = .9; const cy = -r * (A.bw + .45); x.beginPath(); x.moveTo(0, cy - r * .55); x.quadraticCurveTo(r * .42, cy, 0, cy + r * .2); x.quadraticCurveTo(-r * .42, cy, 0, cy - r * .55); x.fill(); x.stroke(); },
    pirofila: (x, r, t, A) => { for (const [px, k, c] of [[-.9, 1, '#ff8a1b'], [-.5, .7, '#ffcf3a']]) { x.fillStyle = c; x.beginPath(); x.moveTo(r * px, -r * .1); x.quadraticCurveTo(r * (px - .2), -r * (.7 + .1 * Math.sin(t * 9 + px)) * k, r * (px + .2), -r * (1.0 + .1 * Math.sin(t * 7)) * k); x.quadraticCurveTo(r * (px + .25), -r * .4, r * px, -r * .1); x.fill(); } },
    herramientas: (x, r, t, A, v) => { x.strokeStyle = '#6b4a2a'; x.lineWidth = Math.max(1.5, r * .16); x.lineCap = 'round'; x.beginPath(); x.moveTo(A.fx * r - r * .3, r * A.bw * .8); x.lineTo(A.fx * r + r * .5, r * (A.bw + .7)); x.stroke(); x.fillStyle = v === 'B' ? '#c9a05a' : '#a0a0a8'; x.strokeStyle = INK; x.lineWidth = .9; x.beginPath(); x.moveTo(A.fx * r + r * .3, r * (A.bw + .5)); x.lineTo(A.fx * r + r * .75, r * (A.bw + .45)); x.lineTo(A.fx * r + r * .65, r * (A.bw + .95)); x.closePath(); x.fill(); x.stroke(); },
    fuego: (x, r, t, A) => { const bx = A.bx * r - r * .2; x.fillStyle = '#ffcf3a'; x.beginPath(); x.moveTo(bx, -r * .4); x.quadraticCurveTo(bx - r * .3, -r * (1.1 + .15 * Math.sin(t * 10)), bx + r * .2, -r * 1.25); x.quadraticCurveTo(bx + r * .3, -r * .7, bx, -r * .4); x.fill(); x.fillStyle = '#ff6b1b'; x.beginPath(); x.arc(bx + r * .1, -r * .55, r * .2, 0, TAU); x.fill(); },
    lenguaje: (x, r, t, A) => { const cy = -r * (A.bw + 1.0); x.fillStyle = '#fff'; x.strokeStyle = INK; x.lineWidth = .9; x.beginPath(); x.ellipse(r * .4, cy, r * .65, r * .38, 0, 0, TAU); x.fill(); x.stroke(); x.beginPath(); x.moveTo(r * .1, cy + r * .3); x.lineTo(r * .0, cy + r * .6); x.lineTo(r * .3, cy + r * .35); x.fill(); x.fillStyle = '#333'; for (const k of [-.3, 0, .3]) { x.beginPath(); x.arc(r * .4 + k * r, cy, r * .07, 0, TAU); x.fill(); } }
  };

  /* ================================================================ drawAnimal ================================================================ */
  function drawAnimal(x, sp, o) {
    const r = sp.r * o.s, tt = o.tt || 0, ph = o.ph || 0, a = o.a || 0, P = pose(o, tt, ph);
    const lite = !!o.lite, dead = o.dead || 0, bornK = o.born == null ? 1 : o.born;
    x.save(); x.translate(o.px, o.py); x.rotate(a);
    if (bornK < 1) { const k = Math.max(.05, bornK), ov = k < .8 ? k / .8 * 1.1 : 1.1 - (k - .8) / .2 * .1; x.scale(ov, ov); }
    if (dead > 0) { x.rotate(dead * 1.25); x.scale(1 + dead * .1, 1 - dead * .28); x.globalAlpha = Math.max(0, 1 - dead * dead * 1.05); }
    if (P.hurt > 0) { x.scale(1 - .16 * P.hurt, 1 + .12 * P.hurt); }
    if (P.lunge > 0) x.translate(r * .5 * P.lunge, 0);
    if (P.lay) { const k = Math.sin(tt * 6) * .05; x.scale(1 + k, 1 - k); }
    x.lineCap = 'round'; x.lineJoin = 'round';
    const col = o.flash > 0 ? '#ffffff' : sp.col, h = mkH(x, r, col, P); h.sp = sp;
    const fn = DRAW[sp.key] || DRAW[KEYMAP[sp.key]] || DRAW[GMAP[sp.g]] || DRAW.gen_ter;
    fn(h, sp);
    const A = h.A;
    if (o.lin && o.lin.col) {   // cinta de la rama heredada
      x.fillStyle = o.lin.col; x.strokeStyle = INK; x.lineWidth = Math.max(1, r * .08); const nx = A.neck * r - r * .14, bw = A.bw * r * 1.05;
      x.beginPath(); x.rect(nx, -bw, r * .26, bw * 2); x.fill(); x.stroke();
      x.fillStyle = '#fff6d0'; for (let i = 0; i < (o.lin.tier || 0); i++) { x.beginPath(); x.arc(nx + r * .13, (i - ((o.lin.tier || 1) - 1) / 2) * r * .3, r * .08, 0, TAU); x.fill(); }
    }
    if (o.cloth) { x.fillStyle = 'rgba(18,149,143,.92)'; x.fillRect(A.neck * r - r * .5, -A.bw * r * .95, r * .22, A.bw * r * 1.9); x.fillStyle = '#ffe08a'; x.fillRect(A.neck * r - r * .5, -r * .16, r * .22, r * .32); }
    if (!lite && o.traits) for (const id of o.traits) {
      const f = TV[id]; if (!f) continue; const v = o.vars ? o.vars[id] : null;
      x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; if (v === 'A') x.scale(1.12, 1.12); f(x, r, tt, A, v, h); x.restore();
    }
    if (o.flash > 0) { x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(0, 0, r * 1.2, r * .9, 0, 0, TAU); x.fill(); }
    x.restore();
  }

  /* ================================================================ ESTADO COSMÉTICO (efectos) ================================================================ */
  const FX = { nums: [], hits: [], bits: [], arrows: [], ghosts: [], dust: [], rings: [], lunge: Object.create(null), recoil: Object.create(null), lastHit: null, scarce: false, scarceT: 0, migBurst: 0, seen: new Set(), scorch: [], gref: null, plantAvg: 1, plantT: 0 };
  const now = () => performance.now() / 1000;
  function reset() { FX.nums.length = FX.hits.length = FX.bits.length = FX.arrows.length = FX.ghosts.length = FX.dust.length = FX.rings.length = 0; FX.lunge = Object.create(null); FX.recoil = Object.create(null); FX.lastHit = null; FX.scorch.length = 0; FX.seen = new Set(); FX.scarce = false; FX.migBurst = 0; SIG.bub.length = 0; SIG.info.clear(); SIG.burstT = -1e9; }
  const cap = (arr, n) => { if (arr.length > n) arr.splice(0, arr.length - n); };
  let getG = () => null, getSel = () => null;

  function attach(Bus, hooks) {
    if (hooks) { if (hooks.getG) getG = hooks.getG; if (hooks.getSel) getSel = hooks.getSel; if (hooks.getInfo) getInfo = hooks.getInfo; if (hooks.getSelSet) getSelSet = hooks.getSelSet; if (hooks.log) logFn = hooks.log; }
    Bus.on('hit', (a, b, d, info) => {
      const t = now(); FX.lunge[a.id] = t; FX.lastHit = { a, b, d, info: info || null };
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx), sz = clamp(a.sp.r / 7, .7, 2.2);
      FX.recoil[b.id] = { t, dx: dx / L, dy: dy / L, k: sz };
      FX.hits.push({ x: b.x - dx / L * b.rr * .5, y: b.y - dy / L * b.rr * .5, ang, sz, t0: t, n: 2 + Math.round(sz * 1.6) });
      if (info && typeof info.mult === 'number' && (info.mult >= 1.12 || info.mult <= .88)) FX.arrows.push({ x: b.x, y: b.y - b.rr * 1.8, up: info.mult >= 1, t0: t, id: b.id });
      cap(FX.hits, 40); cap(FX.arrows, 20);
    });
    Bus.on('dmg', (b, amt, src) => {
      if (!src || !(amt >= .4)) return; const G = getG(); if (!G) return; const sel = getSel(), many = G.A.length >= 60;
      if (many && !(b.sp.team === 'player' || src.sp.team === 'player' || b.id === sel || src.id === sel)) return;
      let kind = 'red'; const lh = FX.lastHit;
      if (lh && lh.a === src && lh.b === b) { const m = lh.info && lh.info.mult; if (typeof m === 'number' ? m >= 1.12 : false) kind = 'gold'; else if (typeof m === 'number' && m <= .88) kind = 'gray'; else if (lh.d > 0 && amt / lh.d < .8) kind = 'gray'; }
      FX.nums.push({ x: b.x + (Math.random() - .5) * 8, y: b.y - b.rr * 1.4, v: Math.max(1, Math.round(amt)), kind, t0: now(), mine: b.sp.team === 'player' }); cap(FX.nums, 40);
    });
    Bus.on('kill', b => {
      const G = getG(); if (!G) return; const many = G.A.length >= 160; if (many && FX.ghosts.length > 10) return;
      FX.ghosts.push({ sp: b.sp, x: b.x, y: b.y, a: b.a, ph: b.ph || 0, rr: b.rr, t0: now(), lite: many }); cap(FX.ghosts, 24);
    });
    Bus.on('eat', (a, tgt, tk) => { if (FX.bits.length > 120) return; const c = tk === 'plant' ? '#6cc850' : '#c04040'; for (let i = 0; i < 3; i++) FX.bits.push({ x: a.x + Math.cos(a.a) * a.rr * 1.5, y: a.y + Math.sin(a.a) * a.rr * 1.5, vx: (Math.random() - .5) * 30, vy: -10 - Math.random() * 20, t0: now(), l: .5, c, s: 1.3 }); });
    Bus.on('born', a => { if (!a) return; for (let i = 0; i < 5; i++) { const q = Math.random() * TAU; FX.bits.push({ x: a.x, y: a.y, vx: Math.cos(q) * 26, vy: Math.sin(q) * 26 - 8, t0: now(), l: .7, c: '#ffe08a', s: 1.6 }); } cap(FX.bits, 140); });
    Bus.on('lay', a => { FX.rings.push({ x: a.x, y: a.y, t0: now(), c: '255,224,138', max: 22, l: .9 }); cap(FX.rings, 16); });
    Bus.on('evolve', () => { SIG.burstT = now(); });
    Bus.on('cause', onCause);   // (animal, texto corto, tipo): lo emite la jugabilidad; aquí solo se muestra
    Bus.on('ability', () => {});
    Bus.on('hazard', () => {});
    Bus.on('season', () => { FX.scarceT = 0; });
    Bus.on('scarcity', e => { FX.scarce = e === false || e === 0 ? false : true; FX.scarceT = now() + 25; });
    Bus.on('migration', p => { FX.migBurst = now() + 6; if (p && typeof p.x === 'number') { const ang = typeof p.tx === 'number' ? Math.atan2(p.ty - p.y, p.tx - p.x) : 0; for (let i = 0; i < 18; i++) FX.dust.push({ x: p.x + (Math.random() - .5) * 30, y: p.y + (Math.random() - .5) * 30, vx: -Math.cos(ang) * (10 + Math.random() * 20), vy: -Math.sin(ang) * (10 + Math.random() * 20), t0: now(), l: 1.2, r: 3 + Math.random() * 3 }); cap(FX.dust, 140); } });
  }

  const _lin = {};
  function linOf(sp, S) { const l = sp.lin || (S && S.lin); if (!l || !l.branch || !BRCOL[l.branch]) return null; const k = l.branch + (l.tier || 0); return _lin[k] || (_lin[k] = { col: BRCOL[l.branch], tier: l.tier || 0 }); }
  /* ---------------------------------------------------------------- opciones por animal (lectura pura) */
  function opts(a, S, tt, r, extra) {
    const sp = a.sp, t = now(), lt = FX.lunge[a.id], rc = FX.recoil[a.id];
    const o = { px: a.x, py: a.y, a: a.a, s: r / sp.r, tt, ph: a.ph, mv: a.mv, flash: a.flash, cloth: S.phase === 2 && sp === S.me, traits: sp.traits, vars: sp.vars, st: a.st, lunge: 0, born: 1 };
    if (lt !== undefined) { const u = (t - lt) / .28; if (u < 1) o.lunge = Math.sin(Math.min(1, u) * Math.PI); else delete FX.lunge[a.id]; }
    if (rc !== undefined) { const u = (t - rc.t) / .16; if (u < 1) { const k = (1 - u) * rc.k * 2.2; o.px += rc.dx * k; o.py += rc.dy * k; } else delete FX.recoil[a.id]; }
    if (a.age < .9) o.born = Math.max(0, a.age / .9);
    if (sp === S.me) o.lin = linOf(sp, S);
    if (extra) Object.assign(o, extra);
    return o;
  }
  function lodBob(a, tt) { return a.mv ? Math.sin(tt * 9 + (a.ph || 0)) * .9 : 0; }

  /* ---------------------------------------------------------------- iconos de estado por animal */
  function status(ctx, a, r, tt, SC) {
    if (a.st === 'flee') {   // gota de sudor + rayas de velocidad
      const u = (tt * 3 + (a.ph || 0)) % 1, bx = a.x - Math.cos(a.a) * r * 1.3, by = a.y - Math.sin(a.a) * r * 1.3;
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5 / SC * SC; ctx.lineCap = 'round'; ctx.beginPath();
      for (const k of [-1, 0, 1]) { const c = Math.cos(a.a), s = Math.sin(a.a), px = -s * k * r * .5, py = c * k * r * .5; ctx.moveTo(bx + px, by + py); ctx.lineTo(bx + px - c * r * (1 + u * .5), by + py - s * r * (1 + u * .5)); } ctx.stroke();
      const dx = a.x + r * .6, dy = a.y - r * 1.7 + u * r * .4; ctx.fillStyle = 'rgba(120,200,255,' + (1 - u * .6) + ')'; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx, dy - 4.5); ctx.quadraticCurveTo(dx + 3.6, dy + .5, dx, dy + 3); ctx.quadraticCurveTo(dx - 3.6, dy + .5, dx, dy - 4.5); ctx.fill(); ctx.stroke();
    } else if (!SIG.on && (a.st === 'rest' || a.st === 'lay')) {   // z de descanso como burbujita (sin texto)
      const u = (tt * .8 + (a.ph || 0)) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (.75 - u * .6) + ')'; for (let i = 0; i < 2; i++) { const k = (u + i * .5) % 1; ctx.beginPath(); ctx.arc(a.x + r * (.8 + k * .5), a.y - r * (1.1 + k * .9), 1.2 + k * 1.6, 0, TAU); ctx.fill(); }
    }
  }
  function breath(ctx, a, r, tt) {   // vapor del aliento (tundra)
    const u = (tt * .7 + (a.ph || 0)) % 1, c = Math.cos(a.a), s = Math.sin(a.a); ctx.fillStyle = 'rgba(255,255,255,' + (.38 * (1 - u)) + ')';
    ctx.beginPath(); ctx.arc(a.x + c * r * (1.5 + u * 1.2), a.y + s * r * (1.5 + u * 1.2) - u * r * .5, r * (.25 + u * .45), 0, TAU); ctx.fill();
  }

  /* ---------------------------------------------------------------- efectos de combate / partículas / fantasmas */
  let lastFx = now();
  function drawFX(ctx, S, tt, SC, selId) {
    const t = now(); lastFx = t;
    // fantasmas de muerte (cuerpo que cae + alma que sube)
    for (let i = FX.ghosts.length - 1; i >= 0; i--) {
      const g = FX.ghosts[i], u = (t - g.t0) / .8; if (u >= 1) { FX.ghosts.splice(i, 1); continue; }
      drawAnimal(ctx, g.sp, { px: g.x, py: g.y, a: g.a, s: g.rr * 1.4 / g.sp.r, tt, ph: g.ph, mv: 0, dead: u, st: 'dead', traits: g.sp.traits, vars: g.sp.vars, lite: g.lite });
      if (!g.lite) { ctx.globalAlpha = (1 - u) * .45; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(g.x, g.y - u * g.rr * 3, g.rr * (.7 - u * .3), g.rr * (1.0 + u * .3), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    // impactos: líneas de corte y chispas, proporcionales al atacante
    for (let i = FX.hits.length - 1; i >= 0; i--) {
      const h = FX.hits[i], u = (t - h.t0) / .26; if (u >= 1) { FX.hits.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; ctx.lineWidth = 1.2 + h.sz; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k < h.n; k++) { const q = h.ang + (k - (h.n - 1) / 2) * .55 + .35, d0 = 3 + u * 5 * h.sz, d1 = d0 + 5 + 7 * h.sz * (1 - u); ctx.moveTo(h.x + Math.cos(q) * d0, h.y + Math.sin(q) * d0); ctx.lineTo(h.x + Math.cos(q) * d1, h.y + Math.sin(q) * d1); } ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,70,' + (.8 * (1 - u)) + ')'; ctx.lineWidth = 1 + h.sz * .6; ctx.beginPath(); const q0 = h.ang + Math.PI / 2; ctx.moveTo(h.x - Math.cos(q0) * 6 * h.sz, h.y - Math.sin(q0) * 6 * h.sz); ctx.lineTo(h.x + Math.cos(q0) * 6 * h.sz, h.y + Math.sin(q0) * 6 * h.sz); ctx.stroke();
    }
    // partículas sueltas (migajas, brillos de nacimiento)
    for (let i = FX.bits.length - 1; i >= 0; i--) { const b = FX.bits[i], u = (t - b.t0) / b.l; if (u >= 1) { FX.bits.splice(i, 1); continue; } const dt = u * b.l; ctx.globalAlpha = 1 - u; ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x + b.vx * dt, b.y + b.vy * dt + 30 * dt * dt, b.s, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    for (let i = FX.rings.length - 1; i >= 0; i--) { const g = FX.rings[i], u = (t - g.t0) / g.l; if (u >= 1) { FX.rings.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(' + g.c + ',' + (1 - u) + ')'; ctx.lineWidth = 2 * (1 - u) + .5; ctx.beginPath(); ctx.arc(g.x, g.y, 4 + g.max * u, 0, TAU); ctx.stroke(); }
    // polvo de migración
    for (let i = FX.dust.length - 1; i >= 0; i--) { const d = FX.dust[i], u = (t - d.t0) / d.l; if (u >= 1) { FX.dust.splice(i, 1); continue; } const dt = u * d.l; ctx.fillStyle = 'rgba(214,190,140,' + (.35 * (1 - u)) + ')'; ctx.beginPath(); ctx.arc(d.x + d.vx * dt, d.y + d.vy * dt, d.r * (1 + u * 1.6), 0, TAU); ctx.fill(); }
    // flechas de ventaja
    for (let i = FX.arrows.length - 1; i >= 0; i--) {
      const a = FX.arrows[i], u = (t - a.t0) / .75; if (u >= 1) { FX.arrows.splice(i, 1); continue; }
      const y = a.y - u * 12, k = 6; ctx.globalAlpha = 1 - u * u; ctx.fillStyle = a.up ? '#5fd37a' : '#d9534f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath();
      if (a.up) { ctx.moveTo(a.x, y - k); ctx.lineTo(a.x + k * .8, y + k * .5); ctx.lineTo(a.x - k * .8, y + k * .5); } else { ctx.moveTo(a.x, y + k); ctx.lineTo(a.x + k * .8, y - k * .5); ctx.lineTo(a.x - k * .8, y - k * .5); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // números de daño (rojo daño, gris reducido, dorado ventaja)
    if (FX.nums.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (let i = FX.nums.length - 1; i >= 0; i--) {
        const n = FX.nums[i], u = (t - n.t0) / .95; if (u >= 1) { FX.nums.splice(i, 1); continue; }
        const sz = (n.kind === 'gold' ? 15 : 12.5) / SC * (1 + .25 * Math.max(0, 1 - u * 6)); ctx.font = '800 ' + sz + 'px system-ui, sans-serif';
        ctx.globalAlpha = u > .6 ? 1 - (u - .6) / .4 : 1; const y = n.y - u * 24 / SC * 1.2;
        ctx.lineWidth = 3 / SC; ctx.strokeStyle = INK; ctx.strokeText(n.v, n.x, y);
        ctx.fillStyle = n.kind === 'gold' ? '#ffd23a' : n.kind === 'gray' ? '#b4b8c0' : (n.mine ? '#ff8a7a' : '#ff4a3a'); ctx.fillText(n.v, n.x, y);
      }
      ctx.globalAlpha = 1;
    }
  }


  /* ================================================================ SEÑALES DE ESTADO Y CAUSA (Ciclo 3) ================================================================
     Iconos pequeños sobre el animal (hambre, peligro, caza, descanso, reproducción/huevo, frío, evolución) y burbujas de causa («Descansa: energía 12»).
     Solo LEE: bioInfo(a) (hooks.getInfo, con caché de 0,3 s y presupuesto de 24 consultas por cuadro) o, con muchos animales, los campos baratos del animal
     (st, hunger). Nada toca G ni usa R(): el único estado es cosmético (SIG). LOD: con más de LOD_N animales solo los propios en peligro/hambre extrema y los
     seleccionados; sin LOD, los propios y los seleccionados (los salvajes solo si los seleccionás). */
  const SIG = { on: true, info: new Map(), budget: 0, bub: [], seen: new Map(), lastLogG: -1e9, burstT: -1e9, wcache: new Map(), drawn: { danger: 0, starve: 0, hunger: 0, hunt: 0, rest: 0, lay: 0, rep: 0, cold: 0, evo: 0, total: 0 }, frame: 0, ms: 0 };
  const CAUSE_COL = { peligro: '#e0453a', danger: '#e0453a', huida: '#e0453a', hambre: '#e6a21b', comida: '#4aa83a', caza: '#d9534f', ataque: '#d9534f', descanso: '#3f8fd1', energia: '#3f8fd1', repro: '#e070a8', reproduccion: '#e070a8', frio: '#7ab8e8', evolucion: '#f0c33a', info: '#8aa09a' };
  let getInfo = null, getSelSet = null, logFn = null;
  const SCRATCH = { danger: false, starve: false, hungry: false, hunt: false, rest: false, lay: false, rep: false, cold: false, hunger: 100 };
  function cheapFlags(a) { const f = SCRATCH; f.danger = a.st === 'flee'; f.starve = a.hunger <= 0; f.hungry = a.hunger < 30; f.hunt = a.st === 'hunt'; f.rest = a.st === 'rest'; f.lay = a.st === 'lay'; f.rep = false; f.cold = false; f.hunger = a.hunger; return f; }
  function mapInfo(a, I) {
    const ef = I.effects || [], has = id => { for (let i = 0; i < ef.length; i++) if (ef[i].id === id) return true; return false; }, th = I.threats && I.threats[0];
    return { danger: a.st === 'flee' || !!(th && th.d < 130), starve: has('starve') || I.hunger <= 0, hungry: I.hunger < 30, hunt: I.st === 'hunt' || !!(I.ord && I.ord.k === 'attack'), rest: I.st === 'rest' || has('rest'),
      lay: I.st === 'lay', rep: !!(I.rep && I.rep.ready && !I.juv), cold: has('cold'), hunger: I.hunger };
  }
  function flagsOf(a, full) {
    if (!full || !getInfo) return cheapFlags(a);
    const t = now(); let e = SIG.info.get(a.id);
    if ((!e || t - e.t > .3) && SIG.budget > 0) { SIG.budget--; let f; try { f = mapInfo(a, getInfo(a)); } catch (_) { f = Object.assign({}, cheapFlags(a)); } e = { t, f }; SIG.info.set(a.id, e); if (SIG.info.size > 900) SIG.info.clear(); }
    return e ? e.f : cheapFlags(a);
  }
  /* ---- iconos (centro cx,cy; tamaño u en unidades de mundo; todos con contorno INK) */
  function icoBegin(ctx, cx, cy, s) { ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; }
  const ICO = {
    danger(ctx, u, tt, ph) { const s = 1 + .1 * Math.sin(tt * 9 + ph); ctx.scale(s, s); ctx.lineWidth = u * .16; ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.moveTo(0, -u); ctx.lineTo(u * 1.05, u * .75); ctx.lineTo(-u * 1.05, u * .75); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = u * .2; ctx.beginPath(); ctx.moveTo(0, -u * .38); ctx.lineTo(0, u * .12); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, u * .44, u * .12, 0, TAU); ctx.fill(); },
    hunger(ctx, u, tt, ph, severe) {   // cuenco vacío + gota
      const p = severe ? 1 + .14 * Math.sin(tt * 10 + ph) : 1; ctx.scale(p, p); ctx.lineWidth = u * .16; ctx.fillStyle = severe ? '#ff9a8a' : '#ffe08a'; ctx.beginPath(); ctx.moveTo(-u * .95, -u * .1); ctx.quadraticCurveTo(-u * .8, u * .85, 0, u * .85); ctx.quadraticCurveTo(u * .8, u * .85, u * .95, -u * .1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(0, -u * .1, u * .95, u * .22, 0, 0, TAU); ctx.fill(); ctx.stroke();
      const k = (tt * 1.1 + ph) % 1; ctx.globalAlpha = 1 - k * .8; ctx.fillStyle = severe ? '#e0453a' : '#e6a21b'; ctx.beginPath(); const dy = -u * (.95 + k * .1) - 0; ctx.moveTo(0, dy - u * .5); ctx.quadraticCurveTo(u * .35, dy + u * .05, 0, dy + u * .2); ctx.quadraticCurveTo(-u * .35, dy + u * .05, 0, dy - u * .5); ctx.fill(); ctx.lineWidth = u * .1; ctx.stroke(); },
    hunt(ctx, u, tt) { ctx.rotate(tt * .8); ctx.lineWidth = u * .34; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, 0, u * .72, 0, TAU); for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2; ctx.moveTo(Math.cos(q) * u * .45, Math.sin(q) * u * .45); ctx.lineTo(Math.cos(q) * u * 1.12, Math.sin(q) * u * 1.12); } ctx.stroke();
      ctx.lineWidth = u * .18; ctx.strokeStyle = '#ff5a48'; ctx.beginPath(); ctx.arc(0, 0, u * .72, 0, TAU); for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2; ctx.moveTo(Math.cos(q) * u * .45, Math.sin(q) * u * .45); ctx.lineTo(Math.cos(q) * u * 1.12, Math.sin(q) * u * 1.12); } ctx.stroke(); ctx.fillStyle = '#ff5a48'; ctx.beginPath(); ctx.arc(0, 0, u * .15, 0, TAU); ctx.fill(); },
    rest(ctx, u, tt, ph) {   // «zz» flotando
      for (let i = 0; i < 2; i++) { const k = (tt * .7 + ph + i * .5) % 1, z = u * (.55 + i * .35), x = -u * .3 + i * u * .75 + k * u * .3, y = u * .5 - i * u * .7 - k * u * .9; ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
        ctx.beginPath(); ctx.moveTo(x - z * .5, y - z * .5); ctx.lineTo(x + z * .5, y - z * .5); ctx.lineTo(x - z * .5, y + z * .5); ctx.lineTo(x + z * .5, y + z * .5);
        ctx.lineWidth = u * .42; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = u * .2; ctx.strokeStyle = '#bfe0ff'; ctx.stroke(); } ctx.globalAlpha = 1; },
    rep(ctx, u, tt, ph) { const s = 1 + .12 * Math.max(0, Math.sin(tt * 6 + ph)); ctx.scale(s, s); ctx.lineWidth = u * .16; ctx.fillStyle = '#ff6fa6'; ctx.beginPath(); ctx.moveTo(0, u * .8); ctx.bezierCurveTo(-u * 1.5, -u * .1, -u * .7, -u * 1, 0, -u * .3); ctx.bezierCurveTo(u * .7, -u * 1, u * 1.5, -u * .1, 0, u * .8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-u * .4, -u * .32, u * .22, u * .13, -.6, 0, TAU); ctx.fill(); },
    lay(ctx, u, tt, ph) { const s = 1 + .08 * Math.sin(tt * 5 + ph); ctx.scale(s, s); ctx.lineWidth = u * .16; ctx.fillStyle = '#fff3d0'; ctx.beginPath(); ctx.ellipse(0, 0, u * .62, u * .85, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(224,112,168,.65)'; ctx.beginPath(); ctx.arc(-u * .12, u * .15, u * .13, 0, TAU); ctx.arc(u * .2, -u * .15, u * .1, 0, TAU); ctx.fill(); },
    cold(ctx, u, tt) { ctx.rotate(tt * .3); ctx.lineWidth = u * .34; ctx.strokeStyle = INK; ctx.beginPath(); for (let i = 0; i < 3; i++) { const q = i * Math.PI / 3; ctx.moveTo(-Math.cos(q) * u, -Math.sin(q) * u); ctx.lineTo(Math.cos(q) * u, Math.sin(q) * u); } ctx.stroke(); ctx.lineWidth = u * .16; ctx.strokeStyle = '#bfe6ff'; ctx.stroke(); },
    evo(ctx, u, tt, ph) { const k = .8 + .3 * Math.sin(tt * 8 + ph); ctx.scale(k, k); ctx.rotate(tt * .5); ctx.lineWidth = u * .16; ctx.fillStyle = '#ffd84a'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const q = i * Math.PI / 4, rr = i % 2 ? u * .3 : u * 1.05; ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
  };
  function icon(ctx, kind, cx, cy, u, tt, ph, SC) {
    icoBegin(ctx, cx, cy, 1);
    if (kind === 'starve') ICO.hunger(ctx, u, tt, ph, true); else if (kind === 'hunger') ICO.hunger(ctx, u, tt, ph, false); else ICO[kind](ctx, u, tt, ph);
    ctx.restore(); SIG.drawn[kind]++; SIG.drawn.total++;
  }
  function textW(ctx, txt, font) { const k = font + '|' + txt; let w = SIG.wcache.get(k); if (w === undefined) { ctx.font = font; w = ctx.measureText(txt).width; if (SIG.wcache.size > 300) SIG.wcache.clear(); SIG.wcache.set(k, w); } return w; }
  function bubbles(ctx, S, tt, SC) {
    const t = now(); let n = 0; const placed = SIG._pl || (SIG._pl = []); placed.length = 0;
    for (let i = SIG.bub.length - 1; i >= 0; i--) {
      const b = SIG.bub[i], u = (t - b.t0) / 2.2; if (u >= 1) { SIG.bub.splice(i, 1); continue; }
      const a = b.a;
      const fs = 12 / SC, font = '700 ' + fs + 'px system-ui, sans-serif', w = textW(ctx, b.txt, font) + 16 / SC, h = 19 / SC, rr = a.rr * 1.4;
      let x = clamp(a.x, w / 2 + 4, W - w / 2 - 4), y = a.y - rr * 1.9 - 34 / SC - b.slot * (h + 3 / SC) - u * 7 / SC;
      if (y < h) y = h + b.slot * (h + 3 / SC);
      for (let g = 0; g < 4; g++) { let hit = false; for (const q of placed) if (Math.abs(q.x - x) < (q.w + w) / 2 && Math.abs(q.y - y) < h + 1 / SC) { y = q.y - h - 2 / SC; hit = true; } if (!hit) break; }
      placed.push({ x, y, w });
      const al = u > .7 ? 1 - (u - .7) / .3 : 1; ctx.globalAlpha = al; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2 / SC; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); else ctx.rect(x - w / 2, y - h / 2, w, h); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(clamp(a.x, x - w / 2 + h / 2, x + w / 2 - h / 2) - 3 / SC, y + h / 2 - .3 / SC); ctx.lineTo(clamp(a.x, x - w / 2 + h / 2, x + w / 2 - h / 2), y + h / 2 + 5 / SC); ctx.lineTo(clamp(a.x, x - w / 2 + h / 2, x + w / 2 - h / 2) + 3 / SC, y + h / 2 - .3 / SC); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(x - w / 2 + 7 / SC, y, 3.2 / SC, 0, TAU); ctx.fill();
      ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(b.txt, x - w / 2 + 13 / SC, y + .5 / SC); ctx.globalAlpha = 1; n++;
    }
    return n;
  }
  /* Se llama una vez por cuadro, después de dibujar a todos los animales. */
  function signals(ctx, S, tt, SC, lodOn) {
    if (!SIG.on) return; const t0 = now(); SIG.budget = lodOn ? 10 : 24; SIG.frame++;
    const selSet = getSelSet ? getSelSet() : null, selId = getSel(), burst = t0 - SIG.burstT < 1.8 ? (t0 - SIG.burstT) / 1.8 : -1, pend = S.pending > 0;
    let drawn = 0;
    for (let i = 0; i < S.A.length && drawn < 90; i++) {
      const a = S.A[i]; if (a.dead) continue; const own = a.sp.team === 'player', isSel = a.id === selId || (selSet && selSet.has(a.id));
      if (!own && !isSel) continue;
      if (own && S.camT > 0 && !isSel) continue;   // camuflado: no delatar al grupo
      const f = flagsOf(a, !lodOn || isSel); let k0 = 0; const kinds = SIG._k || (SIG._k = []); kinds.length = 0;
      if (f.danger) kinds.push('danger'); if (f.starve) kinds.push('starve'); else if (f.hungry) kinds.push('hunger'); if (f.hunt) kinds.push('hunt'); if (f.rest) kinds.push('rest'); if (f.lay) kinds.push('lay'); else if (f.rep) kinds.push('rep'); if (f.cold) kinds.push('cold');
      if (lodOn && !isSel) { // solo lo crítico
        let j = 0; for (let q = 0; q < kinds.length; q++) if (kinds[q] === 'danger' || kinds[q] === 'starve') kinds[j++] = kinds[q]; kinds.length = j;
      }
      const evo = own && ((burst >= 0 && burst < 1) || (pend && isSel)); if (!kinds.length && !evo) continue;
      const r = a.rr * 1.4, u = clamp(r * .95, 6 / SC, 9 / SC), bar = a.hp < a.mhp || isSel ? 11 : 5, y = a.y - r * 1.9 - bar / SC * .5 - u * 1.2, max = isSel ? 3 : 2, n = Math.min(kinds.length, max), sp = u * 2.3;
      for (let q = 0; q < n; q++) icon(ctx, kinds[q], a.x + (q - (n - 1) / 2) * sp, y, u, tt, a.ph || 0, SC);
      if (evo) {   // brillo de evolución: estrella que titila + anillo que se expande
        const ex = a.x + (n ? ((n + 1) / 2) * sp : 0), ey = n ? y : y; icoBegin(ctx, ex, ey, 1); ICO.evo(ctx, u * .8, tt, a.id * .7); ctx.restore(); SIG.drawn.evo++; SIG.drawn.total++;
        if (burst >= 0 && burst < 1) { ctx.strokeStyle = 'rgba(255,216,74,' + (1 - burst) * .9 + ')'; ctx.lineWidth = 2 / SC; ctx.beginPath(); ctx.arc(a.x, a.y, r * (1.2 + burst * 2.2), 0, TAU); ctx.stroke(); }
      }
      drawn++;
    }
    bubbles(ctx, S, tt, SC); SIG.ms += (now() - t0) * 1000;
  }
  function onCause(a, txt, tipo) {
    if (!a || !a.sp || !txt) return; const G = getG(); if (!G) return; const t = now(), own = a.sp.team === 'player', selSet = getSelSet ? getSelSet() : null, sel = a.id === getSel() || (selSet && selSet.has(a.id));
    txt = String(txt).slice(0, 46); const key = a.id + '|' + txt;
    if (own && logFn) {   // registro: solo animales propios y con el reloj de la simulación; el estado vive en G.x2.arte para que guardar/cargar no cambie nada
      const X = (G.x2 = G.x2 || {}).arte || (G.x2.arte = { lg: -1e9, seen: {} });
      if (G.t - X.lg >= 2 && !(X.seen[key] > G.t - 6)) { X.lg = G.t; logFn(a, txt, tipo); const ks = Object.keys(X.seen); if (ks.length > 60) for (const k of ks.slice(0, 30)) delete X.seen[k]; }
      X.seen[key] = G.t;
    }
    if (!own && !sel) return;
    for (const b of SIG.bub) if (b.a === a && b.txt === txt && t - b.t0 < 3) return;
    if (!own && SIG.bub.length >= 3) return;
    const live = SIG.bub.filter(b => b.a === a).length; SIG.bub.push({ a, txt, col: CAUSE_COL[String(tipo || 'info').toLowerCase()] || '#8aa09a', t0: t, slot: live });
    while (SIG.bub.length > 3) SIG.bub.shift();
    let s = 0; for (const b of SIG.bub) if (b.a === a) b.slot = s++;
  }

  /* ================================================================ AMBIENTE POR BIOMA ================================================================ */
  const cache = { cracks: null, mist: null, shaft: null, caus: null, vign: null };
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function crackSprite() {
    if (cache.cracks) return cache.cracks; const c = mkCanvas(W, H), x = c.getContext('2d'); x.strokeStyle = 'rgba(70,40,15,.7)'; x.lineCap = 'round';
    for (let k = 0; k < 14; k++) { let px = hr(k * 3 + 1) * W, py = hr(k * 3 + 2) * H, a = hr(k * 3 + 3) * TAU; for (let br = 0; br < 3; br++) { let qx = px, qy = py, qa = a + br * 2.1; x.lineWidth = 2.2 - br * .5; x.beginPath(); x.moveTo(qx, qy); for (let s = 0; s < 9; s++) { qa += (hr(k * 50 + br * 11 + s) - .5) * 1.1; qx += Math.cos(qa) * (12 + hr(k + s) * 14); qy += Math.sin(qa) * (12 + hr(k + s * 2) * 14); x.lineTo(qx, qy); } x.stroke(); } }
    return cache.cracks = c;
  }
  function softSprite(rgb, sz) { const c = mkCanvas(sz, sz), x = c.getContext('2d'), g = x.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2); g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); x.fillStyle = g; x.fillRect(0, 0, sz, sz); return c; }
  function shaftSprite() { if (cache.shaft) return cache.shaft; const c = mkCanvas(64, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,225,.55)'); g.addColorStop(1, 'rgba(255,255,225,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(18, 0); x.lineTo(46, 0); x.lineTo(64, 256); x.lineTo(0, 256); x.closePath(); x.fill(); return cache.shaft = c; }

  /* Detalle del terreno por bioma (se llama desde drawStatic: queda en la caché estática, solo se redibuja al cambiar estación/partida/tamaño). */
  function groundDetail(ctx, S, sea) {
    const bk = S.biomeKey, winter = S.season === 3;
    if (bk === 'pradera') {   // lomas suaves y senderos pisados
      for (let i = 0; i < 9; i++) { const x = hr(i * 7 + 1) * W, y = hr(i * 7 + 2) * H, rx = 90 + hr(i + 3) * 120, ry = 40 + hr(i + 5) * 60, g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, i % 2 ? 'rgba(255,255,200,.10)' : 'rgba(40,90,30,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.strokeStyle = 'rgba(150,120,70,.16)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(0, 120 + k * 280); ctx.bezierCurveTo(240, 80 + k * 300, 520, 200 + k * 220, W, 150 + k * 260); ctx.stroke(); }
    } else if (bk === 'selva') {   // suelo húmedo con hojarasca y helechos
      for (let i = 0; i < 60; i++) { const x = hr(i * 3 + 1) * W, y = hr(i * 3 + 2) * H; ctx.fillStyle = i % 3 ? 'rgba(90,60,25,.20)' : 'rgba(20,60,25,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 7 + hr(i) * 9, 3 + hr(i + 1) * 4, hr(i + 2) * 3, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(25,90,40,.45)'; ctx.lineWidth = 1.6; for (let i = 0; i < 26; i++) { const x = hr(i * 5 + 4) * W, y = hr(i * 5 + 5) * H; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + k * 4, y - 6 - Math.abs(k), x + k * 7, y - 4 + Math.abs(k) * 2); ctx.stroke(); } }
    } else if (bk === 'desierto') {   // dunas con luz rasante, grietas de barro seco, rocas
      for (let i = 0; i < 8; i++) { const y = 40 + i * 76 + hr(i) * 30, ph = hr(i + 9) * 6; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * .011 + ph) * 18 + Math.sin(x * .027 + ph) * 6); ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,240,200,.18)'; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(160,110,50,.13)'; ctx.translate(0, 8); ctx.stroke(); ctx.translate(0, -8); }
      ctx.strokeStyle = 'rgba(120,80,40,.34)'; ctx.lineWidth = 1.2; for (let k = 0; k < 7; k++) { const cx = hr(k * 4 + 1) * W, cy = hr(k * 4 + 2) * H; for (let b = 0; b < 6; b++) { let qa = b * 1.05 + hr(k + b), qx = cx, qy = cy; ctx.beginPath(); ctx.moveTo(qx, qy); for (let s = 0; s < 4; s++) { qa += (hr(k * 9 + b * 3 + s) - .5) * 1.4; qx += Math.cos(qa) * 9; qy += Math.sin(qa) * 9; ctx.lineTo(qx, qy); } ctx.stroke(); } }
    } else if (bk === 'tundra') {   // hielo agrietado, montículos de nieve, charcos congelados
      for (let i = 0; i < 12; i++) { const x = hr(i * 3 + 1) * W, y = hr(i * 3 + 2) * H, rx = 40 + hr(i) * 70; const g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, winter ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .45, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(110,150,175,.5)'; ctx.lineWidth = 1; for (let k = 0; k < 9; k++) { let qx = hr(k * 4 + 1) * W, qy = hr(k * 4 + 2) * H, qa = hr(k) * TAU; ctx.beginPath(); ctx.moveTo(qx, qy); for (let s = 0; s < 6; s++) { qa += (hr(k * 7 + s) - .5) * .9; qx += Math.cos(qa) * 14; qy += Math.sin(qa) * 14; ctx.lineTo(qx, qy); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(150,175,195,.35)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(hr(i * 9 + 1) * W, hr(i * 9 + 2) * H, 24 + hr(i) * 20, 10 + hr(i + 4) * 8, hr(i) * 3, 0, TAU); ctx.fill(); }
    } else if (bk === 'oceano') {   // arena ondulada, caústicas fijas, coral y algas del fondo
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(10,50,110,.22)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { const y = 80 + i * 100; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * .02 + i) * 10); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,245,200,.09)'; ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.4; for (let i = 0; i < 70; i++) { const x = hr(i * 3 + 1) * W, y = hr(i * 3 + 2) * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 14, y - 10, x + 30, y + 8, x + 44, y - 2); ctx.stroke(); }
      for (let i = 0; i < 16; i++) { const x = hr(i * 5 + 2) * W, y = H - 20 - hr(i * 5 + 3) * 80, c = ['#e07a9a', '#e8a04a', '#a07ad8', '#5ac0a8'][i % 4]; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.globalAlpha = .55; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.quadraticCurveTo(x + k * 6, y + 2, x + k * 9, y - 8 - Math.abs(k) * 2); ctx.stroke(); } ctx.globalAlpha = 1; }
    }
  }
  function topDetail(ctx, S, sea) {
    const bk = S.biomeKey;
    if (bk === 'selva') {   // doseles: sombras de hojas grandes
      for (let i = 0; i < 28; i++) { const x = hr(i * 3 + 11) * W, y = hr(i * 3 + 12) * H, rr = 30 + hr(i) * 50; const g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(10,50,20,.22)'); g.addColorStop(1, 'rgba(10,50,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 12; i++) { const x = hr(i * 7 + 21) * W, y = hr(i * 7 + 22) * H, a = hr(i) * TAU; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = 'rgba(25,90,40,.2)'; for (let k = 0; k < 7; k++) { ctx.rotate(TAU / 7); ctx.beginPath(); ctx.ellipse(26, 0, 26, 7, 0, 0, TAU); ctx.fill(); } ctx.restore(); }
    } else if (bk === 'desierto') {
      const g = ctx.createRadialGradient(W * .8, H * .15, 20, W * .8, H * .15, 600); g.addColorStop(0, 'rgba(255,250,210,.20)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (bk === 'oceano') {
      const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,30,80,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  /* Plantas: color según sequía / escasez (devuelve [r,g,b] claro y oscuro) */
  const PC = { a: [120, 200, 90], b: [36, 100, 44], dry: 0, pale: 0 };
  function plantStyle(S) {
    const t = now(); let dry = 0; if (S.ev && S.ev.k === 'sequia') dry = clamp(Math.min((30 - S.ev.t) / 3, S.ev.t / 3, 1), 0, 1) * .85;
    if (t - FX.plantT > .6) { FX.plantT = t; let s = 0, n = 0; for (const p of S.plants) if (!p.w) { s += p.v; n++; } FX.plantAvg = n ? s / n : 1; }
    const pale = (FX.scarce && t < FX.scarceT) ? .8 : clamp((.42 - FX.plantAvg) / .3, 0, 1) * .8;
    if (dry !== PC.dry || pale !== PC.pale) { PC.dry = dry; PC.pale = pale; const mix = (c, d, p, k1, k2) => c.map((v, i) => Math.round(v + (d[i] - v) * k1 + (p[i] - v) * k2));
      PC.a = mix([120, 200, 90], [200, 160, 80], [200, 215, 140], dry, pale * (1 - dry)); PC.b = mix([36, 100, 44], [120, 85, 40], [135, 150, 85], dry, pale * (1 - dry)); PC.dry = dry; PC.pale = pale; }
    return PC;
  }

  /* Bajo los animales: grietas de sequía, huellas de incendio */
  function under(ctx, S, tt, lite) {
    const t = now();
    if (S.ev && S.ev.k === 'sequia') { const a = clamp(Math.min((30 - S.ev.t) / 3, S.ev.t / 3, 1), 0, 1); if (a > 0) { ctx.globalAlpha = a * .6; ctx.drawImage(crackSprite(), 0, 0); ctx.globalAlpha = 1; } }
    if (FX.gref !== S) { FX.gref = S; FX.seen = new Set(); FX.scorch.length = 0; reset(); FX.gref = S; }
    for (const f of S.F) if (!FX.seen.has(f)) { FX.seen.add(f); FX.scorch.push({ x: f.x, y: f.y, r: f.r, t0: t }); }
    for (let i = FX.scorch.length - 1; i >= 0; i--) { const s = FX.scorch[i], u = (t - s.t0) / 70; if (u >= 1) { FX.scorch.splice(i, 1); continue; } const k = Math.min(1, (t - s.t0) / 6) * (1 - u); const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r); g.addColorStop(0, 'rgba(25,18,12,' + .5 * k + ')'); g.addColorStop(.7, 'rgba(40,28,18,' + .28 * k + ')'); g.addColorStop(1, 'rgba(40,28,18,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    if (!lite && (S.biomeKey === 'pradera' || S.biomeKey === 'selva') && S.season !== 3) {   // hierba que se mece
      ctx.strokeStyle = S.ev && S.ev.k === 'sequia' ? 'rgba(150,120,50,.55)' : 'rgba(70,130,50,.5)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath(); const n = Math.min(S.grass.length, 140);
      for (let i = 0; i < n; i++) { const g = S.grass[i * 3 % S.grass.length], sw = Math.sin(tt * 1.5 + g.x * .04 + g.y * .02) * 2.4; ctx.moveTo(g.x, g.y); ctx.quadraticCurveTo(g.x + sw * .4, g.y - 4, g.x + 1 + sw, g.y - 7 - g.a * 3); } ctx.stroke();
    }
  }

  /* Sobre los animales: partículas del bioma y señales ambientales */
  const SEASTINT = ['rgba(150,220,120,.035)', 'rgba(255,205,90,.05)', 'rgba(220,120,40,.08)', 'rgba(150,190,255,.07)'];
  function over(ctx, S, tt, lite, anim) {
    const bk = S.biomeKey, t = now(), sea = S.season;
    // tinte de estación
    ctx.fillStyle = SEASTINT[sea] || SEASTINT[0]; ctx.fillRect(0, 0, W, H);
    // estela de migración: polvo detrás de los que corren
    if (S.migT > 0 || t < FX.migBurst) {
      if (Math.floor(t * 8) !== Math.floor((t - .125) * 8)) { let c = 0; for (const a of anim) { if (a.sp.team !== 'player' || !a.mv) continue; if (FX.dust.length > 120 || ++c > 10) break; FX.dust.push({ x: a.x - Math.cos(a.a) * a.rr * 1.2, y: a.y - Math.sin(a.a) * a.rr * 1.2, vx: -Math.cos(a.a) * 12, vy: -Math.sin(a.a) * 12 - 4, t0: t, l: .9, r: 2.2 }); } }
    }
    const N = lite ? .35 : 1;
    if (bk === 'pradera') {
      ctx.fillStyle = 'rgba(255,238,150,.8)'; const n = Math.round(26 * N); for (let i = 0; i < n; i++) { const x = (hr(i) * W + tt * (7 + hr(i + 9) * 8)) % W, y = (hr(i + 1) * H + Math.sin(tt * .7 + i) * 16 + H) % H; ctx.beginPath(); ctx.arc(x, y, 1.1 + hr(i + 3) * .8, 0, TAU); ctx.fill(); }
    } else if (bk === 'selva') {
      if (!lite) { if (!cache.mist) cache.mist = softSprite('210,240,225', 256); ctx.globalAlpha = .16; for (let i = 0; i < 4; i++) { const x = ((hr(i) * W + tt * (4 + i * 2)) % (W + 400)) - 200, y = 80 + hr(i + 4) * (H - 160); ctx.drawImage(cache.mist, x - 200, y - 90, 400, 180); } ctx.globalAlpha = 1; }
      const n = Math.round(22 * N); for (let i = 0; i < n; i++) { const x = hr(i * 2 + 1) * W + Math.sin(tt * .4 + i * 1.7) * 34, y = hr(i * 2 + 2) * H + Math.cos(tt * .33 + i) * 26, a = .3 + .7 * (Math.sin(tt * 2 + i * 3) * .5 + .5); ctx.fillStyle = 'rgba(210,255,110,' + a * .22 + ')'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,200,' + a + ')'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
    } else if (bk === 'desierto') {
      ctx.lineCap = 'round'; for (let i = 0; i < (lite ? 2 : 5); i++) { const y = 60 + i * 110 + hr(i) * 40; ctx.beginPath(); for (let x = 0; x <= W; x += 24) { const yy = y + Math.sin(x * .02 + tt * 1.8 + i) * 3; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.strokeStyle = 'rgba(255,245,215,.13)'; ctx.lineWidth = 7; ctx.stroke(); }
      ctx.strokeStyle = 'rgba(225,195,140,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); const n = Math.round(40 * N); for (let i = 0; i < n; i++) { const x = (hr(i) * W + tt * (40 + hr(i + 4) * 50)) % W, y = hr(i + 1) * H; ctx.moveTo(x, y); ctx.lineTo(x - 7 - hr(i + 6) * 7, y + 1); } ctx.stroke();
    } else if (bk === 'tundra') {
      const n = Math.round((sea === 3 ? 90 : 36) * N); ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < n; i++) { const sp = 18 + hr(i + 2) * 22, x = (hr(i) * W + Math.sin(tt * .6 + i) * 18 + tt * 6 + W) % W, y = (hr(i + 1) * H + tt * sp) % H, r = 1 + hr(i + 5) * 1.4; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    } else if (bk === 'oceano') {
      if (!lite) { const sh = shaftSprite(); ctx.globalAlpha = .55; for (let i = 0; i < 5; i++) { const x = 60 + i * 200 + Math.sin(tt * .35 + i * 2) * 40; ctx.save(); ctx.translate(x, -10); ctx.rotate(-.22 + Math.sin(tt * .2 + i) * .05); ctx.drawImage(sh, -40, 0, 80 + (i % 2) * 40, 420); ctx.restore(); } ctx.globalAlpha = 1; }
      const n = Math.round(34 * N); for (let i = 0; i < n; i++) { const sp = 14 + hr(i + 2) * 24, x = hr(i) * W + Math.sin(tt * 1.2 + i * 2) * 7, y = H + 10 - ((tt * sp + hr(i + 1) * H) % (H + 20)), r = 1.2 + hr(i + 5) * 2.6; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .28, 0, TAU); ctx.fill(); }
    }
    if (S.season === 3 && bk !== 'tundra' && bk !== 'oceano') { ctx.fillStyle = 'rgba(255,255,255,.85)'; const n = Math.round(46 * N); for (let i = 0; i < n; i++) { const x = (hr(i) * W + Math.sin(tt * .7 + i) * 10) % W, y = (hr(i + 1) * H + tt * (20 + hr(i + 3) * 14)) % H; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); } }
    // sequía: tinte seco + calima
    if (S.ev && S.ev.k === 'sequia') { const a = clamp(Math.min((30 - S.ev.t) / 3, S.ev.t / 3, 1), 0, 1); ctx.fillStyle = 'rgba(214,150,56,' + .2 * a + ')'; ctx.fillRect(0, 0, W, H); if (!lite && bk !== 'desierto') { ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const y = 120 + i * 180; ctx.beginPath(); for (let x = 0; x <= W; x += 24) { const yy = y + Math.sin(x * .02 + tt * 1.6 + i) * 3; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.strokeStyle = 'rgba(255,235,190,' + .12 * a + ')'; ctx.lineWidth = 7; ctx.stroke(); } } }
    // incendio: resplandor, brasas, humo
    if (S.F.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const f of S.F) { const u = clamp(f.t / 8, 0, 1), g = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r * 1.5); g.addColorStop(0, 'rgba(255,140,40,' + .32 * u + ')'); g.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 1.5, 0, TAU); ctx.fill(); } ctx.restore();
      for (const f of S.F) { const nn = lite ? 6 : 14; for (let i = 0; i < nn; i++) { const u = (tt * .8 + hr(i + f.x) * 1.7) % 1, x = f.x + (hr(i * 3 + f.y) - .5) * f.r * 1.5 + Math.sin(tt * 3 + i) * 4, y = f.y + f.r * .3 - u * f.r * 1.3; ctx.fillStyle = 'rgba(255,' + (150 + Math.round(hr(i) * 80)) + ',50,' + (1 - u) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
        if (!lite) for (let i = 0; i < 4; i++) { const u = (tt * .35 + i / 4) % 1; ctx.fillStyle = 'rgba(70,64,60,' + (.22 * (1 - u)) + ')'; ctx.beginPath(); ctx.arc(f.x + Math.sin(tt + i * 2) * 8, f.y - f.r * .3 - u * f.r * 1.4, 7 + u * 13, 0, TAU); ctx.fill(); } }
    }
  }

  window.Era2Arte = { SIG, ICO, signals, drawAnimal, attach, opts, linOf, lodBob, status, breath, groundDetail, topDetail, plantStyle, under, over, drawFX, reset, TV, DRAW, FX, BRCOL, pose };
})();
