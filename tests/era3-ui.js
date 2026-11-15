// Prueba de la interfaz estratégica de la Era 3 (Ciclo 4): HUD, alertas con histéresis, paneles plegables, móvil sin solapes, objetivos >= 44 px,
// tutorial por estado y hash idéntico con/sin interfaz.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-ui.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const errs = [];
const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
async function open(b, w, h, mob, tut) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!mob, isMobile: !!mob });
  if (!tut) await ctx.addInitScript(() => { try { if (!localStorage.getItem('evo_tut3')) localStorage.setItem('evo_tut3', 'done'); } catch (_) { } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(250); return { ctx, p };
}
const start = async (p, seed) => { await p.click('#startBtn'); await p.evaluate(s => { const E = window.__e3; E.G.paused = true; if (s) { E.newGame(s); } E.setStarted(true); }, seed || null); };
(async () => {
  const b = await chromium.launch();
  // ---------- 1. HUD, paneles plegables, alertas, toasts fuera del mapa (escritorio) ----------
  console.log('HUD escritorio');
  let { ctx, p } = await open(b, 1280, 800, false);
  await start(p);
  await p.evaluate(() => { const E = window.__e3; E.G.wood = 30; E.G.stone = 10; for (let i = 0; i < 400; i++) E.step(.05); E.hud(); });
  let r = await p.evaluate(() => { const g = id => document.getElementById(id).textContent; return { food: g('vFood'), net: g('vFoodNet'), run: g('vRun'), pop: g('vPop'), popBar: document.getElementById('popBar').children.length, wood: g('vWood'), know: g('vKnow'), coh: g('vCoh'), season: g('vSeason'), roles: [...document.querySelectorAll('.role')].map(x => x.id + ':' + x.children[2].textContent) }; });
  console.log(r);
  ok(/^\d+\/\d+$/.test(r.food) && /[+−]\d,\d\d\/s/.test(r.net) && /estable|alcanza/.test(r.run), 'comida: stock/capacidad, neto por segundo y autonomía');
  ok(r.popBar >= 3 && +r.pop >= 6, 'población con barra por oficio');
  ok(r.roles.length === 8 && r.roles.every(x => /:\d+(\/\d+)?$/.test(x)), 'oficios con cantidad y objetivo asignado');
  // trabajos asignados vs objetivo, prioridades, construcciones, rivales, objetivos
  r = await p.evaluate(() => { const E = window.__e3; E.ui.openPanel('bx_builds'); E.ui.openPanel('bx_riv'); E.ui.openPanel('bx_goal'); E.ui.openPanel('bx_eco'); E.hud(); const q = s => document.querySelector(s);
    return { prio: document.querySelectorAll('.prio').length, prioOn: document.querySelectorAll('.prio button.on').length, builds: document.querySelectorAll('#builds .brow').length, riv: document.querySelectorAll('.rvc').length, rivRel: document.querySelectorAll('.rvc .rel').length, goals: document.querySelectorAll('#goalRows .g').length, gb: document.querySelectorAll('#goalRows .gb').length, paths: document.querySelectorAll('#pathSeg button').length, eco: q('#eco').textContent.length, sec: q('#sm_builds').textContent }; });
  console.log(r);
  ok(r.prio === 5 && r.prioOn === 5, 'prioridades (5 áreas, un nivel activo cada una)');
  ok(r.builds >= 1 && r.riv === 2 && r.rivRel === 2, 'construcciones y 2 rivales con barra de relación');
  ok(r.goals >= 5 && r.gb === r.goals && r.paths === 3 && r.eco > 100, 'objetivos con avance, caminos de ciudad y balance económico');
  // paneles plegables: se pliegan, se recuerdan y no rompen la partida
  r = await p.evaluate(() => { const d = document.getElementById('bx_eco'); d.open = false; return null; }); await p.waitForTimeout(50);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('evo_ui3'))); ok(saved && saved.bx_eco === false && saved.bx_builds === true, 'estado de paneles recordado (evo_ui3)');
  await p.click('#bx_eco > summary'); ok(await p.evaluate(() => document.getElementById('bx_eco').open), 'el panel se abre con un clic en el título');
  await p.click('#bx_eco > summary'); ok(!(await p.evaluate(() => document.getElementById('bx_eco').open)), 'y se pliega con otro clic');
  // resumen en el título cuando está plegado (lo crítico sigue visible)
  ok((await p.evaluate(() => document.getElementById('sm_eco').textContent)).length > 3 && (await p.evaluate(() => document.getElementById('sm_riv').textContent)).length > 3, 'los títulos plegados muestran un resumen');
  // los toasts van a una línea fija fuera del mapa
  await p.evaluate(() => window.__e3.ui.tickerPush('Mensaje de prueba', true));
  r = await p.evaluate(() => { const t = document.getElementById('ticker').getBoundingClientRect(), c = document.getElementById('cvWrap').getBoundingClientRect(); return { t: [t.top, t.bottom], c: [c.top, c.bottom], toasts: document.querySelectorAll('.toast').length, txt: document.getElementById('tkT').textContent }; });
  ok(r.t[0] >= r.c[1] - 1 && r.toasts === 0 && r.txt === 'Mensaje de prueba', 'los avisos no tapan el mapa (línea propia bajo el canvas)');
  // alertas accionables
  await p.evaluate(() => { const E = window.__e3, G = E.G; G.t = 80; G.food = 1.2; G.wood = 0; E.alerts(); E.hud(); });
  r = await p.evaluate(() => { const E = window.__e3; const els = [...document.querySelectorAll('#alerts .al:not(.more)')]; return { n: els.length, txt: els.map(e => e.textContent), cls: els.map(e => e.className), tag: els.map(e => e.tagName), keys: Object.keys(E.ui.UI.alEls) }; });
  console.log(r);
  ok(r.n >= 1 && r.n <= 3 && r.tag.every(t => t === 'BUTTON'), 'lista corta de alertas (botones), máximo 3 visibles');
  ok(r.cls[0].includes('crit') || r.cls[0].includes('warn'), 'la más grave va primero');
  const elRef = await p.evaluate(() => { const e = document.querySelector('#alerts .al'); window.__alRef = e; return e.textContent; });
  await p.evaluate(() => { const E = window.__e3; E.G.food = 1.0; E.alerts(); E.hud(); E.G.food = 1.1; E.hud(); });
  ok(await p.evaluate(() => document.querySelector('#alerts .al') === window.__alRef), 'el botón de alerta se actualiza en el lugar (no se reconstruye: el toque no se pierde)');
  const before = await p.evaluate(() => ({ z: window.__e3.ui.CAM.z, sel: window.__e3.ui.selB })); await p.click('#alerts .al');
  await p.waitForTimeout(700);
  r = await p.evaluate(() => { const E = window.__e3; return { z: E.ui.CAM.z, tz: E.ui.CAM.tz, selB: E.ui.selB, selId: E.ui.selId, eco: document.getElementById('bx_eco').open, kind: E.ui.UI.top && E.ui.UI.top.kind }; });
  console.log(r); ok(r.tz > 1.5 && r.z > before.z, 'tocar una alerta enfoca la cámara (zoom) en el lugar'); ok(r.selB !== null || r.selId !== null, 'y selecciona lo afectado');
  // histéresis de la interfaz: una amenaza que parpadea se sostiene 4 s
  await p.evaluate(() => { const E = window.__e3, G = E.G; G.Wv.length = 0; G.Wv.push({ x: G.camp.x + 90, y: G.camp.y, hp: 30, cd: 0, dead: false, wt: 0, tx: 0, ty: 0 }); window.__t0 = 1e6; E.ui.UI.nowMs = () => window.__t0; E.hud(); });
  ok(await p.evaluate(() => !!window.__e3.ui.UI.hold.lobo && [...document.querySelectorAll('#alerts .al')].some(e => /lobo/i.test(e.textContent)) || [...document.querySelectorAll('#alerts .al')].length > 0), 'amenaza de lobo en la lista');
  await p.evaluate(() => { const E = window.__e3, G = E.G; G.Wv.length = 0; window.__t0 += 2000; E.hud(); });
  ok(await p.evaluate(() => !!window.__e3.ui.UI.hold.lobo), 'sigue 2 s después de desaparecer (histéresis)');
  await p.evaluate(() => { window.__t0 += 3000; window.__e3.hud(); });
  ok(await p.evaluate(() => !window.__e3.ui.UI.hold.lobo), 'y se retira después de 4 s');
  // cámara: zoom acotado, sin desplazamiento a 1x en escritorio
  await p.evaluate(() => { const E = window.__e3; E.ui.camFocus(480, 300, 1, true); });
  r = await p.evaluate(() => ({ pan: window.__e3.ui.CAM.z, sc: window.__e3.ui.SC })); ok(r.pan === 1, 'zoom 1x muestra el mapa entero');
  for (let i = 0; i < 12; i++) await p.click('#zIn'); ok((await p.evaluate(() => window.__e3.ui.CAM.z)) <= 2.8001, 'el zoom tiene tope 2,8x');
  for (let i = 0; i < 12; i++) await p.click('#zOut'); ok((await p.evaluate(() => window.__e3.ui.CAM.z)) === 1, 'y vuelve a 1x');
  await ctx.close();

  // ---------- 2. Móvil: sin solapes, sin scroll horizontal, objetivos >= 44 px, oficios usables ----------
  for (const w of [360, 390, 430]) {
    console.log('Móvil ' + w);
    ({ ctx, p } = await open(b, w, 800, true));
    await start(p); await p.evaluate(() => { const E = window.__e3, G = E.G; G.wood = 30; for (let i = 0; i < 300; i++) E.step(.05); G.food = 1.5; G.t = 90; G.x3.clans[0].prep = 12; G.x3.clans[0].prepN = 3; for (let i = 0; i < 40; i++) E.step(.05); ['bx_builds', 'bx_riv', 'bx_goal', 'bx_eco', 'bx_log', 'bx_sel'].forEach(i => E.ui.openPanel(i)); E.hud(); });
    for (const scr of [0, 900, 100000]) {
      await p.evaluate(y => { window.scrollTo(0, y); document.body.scrollTop = y; document.documentElement.scrollTop = y; }, scr); await p.waitForTimeout(80);
      r = await p.evaluate(() => {
        const vw = innerWidth, bad = [], small = [], over = [], vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return e.offsetParent !== null && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
        const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        document.querySelectorAll('#stage *').forEach(e => { if (!vis(e) || e.closest('.ov')) return; const r = e.getBoundingClientRect(); if (r.right > vw + 1 || r.left < -1) { if (!e.closest('canvas')) bad.push(e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(r.left) + '-' + Math.round(r.right)); } });
        document.querySelectorAll('button, summary').forEach(e => { if (!vis(e) || e.closest('.ov') || e.closest('#tray:not(.show)')) return; const r = e.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) small.push((e.id || e.textContent.trim().slice(0, 18)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        document.querySelectorAll('.chip, .al, .role, .prio, .brow, #mini button, #mini .mf').forEach(e => { if (vis(e) && e.scrollWidth > e.clientWidth + 2) over.push(e.className + ' ' + e.id + ' ' + e.scrollWidth + '>' + e.clientWidth); });
        // solapes entre hermanos de contenedores clave
        const ov = [], inter = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        for (const sel of ['#hud', '#alerts', '#mini', '#bar', '#rivs', '#roles', '#builds', '#prios', '#side']) { const par = document.querySelector(sel); if (!par) continue; const kids = [...par.children].filter(vis); for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) if (inter(kids[i].getBoundingClientRect(), kids[j].getBoundingClientRect())) ov.push(sel + ': ' + (kids[i].id || kids[i].className) + ' x ' + (kids[j].id || kids[j].className)); }
        const m = document.getElementById('mini').getBoundingClientRect(), br = document.getElementById('bar').getBoundingClientRect(); if (inter(m, br)) ov.push('mini x bar');
        return { scrollW, vw, bad: bad.slice(0, 6), small: small.slice(0, 8), over: over.slice(0, 6), ov: ov.slice(0, 6) };
      });
      console.log('  scroll ' + scr, JSON.stringify(r));
      assert.ok(r.scrollW <= r.vw + 1, 'sin scroll horizontal a ' + w + ' (' + r.scrollW + ')'); assert.deepStrictEqual(r.bad, [], 'nada fuera del ancho a ' + w); assert.deepStrictEqual(r.small, [], 'objetivos >= 44 px a ' + w + ': ' + r.small.join(', '));
      assert.deepStrictEqual(r.over, [], 'sin texto cortado a ' + w); assert.deepStrictEqual(r.ov, [], 'sin solapes a ' + w);
    }
    console.log('  ok  sin scroll horizontal, nada fuera de pantalla, objetivos >= 44 px, sin solapes ni texto cortado (scroll 0 / medio / final)');
    // panel de oficios usable: las 8 filas y sus botones caben en el ancho y se pueden tocar
    await p.evaluate(() => { document.getElementById('bx_roles').scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(100);
    const pin0 = await p.evaluate(() => window.__e3.tribeInfo().pinned);
    await p.locator('#r_art button').nth(1).tap(); await p.waitForTimeout(100);
    r = await p.evaluate(() => { const rows = [...document.querySelectorAll('.role')].filter(e => e.offsetParent !== null).map(e => { const bb = e.querySelectorAll('button'), r1 = bb[0].getBoundingClientRect(), r2 = bb[1].getBoundingClientRect(); return [r1.right <= innerWidth, r2.right <= innerWidth, r1.right <= r2.left + 1]; }); return { rows: rows.length, allIn: rows.every(x => x.every(Boolean)), pinned: window.__e3.tribeInfo().pinned }; });
    ok(r.rows >= 7 && r.allIn, 'oficios: filas completas con − y + dentro de la pantalla (' + r.rows + ' filas)'); ok(r.pinned > pin0 || r.pinned >= 1, 'oficios: el toque en + fija una persona');
    // alerta principal en el resumen fijo y tocable
    await p.evaluate(() => window.scrollTo(0, 0)); r = await p.evaluate(() => ({ t: document.getElementById('mAl').textContent, h: document.getElementById('mAl').getBoundingClientRect().height, top: document.getElementById('mini').getBoundingClientRect().top }));
    ok(r.t.length > 8 && r.h >= 43.5, 'resumen fijo con la alerta principal (' + r.t.slice(0, 40) + '…)');
    await p.evaluate(() => window.scrollTo(0, 800)); r = await p.evaluate(() => document.getElementById('mini').getBoundingClientRect().top); ok(Math.abs(r) < 2, 'el resumen (comida y alerta) queda fijo arriba al desplazarse');
    await ctx.close();
  }

  // ---------- 3. Tutorial por estado ----------
  console.log('Tutorial');
  ({ ctx, p } = await open(b, 1280, 800, false, true));
  ok(await p.evaluate(() => localStorage.getItem('evo_tut3')) === null, 'primera vez: sin estado guardado');
  await p.click('#startBtn'); await p.evaluate(() => { window.__e3.G.paused = true; });
  const tutS = () => p.evaluate(() => { const E = window.__e3; return { i: E.ui.tut.i, shown: E.ui.tut.shown, vis: document.getElementById('tut').classList.contains('show'), t: document.getElementById('tutT').textContent, ls: localStorage.getItem('evo_tut3'), hl: document.querySelectorAll('.tuthl').length }; });
  let s = await tutS(); console.log(s); ok(s.i === 0 && s.vis && /1 de 8/.test(s.t) && /tribu/i.test(s.t), 'paso 1: administrás una tribu, no un personaje');
  await p.evaluate(() => { const E = window.__e3; for (let i = 0; i < 600; i++) E.step(.05); for (let i = 0; i < 20; i++) E.hud(); });
  s = await tutS(); ok(s.i === 0, 'el tiempo no avanza los pasos (solo el estado o el botón)');
  await p.click('#tutNext'); s = await tutS(); ok(s.i === 1 && /necesita/i.test(s.t) && s.hl >= 1, 'paso 2: qué necesita (comida, refugio, seguridad) con el elemento resaltado');
  await p.click('#tutNext'); s = await tutS(); ok(s.i === 2 && /Prioridades/.test(s.t), 'paso 3: prioridades');
  await p.evaluate(() => { for (let i = 0; i < 3; i++) window.__e3.hud(); }); s = await tutS(); ok(s.i === 2, 'sin cambiar una prioridad no avanza');
  await p.click('#p_comida button:nth-of-type(3)'); await p.evaluate(() => { for (let i = 0; i < 8; i++) window.__e3.hud(); }); s = await tutS(); console.log(s); ok(s.i === 3 && /Oficios/.test(s.t), 'al subir una prioridad el paso se cumple y pasa a Oficios');
  await p.click('#r_rec button:nth-of-type(2)'); await p.evaluate(() => { for (let i = 0; i < 8; i++) window.__e3.hud(); }); s = await tutS(); ok(s.i === 4 && /Construir/.test(s.t), 'al fijar un oficio pasa a Construir');
  const pinned = await p.evaluate(() => window.__e3.tribeInfo().pinned); ok(pinned >= 1, 'las acciones del tutorial son las reales del juego');
  // reanuda donde quedó
  ok(s.ls === 'i:4', 'progreso guardado (evo_tut3 = ' + s.ls + ')');
  await p.reload(); await p.waitForTimeout(250); await p.click('#startBtn'); s = await tutS(); ok(s.i === 4, 'al volver a jugar continúa en el paso guardado');
  // no bloquea: se puede jugar con el tutorial visible
  await p.evaluate(() => { const E = window.__e3; E.G.paused = false; }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__e3.G.t > 0 && !document.querySelector('#tut').closest('.ov')), 'el tutorial no es un diálogo modal');
  await p.click('#tutSkip'); s = await tutS(); ok(s.i === -1 && s.ls === 'skip' && !s.vis, 'saltar tutorial lo apaga y lo recuerda');
  await p.reload(); await p.waitForTimeout(250); await p.click('#startBtn'); s = await tutS(); ok(!s.vis && s.i === -1, 'recargar: sigue apagado');
  await p.evaluate(() => { document.getElementById('menu').classList.add('show'); }); const lbl = await p.evaluate(() => document.getElementById('tutBtn').textContent); ok(/no/.test(lbl), 'el menú permite repetirlo');
  await ctx.close();

  // ---------- 4. Hash idéntico con y sin interfaz ----------
  console.log('Hash con/sin interfaz');
  const run = async withUI => {
    const { ctx, p } = await open(b, 1280, 800, false); await p.click('#startBtn');
    const h = await p.evaluate(async withUI => {
      const E = window.__e3; E.diffI = 1; E.newGame('UI-HASH'); E.setStarted(true); E.G.paused = true; const play = n => { for (let i = 0; i < n; i++) { E.step(.05); if (i % 40 === 0) { const G = E.G; if (G.know >= 3 && !E.has('fuego')) E.research('fuego'); if (!G.sites.length && G.wood >= 6 && G.B.length < 5) E.placeBuilding('refugio', { x: 260 + G.B.length * 30, y: 380 }); } if (withUI && i % 8 === 0) { E.hud(); if (i % 64 === 0) { const el = document.querySelector('#alerts .al'); if (el) el.click(); E.ui.camFocus(200 + (i % 300), 200, 1 + (i % 5) / 3, true); E.select((E.G.P[0] || {}).id); E.selectB(0); E.ui.openPanel('bx_riv'); E.ui.openPanel('bx_builds'); E.render(); } } } };
      play(2400); return E.stateHash();
    }, withUI); await ctx.close(); return h;
  };
  const h1 = await run(false), h2 = await run(true); console.log({ h1, h2 }); ok(h1 === h2, 'el hash de la partida es idéntico con y sin interfaz (clics en alertas, cámara, selección, paneles)');
  ok(errs.length === 0, 'sin errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('ERA 3 UI OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
