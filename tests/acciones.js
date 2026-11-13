// Prueba de regresión de ACCIONES del jugador: una partida con semilla fija donde se juegan acciones reales por la interfaz.
// Imprime el hash final; el valor esperado queda en tests/acciones.hash (se actualiza a propósito si cambian las reglas).
// Uso: NODE_PATH=$(npm root -g) node tests/acciones.js [--update]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const assert = require('assert');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../eras/' + (process.env.FILE || 'era1-celula.html'))); await p.waitForTimeout(400);
  await p.evaluate(() => { const E = __e1; E.newGame(1, 2, 'ACCIONES', [0, 1, 2]); E.setStarted(true); document.getElementById('menu').classList.remove('show'); E.S.paused = true; });
  await p.evaluate(() => { window.__trace = []; });
  const hash = await p.evaluate(async () => {
    const E = __e1, $ = id => document.getElementById(id); const run = n => { for (let i = 0; i < n; i++) { if (E.S.modal) break; E.step(1 / 60); } };
    const click = id => $(id).click(); const pickAll = () => { let g = 0; while (E.S.teams[0].pending > 0 && g++ < 8) { if (!E.S.modal) E.openMutation(); const o = E.offers(); E.pickMut(o[0]); } E.S.modal = false; };
    const T = () => E.S.teams[0];
    for (let k = 0; k < 40; k++) {
      T().nut = Math.max(T().nut, 120); T().en = Math.max(T().en, 40);
      click('bDiv'); run(30);
      if (k === 3) { click('bAll'); click('bBoost'); }
      if (k === 6) { T().pending += 2; pickAll(); }
      if (k === 8) { click('bAll'); click('bTypes'); const bs = $('tray').querySelectorAll('button'); bs[1].click(); bs[2].click(); }
      if (k === 12) { T().pending += 2; pickAll(); E.S.stage = Math.max(E.S.stage || 0, 1); T().stage = Math.max(T().stage || 0, 1); }
      if (k === 14) { click('bBuild'); const ss = $('tray2').querySelectorAll('button'); if (ss[0]) ss[0].click(); }
      if (k === 18) { E.S.fusion = true; E.S.stage = 2; T().fusion = true; T().stage = 2; click('bAll'); click('bFuse'); }
      if (k === 20) { T().pending += 3; pickAll(); }
      if (k >= 22) { for (const a of Object.keys(E.AB)) if (E.abLevel(a)) E.useAbility(a); }
      if (k === 26) { click('bSow'); }
      if (k === 30) { click('bAll'); }
      run(60);
      if (window.__trace) window.__trace.push([k, E.S.t.toFixed(2), E.S.cells.length, E.S.teams[0].nut.toFixed(2), E.S.teams[0].mutCount, E.S.modal ? 1 : 0]);
    }
    const d = JSON.parse(E.snapshot()), S = d.S; // proyección estable: lo esencial de la simulación, sin campos de interfaz ni su orden
    const core = { rs: d.rs, t: +S.t.toFixed(4), idc: S.idc, cells: S.cells, nuts: S.nuts, drops: S.drops, meadows: S.meadows, rests: S.rests, reefs: S.reefs, vents: S.vents,
      teams: S.teams.map(T => ({ nut: T.nut, en: T.en, dna: T.dna, prot: T.prot, mutCount: T.mutCount, owned: T.owned, branch: T.branch, branch2: T.branch2, vars: T.vars, pending: T.pending, mods: T.mods })) };
    const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
    return E.hashStr(JSON.stringify(canon(core))).toString(16) + '/' + S.cells.length + '/' + S.teams[0].mutCount + '/' + Math.round(S.t);
  });
  if (process.env.TRACE) console.log((await p.evaluate(() => window.__trace)).map(r => r.join(' ')).join('\n'));
  console.log('hash', hash, 'errs', errs.slice(0, 3));
  assert.strictEqual(errs.length, 0);
  const f = path.resolve(__dirname, 'acciones.hash');
  if (process.argv.includes('--update') || !fs.existsSync(f)) { fs.writeFileSync(f, hash + '\n'); console.log('línea base escrita'); }
  else assert.strictEqual(hash, fs.readFileSync(f, 'utf8').trim(), 'el resultado de las acciones cambió respecto de la línea base');
  console.log('ACCIONES OK'); await b.close();
})();
