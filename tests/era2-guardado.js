// Prueba Era 2: misma semilla => mismo estado; guardar/cargar no cambia el futuro; sin errores de consola.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-guardado.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_(INTERNET|NAME|FAILED|CONNECTION)|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../eras/era2-animales.html')); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const E = window.__e2, out = {};
    const run = n => { for (let i = 0; i < n; i++) { const g = E.G; if (g.pending > 0) { g.pending = 0; } E.step(.05); } };
    const fresh = (seed, cls, spec) => { E.cls = cls; E.specKey = spec; E.diffI = 1; E.newGame('pradera', null, seed); };
    fresh('SEMILLA1', 'ter', 'ter_cazador'); run(1200); out.a = E.stateHash();
    fresh('SEMILLA1', 'ter', 'ter_cazador'); run(1200); out.b = E.stateHash();
    fresh('OTRA', 'ter', 'ter_cazador'); run(1200); out.c = E.stateHash();
    // guardar -> cargar -> seguir
    fresh('SEMILLA1', 'ter', 'ter_cazador'); run(600); E.setStarted(true);
    const mid = E.stateHash(); out.saved = E.saveGame(true); const d = E.readSave(); out.hasSave = !!d && d.v === 1 && typeof d.summary === 'string' && d.at > 0; out.summary = d && d.summary;
    E.newGame('desierto', null, 'ZZZ'); run(50);          // ensucia el estado
    out.restored = E.restoreGame(d); out.midAfter = E.stateHash(); out.mid = mid; run(600); out.d = E.stateHash();
    // otra clase (aves) y bioma de agua, para cubrir referencias a especies
    E.cls = 'ave'; E.specKey = 'ave_rapaz'; E.newGame('oceano', null, 'AGUA'); run(400); const m2 = E.stateHash(); E.saveGame(true); E.restoreGame(E.readSave()); out.m2 = m2 === E.stateHash(); run(300); const x1 = E.stateHash();
    E.cls = 'ave'; E.specKey = 'ave_rapaz'; E.newGame('oceano', null, 'AGUA'); run(700); out.m3 = x1 === E.stateHash();
    E.setStarted(false); return out;
  });
  console.log(r, 'errs', errs.slice(0, 5));
  assert.strictEqual(r.a, r.b, 'misma semilla debe dar el mismo estado');
  assert.notStrictEqual(r.a, r.c, 'otra semilla debe dar otro estado');
  assert.ok(r.saved && r.hasSave, 'el guardado existe y tiene v, at y summary');
  assert.ok(r.restored); assert.strictEqual(r.mid, r.midAfter, 'cargar debe devolver el mismo estado');
  assert.strictEqual(r.a.split('/')[2] > 0, true);
  assert.ok(r.m2 && r.m3, 'guardar/cargar en otro bioma no cambia el futuro');
  assert.strictEqual(errs.length, 0, 'sin errores de consola');
  // d (guardar->cargar->seguir 600) debe coincidir con correr 1200 seguidos con la misma semilla
  assert.strictEqual(r.d, r.a, 'guardar->cargar->seguir = no interrumpir');
  console.log('GUARDADO ERA 2 OK'); await b.close();
})();
