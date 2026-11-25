// Pruebas de las Eras 5 y 6: determinismo, guardar/cargar, linaje (4 → 5 → 6), órdenes inválidas, interfaz básica y sin errores de consola.
// Uso: NODE_PATH=$(npm root -g) node tests/era56.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const ok = n => console.log('  ok  ' + n);
(async () => {
  const b = await chromium.launch();
  for (const era of [5, 6]) {
    const file = era === 5 ? 'era5-industria.html' : 'era6-estrellas.html', H = '__e' + era;
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|net::/i.test(m.text())) errs.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '../eras/' + file)); await p.waitForTimeout(300);
    console.log('Era ' + era);
    // 1. misma semilla => mismo estado (con un bot manejando al jugador por órdenes)
    const det = await p.evaluate(([H, era]) => { const E = window[H]; localStorage.removeItem('evo_lineage');
      const play = (seed, n) => { E.setDiff(1); E.newGame(seed, { noLineage: true }); E.pause(true); const c = E.G.civs[0]; for (let i = 0; i < n; i++) { E.step(1); if (i % 16 === 0) { E.aiThink(c); if (era === 5 && c.dlg) E.resolveDlg(c, 0); } } return E.stateHash(); };
      return { a: play('SEM-A', 2400), b: play('SEM-A', 2400), c: play('SEM-B', 2400) }; }, [H, era]);
    assert.strictEqual(det.a, det.b, 'misma semilla'); assert.notStrictEqual(det.a, det.c, 'otra semilla'); ok('misma semilla => mismo estado; otra semilla => otro');
    // 2. guardar -> cargar -> seguir == seguir sin cortar
    const sv = await p.evaluate(([H, era]) => { const E = window[H];
      const run = viaSave => { E.setDiff(1); E.newGame('GUARDA', { noLineage: true }); const c0 = () => E.G.civs[0]; const tick = n => { for (let i = 0; i < n; i++) { E.step(1); if (E.G.tick % 16 === 0) { E.aiThink(c0()); if (era === 5 && c0().dlg) E.resolveDlg(c0(), 0); } } };
        tick(1500); let sum = null; if (viaSave) { E.saveGame(); const d = E.readSave(); sum = d.summary; E.newGame('OTRA', { noLineage: true }); E.restoreGame(d); } tick(1500); return { h: E.stateHash(), sum }; };
      const x = run(false), y = run(true); return { x: x.h, y: y.h, sum: y.sum }; }, [H, era]);
    assert.strictEqual(sv.x, sv.y, 'guardar/cargar no cambia el futuro'); assert.ok(/·/.test(sv.sum)); ok('guardar → cargar → seguir = mismo futuro (' + sv.sum + ')');
    // 3. órdenes inválidas no cambian nada
    const inv = await p.evaluate(([H, era]) => { const E = window[H]; E.setDiff(0); E.newGame('INV', { noLineage: true }); const h0 = E.stateHash();
      const bad = era === 5 ? [{ t: 'annex', r: 9999 }, { t: 'build', r: E.G.civs[1].cap, k: 'mina' }, { t: 'tech', id: 'arca' }, { t: 'space' }, { t: 'rail', a: 0, b: 1 }, { t: 'zzz' }, null]
        : [{ t: 'send', a: E.G.civs[1].home, b: 0, f: 1 }, { t: 'build', s: E.G.civs[1].home, k: 'dy' }, { t: 'tech', id: 'esfera' }, { t: 'build', s: E.G.civs[0].home, k: 'esc' }, { t: 'zzz' }, null];
      const res = bad.map(o => E.cmd(0, o)); return { same: E.stateHash() === h0, res }; }, [H, era]);
    assert.ok(inv.same && inv.res.every(r => r), 'órdenes inválidas rechazadas: ' + JSON.stringify(inv.res)); ok('órdenes inválidas rechazadas sin tocar el estado');
    // 4. linaje: lee la era anterior, da un bono chico y explicado; al ganar escribe from: era
    const lin = await p.evaluate(([H, era]) => { const E = window[H];
      const prev = era === 5 ? { v: 1, from: 4, branch: 'foto', species: 'Colmena con castas', era3: { civ: 'ins', especie: 'ins_colmena', ciudad: 'La Colmena' }, era4: { civ: 'ins', especie: 'ins_colmena', como: 'asedio', capitales: 2, rendiciones: 1, techs: ['logi', 'bronce'] } }
        : { v: 1, from: 5, branch: 'pred', species: 'Arrecife constructor', era5: { civ: 'acu', especie: 'acu_arrecife', K: .74, temp: 1.2, pacto: true } };
      localStorage.setItem('evo_lineage', JSON.stringify(prev)); const L = E.readLineage(), B = E.linBonus(L); E.setDiff(0); E.newGame('LIN');
      const c = E.G.civs[0], out = { cv: c.cv, sp: c.sp, why: B.why.length, bonus: E.G.bonus.length };
      localStorage.removeItem('evo_lineage'); E.newGame('LIN0'); out.noLin = E.G.bonus.length;
      localStorage.setItem('evo_lineage', JSON.stringify(prev)); E.newGame('WIN'); E.end(0, era === 5 ? 'arca' : 'tipo2'); out.after = JSON.parse(localStorage.getItem('evo_lineage')); out.save = localStorage.getItem(era === 5 ? 'evo_save5_v1' : 'evo_save6_v1');
      localStorage.setItem('evo_lineage', '{"v":1,"from":"x"}'); out.bad = E.readLineage(); localStorage.setItem('evo_lineage', 'no-json'); out.bad2 = E.readLineage(); return out; }, [H, era]);
    assert.strictEqual(lin.cv, era === 5 ? 'ins' : 'acu'); assert.strictEqual(lin.sp, era === 5 ? 'ins_colmena' : 'acu_arrecife'); assert.ok(lin.why >= 3 && lin.bonus === lin.why && lin.noLin === 0, 'bono explicado y nada sin linaje');
    assert.strictEqual(lin.after.from, era); assert.ok(lin.after['era' + era] && lin.after['era' + (era - 1)], 'conserva la era anterior y suma la nueva'); assert.strictEqual(lin.save, null); assert.strictEqual(lin.bad, null); assert.strictEqual(lin.bad2, null);
    ok('linaje: clase y especie de la era anterior, bono explicado, escribe from: ' + era + ' y conserva lo anterior');
    // 5. interfaz: empezar desde el menú, tocar el mapa, abrir tecnologías, sin errores
    await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
    await p.click('#startBtn'); await p.waitForTimeout(500);
    const box = await p.locator('#cv').boundingBox(); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(200);
    await p.click('#bTech'); await p.waitForTimeout(200); const nT = await p.locator('#techGrid .tc').count(); await p.click('#techClose');
    const ui = await p.evaluate(H => ({ t: window[H].G.t, hint: document.getElementById('hint').textContent, goals: document.querySelectorAll('#goalRows .g').length }), H);
    await p.waitForTimeout(1000); const t2 = await p.evaluate(H => window[H].G.t, H);
    assert.ok(nT >= 8 && ui.goals >= 7 && ui.hint.length > 10 && t2 > ui.t, 'la partida corre y la interfaz responde'); ok('interfaz: menú → partida → mapa → tecnologías (' + nT + ' tarjetas)');
    // 6. móvil: sin desborde horizontal
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(ov <= 1, 'desborde horizontal en móvil: ' + ov); ok('móvil 390 px sin desborde horizontal');
    assert.deepStrictEqual(errs, [], 'errores de consola'); ok('sin errores de consola');
    await p.close();
  }
  await b.close(); console.log('ERAS 5 Y 6 OK');
})().catch(e => { console.error(e); process.exit(1); });
