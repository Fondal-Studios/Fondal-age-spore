// Prueba del dibujo PROVISORIO de la Era 3 (Ciclo 4 · civilizaciones): marcadores simples distintos por civilización × casillero × nivel,
// accesorio distinto por oficio, habitantes dibujados con Era2Arte (tu especie, sus rasgos), animaciones por el Bus, 0 argumentos no finitos,
// caché estable, costo por cuadro con carga alta y 0 errores de consola. El arte final (Runway) se enchufa por id en ASSETS.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-arte.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const errs = []; const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
async function open(b, w, h, sp) { const ctx = await b.newContext({ viewport: { width: w || 1280, height: h || 800 } }); await ctx.addInitScript(() => { try { localStorage.setItem('evo_tut3', 'done'); localStorage.removeItem('evo_lineage'); } catch (_) { } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); }); await p.goto(url); await p.waitForTimeout(250); await p.evaluate(s => { window.__e3.pickSp = s || 'ter_ingeniero'; }, sp); await p.click('#startBtn'); await p.evaluate(() => { window.__e3.G.paused = true; }); return { ctx, p }; }
const dup = m => { const seen = {}, d = []; for (const k of Object.keys(m)) { const h = m[k]; if (seen[h]) d.push(seen[h] + ' = ' + k); else seen[h] = k; } return d; };
(async () => {
  const b = await chromium.launch();
  let { ctx, p } = await open(b);
  console.log('Marcadores de edificios');
  const R1 = await p.evaluate(() => {
    const E = window.__e3, A = E.art, hash = (c, alpha) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h = Math.imul(h ^ (alpha === 3 ? (d[i + 3] > 100 && d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225 ? 1 : 0) : alpha === 2 ? (d[i + 3] > 100 && d[i] + d[i + 1] + d[i + 2] < 220 ? 1 : 0) : alpha ? (d[i + 3] > 40 ? 1 : 0) : d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + d[i + 3]), 16777619) >>> 0; h = Math.imul(h ^ (i >> 2), 16777619) >>> 0; } return h; }, out = { m: {}, site: {}, shape: {} };
    for (const c of ['ter', 'ins', 'acu', 'ave']) for (const k of E.SLOTS) for (let l = 1; l <= E.SL[k].max; l++) { out.m[c + '.' + k + '.' + l] = hash(A.markerSprite(c, k, l, false).c); if (l === 1) out.site[c + '.' + k] = hash(A.markerSprite(c, k, 1, true).c) !== out.m[c + '.' + k + '.1']; }
    for (const c of ['ter', 'ins', 'acu', 'ave']) out.shape[c] = hash(A.markerSprite(c, 'vivienda', 1, false).c, 2);
    const badge = {}; for (const r of ['rec', 'caz', 'agr', 'art', 'con', 'def', 'cha', 'exp', 'libre', 'gue', 'tir', 'cam']) badge[r] = hash(A.badgeSprite(r).c, 3);
    return { out, badge, ids: Object.keys(E.ASSETS).length };
  });
  ok(dup(R1.out.m).length === 0, 'cada civilización × casillero × nivel tiene un marcador distinto (' + Object.keys(R1.out.m).length + ' marcadores)');
  ok(Object.values(R1.out.site).every(Boolean), 'el edificio en obra se ve distinto del terminado (placa punteada y transparente)');
  ok(new Set(Object.values(R1.out.shape)).size === 4, 'cada civilización tiene su forma (casa, hexágono, concha, nido): contornos distintos');
  ok(dup(R1.badge).length === 0, 'el accesorio de cada oficio y unidad tiene un glifo propio (12, distinguibles sin color) ' + dup(R1.badge).join(';'));

  console.log('Habitantes con el arte de la Era 2');
  const R2 = await p.evaluate(() => {
    const E = window.__e3, A = E.art, A2 = window.Era2Arte, calls = [], orig = A2.drawAnimal; A2.drawAnimal = function (x, sp, o) { calls.push({ key: sp.key, traits: (sp.traits || []).join(','), s: o.s, lin: !!o.lin }); return orig.apply(this, arguments); };
    const c = document.createElement('canvas'); c.width = 60; c.height = 60; const x = c.getContext('2d'), hash = () => { const d = x.getImageData(0, 0, 60, 60).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] + d[i + 1] * 3 + d[i + 2] * 7 + d[i + 3]), 16777619) + i) >>> 0; return h; };
    const sps = {}; for (const sp of E.SP_KEYS) { E.newGame('ARTE-SP', { species: sp, traits: sp === 'ter_cazador' ? ['garras', 'alas'] : [] }); const q = E.mkPerson(30, 40, 90, 'rec'); q.a = 0; q.ph = 0; q.id = 3; x.clearRect(0, 0, 60, 60); A.drawPersonCiv(x, q, 1, false); sps[sp] = hash(); }
    const last = calls[calls.length - 1], withTraits = calls.find(k => k.key === 'ter_cazador');
    E.newGame('ARTE-R', { species: 'ins_colmena' }); const roles = {}; for (const r of ['rec', 'caz', 'agr', 'art', 'con', 'def', 'cha', 'exp', 'gue', 'tir', 'cam']) { const q = E.mkPerson(30, 40, 90, r); q.a = 0; q.ph = 0; q.id = 3; x.clearRect(0, 0, 60, 60); A.drawPersonCiv(x, q, 1, false); roles[r] = hash(); }
    A2.drawAnimal = orig; return { sps, roles, n: calls.length, last, withTraits };
  });
  console.log(JSON.stringify({ n: R2.n, last: R2.last, wt: R2.withTraits }));
  ok(R2.n >= 23 && R2.withTraits.traits === 'garras,alas' && R2.last.key === 'ave_migratoria', 'los habitantes se dibujan con Era2Arte.drawAnimal con la especie y los rasgos del linaje');
  ok(dup(R2.sps).length === 0, 'las 12 especies se ven distintas como habitantes');
  ok(dup(R2.roles).length === 0, 'cada oficio y unidad se distingue por su accesorio (11 combinaciones)');

  console.log('Animaciones por eventos del Bus');
  const R3 = await p.evaluate(() => {
    const E = window.__e3, A = E.art, Bus = E.Bus, out = {}; E.newGame('ARTE-BUS', { species: 'acu_abisal' }); const G = E.G; G.P.length = 0;
    const a = E.mkPerson(300, 300, 90, 'def'), v = E.mkPerson(330, 300, 90, 'rec'); G.P.push(a, v); const w = { x: 340, y: 320, hp: 10, cd: 0, dead: false }; G.Wv.push(w); const rd = { x: 360, y: 300, hp: 10, cd: 0, dead: false, fleeing: false, cl: 0 }; G.Rd.push(rd);
    const n = () => ({ fx: A.AN.fx.length, tx: A.AN.tx.length, gh: A.AN.gh.length, pg: A.AN.pg.length }); const step = (name, f) => { const x0 = n(); f(); const x1 = n(); out[name] = { fx: x1.fx - x0.fx, tx: x1.tx - x0.tx, gh: x1.gh - x0.gh, pg: x1.pg - x0.pg }; };
    step('hit', () => Bus.emit('hit', a, v, 7, 'saqueo')); step('kill_raid', () => Bus.emit('kill', rd, a)); step('death', () => Bus.emit('death', v, 'lobo')); step('born', () => Bus.emit('born', a));
    const bs = G.B[0]; step('build', () => Bus.emit('build', bs, .25)); step('built', () => Bus.emit('built', bs, true)); step('drop', () => Bus.emit('drop', a, { k: 'wood', amt: 1.2 })); step('raidPrep', () => Bus.emit('raidPrep', G.x3.clans[0], 3, 'prueba')); step('tech', () => Bus.emit('tech', 'concha'));
    E.render(); for (const s of [0, 3]) { G.season = s; E.render(); } out.err = Bus.err; return out;
  });
  console.log(JSON.stringify(R3));
  ok(R3.hit.tx === 1 && R3.kill_raid.gh === 1 && R3.death.gh === 1 && R3.born.tx === 1 && R3.build.fx >= 5 && R3.built.tx === 1 && R3.drop.tx === 1 && R3.raidPrep.pg === 1 && R3.tech.fx >= 5 && R3.err === 0, 'hit, kill, death, born, build, built, drop, raidPrep y tech disparan su animación; ghosts con la especie; Bus sin errores');
  await ctx.close();

  console.log('Escenario completo: 0 argumentos no finitos (las 4 civilizaciones, anfibia, combate, muros, expediciones)');
  ({ ctx, p } = await open(b));
  const R5 = await p.evaluate(() => {
    const bad = []; const P = CanvasRenderingContext2D.prototype, names = ['moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'fillRect', 'strokeRect', 'clearRect', 'translate', 'scale', 'rotate', 'quadraticCurveTo', 'bezierCurveTo', 'drawImage', 'fillText', 'strokeText', 'createRadialGradient', 'createLinearGradient', 'setTransform'];
    for (const n of names) { const o = P[n]; P[n] = function () { for (let i = 0; i < arguments.length; i++) { const v = arguments[i]; if (typeof v === 'number' && !Number.isFinite(v)) bad.push(n + '#' + i + '=' + v); } return o.apply(this, arguments); }; }
    const og = CanvasGradient.prototype.addColorStop; CanvasGradient.prototype.addColorStop = function (o, c) { if (!Number.isFinite(o)) bad.push('addColorStop=' + o); return og.call(this, o, c); };
    const E = window.__e3, out = { frames: 0 };
    for (const [sp, tierra] of [['ter_gigante', false], ['ins_parasito', false], ['acu_arrecife', false], ['acu_anfibio', true], ['ave_carronera', false]]) {
      E.diffI = 1; E.newGame('ARTE-' + sp, { species: sp, tierra, traits: ['garras', 'caparazon', 'alas'] }); E.setStarted(true); const g = E.G; g.paused = true; E.core().lvl = 3; E.modsDirty(); g.wood = 400; g.stone = 400; g.food = 400; g.know = 200;
      for (const k of ['vivienda', 'granja', 'ext1', 'ext2', 'almacen', 'saber', 'torre', 'cuartel', 'unico', 'cria', 'muro', 'muro', 'maravilla']) { const s = E.findSpot(k); if (s) E.placeBuilding(k, s); }
      g.B.slice(1, 9).forEach(bb => { bb.done = true; bb.prog = 1; bb.paid = 4; }); g.sites = g.sites.filter(s => !s.done); while (g.P.length < 18) g.P.push(E.mkPerson(310, 330, 100, 'libre'));
      for (let i = 0; i < 1600; i++) { E.step(.05); if (i === 200) { E.train('gue'); E.train('tir'); E.train('cam'); } if (i === 600) E.sendExpedition('node', 0, 'tomar'); if (i === 700) { E.spawnRaid(g.x3.clans[0]); } if (i === 900) g.Wv.push({ x: g.camp.x - 70, y: g.camp.y, hp: 30, cd: 0, dead: false, wt: 0, tx: 0, ty: 0 });
        if (i % 25 === 0) { if (i % 250 === 0) E.ui.camFocus(200 + (i % 400), 200 + (i % 150), 1 + (i % 7) / 3.5, true); if (i % 400 === 0) E.ui.setMode('b:torre'); E.hud(); E.render(); E.ui.setMode(null); out.frames++; } if (i % 200 === 0) { g.wood = Math.max(g.wood, 100); g.food = Math.max(g.food, 100); } }
      for (const s of [0, 1, 2, 3]) { g.season = s; E.render(); }
    }
    E.ui.camFocus(480, 300, 1, true); E.render(); out.bad = bad.slice(0, 5); out.nbad = bad.length; out.busErr = E.Bus.err; out.stat = Object.assign({}, E.art.STAT); return out;
  });
  console.log(R5); ok(R5.nbad === 0, '0 argumentos no finitos en ' + R5.frames + ' cuadros (5 ciudades, combate, muros, expediciones, 4 estaciones)'); ok(R5.busErr === 0, 'Bus sin excepciones');
  const R6 = await p.evaluate(() => { const E = window.__e3, S = E.art.STAT, real = performance.now.bind(performance); let off = 0; performance.now = () => real() + off; for (let i = 0; i < 300; i++) { off += 53; E.render(); } const m0 = S.made; for (let i = 0; i < 300; i++) { off += 53; E.render(); } performance.now = real; return { made: S.made - m0, size: E.art.SPR.size }; });
  ok(R6.made === 0, 'el caché de sprites queda estable (300 cuadros más no crean sprites; ' + R6.size + ' en caché)');
  await ctx.close();

  console.log('Costo por cuadro (carga alta)');
  const times = []; for (let r = 0; r < 3; r++) { ({ ctx, p } = await open(b)); times.push(await p.evaluate(() => { const E = window.__e3; E.diffI = 1; E.newGame('COSTO', { species: 'ter_cazador', traits: ['garras', 'piel'] }); E.setStarted(true); const G = E.G; G.paused = true; E.core().lvl = 3; E.modsDirty(); G.P.length = 0;
    for (let i = 0; i < 90; i++) { const q = E.mkPerson(150 + (i * 53) % 640, 120 + (i * 37) % 400, 90 + (i % 3) * 200, ['rec', 'caz', 'art', 'con', 'def', 'cha', 'exp', 'agr', 'gue'][i % 9]); q.mv = i % 2; G.P.push(q); }
    G.wood = 900; G.stone = 900; G.food = 900; for (const k of ['vivienda', 'vivienda', 'granja', 'ext1', 'almacen', 'saber', 'torre', 'cuartel']) { const s = E.findSpot(k); if (s) E.placeBuilding(k, s); } G.B.forEach(bb => { bb.done = true; bb.prog = 1; bb.paid = 4; }); G.sites.length = 0;
    for (let i = 0; i < 4; i++) G.Rd.push({ x: 600 + i * 12, y: 320, hp: 18, cd: 0, dead: false, fleeing: false, cl: 0 }); for (let i = 0; i < 3; i++) G.Wv.push({ x: 200 + i * 30, y: 120, hp: 30, cd: 0, dead: false });
    for (let i = 0; i < 20; i++) E.render(); const cx = document.getElementById('cv').getContext('2d'); cx.getImageData(0, 0, 1, 1); const runs = []; for (let k = 0; k < 5; k++) { const t0 = performance.now(); for (let i = 0; i < 20; i++) E.render(); cx.getImageData(0, 0, 1, 1); runs.push((performance.now() - t0) / 20); } runs.sort((a, b2) => a - b2); return runs[2]; })); await ctx.close(); }
  times.sort((a, b2) => a - b2); const ms = times[1]; console.log('  render() por cuadro, 90 habitantes (Era2Arte) + 9 edificios + 4 saqueadores + 3 amenazas: ' + ms.toFixed(2) + ' ms');
  ok(ms < 14, 'costo por cuadro < 14 ms con carga alta (' + ms.toFixed(2) + ' ms; 60 fps = 16,7 ms)');
  ok(errs.length === 0, 'sin errores de consola: ' + errs.slice(0, 3).join(' | ')); console.log('ERA 3 ARTE OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
