// Capturas de la Era 4 por civilización (Ciclo 5): escritorio 1280×800 y móvil 390×844, con el arte de art/era3 y con ?sinarte.
// Uso: NODE_PATH=$(npm root -g) node tools/era4-capturas.js [carpeta=docs/ciclo5/era4]
// Cada captura juega unos minutos con un bot simple y lleva un ejército propio cerca de la capital rival para ver ejércitos, ciudades y asedio.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = path.resolve(process.argv[2] || path.join(__dirname, '../docs/ciclo5/era4')); fs.mkdirSync(out, { recursive: true });
const url = 'file://' + path.resolve(__dirname, '../eras/era4-civilizaciones.html');
const LIN = { ter: ['ter', 'ter_gigante', 'Círculo de piedras'], ins: ['ins', 'ins_enjambre', 'La Reina Madre'], acu: ['acu', 'acu_arrecife', 'Corriente domada'], ave: ['ave', 'ave_rapaz', null] };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const shot = async (name, w, h, mob, civ, q, menu) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob, deviceScaleFactor: 1 });
    const [cv, sp, mar] = LIN[civ];
    await ctx.addInitScript(([cv, sp, mar]) => { try { localStorage.removeItem('evo_save4_v1'); if (cv) localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 3, branch: 'pred', tier: 2, mutCount: 8, owned: [], seed: 'cap', species: sp, city: 'Ciudad militarista', pop: 22, era2: { species: sp, cls: cv, traits: [] }, era3: { civ: cv, especie: sp, especieN: sp, edad: 3, techs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], maravilla: mar, anfibia: false, ciudad: '', path: 'jefatura' } })); else localStorage.removeItem('evo_lineage'); } catch (_) { } }, [menu === 'sinlinaje' ? null : cv, sp, mar]);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(name + ': ' + m.text()); });
    await p.goto(url + (q || '')); await p.waitForTimeout(700);
    if (!menu) {
      await p.evaluate(() => { const E = window.__e4; E.setDiff(1); document.getElementById('startBtn').click(); E.G.paused = true;
        for (let i = 0; i < 160; i++) { E.step(2); const G = E.G; if (G.dlg) { E.resolveDlg(1); } E.recruit(0, 'obrero'); for (const k of ['granja', 'cuartel', 'vivienda', 'muralla', 'templo']) if (E.build(0, k) === null) break; E.recruit(0, 'lan'); E.recruit(0, 'arq'); E.recruit(0, 'jin'); }
        const G = E.G, me = G.civs[0], t = G.civs.find(c => c.id && c.alive) || G.civs[1];
        const a = E.formArmy(0, .6); if (a) { a.x = t.x - 70; a.y = t.y + 20; a.path = [[t.x - 30, t.y]]; a.stance = 'move'; a.prov = 200; }
        me.intel[t.id] = G.t + 999; t.sg = 63; E.select(a ? a.id : 0); E.G.paused = false; window.__e4.cam.ox = 0; });
      await p.evaluate(() => { const E = window.__e4, G = E.G, t = G.civs.find(c => c.id && c.alive) || G.civs[1], k = E.cam, cvEl = document.getElementById('cv'); const W = 960, H = 600, cw = cvEl.clientWidth, ch = cvEl.clientHeight, cl = (v, a, b) => Math.max(a, Math.min(b, v)); k.ox = cl(cw / 2 - (t.x - 90) * k.s, Math.min(0, cw - W * k.s), 0); k.oy = cl(ch / 2 - t.y * k.s, Math.min(0, ch - H * k.s), 0); G.modal = true; document.getElementById('toasts').innerHTML = ''; });
      await p.waitForTimeout(500);
    }
    await p.screenshot({ path: path.join(out, name + '.png') }); console.log('ok', name); await ctx.close();
  };
  await shot('menu-sin-linaje-escritorio', 1280, 800, false, 'ter', '', 'sinlinaje');
  await shot('menu-linaje-movil', 390, 844, true, 'ins', '', 'menu');
  for (const c of ['ter', 'ins', 'acu', 'ave']) { await shot(c + '-escritorio', 1280, 800, false, c); await shot(c + '-movil', 390, 844, true, c); }
  await shot('ter-escritorio-sinarte', 1280, 800, false, 'ter', '?sinarte');
  console.log(errs.length ? 'ERRORES: ' + errs.join(' | ') : 'sin errores'); await b.close();
})();
