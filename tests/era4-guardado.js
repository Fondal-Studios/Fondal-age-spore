// Prueba Era 4: misma semilla => mismo estado; guardar->cargar->seguir == no interrumpir; linaje (lectura y escritura); sin errores de consola.
// Uso: NODE_PATH=$(npm root -g) node tests/era4-guardado.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../eras/era4-civilizaciones.html')); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const E = window.__e4, out = {}, K = ['lan', 'arq', 'jin'];
    // jugador mínimo y determinista (todo por la API de órdenes, sin tiempo real); el bucle de la página queda en pausa
    const act = () => { const G = E.G, c = G.civs[0]; if (G.dlg) { E.resolveDlg(0); if (G.dlg) E.resolveDlg(1); return; }
      E.recruit(0, 'obrero'); for (const k of ['granja', 'cuartel', 'mina', 'espias', 'aserr']) if (E.build(0, k) === null) break;
      for (const k of ['bronce', 'coraza']) if (E.research(0, k) === null) break;
      E.recruit(0, K[G.tick % 3 === 0 ? 1 : 0]); E.recruit(0, 'lan');
      const g = E.garr(c), field = G.armies.filter(a => a.team === 0 && !a.home);
      if (!field.length && g && E.tot(g.n) >= 20) { const a = E.formArmy(0, .75); const t = G.civs[1]; if (a && t) E.orderMove(a, t.x, t.y); } };
    const play = n => { for (let i = 0; i < n; i++) { E.step(.05); if (i % 20 === 0) act(); } };
    const fresh = (seed, d) => { E.setDiff(d); E.newGame(seed); E.setStarted(true); E.G.paused = true; };
    fresh('SEMILLA-A', 1); play(4800); out.a = E.stateHash(); out.hasBattle = E.G.rep.length;
    fresh('SEMILLA-A', 1); play(4800); out.b = E.stateHash();
    fresh('SEMILLA-B', 1); play(4800); out.c = E.stateHash();
    // guardar -> cargar -> seguir, con un choque en curso para cubrir battles/armies/path
    const mid = viaSave => { fresh('SEMILLA-A', 1); play(2400);
      const G = E.G; const f = E.nearestTerr(1, G.civs[0].x + 120, G.civs[0].y - 60, 400);   // emboscada garantizada: choque en curso al guardar
      const a = E.mkArmy(0, f[0], f[1], { lan: 20, arq: 6 }, { morale: 70 }); a.prov = 100; E.setAmbush(a);
      const e = E.mkArmy(1, f[0] + 50, f[1], { lan: 20, arq: 10, jin: 4 }, { morale: 70 }); e.prov = 100; e.stance = 'move'; e.path = [[f[0] - 60, f[1]]]; e.goal = [f[0] - 60, f[1]];
      for (let i = 0; i < 40; i++) E.step(.05);
      if (viaSave) { out.battlesAtSave = E.G.battles.length; out.saved = E.saveGame(); const d = E.readSave(); out.hasSave = !!d && d.v === 1 && typeof d.at === 'number' && /Civilización de \d+ obreros y \d+ soldados · \d+:\d\d · \d rival/.test(d.summary); out.summary = d && d.summary;
        E.newGame('OTRA'); E.restoreGame(d); E.G.paused = true; out.armiesAfter = E.G.armies.length; }
      play(2000); return E.stateHash(); };
    out.m1 = mid(false); out.m2 = mid(true);
    out.keys = Object.keys(JSON.parse(localStorage.getItem('evo_save4_v1'))).slice(0, 4);
    // lógica pura de Lanchester: lineal y cuadrática coinciden con la forma cerrada
    out.lin = E.lanch(30, 20, 1, 1, true); out.sq = E.lanch(30, 20, 1, 1, false);
    return out;
  });
  console.log(r, 'errs', errs.slice(0, 5));
  assert.strictEqual(r.a, r.b, 'misma semilla => mismo estado'); assert.notStrictEqual(r.a, r.c, 'otra semilla => otro estado');
  assert.ok(r.battlesAtSave > 0, 'debe haber un choque en curso al guardar'); assert.ok(r.saved && r.hasSave, 'formato del guardado: ' + r.summary);
  assert.strictEqual(r.m1, r.m2, 'guardar/cargar no debe cambiar el futuro'); assert.deepStrictEqual(r.keys.slice(0, 3), ['v', 'at', 'summary']);
  assert.ok(Math.abs(r.lin.surv - 10) < 1e-9 && Math.abs(r.sq.surv - Math.sqrt(500)) < 1e-9, 'Lanchester lineal (A-B) y cuadrática (raíz de A²-B²)');
  // linaje: sin linaje no hay bono; con linaje de la Era 3 hay bono chico y explicado
  const lin = await p.evaluate(() => { const E = window.__e4; localStorage.removeItem('evo_lineage'); E.setDiff(0); E.newGame('L'); const s0 = { f: E.G.civs[0].food, w: E.G.civs[0].wood, why: E.G.bonus.length, lin: E.G.lin };
    localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 3, branch: 'pred', tier: 2, mutCount: 9, owned: [], seed: 'x', city: 'Ciudad mercantil', pop: 31, at: 1 })); E.newGame('L'); const s1 = { f: E.G.civs[0].food, w: E.G.civs[0].wood, wk: E.wkTotal(E.G.civs[0]), why: E.G.bonus.slice(), box: document.getElementById('linBox').textContent };
    localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 4 })); const l4 = E.readLineage(); return { s0, s1, l4 }; });
  console.log(JSON.stringify(lin)); assert.strictEqual(lin.s0.why, 0); assert.strictEqual(lin.s0.lin, null); assert.ok(lin.s1.f - lin.s0.f === 50 && lin.s1.w - lin.s0.w === 50 && lin.s1.wk === 10 && lin.s1.why.length === 4 && lin.s1.why.some(w => /Depredador/.test(w)), 'bono del linaje (Mercado, población y rama de la Era 1)'); assert.strictEqual(lin.l4, null, 'una Era 4 sin datos de la Era 3 no cuenta como linaje');
  // ganar escribe linaje from:4 y borra el guardado
  const w = await p.evaluate(() => { const E = window.__e4; localStorage.removeItem('evo_lineage'); E.setDiff(0); E.newGame('W'); E.setStarted(true); E.G.paused = true; E.saveGame(); E.G.civs[1].alive = false; E.step(.05); const G = E.G; return { win: G.win, over: G.over, lin: JSON.parse(localStorage.getItem('evo_lineage')), save: localStorage.getItem('evo_save4_v1'), dlg: document.getElementById('dlg').classList.contains('show'), txt: document.getElementById('dB').textContent }; });
  console.log(w.lin); assert.ok(w.win && w.over && w.lin.v === 1 && w.lin.from === 4 && w.save === null && w.dlg && /Eras 5 y 6 todavía no existen/.test(w.txt));
  // menú: «Continuar» con fecha y resumen
  await p.evaluate(() => { const E = window.__e4; E.setDiff(0); E.newGame('C'); E.setStarted(true); E.G.paused = true; E.step(5); E.saveGame(); });
  await p.reload(); await p.waitForTimeout(300);
  const cont = await p.evaluate(() => { const b = document.getElementById('contBtn'); return { vis: b.style.display, txt: b.textContent }; });
  console.log(cont); assert.strictEqual(cont.vis, 'block'); assert.ok(/Civilización de/.test(cont.txt));
  await p.click('#contBtn'); await p.waitForTimeout(200);
  const run2 = await p.evaluate(() => { const E = window.__e4; return { t: E.G.t, menu: document.getElementById('menu').classList.contains('show') }; });
  assert.ok(run2.t >= 5 && !run2.menu, 'Continuar restaura la partida');
  assert.strictEqual(errs.length, 0, 'sin errores de consola: ' + errs.join('|'));
  console.log('GUARDADO ERA 4 OK'); await b.close();
})();
