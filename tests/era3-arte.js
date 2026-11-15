// Prueba del arte y la animación de la Era 3 (Ciclo 4): cada oficio × edad se dibuja distinto, las animaciones las disparan los eventos del Bus,
// costo por cuadro (A/B contra el commit base), 0 argumentos no finitos en el canvas y 0 errores de consola.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-arte.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const BASE_REV = process.env.ERA3_BASE || '83fc584';
const errs = []; const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
async function open(b, file, w, h) { const ctx = await b.newContext({ viewport: { width: w || 1280, height: h || 800 } }); await ctx.addInitScript(() => { try { localStorage.setItem('evo_tut3', 'done'); } catch (_) { } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); }); await p.goto(file || url); await p.waitForTimeout(250); await p.click('#startBtn'); await p.evaluate(() => { window.__e3.G.paused = true; }); return { ctx, p }; }
(async () => {
  const b = await chromium.launch();
  let { ctx, p } = await open(b);
  // ---------- 1. cada oficio × edad se dibuja distinto (hash de píxeles) ----------
  console.log('Sprites por oficio y edad');
  const R1 = await p.evaluate(() => {
    const A = window.__e3.art, roles = ['rec', 'caz', 'agr', 'art', 'con', 'def', 'cha', 'exp', 'libre', 'raid'], out = { col: {}, sil: {}, size: {} };
    const hash = (c, alphaOnly) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { const v = alphaOnly ? (d[i + 3] > 40 ? 1 : 0) : (d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + d[i + 3]); h = Math.imul(h ^ v, 16777619) >>> 0; h = Math.imul(h ^ (i >> 2), 16777619) >>> 0; } return h; };
    const bbox = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x1 - x0 + 1, y1 - y0 + 1]; };
    for (const r of roles) for (const ac of r === 'libre' ? ['n', 'a', 'v'] : ['a', 'v']) { const s = A.personSprite(r, ac, 'stand', 's', 0); out.col[r + '|' + ac] = hash(s.c, false); out.sil[r + '|' + ac] = hash(s.c, true); out.size[r + '|' + ac] = bbox(s.c); }
    const s0 = A.personSprite('art', 'a', 'stand', 's', 0), pose = {}, view = {}, variant = {};
    for (const q of A.POSES) pose[q] = hash(A.personSprite('art', 'a', q, 's', 0).c, false); for (const v of ['s', 'f', 'b']) view[v] = hash(A.personSprite('def', 'a', 'stand', v, 0).c, false); for (let v = 0; v < 4; v++) variant[v] = hash(A.personSprite('rec', 'a', 'stand', 's', v).c, false);
    return { out, pose, view, variant, k: A.SPRK };
  });
  const keys = Object.keys(R1.out.col); console.log('  ' + keys.length + ' combinaciones rol×edad');
  const dup = (m) => { const seen = {}, d = []; for (const k of Object.keys(m)) { const h = m[k]; if (seen[h]) d.push(seen[h] + ' = ' + k); else seen[h] = k; } return d; };
  ok(dup(R1.out.col).length === 0, 'todas las combinaciones rol × edad tienen píxeles distintos (' + keys.length + ')');
  const silDup = dup(R1.out.sil).filter(x => !/\|(a|v|n) = /.test('x') ); console.log('  siluetas iguales:', silDup.length ? silDup.join('; ') : 'ninguna');
  const adult = keys.filter(k => /\|a$/.test(k) && !/^libre/.test(k)); const sA = {}; adult.forEach(k => sA[k] = R1.out.sil[k]); ok(dup(sA).length === 0, 'las siluetas (solo forma, sin color) de los 9 oficios adultos son todas distintas');
  const ageD = ['rec', 'caz', 'art', 'cha'].every(r => R1.out.sil[r + '|a'] !== R1.out.sil[r + '|v']); ok(ageD, 'adulto y anciano se distinguen por silueta (barba, bastón, encorvado)');
  ok(R1.out.size['libre|n'][1] < R1.out.size['libre|a'][1] * .8, 'el niño es más bajo que el adulto (' + R1.out.size['libre|n'][1] + ' vs ' + R1.out.size['libre|a'][1] + ' px de sprite)');
  ok(new Set(Object.values(R1.pose)).size === 7, 'las 7 poses (parado, 4 pasos, agachado, golpe) son distintas');
  ok(new Set(Object.values(R1.view)).size === 3, 'las 3 vistas (lado, frente, espalda) son distintas');
  ok(new Set(Object.values(R1.variant)).size === 4, 'las 4 variantes de piel y pelo son distintas');
  // legibilidad: alto del adulto en pantalla a 1280x800 (escala del mapa) >= 24 px; a 390 px >= 17 px (el sprite mide ~38 u de alto)
  const hAd = await p.evaluate(() => { const A = window.__e3.art; return { sc: window.__e3.ui.SC, h: 36 * A.PSZ }; }); ok(hAd.h * hAd.sc >= 24, 'el adulto mide ~' + Math.round(hAd.h * hAd.sc) + ' px en pantalla de escritorio');

  // ---------- 2. edificios por nivel y por etapa ----------
  console.log('Edificios');
  const R2 = await p.evaluate(() => {
    const A = window.__e3.art, hash = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h = Math.imul(h ^ (d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + d[i + 3]), 16777619) >>> 0; h = Math.imul(h ^ (i >> 2), 16777619) >>> 0; } return h; }, out = { lv: {}, st: {} };
    for (const k of Object.keys(window.__e3.BLD)) { const n = window.__e3.BLD[k].lv.length; for (let l = 1; l <= n; l++) out.lv[k + l] = hash(A.bldSprite(k, l, 0).c); for (let s = 1; s <= 4; s++) out.st[k + 's' + s] = hash(A.bldSprite(k, 1, s).c); out.st[k + 'full'] = hash(A.bldSprite(k, 1, 0).c); }
    return out;
  });
  const lvKeys = Object.keys(R2.lv); ok(dup(R2.lv).length === 0, 'cada edificio y cada nivel se dibuja distinto (' + lvKeys.length + ' sprites: ' + lvKeys.join(' ') + ')');
  console.log('  colisiones de etapas:', dup(R2.st).join('; ') || 'ninguna'); ok(dup(R2.st).length === 0, 'las 4 etapas de obra de cada edificio son distintas entre sí y del edificio terminado');

  // ---------- 3. animaciones disparadas por el Bus ----------
  console.log('Animaciones por eventos del Bus');
  const R3 = await p.evaluate(() => {
    const E = window.__e3, G = E.G, A = E.art, Bus = E.Bus, out = {}; G.P.length = 0; G.Rd.length = 0; G.Wv.length = 0;
    const a = E.mkPerson(300, 300, 90, 'def'), v = E.mkPerson(330, 300, 90, 'rec'); G.P.push(a, v); const w = { x: 340, y: 320, hp: 10, cd: 0, dead: false, wt: 0, tx: 0, ty: 0 }; G.Wv.push(w); const rd = { x: 360, y: 300, hp: 10, cd: 0, dead: false, fleeing: false, cl: 0 }; G.Rd.push(rd);
    const n = () => ({ fx: A.AN.fx.length, tx: A.AN.tx.length, gh: A.AN.gh.length, pg: A.AN.pg.length }), snap = () => JSON.stringify(n()); let b0 = n();
    const step = (name, f) => { const x0 = n(); f(); const x1 = n(); out[name] = { fx: x1.fx - x0.fx, tx: x1.tx - x0.tx, gh: x1.gh - x0.gh, pg: x1.pg - x0.pg }; };
    step('hit', () => Bus.emit('hit', a, v, 7, 'saqueo')); out.hitPA = { dst: A.PA.get(v).hit > 0, src: A.PA.get(a).lunge > 0, txt: A.AN.tx[A.AN.tx.length - 1].txt };
    step('hitWolf', () => Bus.emit('hit', a, w, 6.5, 'defensa'));
    step('kill_wolf', () => Bus.emit('kill', w, a)); step('kill_raid', () => Bus.emit('kill', rd, a)); step('kill_prey', () => Bus.emit('kill', { kind: 'ciervo', x: 310, y: 330, a: 0 }, a));
    step('death', () => Bus.emit('death', v, 'lobo')); step('born', () => Bus.emit('born', a));
    const bs = { k: 'refugio', x: 280, y: 280, prog: .3, done: false, lvl: 1, paid: 1 }; G.B.push(bs);
    step('build', () => Bus.emit('build', bs, .25)); step('built', () => Bus.emit('built', bs, false)); step('upgraded', () => Bus.emit('built', bs, true));
    step('drop', () => Bus.emit('drop', a, { k: 'wood', amt: 1.2 })); step('eat', () => Bus.emit('eat', a)); step('carry', () => Bus.emit('carry', a, { k: 'food', amt: 1 }));
    step('work_chop', () => Bus.emit('work', a, 'chop', { x: 250, y: 250, w: 3 }, 'start')); step('work_gather', () => Bus.emit('work', a, 'gather', { x: 250, y: 250, v: 1 }, 'start')); step('work_mine', () => Bus.emit('work', a, 'mine', { x: 250, y: 250, s: 3 }, 'start'));
    step('raid', () => Bus.emit('raid', 3, G.x3.clans[0])); step('raidPrep', () => Bus.emit('raidPrep', G.x3.clans[0], 3, 'prueba')); step('alert', () => Bus.emit('alert', { kind: 'hambruna', level: 'crit', text: 'x', x: 300, y: 300 })); step('alert_ok', () => Bus.emit('alert', { kind: 'hambruna', level: 'ok', text: 'x', x: 300, y: 300 }));
    step('tech', () => Bus.emit('tech', 'fuego')); step('discover', () => Bus.emit('discover', { x: 100, y: 100, k: 'bayas' }, a)); step('role', () => Bus.emit('role', a, 'cha', 'def'));
    out.err = Bus.err; out.last = Bus.last; return out;
  });
  console.log(JSON.stringify(R3));
  ok(R3.hit.tx === 1 && R3.hit.fx >= 3 && R3.hitPA.dst && R3.hitPA.src && R3.hitPA.txt === '7', 'hit: número de daño, partículas, retroceso del herido y embestida del atacante');
  ok(R3.hitWolf.tx === 1 && R3.kill_wolf.gh === 1 && R3.kill_raid.gh === 1 && R3.kill_prey.gh === 1, 'kill: lobo, saqueador y presa dejan un cuerpo que cae y se desvanece');
  ok(R3.death.gh === 1 && R3.death.tx === 1 && R3.death.pg === 1, 'death: caída de la persona, causa flotante y aviso en el mapa');
  ok(R3.born.fx >= 5 && R3.born.tx === 1, 'born: destello y cartel');
  ok(R3.build.fx >= 5 && R3.built.fx >= 15 && R3.upgraded.tx === 1, 'build/built: polvo por etapa; terminado y mejorado con estrellas y cartel');
  ok(R3.drop.tx === 1 && R3.eat.fx >= 3 && R3.work_chop.fx >= 5 && R3.work_gather.fx >= 5 && R3.work_mine.fx >= 5, 'drop/eat/work: ingreso flotante, migas, astillas, hojas y chispas de piedra');
  ok(R3.raid.fx >= 1 && R3.raidPrep.pg === 1 && R3.alert.pg === 1 && R3.alert_ok.pg === 0 && R3.tech.fx >= 5 && R3.discover.pg === 1 && R3.role.fx === 0, 'raid/raidPrep/alert/tech/discover: avisos y destellos (alert "ok" no deja marca)');
  ok(R3.err === 0, 'ningún suscriptor del Bus lanzó una excepción (' + R3.last + ')');
  // el estado animado se dibuja y vence solo (reloj cosmético)
  const R3b = await p.evaluate(() => { const E = window.__e3, A = E.art; const before = { fx: A.AN.fx.length, tx: A.AN.tx.length, gh: A.AN.gh.length, pg: A.AN.pg.length }; E.render(); const real = performance.now.bind(performance); const off = 8000; performance.now = () => real() + off; E.render(); performance.now = real; return { before, after: { fx: A.AN.fx.length, tx: A.AN.tx.length, pg: A.AN.pg.length } }; });
  ok(R3b.before.fx > 20 && R3b.after.fx === 0 && R3b.after.tx === 0 && R3b.after.pg === 0, 'partículas, textos y marcas vencen solos (' + R3b.before.fx + ' → ' + R3b.after.fx + ')');
  // animaciones por estado: cada actividad cambia de cuadro a cuadro (no se «desliza» sin actuar)
  const R4 = await p.evaluate(() => {
    const E = window.__e3, A = E.art, c = document.createElement('canvas'); c.width = 80; c.height = 90; const x = c.getContext('2d'), res = {};
    const hash = () => { const d = x.getImageData(0, 0, 80, 90).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] + d[i + 1] * 3 + d[i + 2] * 7 + d[i + 3]), 16777619) + i) >>> 0; return h; };
    const frames = (role, st, mv, n, carry) => { const hs = new Set(); for (let i = 0; i < n; i++) { const p = E.mkPerson(40, 62, 90, role); p.st = st; p.mv = mv ? 1 : 0; p.a = 0; p.ph = 0; p.id = 4; p.carry = carry || null; x.clearRect(0, 0, 80, 90); A.drawPerson(x, p, i * .07, false); hs.add(hash()); } return hs.size; };
    for (const [role, st, mv] of [['rec', 'gather', 0], ['rec', 'carry', 1], ['caz', 'hunt', 0], ['caz', 'idle', 0], ['agr', 'farm', 0], ['art', 'chop', 0], ['art', 'mine', 0], ['con', 'build', 0], ['def', 'fight', 0], ['def', 'guard', 1], ['cha', 'pray', 0], ['exp', 'explore', 1], ['libre', 'idle', 1], ['rec', 'eat', 0], ['art', 'flee', 1]]) res[role + ':' + st + (mv ? ':mv' : '')] = frames(role, st, mv, 14);
    res.carryWood = frames('art', 'carry', 1, 14, { k: 'wood', amt: 1 }); res.noCarry = frames('art', 'carry', 1, 14, null);
    return res;
  });
  console.log(JSON.stringify(R4)); const still = Object.entries(R4).filter(([k, v]) => !/idle$/.test(k) && v < 3); ok(still.length === 0, 'cada actividad (recolectar, cargar, cazar, cultivar, cortar, picar, construir, pelear, rezar, explorar, comer, huir) cambia de cuadro: ' + (still.length ? 'FIJAS: ' + still.map(x => x[0]) : '≥ 3 cuadros distintos en 1 s'));
  await ctx.close();

  // ---------- 4. 0 argumentos no finitos y 0 errores en un escenario completo ----------
  console.log('Argumentos finitos');
  ({ ctx, p } = await open(b));
  const R5 = await p.evaluate(() => {
    const bad = []; const P = CanvasRenderingContext2D.prototype, names = ['moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'fillRect', 'strokeRect', 'clearRect', 'translate', 'scale', 'rotate', 'quadraticCurveTo', 'bezierCurveTo', 'drawImage', 'fillText', 'strokeText', 'createRadialGradient', 'createLinearGradient', 'setTransform', 'arcTo'];
    for (const n of names) { const o = P[n]; P[n] = function () { for (let i = 0; i < arguments.length; i++) { const v = arguments[i]; if (typeof v === 'number' && !Number.isFinite(v)) bad.push(n + '#' + i + '=' + v); } return o.apply(this, arguments); }; }
    const og = CanvasGradient.prototype.addColorStop; CanvasGradient.prototype.addColorStop = function (o, c) { if (!Number.isFinite(o)) bad.push('addColorStop=' + o); return og.call(this, o, c); };
    const E = window.__e3, G = E.G; E.diffI = 1; E.newGame('ARTE-FIN'); E.setStarted(true); E.G.paused = true; const g = E.G; g.wood = 60; g.stone = 30; g.know = 80; const out = { frames: 0 };
    ['fuego', 'piedra', 'cesta', 'lanza', 'ceram', 'agri'].forEach(t => { g.know += 30; E.research(t); }); ['rec', 'caz', 'art', 'con', 'cha', 'def', 'exp', 'agr'].forEach(r => E.setRole(r, 1));
    const place = (k, x, y) => E.placeBuilding(k, { x, y }); place('refugio', 340, 300); place('almacen', 250, 380); place('huerto', 380, 360); place('totem', 300, 250); place('taller', 230, 300);
    for (let i = 0; i < 2600; i++) { E.step(.05); if (i === 900) { E.spawnRaid(g.x3.clans[0]); g.Rd.forEach((r, j) => { r.x = 340 + j * 10; r.y = 330; }); } if (i === 1300) { g.Wv.push({ x: E.adults()[0].x - 20, y: E.adults()[0].y, hp: 12, cd: 0, dead: false, wt: 0, tx: 0, ty: 0 }); }
      if (i % 25 === 0) { if (i % 250 === 0) E.ui.camFocus(200 + (i % 400), 200 + (i % 150), 1 + (i % 7) / 3.5, true); E.hud(); E.render(); out.frames++; } if (i === 1700) { const b0 = g.B.find(b => b.k === 'refugio'); if (b0 && b0.done) E.upgradeBuilding(b0); } if (i % 400 === 0) g.wood += 30; if (i === 2000) E.G.P.slice(0, 2).forEach(q => { q.hp = 0; q.dead = true; E.Bus.emit('death', q, 'frío'); }); }
    for (const s of [0, 1, 2, 3]) { g.season = s; E.render(); E.render(); } E.ui.camFocus(480, 300, 1, true); E.render();
    out.bad = bad.slice(0, 5); out.nbad = bad.length; out.busErr = E.Bus.err; out.pop = g.P.length; out.stat = Object.assign({}, E.art.STAT); out.spr = E.art.SPR.size; out.over = g.over; return out;
  });
  console.log(R5); ok(R5.nbad === 0, '0 argumentos no finitos en ' + R5.frames + ' cuadros con combate, obras, muertes y las 4 estaciones'); ok(R5.busErr === 0, 'Bus sin excepciones');
  // el caché de sprites alcanza un estado estable: dibujar 300 cuadros más no crea sprites nuevos
  const R6 = await p.evaluate(() => { const E = window.__e3, S = E.art.STAT, real = performance.now.bind(performance); let off = 0; performance.now = () => real() + off; for (let i = 0; i < 400; i++) { off += 53; E.render(); } const m0 = S.made; for (let i = 0; i < 400; i++) { off += 53; E.render(); } performance.now = real; return { newSprites: S.made - m0, hits: S.hits, made: S.made }; }); console.log(R6); ok(R6.newSprites <= 3, 'el caché de sprites es estable (400 cuadros de 53 ms de animación → ' + R6.newSprites + ' sprites nuevos)');
  await ctx.close();

  // ---------- 5. costo por cuadro: A/B contra el commit base ----------
  console.log('Costo por cuadro (A/B)');
  const baseFile = path.join(os.tmpdir(), 'era3-base-' + process.pid + '.html'); let abOK = true;
  try { fs.writeFileSync(baseFile, cp.execSync('git show ' + BASE_REV + ':eras/era3-tribus.html', { cwd: path.resolve(__dirname, '..'), maxBuffer: 1 << 26 })); } catch (e) { abOK = false; console.log('  (sin commit base ' + BASE_REV + ': se omite la comparación A/B)'); }
  const scene = () => { const E = window.__e3, G = E.G; E.diffI = 1; E.newGame('COSTO'); E.setStarted(true); G.paused = true; G.P.length = 0; for (let i = 0; i < 90; i++) { const r = ['rec', 'caz', 'art', 'con', 'def', 'cha', 'exp', 'agr'][i % 8], q = E.mkPerson(150 + (i * 53) % 640, 120 + (i * 37) % 400, 90 + (i % 3) * 200, r); q.st = ['gather', 'chop', 'build', 'hunt', 'carry', 'idle'][i % 6]; q.mv = i % 3 ? 1 : 0; q.a = i * .7; if (i % 5 === 0) q.carry = { k: ['food', 'wood', 'stone'][i % 3], amt: 1 }; G.P.push(q); }
    for (const [k, x, y] of [['refugio', 300, 200], ['almacen', 380, 200], ['totem', 460, 200], ['taller', 540, 200], ['huerto', 300, 420], ['corral', 400, 430], ['empalizada', 500, 430]]) G.B.push({ k, x, y, prog: 1, done: true, lvl: 1 }); for (let i = 0; i < 4; i++) G.Rd.push({ x: 600 + i * 12, y: 320, hp: 18, cd: 0, dead: false, fleeing: false, cl: 0 }); for (let i = 0; i < 3; i++) G.Wv.push({ x: 650 + i * 14, y: 360, hp: 30, cd: 0, dead: false, wt: 0, tx: 0, ty: 0 }); };
  const time = async (file) => { const { ctx, p } = await open(b, file); const ms = await p.evaluate(sceneSrc => { eval('(' + sceneSrc + ')()'); const E = window.__e3; const runs = []; for (let k = 0; k < 7; k++) { for (let i = 0; i < 10; i++) E.render(); const cx = document.getElementById('cv').getContext('2d'); cx.getImageData(0, 0, 1, 1); const t0 = performance.now(); for (let i = 0; i < 120; i++) { E.render(); if (i % 10 === 9) cx.getImageData(0, 0, 1, 1); } runs.push((performance.now() - t0) / 120); } /* getImageData fuerza el rasterizado: se mide el dibujo real, no solo el registro de comandos */ runs.sort((a, b) => a - b); return runs[3]; }, scene.toString()); await ctx.close(); return ms; };
  const tNew = [], tOld = []; for (let r = 0; r < 3; r++) { tNew.push(await time(url)); if (abOK) tOld.push(await time('file://' + baseFile)); }
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)], nMs = med(tNew), oMs = abOK ? med(tOld) : null;
  console.log('  render() por cuadro, 90 personas + 7 edificios + 4 saqueadores + 3 lobos: nuevo ' + nMs.toFixed(2) + ' ms' + (abOK ? ' · base ' + oMs.toFixed(2) + ' ms · razón ' + (nMs / oMs).toFixed(2) : '')); fs.writeFileSync(path.join(os.tmpdir(), 'era3-ab.json'), JSON.stringify({ nuevo: nMs, base: oMs, nuevoRuns: tNew, baseRuns: tOld }));
  ok(nMs < 12, 'costo por cuadro < 12 ms con carga alta (' + nMs.toFixed(2) + ' ms; presupuesto de 60 fps = 16,7 ms)'); if (abOK) ok(nMs <= Math.max(oMs * 2.5, oMs + 4), 'no más de 2,5× el costo del dibujo anterior (' + (nMs / oMs).toFixed(2) + '×)');
  ok(errs.length === 0, 'sin errores de consola: ' + errs.slice(0, 3).join(' | ')); console.log('ERA 3 ARTE OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
