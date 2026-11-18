const { chromium } = require('playwright'); const B = 'file:///home/user/Fondal-age-spore/eras/';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const L = () => p.evaluate(() => JSON.parse(localStorage.getItem('evo_lineage') || 'null'));
  await p.goto(B + 'era1-celula.html'); await p.evaluate(() => { const E = window.__e1; E.newGame(0, 1, 'LIN'); E.setStarted(true); const T = E.S.teams[0]; T.branch = 'foto'; T.mutCount = 7; E.saveLineage && E.saveLineage(); });
  const l1 = await L(); console.log('tras Era 1:', JSON.stringify(l1));
  await p.goto(B + 'era2-animales.html'); await p.waitForTimeout(300);
  const e2 = await p.evaluate(() => { const E = window.__e2; return { cls: E.cls, specKey: E.specKey, linTxt: (document.getElementById('linBox') || document.body).textContent.slice(0, 160) }; });
  console.log('Era 2 lee:', JSON.stringify(e2));
  await p.evaluate(() => { const E = window.__e2; E.cls = 'acu'; E.specKey = 'acu_arrecife'; E.newGame('pradera', null, 'LIN2'); E.setStarted(true); if (E.forceWin) E.forceWin(); });
  await p.waitForTimeout(500); const l2 = await L(); console.log('tras Era 2:', JSON.stringify(l2 && { from: l2.from, branch: l2.branch, era2: l2.era2 && { species: l2.era2.species, cls: l2.era2.cls, tierra: l2.era2.tierra, traits: (l2.era2.traits || []).length } }));
  await p.goto(B + 'era3-tribus.html'); await p.waitForTimeout(300); await p.click('#startBtn'); await p.waitForTimeout(300);
  const e3 = await p.evaluate(() => { const X = window.__e3.G.x3; return { civ: X.civ, sp: X.sp, amph: X.amph, traits: (X.traits || []).length }; }); console.log('Era 3 arranca con:', JSON.stringify(e3));
  await p.evaluate(() => { const E = window.__e3; E.forceWin && E.forceWin(); }); await p.waitForTimeout(300); const l3 = await L(); console.log('tras Era 3:', JSON.stringify(l3 && { from: l3.from, era3: l3.era3, city: l3.city, species: l3.species }));
  await p.goto(B + 'era4-civilizaciones.html'); await p.waitForTimeout(300);
  const e4 = await p.evaluate(() => ({ lin: window.__e4.readLineage(), box: document.getElementById('linBox').textContent.slice(0, 200) })); console.log('Era 4 lee:', JSON.stringify(e4));
  await b.close();
})();
