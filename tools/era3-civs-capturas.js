// Ciclo 4 · Era 3 por civilización: capturas de las 4 civilizaciones (y la ciudad acuática anfibia) en la Edad I y en la Edad III.
// Las partidas las juega el bot «clash» (tests/era3-bots.js) por la API pública, sin preparar el estado a mano; el dibujo es el provisorio (marcadores simples).
// Uso: NODE_PATH=$(npm root -g) node tools/era3-civs-capturas.js [carpeta=docs/ciclo4/era3-civs]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const out = path.resolve(__dirname, '..', process.argv[2] || 'docs/ciclo4/era3-civs'); fs.mkdirSync(out, { recursive: true });
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const CASES = [['ter', 'ter_ingeniero', false], ['ins', 'ins_colmena', false], ['acu', 'acu_arrecife', false], ['acu-anfibia', 'acu_anfibio', true], ['ave', 'ave_migratoria', false]];
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, sp, tierra] of CASES) for (const [age, w, h, mob] of [[1, 1280, 800, false], [3, 1280, 800, false], [3, 390, 800, true]]) {
    if (mob && name !== 'ins' && name !== 'acu-anfibia') continue;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob, deviceScaleFactor: mob ? 2 : 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('evo_tut3', 'done'); localStorage.removeItem('evo_lineage'); } catch (_) { } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto(url); await p.addScriptTag({ content: fs.readFileSync(path.resolve(__dirname, '../tests/era3-bots.js'), 'utf8') });
    const st = await p.evaluate(([sp, tierra, age]) => { const E = window.__e3; E.pickSp = sp; document.getElementById('startBtn').click(); E.G.paused = true;
      const r = window.runBot3('CAPTURA-' + sp, 0, 3000, 'clash', { species: sp, tierra, traits: ['garras', 'alas'], stopAge: age, stopAfter: age === 1 ? 240 : 150, noFound: true });
      E.setStarted(true); E.G.paused = true; E.ui.setSel(null, E.G.B.findIndex(b => b.k === 'corazon')); ['bx_age', 'bx_army', 'bx_sel'].forEach(i => E.ui.openPanel(i)); E.ui.camFocus(E.G.camp.x + (age === 3 ? 60 : 0), E.G.camp.y, age === 3 ? 1.15 : 1.6, true); E.hud(); E.render();
      return { t: r.t, age: E.age(), civ: E.G.x3.civ, amph: E.G.x3.amph, blds: E.G.B.length, pop: E.G.P.length }; }, [sp, tierra, age]);
    await p.waitForTimeout(150); await p.evaluate(() => window.__e3.render());
    const f = path.join(out, name + '-edad' + age + (mob ? '-movil' : '') + '.png'); await p.screenshot({ path: f });
    console.log(f, JSON.stringify(st)); await ctx.close();
  }
  console.log('errores:', errs); await b.close();
})();
