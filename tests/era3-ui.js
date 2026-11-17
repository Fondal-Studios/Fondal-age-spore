// Prueba de la interfaz de la Era 3 (Ciclo 4 · civilizaciones): HUD con nombres de la civilización y Edad, menú de construcción por casillero,
// fantasma verde/rojo con motivo, colocar con clic y con toque, ficha con Mejorar/Mover/Demoler, tecnologías por Edad, ejército, alertas,
// paneles plegables, móvil 360/390/430 sin solapes ni objetivos < 44 px, tutorial del bucle nuevo y hash idéntico con y sin interfaz.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-ui.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const errs = [];
const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
async function open(b, w, h, mob, tut) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!mob, isMobile: !!mob });
  await ctx.addInitScript(t => { try { localStorage.removeItem('evo_lineage'); if (!t && !localStorage.getItem('evo_tut3')) localStorage.setItem('evo_tut3', 'done'); } catch (_) { } }, !!tut);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(250); return { ctx, p };
}
const start = async (p, sp) => { await p.evaluate(sp => { window.__e3.pickSp = sp || 'ter_ingeniero'; }, sp); await p.click('#startBtn'); await p.evaluate(() => { window.__e3.G.paused = true; }); };
(async () => {
  const b = await chromium.launch();
  // ---------- 1. HUD con la civilización, paneles, alertas ----------
  console.log('HUD escritorio');
  let { ctx, p } = await open(b, 1280, 800, false);
  await start(p, 'ins_colmena');
  await p.evaluate(() => { const E = window.__e3; E.G.wood = 30; E.G.stone = 10; for (let i = 0; i < 400; i++) E.step(.05); E.hud(); });
  let r = await p.evaluate(() => { const g = id => document.getElementById(id).textContent; return { food: g('vFood'), nFood: g('nFood'), nWood: g('nWood'), nStone: g('nStone'), nKnow: g('nKnow'), wood: g('vWood'), age: g('vAge'), ageN: g('vAgeN'), ageR: g('vAgeR'), pop: g('vPop'), popBar: document.getElementById('popBar').children.length, roles: [...document.querySelectorAll('.role')].map(x => x.id + ':' + x.children[2].textContent) }; });
  console.log(r);
  ok(r.nFood === 'jalea' && r.nWood === 'fibra' && r.nStone === 'cera' && r.nKnow === 'memoria', 'los recursos del HUD se llaman como en La Colmena (jalea, fibra, cera, memoria)');
  ok(/^\d+\/\d+$/.test(r.wood) && r.age === 'Edad I' && r.ageN === 'Campamento' && /^\d\/\d$/.test(r.ageR), 'material con tope (' + r.wood + ') y chip de Edad con requisitos (' + r.age + ' · ' + r.ageR + ')');
  ok(r.popBar >= 3 && r.roles.length === 8, 'población con barra por oficio y 8 oficios');
  r = await p.evaluate(() => { const E = window.__e3; ['bx_builds', 'bx_riv', 'bx_age', 'bx_army', 'bx_eco'].forEach(i => E.ui.openPanel(i)); E.hud(); const q = s => document.querySelector(s);
    return { prio: document.querySelectorAll('.prio').length, builds: document.querySelectorAll('#builds .brow').length, riv: document.querySelectorAll('.rvc').length, req: document.querySelectorAll('#ageBox .req').length, bonus: document.querySelectorAll('#bonusBox .bon').length, goals: document.querySelectorAll('#goalRows .g').length, ageBtn: q('#bAge').textContent, army: q('#armyBox').textContent, eco: q('#eco').textContent }; });
  console.log(r);
  ok(r.prio === 5 && r.builds >= 1 && r.riv === 2, 'prioridades, construcciones y 2 rivales');
  ok(r.req >= 5 && r.goals === 3 && /Avanzar a la Edad II/.test(r.ageBtn) && r.bonus >= 2, 'panel de Edades: requisitos con avance, metas (Edad II, Edad III, Maravilla), botón «Avanzar» y bonos con su origen');
  ok(/Edad II/.test(r.army) && /jalea/i.test(r.eco), 'ejército explica que se abre en la Edad II; el balance usa los nombres de la civilización');
  await p.evaluate(() => { document.getElementById('bx_eco').open = false; }); await p.waitForTimeout(50);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('evo_ui3'))); ok(saved && saved.bx_eco === false && saved.bx_builds === true, 'estado de paneles recordado (evo_ui3)');
  await p.evaluate(() => window.__e3.ui.tickerPush('Mensaje de prueba', true));
  r = await p.evaluate(() => { const t = document.getElementById('ticker').getBoundingClientRect(), c = document.getElementById('cvWrap').getBoundingClientRect(); return { t: t.top, c: c.bottom, txt: document.getElementById('tkT').textContent }; });
  ok(r.t >= r.c - 1 && r.txt === 'Mensaje de prueba', 'los avisos van en una línea propia bajo el mapa');
  await p.evaluate(() => { const E = window.__e3, G = E.G; G.t = 80; G.food = 1.2; G.wood = 0; E.alerts(); E.hud(); });
  r = await p.evaluate(() => { const els = [...document.querySelectorAll('#alerts .al:not(.more)')]; return { n: els.length, cls: els.map(e => e.className), tag: els.map(e => e.tagName) }; });
  ok(r.n >= 1 && r.n <= 3 && r.tag.every(t => t === 'BUTTON') && /crit|warn/.test(r.cls[0]), 'alertas accionables (botones), la más grave primero');
  const z0 = await p.evaluate(() => window.__e3.ui.CAM.z); await p.click('#alerts .al'); await p.waitForTimeout(600); r = await p.evaluate(() => ({ z: window.__e3.ui.CAM.z, sel: window.__e3.ui.selB }));
  ok(r.z > z0 && r.sel !== null, 'tocar una alerta enfoca la cámara y selecciona lo afectado');

  // ---------- 2. Menú de construcción, fantasma verde/rojo con motivo, colocar con clic ----------
  console.log('Construcción con fantasma');
  await p.evaluate(() => { const E = window.__e3, G = E.G; G.wood = 60; G.stone = 30; G.food = 60; E.ui.camFocus(G.camp.x, G.camp.y, 1, true); E.ui.setSel(null, null); E.hud(); });
  await p.click('#bBuild');
  r = await p.evaluate(() => [...document.querySelectorAll('#tray button')].map(b => b.id + '|' + b.firstChild.textContent + '|' + b.lastChild.textContent));
  console.log(r.slice(0, 4).join('\n'));
  ok(r.length === 12 && /bb_vivienda\|Celdas de cría · 6 fibra\|\+4 camas/.test(r[0]) && r.some(x => /bb_torre\|Torre de aguijones.*Bloqueado: se abre en la Edad II/.test(x)), 'menú por casillero con nombre de la civilización, costo y efecto; los de Edad II aparecen bloqueados con el motivo');
  await p.click('#bb_vivienda'); ok(await p.evaluate(() => window.__e3.ui.mode === 'b:vivienda' && document.getElementById('modeTip').style.display === 'block'), 'elegir un edificio entra en modo colocar con indicación');
  const cell = await p.evaluate(() => { const E = window.__e3, s = E.findSpot('vivienda'), c = E.core(); return { ok: E.scr(s.x, s.y), occ: E.scr(c.x, c.y) }; });
  await p.mouse.move(cell.occ.x, cell.occ.y); await p.waitForTimeout(80);
  r = await p.evaluate(() => { const g = window.__e3.art.ghostAt(); window.__e3.render(); return g && { ok: g.c.ok, why: g.c.why }; });
  ok(r && !r.ok && /ocupado/.test(r.why), 'fantasma ROJO sobre el Corazón con el motivo («' + r.why + '»)');
  await p.mouse.move(cell.ok.x, cell.ok.y); await p.waitForTimeout(80);
  r = await p.evaluate(() => { const g = window.__e3.art.ghostAt(); window.__e3.render(); return g && { ok: g.c.ok, gx: g.gx, gy: g.gy }; });
  ok(r && r.ok, 'fantasma VERDE en un lugar libre del territorio');
  const nB = await p.evaluate(() => window.__e3.G.B.length); await p.mouse.click(cell.ok.x, cell.ok.y); await p.waitForTimeout(80);
  r = await p.evaluate(() => { const G = window.__e3.G, bb = G.B[G.B.length - 1]; return { n: G.B.length, k: bb.k, gx: bb.gx, gy: bb.gy, mode: window.__e3.ui.mode }; });
  ok(r.n === nB + 1 && r.k === 'vivienda' && r.mode === null, 'clic: se coloca en la celda del fantasma y sale del modo');

  // ---------- 3. Ficha del edificio: Mejorar / Mover / Demoler; tecnologías por Edad ----------
  console.log('Ficha y tecnologías');
  r = await p.evaluate(() => { const E = window.__e3, G = E.G, v = G.B[G.B.length - 1]; v.done = true; v.prog = 1; v.paid = 4; G.sites.length = 0; E.selectB(G.B.indexOf(v)); E.ui.openPanel('bx_sel'); E.hud(); return [...document.querySelectorAll('#bActs button')].map(x => x.dataset.a + ':' + x.textContent + ':' + x.getAttribute('aria-disabled')); });
  console.log(r); ok(r.length === 3 && /^up:Mejorar a Panal de celdas:true/.test(r[0]) && /^mv:Mover:false/.test(r[1]) && /^dm:Demoler/.test(r[2]), 'ficha: «Mejorar» (bloqueado hasta la Edad II, con motivo), «Mover» y «Demoler»');
  await p.click('#bActs button[data-a=mv]'); const dest = await p.evaluate(() => { const E = window.__e3, s = E.findSpot('vivienda', { x: 240, y: 280 }); return Object.assign(E.scr(s.x, s.y), { gx: s.gx, gy: s.gy }); });
  await p.mouse.move(dest.x, dest.y); await p.mouse.click(dest.x, dest.y); r = await p.evaluate(gx => { const G = window.__e3.G, v = G.B[G.B.length - 1]; return { gx: v.gx, mode: window.__e3.ui.mode }; }, dest.gx);
  ok(r.gx === dest.gx && r.mode === null, 'Mover: el edificio cambia de celda sin costo');
  const w0 = await p.evaluate(() => window.__e3.G.wood); await p.click('#bActs button[data-a=dm]'); const still = await p.evaluate(() => window.__e3.G.B.length); await p.click('#bActs button[data-a=dm]'); r = await p.evaluate(() => ({ n: window.__e3.G.B.length, w: window.__e3.G.wood }));
  ok(r.n === still - 1 && r.w - w0 === 3, 'Demoler pide confirmar (segundo toque) y devuelve el 50 % (+3)');
  await p.evaluate(() => { window.__e3.G.paused = true; }); await p.click('#bTech'); r = await p.evaluate(() => ({ h: [...document.querySelectorAll('#techGrid h3')].map(x => x.textContent), n: document.querySelectorAll('#techGrid .tc').length, dis: [...document.querySelectorAll('#techGrid .tc')].map(x => x.disabled), em: document.querySelector('#techGrid .tc em').textContent }));
  ok(r.h.length === 3 && /Edad I/.test(r.h[0]) && /bloqueada/.test(r.h[1]) && r.n === 12 && r.dis.slice(4).every(Boolean) && /memoria/.test(r.em), 'tecnologías por Edad: 3 grupos de 4, II y III bloqueadas; costo en «memoria»');
  await p.click('#techClose'); await ctx.close();

  // ---------- 4. Toque: el primer toque muestra el fantasma, el segundo confirma ----------
  console.log('Colocar con toque (móvil)');
  ({ ctx, p } = await open(b, 390, 800, true)); await start(p, 'acu_arrecife');
  await p.evaluate(() => { const E = window.__e3, G = E.G; G.wood = 60; G.stone = 30; E.ui.setMode('b:granja'); document.getElementById('cvWrap').scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(150); const tc = await p.evaluate(() => { const E = window.__e3, s = E.findSpot('granja'); return E.scr(s.x, s.y); });
  const n0 = await p.evaluate(() => window.__e3.G.B.length); await p.touchscreen.tap(tc.x, tc.y); await p.waitForTimeout(80);
  r = await p.evaluate(() => ({ n: window.__e3.G.B.length, gh: window.__e3.ui.UI.ghost, g: window.__e3.art.ghostAt() && window.__e3.art.ghostAt().c.ok }));
  ok(r.n === n0 && r.gh && r.g, 'primer toque: muestra el fantasma (verde) sin construir');
  await p.touchscreen.tap(tc.x, tc.y); await p.waitForTimeout(80); r = await p.evaluate(() => ({ n: window.__e3.G.B.length, k: window.__e3.G.B[window.__e3.G.B.length - 1].k }));
  ok(r.n === n0 + 1 && r.k === 'granja', 'segundo toque en la misma celda: confirma y coloca');
  await ctx.close();

  // ---------- 5. Móvil: sin solapes, sin scroll horizontal, objetivos >= 44 px ----------
  for (const w of [360, 390, 430]) {
    console.log('Móvil ' + w);
    ({ ctx, p } = await open(b, w, 800, true)); await start(p, 'ave_migratoria');
    await p.evaluate(() => { const E = window.__e3, G = E.G; G.wood = 30; for (let i = 0; i < 300; i++) E.step(.05); G.food = 1.5; G.t = 90; G.x3.clans[0].prep = 12; G.x3.clans[0].prepN = 3; E.core().lvl = 2; E.modsDirty(); for (let i = 0; i < 40; i++) E.step(.05); E.selectB(0); ['bx_prios', 'bx_roles', 'bx_builds', 'bx_riv', 'bx_age', 'bx_army', 'bx_eco', 'bx_log', 'bx_sel'].forEach(i => E.ui.openPanel(i)); E.hud(); document.getElementById('bBuild').click(); E.hud(); });
    for (const scr of [0, 900, 100000]) {
      await p.evaluate(y => { window.scrollTo(0, y); }, scr); await p.waitForTimeout(80);
      r = await p.evaluate(() => {
        const vw = innerWidth, bad = [], small = [], over = [], vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return e.offsetParent !== null && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
        const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        document.querySelectorAll('#stage *').forEach(e => { if (!vis(e) || e.closest('.ov')) return; const r = e.getBoundingClientRect(); if ((r.right > vw + 1 || r.left < -1) && !e.closest('canvas')) bad.push(e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(r.left) + '-' + Math.round(r.right)); });
        document.querySelectorAll('button, summary').forEach(e => { if (!vis(e) || e.closest('.ov') || e.closest('#audioUI')) return; const r = e.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) small.push((e.id || e.textContent.trim().slice(0, 18)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        document.querySelectorAll('.chip, .al, .role, .prio, .brow, #mini button, #mini .mf').forEach(e => { if (vis(e) && e.scrollWidth > e.clientWidth + 2) over.push(e.className + ' ' + e.id + ' ' + e.scrollWidth + '>' + e.clientWidth); });
        const ov = [], inter = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        for (const sel of ['#hud', '#alerts', '#mini', '#bar', '#rivs', '#roles', '#builds', '#prios', '#side', '#tray', '#bActs', '#armyBox']) { const par = document.querySelector(sel); if (!par) continue; const kids = [...par.children].filter(vis); for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) if (inter(kids[i].getBoundingClientRect(), kids[j].getBoundingClientRect())) ov.push(sel + ': ' + (kids[i].id || kids[i].className) + ' x ' + (kids[j].id || kids[j].className)); }
        return { scrollW, vw, bad: bad.slice(0, 6), small: small.slice(0, 8), over: over.slice(0, 6), ov: ov.slice(0, 6) };
      });
      console.log('  scroll ' + scr, JSON.stringify(r));
      assert.ok(r.scrollW <= r.vw + 1, 'sin scroll horizontal a ' + w); assert.deepStrictEqual(r.bad, [], 'nada fuera del ancho a ' + w); assert.deepStrictEqual(r.small, [], 'objetivos >= 44 px a ' + w + ': ' + r.small.join(', '));
      assert.deepStrictEqual(r.over, [], 'sin texto cortado a ' + w); assert.deepStrictEqual(r.ov, [], 'sin solapes a ' + w);
    }
    console.log('  ok  sin scroll horizontal, nada fuera de pantalla, objetivos >= 44 px, sin solapes (con menú de construcción y paneles abiertos)');
    r = await p.evaluate(() => { window.scrollTo(0, 0); return { t: document.getElementById('mAl').textContent, h: document.getElementById('mAl').getBoundingClientRect().height, age: getComputedStyle(document.getElementById('cAge')).display }; });
    ok(r.t.length > 8 && r.h >= 43.5 && r.age !== 'none', 'resumen fijo con la alerta principal y chip de Edad visible en móvil');
    await ctx.close();
  }

  // ---------- 6. Tutorial del bucle nuevo (colocar → generar → mejorar → Edad → defender → expedición) ----------
  console.log('Tutorial');
  ({ ctx, p } = await open(b, 1280, 800, false, true));
  ok(await p.evaluate(() => localStorage.getItem('evo_tut3')) === null, 'primera vez: sin estado guardado');
  await start(p, 'ter_cazador');
  const tutS = () => p.evaluate(() => { const E = window.__e3; return { i: E.ui.tut.i, id: E.ui.TUT3[E.ui.tut.i] && E.ui.TUT3[E.ui.tut.i].id, vis: document.getElementById('tut').classList.contains('show'), t: document.getElementById('tutT').textContent, ls: localStorage.getItem('evo_tut3'), hl: document.querySelectorAll('.tuthl').length }; });
  const pump = () => p.evaluate(() => { for (let i = 0; i < 8; i++) window.__e3.hud(); });
  let s = await tutS(); console.log(s); ok(s.i === 0 && s.vis && /1 de 7/.test(s.t) && /civilización/i.test(s.t), 'paso 1: tu civilización (7 pasos)');
  await p.click('#tutNext'); await pump(); s = await tutS(); ok(s.id === 'colocar' && /Colocar/.test(s.t) && s.hl >= 1, 'paso 2: colocar, con «Construir» resaltado');
  await p.evaluate(() => { const E = window.__e3, G = E.G; G.wood = 40; E.placeBuilding('granja', E.findSpot('granja')); }); await pump(); s = await tutS(); ok(s.id === 'generar', 'al colocar pasa a «Generar»');
  await p.evaluate(() => { const E = window.__e3, G = E.G, g = G.B[G.B.length - 1]; g.done = true; g.prog = 1; g.paid = 4; G.sites.length = 0; E.setRole('agr', 1); E.setRole('agr', 1); G.paused = false; for (let i = 0; i < 20 * 25; i++) E.step(.05); G.paused = true; }); await pump(); s = await tutS(); ok(s.id === 'mejorar', 'con obreros produciendo pasa a «Mejorar» (' + s.t + ')');
  ok(s.ls === 'i:3', 'progreso guardado (evo_tut3 = ' + s.ls + ')');
  await p.reload(); await p.waitForTimeout(250); await start(p, 'ter_cazador'); s = await tutS(); ok(s.i === 3, 'al volver a jugar continúa en el paso guardado');
  await p.evaluate(() => { const E = window.__e3; E.core().lvl = 2; E.modsDirty(); }); await pump(); await pump(); s = await tutS(); ok(s.id === 'defender' || s.id === 'edad', 'subir de Edad cumple «Mejorar» y «Avanzar de Edad» (' + s.id + ')');
  await p.click('#tutSkip'); s = await tutS(); ok(s.i === -1 && s.ls === 'skip' && !s.vis, 'saltar tutorial lo apaga y lo recuerda');
  await ctx.close();

  // ---------- 7. Hash idéntico con y sin interfaz ----------
  console.log('Hash con/sin interfaz');
  const run = async withUI => {
    const { ctx, p } = await open(b, 1280, 800, false); await start(p, 'ave_rapaz');
    const h = await p.evaluate(async withUI => {
      const E = window.__e3; E.diffI = 1; E.newGame('UI-HASH', { species: 'ave_rapaz' }); E.setStarted(true); E.G.paused = true;
      for (let i = 0; i < 2400; i++) { E.step(.05); if (i % 40 === 0) { const G = E.G; if (E.techCheck('tejidos').ok) E.research('tejidos'); if (!G.sites.length && G.wood >= 6 && G.B.length < 6) { const s = E.findSpot('vivienda'); if (s) E.placeBuilding('vivienda', s); } }
        if (withUI && i % 8 === 0) { E.hud(); if (i % 64 === 0) { const el = document.querySelector('#alerts .al'); if (el) el.click(); E.ui.camFocus(200 + (i % 300), 200, 1 + (i % 5) / 3, true); E.select((E.G.P[0] || {}).id); E.selectB(0); ['bx_riv', 'bx_builds', 'bx_age', 'bx_army'].forEach(x => E.ui.openPanel(x)); E.ui.setMode(i % 128 ? 'b:vivienda' : null); E.render(); E.ui.setMode(null); } } }
      return E.stateHash(); }, withUI); await ctx.close(); return h;
  };
  const h1 = await run(false), h2 = await run(true); console.log({ h1, h2 }); ok(h1 === h2, 'el hash de la partida es idéntico con y sin interfaz (alertas, cámara, selección, paneles, modo construir)');
  ok(errs.length === 0, 'sin errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('ERA 3 UI OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
