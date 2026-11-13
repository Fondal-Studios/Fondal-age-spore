// Bot de 10 min de juego en el bucle real (x4), sin errores de consola; luego fuerza la victoria y revisa pantalla final y linaje.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-bot.js [ruta-captura-escritorio.png] [ruta-captura-movil.png]
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const BOT = () => {
  const E = window.__e3, ORDER = ['fuego', 'piedra', 'cesta', 'lanza', 'ceram', 'agri', 'marcas', 'arco', 'domes']; let slot = 0;
  const place = k => { const G = E.G; for (let i = 0; i < 12; i++) { const a = slot++ * 2.4; const n0 = G.sites.length; E.placeBuilding(k, { x: 300 + Math.cos(a) * (60 + (slot % 4) * 14), y: 330 + Math.sin(a) * (60 + (slot % 4) * 14) }); if (G.sites.length > n0) return; } };
  window.__act = () => { const G = E.G; if (!G || G.over || G.modal) return; const ad = E.adults(); if (!ad.length) return; const cnt = r => ad.filter(p => p.role === r).length;
    if (!cnt('cha')) E.setRole('cha', 1);
    for (const k of ORDER) { const t = E.TECH[k]; if (!E.has(k) && t.req.every(E.has) && !(t.excl || []).some(E.has) && G.know >= E.techCost(k)) { E.research(k); break; } }
    if (G.sites.length < 2) { const ref = E.done('refugio').length + G.sites.filter(s => s.k === 'refugio').length, need = k => !E.done(k).length && !G.sites.some(s => s.k === k);
      if (!cnt('con')) E.setRole('con', 1);
      if (ref < 3 && G.wood >= 6) place('refugio'); else if (need('almacen') && G.wood >= 10 && G.stone >= 2) place('almacen'); else if (need('totem') && G.wood >= 8 && G.stone >= 4) place('totem'); else if (E.has('agri') && need('huerto') && G.wood >= 4) place('huerto'); }
    if (G.relation < 45 && G.food >= 14) E.dip('gift'); if (G.relation >= 50 && !G.allied) E.dip('ally'); };
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, mob, shot] of [[1280, 800, false, process.argv[2]], [390, 800, true, process.argv[3]]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); });
    await p.goto(url); await p.evaluate(BOT);
    await p.click('#startBtn'); await p.click('#bSpd'); await p.click('#bSpd'); // x4
    await p.evaluate(() => { window.__iv = setInterval(window.__act, 400); });
    await p.waitForFunction(() => window.__e3.G.t >= 600 || window.__e3.G.over, null, { timeout: 180000, polling: 1000 });
    const st = await p.evaluate(() => { const G = window.__e3.G; return { t: Math.round(G.t), over: G.over, pop: G.P.length, techs: Object.keys(G.techs).length, deaths: G.deaths, nan: JSON.stringify(G).includes('null,') && /NaN/.test(JSON.stringify(G)) }; });
    console.log(mob ? 'movil' : 'escritorio', st); assert.ok(!st.nan);
    if (shot) await p.screenshot({ path: shot });
    // pantalla final (victoria forzada) + linaje
    await p.evaluate(() => { clearInterval(window.__iv); const G = window.__e3.G; G.over = false; G.raidsOk = 2; G.g = []; window.__e3.win && 0; });
    const fin = await p.evaluate(() => { const E = window.__e3; E.forceWin(); return { dlg: document.getElementById('dlg').classList.contains('show'), btns: [...document.querySelectorAll('#dBtns button')].map(x => x.textContent + ':' + Math.round(x.getBoundingClientRect().height)), lin: localStorage.getItem('evo_lineage'), save: localStorage.getItem('evo_save3_v1') }; });
    console.log(fin); assert.ok(fin.dlg && fin.btns.some(x => /Volver a la portada/.test(x))); assert.strictEqual(JSON.parse(fin.lin).from, 3); assert.strictEqual(fin.save, null);
    await Promise.all([p.waitForNavigation(), p.click('#dBtns button')]); assert.ok(/index\.html$/.test(p.url()), p.url());
    await ctx.close();
  }
  assert.strictEqual(errs.length, 0, errs.join(' | ')); console.log('BOT ERA 3 OK'); await b.close();
})();
