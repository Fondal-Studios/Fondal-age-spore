// Prueba Era 3: misma semilla => mismo estado; guardar->cargar->seguir == no interrumpir; sin errores de consola.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-guardado.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../eras/era3-tribus.html')); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const E = window.__e3, out = {};
    // un jugador mínimo y determinista, para que el estado tenga construcciones, tareas, tecnologías y objetivos (tgt)
    const play = n => { for (let i = 0; i < n; i++) { E.step(.05); if (i % 40 === 0) { const G = E.G; if (G.know >= 3 && !E.has('fuego')) E.research('fuego'); if (!G.sites.length && G.wood >= 6 && G.B.length < 5) E.placeBuilding('refugio', { x: 260 + G.B.length * 30, y: 380 }); } } };
    const run = (seed, diff, n) => { E.diffI = diff; E.newGame(seed); E.setStarted(true); play(n); return E.stateHash(); };
    out.a = run('SEMILLA-A', 1, 3200);
    out.b = run('SEMILLA-A', 1, 3200);
    out.c = run('SEMILLA-B', 1, 3200);
    // guardar -> cargar -> seguir, con una obra en curso para cubrir sites/tgt
    const mid = viaSave => { E.diffI = 1; E.newGame('SEMILLA-A'); E.setStarted(true); play(1600); E.G.wood += 20; E.G.stone += 10; E.placeBuilding('almacen', { x: 330, y: 400 });
      if (viaSave) { out.sitesAtSave = E.G.sites.length; out.tgtAtSave = E.G.P.filter(q => q.tgt).length; out.saved = E.saveGame(); const d = E.readSave(); out.hasSave = !!d && d.v === 1 && typeof d.at === 'number' && /Tribu de \d+ · año \d+ · \d+ tecnolog/.test(d.summary); out.summary = d && d.summary; E.newGame('OTRA'); E.restoreGame(d); }
      play(1600); return E.stateHash(); };
    out.a2 = mid(false); out.d = mid(true);
    // el estado restaurado no comparte objetos duplicados: sitios == objetos de B, tgt == objetos de las listas
    const G = E.G; out.sitesInB = G.sites.every(s => G.B.includes(s));
    out.tgtOk = G.P.every(q => !q.tgt || [G.bushes, G.trees, G.rocks, G.Gm].some(l => l.includes(q.tgt)));
    out.sav = Object.keys(JSON.parse(localStorage.getItem('evo_save3_v1'))).slice(0, 6);
    return out;
  });
  console.log(r, 'errs', errs.slice(0, 5));
  assert.strictEqual(r.a, r.b, 'misma semilla => mismo estado');
  assert.notStrictEqual(r.a, r.c, 'otra semilla => otro estado');
  assert.strictEqual(r.a2, r.d, 'guardar/cargar no debe cambiar el futuro'); assert.ok(r.sitesAtSave > 0, 'debe haber una obra en curso al guardar');
  assert.ok(r.saved && r.hasSave, 'formato del guardado'); assert.ok(r.sitesInB && r.tgtOk, 'referencias reconstruidas');
  assert.ok(r.tgtAtSave > 0, 'la prueba debe cubrir referencias tgt');
  // menú: botón Continuar con fecha y resumen; se borra al terminar
  await p.reload(); await p.waitForTimeout(300);
  const cont = await p.evaluate(() => { const b = document.getElementById('contBtn'); return { vis: b.style.display, txt: b.textContent }; });
  console.log(cont); assert.strictEqual(cont.vis, 'block'); assert.ok(/Tribu de/.test(cont.txt));
  await p.click('#contBtn'); await p.waitForTimeout(200);
  const run2 = await p.evaluate(() => { const E = window.__e3; E.step(.05 * 20); const t = E.G.t; E.G.P.forEach(q => q.dead = true); E.step(.05 * 25); return { t, over: E.G.over, left: localStorage.getItem('evo_save3_v1') }; });
  console.log(run2); assert.ok(run2.over && run2.left === null, 'el guardado se borra al terminar');
  assert.strictEqual(errs.length, 0, 'sin errores de consola: ' + errs.join('|'));
  console.log('GUARDADO ERA 3 OK'); await b.close();
})();
