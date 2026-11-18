// Era 4 · Ciclo 5: continuidad por civilización, fin de partida y partida vieja.
// 1) Linaje de la Era 3 con cada civilización (ter/ins/acu/ave): tu civilización, tu especie, nombres de recursos, unidades, edificios y rivales de OTRAS clases; bono explicado.
// 2) Sin linaje: el menú deja elegir especie (12) y la clase decide la civilización. Linaje solo de la Era 2: la clase de la Era 2.
// 3) Fin de partida: tope de ejército, asedio que baja la barra y toma la capital, rendición con tributo, derrota por asedio de tu capital.
// 4) Partida vieja (evo_save4_v1 del Ciclo 4, tests/fixtures/era4-save-v1-base.json): carga, se migra a Terrestres y sigue determinista.
// 5) Linaje de salida (from:4) conserva rama, era2 y era3; la Era 3 acepta un linaje que viene directo de la Era 1 y conserva la rama.
// 6) Arte: con manifest carga los dibujos de art/era3; ?sinarte no carga ninguno.
// Uso: NODE_PATH=$(npm root -g) node tests/era4-continuidad.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'); const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../eras/era4-civilizaciones.html'), url3 = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const FIX = fs.readFileSync(path.resolve(__dirname, 'fixtures/era4-save-v1-base.json'), 'utf8');
const lin3 = (civ, sp, mar, extra) => JSON.stringify(Object.assign({ v: 1, from: 3, branch: 'colo', tier: 2, mutCount: 6, owned: [], seed: 's', species: sp, city: 'Ciudad mercantil', path: 'mercado', pop: 12, era2: { species: sp, name: sp, cls: civ, traits: [] }, era3: { civ, especie: sp, especieN: sp, edad: 3, techs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], maravilla: mar, anfibia: false, ciudad: 'X', path: 'mercado', t: 1500 } }, extra || {}));
(async () => {
  const b = await chromium.launch(); const errs = [];
  const page = async (u, init) => { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); if (init) await ctx.addInitScript(init[0], init[1]); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); }); await p.goto(u); await p.waitForTimeout(300); return { ctx, p }; };

  // 1) las cuatro civilizaciones desde el linaje de la Era 3
  const MARS = { ter: 'Círculo de piedras', ins: 'La Reina Madre', acu: 'Corriente domada', ave: 'La Gran Ruta Migratoria' }, SPS = { ter: 'ter_gigante', ins: 'ins_parasito', acu: 'acu_arrecife', ave: 'ave_migratoria' };
  for (const civ of ['ter', 'ins', 'acu', 'ave']) {
    const { ctx, p } = await page(url + '?sinarte', [l => { localStorage.setItem('evo_lineage', l); localStorage.removeItem('evo_save4_v1'); }, lin3(civ, SPS[civ], MARS[civ])]);
    const menu = await p.evaluate(() => ({ box: document.getElementById('linBox').textContent, pick: document.getElementById('spPick').style.display }));
    await p.evaluate(() => window.__e4.setDiff(2)); await p.click('#diffSeg button[data-d="2"]'); await p.click('#startBtn'); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const E = window.__e4, G = E.G, c = G.civs[0]; E.G.paused = true; E.hud(); document.getElementById('bRec').click(); const rec = document.getElementById('tray').textContent; document.getElementById('bBld').click(); const bld = document.getElementById('tray').textContent;
      return { civ: G.civ, sp: G.sp, cv0: c.cv, rivals: G.civs.slice(1).map(x => x.cv), rnames: G.civs.slice(1).map(x => x.name), wood: document.getElementById('nWood').textContent, bronze: document.getElementById('nBronze').textContent, food: document.getElementById('vFoodR').textContent, rec, bld, bonus: G.bonus, food0: c.food, bronze0: c.bronze, wk: E.wkTotal(c), log: G.log[0], jin: E.unitName('jin', c), cap: E.armyCap(c) }; });
    console.log(civ, JSON.stringify({ civ: r.civ, sp: r.sp, rivals: r.rivals, wood: r.wood, bronze: r.bronze, jin: r.jin, bonus: r.bonus }));
    const CVN = { ter: ['madera', 'piedra', 'carne'], ins: ['fibra', 'cera', 'jalea'], acu: ['coral', 'nácar', 'algas'], ave: ['ramas', 'barro', 'semillas'] }[civ];
    assert.strictEqual(r.civ, civ, 'civilización del linaje (era3.civ)'); assert.strictEqual(r.sp, SPS[civ], 'especie del linaje'); assert.strictEqual(r.cv0, civ);
    assert.strictEqual(r.rivals.length, 3); assert.ok(!r.rivals.includes(civ) && new Set(r.rivals).size === 3, 'rivales de OTRAS clases: ' + r.rivals);
    assert.ok(r.wood === CVN[0] && r.bronze === CVN[1] && r.food.startsWith(CVN[2]), 'recursos con nombre de la civilización');
    assert.strictEqual(menu.pick, 'none', 'con linaje no se elige especie'); assert.ok(/Continuidad/.test(menu.box) && /Bono chico/.test(menu.box) && menu.box.includes(MARS[civ]), 'menú explica continuidad y bono: ' + menu.box);
    assert.ok(r.bonus.some(w => w.includes(MARS[civ])) && r.bonus.some(w => /Edad III/.test(w)) && r.bonus.some(w => /Colonial/.test(w)) && r.bonus.some(w => /tecnologías/.test(w)), 'bono por Maravilla, Edad, techs y rama: ' + r.bonus.join(' | '));
    assert.ok(!/Lancero|Arquero|Jinete|bronce/i.test(r.rec + r.bld) || civ === 'ter' && !/Arquero|Jinete|bronce/i.test(r.rec + r.bld), 'sin soldados humanos ni bronce en reclutar/construir: ' + r.rec);
    assert.ok(r.rec.includes(r.jin.split(' ')[0].slice(0, 5)) || r.rec.toLowerCase().includes(r.jin.split(' ')[0].toLowerCase().slice(0, 5)), 'tropa de choque según la especie');
    assert.ok(r.cap >= 36 + 6, 'tope con bono de Edad III');
    await ctx.close();
  }

  // 2) sin linaje: selector de especie; linaje solo de la Era 2
  { const { ctx, p } = await page(url + '?sinarte', [() => { localStorage.removeItem('evo_lineage'); localStorage.removeItem('evo_save4_v1'); }]);
    const n = await p.evaluate(() => document.querySelectorAll('#spPick button').length); assert.strictEqual(n, 12, '12 especies para elegir');
    await p.click('#spPick button[data-sp="ave_carronera"]'); await p.click('#startBtn'); await p.waitForTimeout(150);
    const r = await p.evaluate(() => { const G = window.__e4.G; return { civ: G.civ, sp: G.sp, lin: G.lin, bonus: G.bonus.length, riv: G.civs.slice(1).map(c => c.cv) }; });
    console.log('sin linaje', JSON.stringify(r)); assert.ok(r.civ === 'ave' && r.sp === 'ave_carronera' && r.lin === null && r.bonus === 0 && !r.riv.includes('ave'));
    const r2 = await p.evaluate(() => { const E = window.__e4; localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 2, branch: 'foto', tier: 1, mutCount: 2, owned: [], seed: 'x', era2: { species: 'acu_anfibio', name: 'Anfibios', cls: 'acu', traits: [], tierra: true } })); E.newGame('E2'); return { civ: E.G.civ, sp: E.G.sp, amph: E.G.amph, bonus: E.G.bonus }; });
    console.log('linaje Era 2', JSON.stringify(r2)); assert.ok(r2.civ === 'acu' && r2.sp === 'acu_anfibio' && r2.amph === true && r2.bonus.some(w => /Fotosintético/.test(w)));
    await ctx.close(); }

  // 3) fin de partida
  { const { ctx, p } = await page(url + '?sinarte', [() => { localStorage.removeItem('evo_lineage'); localStorage.removeItem('evo_save4_v1'); }]);
    const r = await p.evaluate(() => { const E = window.__e4, out = {}; document.getElementById('menu').classList.remove('show');
      // tope de ejército
      E.setDiff(1); E.newGame('FIN-A', { civ: 'ins' }); E.setStarted(true); E.G.paused = true; let G = E.G, me = G.civs[0]; me.food = me.wood = 600; me.bronze = 400;
      const cap = E.armyCap(me); E.garr(me).n.lan = cap - E.units(me) + E.garr(me).n.lan; me.rcd = 0; out.capErr = E.recruit(0, 'lan'); E.build(0, 'cuartel'); out.cap2 = E.armyCap(me) - cap; me.rcd = 0; out.capOk = E.recruit(0, 'lan');
      out.aiCapLow = E.armyCap(G.civs[1]) < E.armyCap(me) - 12;
      // asedio: rival sin guarnición, ejército tuyo acampado al lado -> la barra baja y la capital cae
      E.setDiff(0); E.newGame('FIN-B', { civ: 'ter' }); E.setStarted(true); G = E.G; me = G.civs[0]; const t = G.civs[1]; E.garr(t).n = { lan: 0, arq: 0, jin: 0 }; t.lost = 0;
      const a = E.mkArmy(0, t.x + 15, t.y, { lan: 30, arq: 10 }, { morale: 80 }); a.prov = 999; const sg = [];   // acampado sobre la ciudad: si recluta a alguien, pelea con él
      for (let i = 0; i < 800 && t.alive; i++) { E.step(.05); if (i % 40 === 0) sg.push(Math.round(t.sg)); }
      out.sg = sg; out.fallen = !t.alive; out.taken = me.taken; out.vassal = t.vassal; out.over = G.over; out.win = G.win; out.how = G.how; out.lin = JSON.parse(localStorage.getItem('evo_lineage'));
      // rendición: rival que perdió muchos choques y quedó por debajo
      E.setDiff(1); E.newGame('FIN-C', { civ: 'acu' }); E.setStarted(true); G = E.G; me = G.civs[0]; G.t = 400; G.civs[1].lost = 6; E.garr(G.civs[1]).n = { lan: 3, arq: 0, jin: 0 }; E.garr(me).n.lan = 40;
      E.step(1.05); out.surr = { alive: G.civs[1].alive, vassal: G.civs[1].vassal, surr: G.stats.surr, log: G.log.find(l => /rinde/.test(l)) };
      // derrota: tu capital sitiada sin guarnición
      E.setDiff(0); E.newGame('FIN-D', { civ: 'ave' }); E.setStarted(true); G = E.G; me = G.civs[0]; E.garr(me).n = { lan: 0, arq: 0, jin: 0 }; const e = E.mkArmy(1, me.x + 30, me.y, { lan: 30 }, { morale: 90 }); e.prov = 999;
      for (let i = 0; i < 600 && !G.over; i++) E.step(.05); out.lose = { over: G.over, win: G.win, how: G.how, alive: me.alive, dlg: document.getElementById('dT').textContent };
      return out; });
    console.log('fin', JSON.stringify(r));
    assert.ok(/tope de ejército/.test(r.capErr || ''), 'tope de ejército: ' + r.capErr); assert.strictEqual(r.cap2, 12, 'el Cuartel sube el tope'); assert.strictEqual(r.capOk, null); assert.ok(r.aiCapLow, 'la IA de Normal tiene tope menor');
    assert.ok(r.sg[0] === 100 && r.sg[1] < 100 && r.sg[2] < r.sg[1], 'la barra de asedio baja: ' + r.sg); assert.ok(r.fallen && !r.vassal && r.taken === 1, 'la capital cae por asedio');
    assert.ok(r.over && r.win && r.how === 'conquista', 'victoria por tomar la capital (Fácil, 1 rival)'); assert.ok(r.lin.from === 4 && r.lin.era4 && r.lin.era4.civ === 'ter' && r.lin.era4.como === 'conquista');
    assert.ok(!r.surr.alive && r.surr.vassal && r.surr.surr === 1 && /tributo/.test(r.surr.log), 'rendición con tributo');
    assert.ok(r.lose.over && !r.lose.win && r.lose.how === 'capital' && !r.lose.alive && /capital cayó/.test(r.lose.dlg), 'derrota por asedio de tu capital');
    await ctx.close(); }

  // 4) partida vieja del Ciclo 4
  { const { ctx, p } = await page(url + '?sinarte', [f => { localStorage.removeItem('evo_lineage'); localStorage.setItem('evo_save4_v1', f); }, FIX]);
    const vis = await p.evaluate(() => document.getElementById('contBtn').style.display); assert.strictEqual(vis, 'block', 'la partida vieja aparece en «Continuar»');
    await p.click('#contBtn'); await p.waitForTimeout(200);
    const r = await p.evaluate(fx => { const E = window.__e4, G = E.G; G.paused = true; const out = { ver: G.ver, civ: G.civ, cvs: G.civs.map(c => c.cv), names: G.civs.map(c => c.name), t: Math.round(G.t), viv: G.civs.map(c => c.bld.vivienda), sg: G.civs.map(c => c.sg), wood: document.getElementById('nWood').textContent };
      E.restoreGame(JSON.parse(fx)); E.G.paused = true; for (let i = 0; i < 400; i++) E.step(.05); out.h1 = E.stateHash();   // el bucle real ya corrió unos cuadros desde «Continuar»: se compara desde el archivo
      E.restoreGame(JSON.parse(fx)); E.G.paused = true; for (let i = 0; i < 400; i++) E.step(.05); out.h2 = E.stateHash(); out.nan = /NaN/.test(E.snapshot()); return out; }, FIX);
    console.log('partida vieja', JSON.stringify(r));
    assert.ok(r.ver === 2 && r.civ === 'ter' && r.cvs[0] === 'ter' && r.cvs.slice(1).every(c => c && c !== 'ter') && r.t >= 303 && r.t < 320, 'migrada a Terrestres'); assert.ok(r.viv.every(v => v === 0) && r.sg.every(v => v === 100) && r.wood === 'madera');
    assert.strictEqual(r.h1, r.h2, 'partida vieja migrada: determinista'); assert.ok(!r.nan);
    await ctx.close(); }

  // 5) linaje Era 1 -> Era 3 conserva la rama; Era 3 -> Era 4 -> salida conserva todo
  let l3out = null;
  { const { ctx, p } = await page(url3, [() => { localStorage.setItem('evo_tut3', 'done'); localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 1, branch: 'foto', tier: 2, mutCount: 7, owned: [], seed: 'L1' })); }]);
    const l = await p.evaluate(() => { const E = window.__e3; const r = E.readLineage(); document.getElementById('startBtn').click(); E.forceWin(); return { read: r && r.branch, out: JSON.parse(localStorage.getItem('evo_lineage')) }; });
    l3out = l.out; console.log('Era 1 -> 3', JSON.stringify({ read: l.read, from: l.out.from, branch: l.out.branch, tier: l.out.tier, era3: l.out.era3 && l.out.era3.civ }));
    assert.ok(l.read === 'foto' && l.out.from === 3 && l.out.branch === 'foto' && l.out.tier === 2 && l.out.mutCount === 7 && l.out.era3 && l.out.era3.civ, 'la rama de la Era 1 llega a la Era 3 y sale en era3');
    await ctx.close(); }
  { const { ctx, p } = await page(url + '?sinarte', [l => { if (!localStorage.getItem('evo_lineage') || /"from":3/.test(localStorage.getItem('evo_lineage'))) localStorage.setItem('evo_lineage', l); }, JSON.stringify(l3out)]);
    const l4 = await p.evaluate(() => { const E = window.__e4, r = E.readLineage(); E.setDiff(0); E.newGame('L4'); E.setStarted(true); E.G.paused = true; E.G.civs[1].alive = false; E.step(.05); return { r: { civ: E.linCiv(r).civ, branch: r.branch }, civ: E.G.civ, out: JSON.parse(localStorage.getItem('evo_lineage')) }; });
    console.log('Era 3 -> 4', JSON.stringify({ r: l4.r, civ: l4.civ, branch: l4.out.branch, era3: l4.out.era3 && l4.out.era3.civ, era4: l4.out.era4 }));
    assert.ok(l4.r.branch === 'foto' && l4.civ === l4.r.civ && l4.out.from === 4 && l4.out.branch === 'foto' && l4.out.tier === 2 && l4.out.era3.civ === l4.civ && Array.isArray(l4.out.era3.techs) && l4.out.era4.civ === l4.civ, 'from:4 conserva rama, nivel y era3');
    const again = await p.evaluate(() => { const E = window.__e4; E.newGame('L5'); return E.G.civ; }); assert.strictEqual(again, l4.civ, 'rejugar la Era 4 sigue con tu civilización');
    await ctx.close(); }

  // 6) arte: carga con manifest; ?sinarte no carga nada
  { const { ctx, p } = await page(url, [l => { localStorage.setItem('evo_lineage', l); }, lin3('ins', 'ins_enjambre', 'La Reina Madre')]);
    await p.click('#startBtn'); await p.waitForTimeout(1200);
    const a = await p.evaluate(() => { const E = window.__e4; return { hab: !!E.art('hab.ins_enjambre'), cor: !!E.art('ins.corazon.1'), suelo: E.art('ins.terreno.suelo'), ico: document.getElementById('iWood').classList.contains('on'), noart: E.NOART, imgs: performance.getEntriesByType('resource').filter(r => /art\/era3\/.*\.png/.test(r.name)).length }; });
    console.log('arte', JSON.stringify(a)); assert.ok(a.hab && a.cor && a.ico && !a.noart, 'dibujos de art/era3 cargados'); assert.strictEqual(a.suelo, null, 'ins.terreno.suelo no existe: fallback');
    await p.goto(url + '?sinarte'); await p.click('#startBtn'); await p.waitForTimeout(600);
    const s = await p.evaluate(() => { const E = window.__e4; return { noart: E.NOART, hab: E.art('hab.ins_enjambre'), imgs: performance.getEntriesByType('resource').filter(r => /art\/era3\/.*\.png/.test(r.name)).length, ico: document.getElementById('iWood').classList.contains('on'), px: (() => { try { document.getElementById('cv').getContext('2d').getImageData(10, 10, 1, 1); return 'ok'; } catch (e) { return e.name; } })() }; });
    console.log('sinarte', JSON.stringify(s)); assert.ok(s.noart && s.hab === null && !s.ico && s.px === 'ok', '?sinarte: sin imágenes y el lienzo se puede leer');
    await ctx.close(); }

  assert.strictEqual(errs.length, 0, 'sin errores de consola: ' + errs.join(' | '));
  console.log('CONTINUIDAD ERA 4 OK'); await b.close();
})();
