// Ciclo 3 · evaluación visual REAL: capturas de las Eras 1, 2 y 3 (escritorio 1280x800 y móvil 390x800) en escenas forzadas con los ganchos __e1/__e2/__e3.
// Uso: NODE_PATH=$(npm root -g) node tools/ciclo3-capturas.js antes|despues [era1,era2,era3]
// Escribe docs/ciclo3/<antes|despues>/era<N>-<escena>-<d|m>.png. Reloj congelado (performance.now) para que los efectos cosméticos sean reproducibles.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const which = process.argv[2] === 'despues' ? 'despues' : 'antes';
const eras = (process.argv[3] || 'era1,era2,era3').split(',');
const OUT = path.join(ROOT, 'docs/ciclo3', which); fs.mkdirSync(OUT, { recursive: true });
const FILES = { era1: 'era1-celula.html', era2: 'era2-animales.html', era3: 'era3-tribus.html' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const CLOCK = () => { const real = performance.now.bind(performance); window.__clk = { off: 0, frz: null }; performance.now = () => window.__clk.frz !== null ? window.__clk.frz : real() + window.__clk.off; window.__freeze = dt => { window.__clk.frz = (window.__clk.frz !== null ? window.__clk.frz : real() + window.__clk.off) + (dt || 0); }; window.__thaw = () => { window.__clk.off = (window.__clk.frz || 0) - real(); window.__clk.frz = null; }; };

async function open(browser, era, mobile, extraInit) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(CLOCK); await ctx.addInitScript(() => { try { localStorage.setItem('evo_tut2', 'done'); } catch (_) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(era + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/i.test(m.text())) errs.push(era + ' ' + m.text()); });
  await p.goto('file://' + path.join(process.env.ERAS_DIR || path.join(ROOT, 'eras'), FILES[era])); await wait(300); await p.addStyleTag({ content: '#pauseTag{display:none!important}' }); return { ctx, p };
}
const shot = async (p, name, clip) => { await wait(180); await p.screenshot(Object.assign({ path: path.join(OUT, name + '.png') }, clip ? { clip } : {})); console.log('  ' + name); };
/* recorte alrededor de un punto del mundo (Era 2 y 3: mapa 960x600 con escala SC/OX/OY) */
const clipAround = async (p, wx, wy, w, h) => p.evaluate(([wx, wy, w, h]) => {
  const E = window.__e2 || window.__e3, r = document.getElementById('cv').getBoundingClientRect(), s = E.ui ? E.ui.scr(wx, wy) : E.scr(wx, wy);
  const x = Math.max(r.left, Math.min(r.right - w, s.x - w / 2)), y = Math.max(r.top, Math.min(r.bottom - h, s.y - h / 2)); return { x, y, width: w, height: h };
}, [wx, wy, w, h]);

/* ================================ ERA 2 ================================ */
async function era2(browser, mob) {
  const tag = mob ? 'm' : 'd', { ctx, p } = await open(browser, 'era2', mob);
  await p.click('#startBtn'); await wait(300);
  const setup = (spec, bk, seed) => p.evaluate(([spec, bk, seed]) => { const E = window.__e2; E.cls = spec === 'acu_arrecife' ? 'acu' : spec.slice(0, 3); E.specKey = spec; E.diffI = 1; E.newGame(bk, null, seed); E.setStarted(true); E.G.modal = false; E.G.paused = true; document.querySelectorAll('.ov.show').forEach(o => o.classList.remove('show')); window.__thaw(); }, [spec, bk, seed]);
  await setup('ter_cazador', 'pradera', 'CICLO3');
  const run = n => p.evaluate(n => { const E = window.__e2; for (let i = 0; i < n; i++) E.step(.05); E.hud(); }, n);
  await run(360);
  await shot(p, 'era2-explorar-' + tag);
  // selección: un animal y un grupo
  const ids = await p.evaluate(() => { const E = window.__e2; return E.G.A.filter(a => a.sp.team === 'player' && !a.dead).map(a => a.id); });
  await p.evaluate(id => { const E = window.__e2; E.ui.setSel([id]); E.select(id); E.hud(); }, ids[0]); await shot(p, 'era2-seleccion-' + tag);
  await p.evaluate(ids => { const E = window.__e2; E.ui.setSel(ids.slice(0, 6)); E.hud(); }, ids); await shot(p, 'era2-seleccion-grupo-' + tag);
  await p.evaluate(() => { window.__e2.ui.setSel([]); });
  // alimentación: cadáver junto a un animal propio con hambre
  const feed = await p.evaluate(() => { const E = window.__e2, G = E.G, a = G.A.find(q => q.sp.team === 'player' && !q.dead); a.hunger = 22; G.C.push({ x: a.x + 12, y: a.y + 6, food: 40 }); for (let i = 0; i < 300 && a.st !== 'eat'; i++) E.step(.05); E.hud(); return { x: a.x, y: a.y, st: a.st, id: a.id }; });
  await p.evaluate(id => { window.__e2.ui.setSel([id]); window.__e2.select(id); }, feed.id);
  await shot(p, 'era2-alimentacion-' + tag, mob ? undefined : await clipAround(p, feed.x, feed.y, 420, 300));
  await p.evaluate(() => window.__e2.ui.setSel([]));
  // combate: presa salvaje pegada a un animal propio; esperamos eventos 'hit'
  await setup('ter_cazador', 'pradera', 'CICLO3-C'); await run(120);
  const cmb = await p.evaluate(() => { const E = window.__e2, G = E.G; const a = G.A.find(q => q.sp.team === 'player' && !q.dead), v = G.A.find(q => q.sp.team === 'wild' && q.sp.hab === 'land' && !q.dead && q.sp.diet === 'herb') || G.A.find(q => q.sp.team === 'wild' && !q.dead);
    v.x = a.x + 14; v.y = a.y + 4; a.ord = { k: 'attack', tid: v.id, t: 30 }; window.__hits = 0; E.Bus.on('hit', () => { window.__hits++; }); for (let i = 0; i < 200 && window.__hits < 2; i++) E.step(.05); E.hud(); return { x: a.x, y: a.y, id: a.id, hits: window.__hits }; });
  await p.evaluate(() => window.__freeze(60)); await p.evaluate(id => { window.__e2.ui.setSel([id]); window.__e2.select(id); }, cmb.id);
  await shot(p, 'era2-combate-' + tag, mob ? undefined : await clipAround(p, cmb.x, cmb.y, 420, 300));
  // muerte: matar un animal propio herido
  await setup('ter_cazador', 'pradera', 'CICLO3-M'); await run(100);
  const dth = await p.evaluate(() => { const E = window.__e2, G = E.G, a = G.A.find(q => q.sp.team === 'player' && !q.dead), w = G.A.find(q => q.sp.team === 'wild' && !q.dead); const pos = { x: a.x, y: a.y }; a.hp = 1; E.Bus.emit('dmg', a, 4, w); a.dead = true; E.Bus.emit('kill', a, w); E.hud(); return pos; });
  await p.evaluate(() => window.__freeze(300));
  await shot(p, 'era2-muerte-' + tag, mob ? undefined : await clipAround(p, dth.x, dth.y, 420, 300));
  // evolución
  await setup('ter_cazador', 'pradera', 'CICLO3-E'); await run(40);
  await p.evaluate(() => { const E = window.__e2; E.G.pending = 1; E.openEvo(); }); await wait(250); await shot(p, 'era2-evolucion-dialogo-' + tag);
  await p.evaluate(() => { const b = document.querySelector('#offers .offer'); b && b.click(); const E = window.__e2; E.hud(); }); await run(10); await shot(p, 'era2-evolucion-despues-' + tag);
  // masa: ~540 animales
  await setup('ter_cazador', 'pradera', 'CICLO3-N'); await run(40);
  await p.evaluate(() => { const E = window.__e2, G = E.G, sps = [G.me, ...G.riv], base = G.A.slice(); let i = 0; while (G.A.length < 540) { const t = base[i++ % base.length], sp = sps[i % sps.length]; const a = Object.assign({}, t, { id: ++G.id, sp, x: 30 + (i * 53) % 900, y: 30 + (i * 37) % 540, rr: sp.r, st: 'idle' }); a.mhp = sp.hp; a.hp = a.mhp; if (i % 9 === 0) a.st = 'flee'; if (i % 13 === 0) a.hunger = 3; G.A.push(a); } E.hud(); });
  await shot(p, 'era2-masa-' + tag);
  await ctx.close();
}

/* ================================ ERA 3 ================================ */
async function era3(browser, mob) {
  const tag = mob ? 'm' : 'd', { ctx, p } = await open(browser, 'era3', mob);
  await p.click('#startBtn'); await wait(300);
  const E3 = (fn, arg) => p.evaluate(fn, arg);
  await E3(() => { const E = window.__e3; E.G.paused = true; E.G.modal = false; window.__thaw(); });
  const run = n => E3(n => { const E = window.__e3; for (let i = 0; i < n; i++) E.step(.05); E.hud(); }, n);
  await E3(() => { const E = window.__e3; E.G.wood = 40; E.G.stone = 20; E.G.food = 30; E.G.know = 60; for (const r of ['rec', 'caz', 'art', 'con', 'cha']) E.setRole(r, 1); });
  await run(300); await shot(p, 'era3-explorar-' + tag);
  const roles = await E3(() => { const E = window.__e3, ad = E.adults(); const m = {}; for (const q of ad) if (!m[q.role]) m[q.role] = { x: q.x, y: q.y, id: q.id }; return m; });
  await shot(p, 'era3-oficios-' + tag, mob ? undefined : await clipAround(p, 300, 330, 520, 360));
  await E3(() => { const E = window.__e3, a = E.adults()[0]; E.select && E.select(a.id); });
  await shot(p, 'era3-seleccion-' + tag);
  // construcción
  await E3(() => { const E = window.__e3, G = E.G; for (const [k, x, y] of [['refugio', 345, 290], ['almacen', 250, 365], ['totem', 385, 360], ['taller', 240, 295]]) G.B.push({ k, x, y, prog: 1, done: true }); E.placeBuilding('huerto', { x: 330, y: 400 }); }); await run(60); await shot(p, 'era3-construccion-' + tag, mob ? undefined : await clipAround(p, 300, 330, 520, 360));
  // caza
  await E3(() => { const E = window.__e3, G = E.G; for (const q of G.P) if (q.role === 'caz') { G.Gm.push({ kind: 'ciervo', x: q.x + 30, y: q.y + 10, hp: 1, kcal: 7, spd: 52, tx: q.x, ty: q.y, a: 0, fleeT: 0, dead: false }); } }); await run(40);
  await shot(p, 'era3-caza-' + tag, mob ? undefined : await clipAround(p, 300, 330, 520, 360));
  // lobo (combate/peligro)
  await E3(() => { const E = window.__e3, G = E.G, q = E.adults()[0]; G.Wv.push({ x: q.x + 28, y: q.y + 6, hp: 10, a: 0, cd: 0, dead: false, tx: q.x, ty: q.y }); }); await run(6);
  await shot(p, 'era3-combate-' + tag, mob ? undefined : await clipAround(p, 300, 330, 520, 360));
  // muerte
  const d3 = await E3(() => { const E = window.__e3, G = E.G, q = E.adults().slice(-1)[0]; q.hp = 0; q.dead = true; G.deaths++; E.hud(); return { x: q.x, y: q.y }; }); await run(2);
  await shot(p, 'era3-muerte-' + tag, mob ? undefined : await clipAround(p, d3.x, d3.y, 420, 300));
  // evolución (tecnología investigada)
  await E3(() => { const E = window.__e3; E.G.know = 100; E.research('fuego'); E.research('piedra'); E.hud(); }); await run(4); await shot(p, 'era3-evolucion-' + tag);
  await ctx.close();
}

/* ================================ ERA 1 ================================ */
async function era1(browser, mob) {
  const tag = mob ? 'm' : 'd', { ctx, p } = await open(browser, 'era1', mob);
  await p.evaluate(() => { window.C = (E, x, y, z) => { if (z) E.cam.z = z; E.cam.x = x - innerWidth / E.cam.z / 2; E.cam.y = y - innerHeight / E.cam.z / 2; }; });
  await p.evaluate(() => { const E = window.__e1; E.newGame(1, 2, 'CICLO3', [0, 1, 2]); E.setStarted(true); document.getElementById('menu').classList.remove('show'); E.S.paused = true; window.__thaw(); });
  const follow = () => p.evaluate(mob => { const E = window.__e1, c = E.S.cells.find(q => q.team === 0 && !q.struct && !q.dead); if (c) C(E, c.x, c.y); }, mob);
  const run = n => p.evaluate(n => { const E = window.__e1; for (let i = 0; i < n; i++) { if (E.S.modal) break; E.step(1 / 60); } E.hud && E.hud(); }, n);
  await p.evaluate(mob => { const E = window.__e1, c = E.S.cells.find(q => q.team === 0 && !q.struct); C(E,c.x,c.y,mob ? 1.2 : 1.6); }, mob);
  await run(600); await follow(); await shot(p, 'era1-explorar-' + tag);
  await p.evaluate(() => { const E = window.__e1, cs = E.S.cells.filter(q => q.team === 0 && !q.struct); E.S.sel = new Set(cs.slice(0, 3).map(c => c.id)); E.cam.x = cs[0].x; E.cam.y = cs[0].y; }); await run(2); await follow(); await shot(p, 'era1-seleccion-' + tag);
  // alimentación: nutrientes junto a la célula
  await p.evaluate(mob => { const E = window.__e1, c = E.S.cells.find(q => q.team === 0 && !q.struct); for (let i = 0; i < 12; i++) E.S.nuts.push({ x: c.x + 20 + (i % 4) * 14, y: c.y - 20 + Math.floor(i / 4) * 14, v: 3, r: 4 }); C(E,c.x,c.y,mob ? 1.4 : 2); }, mob); await run(60); await follow(); await shot(p, 'era1-alimentacion-' + tag);
  // combate: célula rival pegada
  await p.evaluate(() => { const E = window.__e1, a = E.S.cells.find(q => q.team === 0 && !q.struct), b = E.S.cells.find(q => q.team === 1 && !q.struct); b.x = a.x + 26; b.y = a.y; C(E,a.x,a.y); for (const t of E.S.teams) t.nut = 200; }); await run(90); await follow(); await shot(p, 'era1-combate-' + tag);
  // muerte
  await p.evaluate(() => { const E = window.__e1, a = E.S.cells.filter(q => q.team === 0 && !q.struct).slice(-1)[0]; C(E,a.x,a.y); a.hp = 0; a.dead = true; E.S.rests.push({ x: a.x, y: a.y, v: 3, t: 40 }); }); await shot(p, 'era1-muerte-' + tag);
  // evolución (diálogo de mutación) + después
  await p.evaluate(() => { const E = window.__e1; E.S.teams[0].pending = 2; E.S.modal = false; E.openMutation(); }); await wait(250); await shot(p, 'era1-evolucion-dialogo-' + tag);
  await p.evaluate(() => { const E = window.__e1; const o = E.offers(); E.pickMut(o[0]); E.S.modal = false; document.querySelectorAll('.ov.show').forEach(x => x.classList.remove('show')); }); await run(30); await follow(); await shot(p, 'era1-evolucion-despues-' + tag);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const era of eras) for (const mob of [false, true]) { console.log(era, mob ? 'móvil' : 'escritorio'); await ({ era1, era2, era3 })[era](browser, mob); }
  } finally { await browser.close(); }
  console.log('errores de consola:', errs.length, errs.slice(0, 5));
})();
