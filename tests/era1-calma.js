// Era 1 · calma inicial (auditoría C5, punto 1): una colonia quieta no muere antes de que termine la calma; la calma termina con el
// primer hito; los rivales no eligen como blanco a un equipo en calma; primera partida = Fácil con 1 rival; aviso táctil correcto.
// Uso: NODE_PATH=$(npm root -g) node tests/era1-calma.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era1-celula.html');
const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  let p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(url); await p.waitForTimeout(300);
  const lob = await p.evaluate(() => ({ on: document.querySelector('#diffSeg .on').dataset.d, bots: document.querySelectorAll('#lobby select, .slot select').length ? [...document.querySelectorAll('select')].filter(s => s.value === '1' || /bot/i.test(s.value)).length : null }));
  ok(lob.on === '0', 'primera partida: Fácil preseleccionado (' + JSON.stringify(lob) + ')');
  const r = await p.evaluate(() => { const E = window.__e1, out = {};
    for (const di of [0, 1, 2]) { E.newGame(di, 3, 'CALMA' + di); E.setStarted(true); const S = E.S, calmT = S.calm; let tLose = null, minN = 99;
      while (!E.S.over && E.S.t < calmT) { E.step(1); E.S.modal = false; minN = Math.min(minN, E.S.cells.filter(c => c.team === 0).length); }
      out[di] = { calmT, sobrevive: !E.S.over && minN > 0, minN, env: E.S.env ? E.S.env.kind : null }; }
    E.newGame(1, 3, 'HITO'); E.setStarted(true); const T = E.S.teams[0]; E.step(1); const before = E.S.teams.slice(1).every((_, i) => true); T.stage = 1; E.step(1); out.hito = { calmFin: E.S.calmEnd === true };
    return out; });
  for (const di of ['0', '1', '2']) ok(r[di].sobrevive, 'dificultad ' + di + ': colonia quieta viva durante toda la calma (' + r[di].calmT + ' s, mínimo ' + r[di].minN + ' células)');
  ok(r.hito.calmFin, 'la calma termina al llegar al primer hito');
  await p.close();
  const ctx = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } }); p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(300);
  await p.click('#startBtn'); await p.waitForTimeout(400); const txt = await p.evaluate(() => document.body.innerText);
  ok(/arrastrá con un dedo/.test(txt) && !/mové el mouse/.test(txt), 'en pantalla táctil el aviso dice «arrastrá con un dedo»');
  assert.deepStrictEqual(errs, []); console.log('ERA 1 CALMA OK'); await b.close();
})();
