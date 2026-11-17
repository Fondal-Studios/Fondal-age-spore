// Bot en el bucle real (×4) de la Era 3 (Ciclo 4 · civilizaciones), escritorio (Terrestres) y móvil (Acuáticos anfibios), sin errores de consola;
// luego fuerza la fundación y revisa pantalla final, linaje (era3) y vuelta a la portada.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-bot.js [segundos de juego=480] [captura-escritorio.png] [captura-movil.png]
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const T = +(process.argv[2] || 480);
const BOT = () => {
  const E = window.__e3;
  window.__act = () => { const G = E.G; if (!G || G.over || G.modal) return; if (!E.adults().length) return;
    for (const id in E.TECH) if (E.techCheck(id).ok) { E.research(id); break; }
    const c = E.core(); if (!c.upg && E.upgradeCheck(c).ok) E.upgradeBuilding(c);
    if (E.workItems().length < 2) { const need = ['vivienda', 'granja', 'ext1', 'almacen', 'saber', 'vivienda', 'torre', 'cuartel', 'ext2', 'cria']; for (const k of need) { if (G.B.filter(b => b.k === k).length >= (k === 'vivienda' ? 4 : 1)) continue; const s = E.findSpot(k); if (s && E.placeBuilding(k, s)) break; } }
    const b = G.B.find(x => x.done && !x.upg && x.k !== 'corazon' && E.upgradeCheck(x).ok); if (b && E.workItems().length < 2) E.upgradeBuilding(b);
    if (E.done('cuartel').length && E.trainCheck('gue').ok && G.P.filter(p => p.role === 'gue').length < 2) E.train('gue'); };
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, mob, sp, shot] of [[1280, 800, false, 'ter_cazador', process.argv[3]], [390, 800, true, 'acu_anfibio', process.argv[4]]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
    await ctx.addInitScript(sp => { try { localStorage.setItem('evo_tut3', 'done'); localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 2, branch: 'foto', tier: 1, mutCount: 4, owned: [], seed: 'bot', era2: { species: sp, name: sp, cls: sp.slice(0, 3), traits: ['garras', 'aletas'], vars: {}, tierra: sp === 'acu_anfibio' } })); } catch (_) { } }, sp);
    await p.goto(url); await p.evaluate(BOT);
    await p.click('#startBtn'); await p.click('#bSpd'); await p.click('#bSpd'); // ×4
    await p.evaluate(() => { window.__iv = setInterval(window.__act, 400); });
    await p.waitForFunction(t => window.__e3.G.t >= t || window.__e3.G.over, T, { timeout: T * 1000, polling: 1000 });
    const st = await p.evaluate(() => { const E = window.__e3, G = E.G; return { t: Math.round(G.t), over: G.over, civ: G.x3.civ, amph: G.x3.amph, age: E.age(), pop: G.P.length, blds: G.B.filter(b => b.done).length, techs: Object.keys(G.techs).length, nan: /NaN/.test(JSON.stringify(G)), busErr: E.Bus.err }; });
    console.log(mob ? 'móvil' : 'escritorio', st); assert.ok(!st.nan && st.busErr === 0 && st.blds >= 4 && st.civ === sp.slice(0, 3) && st.amph === (sp === 'acu_anfibio'), 'partida sana con la civilización del linaje');
    if (shot) await p.screenshot({ path: shot });
    const fin = await p.evaluate(() => { clearInterval(window.__iv); const E = window.__e3; E.forceWin(); return { dlg: document.getElementById('dlg').classList.contains('show'), txt: document.getElementById('dB').textContent, btns: [...document.querySelectorAll('#dBtns button')].map(x => x.textContent + ':' + Math.round(x.getBoundingClientRect().height)), lin: JSON.parse(localStorage.getItem('evo_lineage')), save: localStorage.getItem('evo_save3_v1') }; });
    console.log(fin.btns, fin.lin.era3); assert.ok(fin.dlg && fin.btns.some(x => /Volver a la portada/.test(x)) && fin.btns.every(x => +x.split(':').pop() >= 44)); assert.strictEqual(fin.lin.from, 3); assert.strictEqual(fin.lin.era3.civ, sp.slice(0, 3)); assert.strictEqual(fin.lin.era2.species, sp); assert.strictEqual(fin.save, null);
    await Promise.all([p.waitForNavigation(), p.click('#dBtns button')]); assert.ok(/index\.html$/.test(p.url()), p.url());
    await ctx.close();
  }
  assert.strictEqual(errs.length, 0, errs.join(' | ')); console.log('BOT ERA 3 OK'); await b.close();
})();
