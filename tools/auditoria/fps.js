const { chromium } = require('playwright'); const B = 'file:///home/user/Fondal-age-spore/eras/';
(async () => {
  const b = await chromium.launch();
  for (const [f, warm] of [['era1-celula.html', 'for(let i=0;i<120;i++)window.__e1.step(1);window.__e1.S.modal=false'], ['era2-animales.html', 'for(let i=0;i<300;i++)window.__e2.step(1)'], ['era3-tribus.html', 'for(let i=0;i<600;i++)window.__e3.step(.5)'], ['era4-civilizaciones.html', 'for(let i=0;i<300;i++)window.__e4.step(2)']]) {
    for (const [w, h, mob] of [[1280, 800, false], [390, 844, true]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob }); const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('evo_tut3', 'done'); } catch (_) {} });
      await p.goto(B + f); await p.waitForTimeout(400); await p.click('#startBtn').catch(() => {}); await p.waitForTimeout(400);
      await p.evaluate(warm).catch(e => console.log('warm', f, e.message.slice(0, 80)));
      const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
      console.log(f, mob ? 'móvil' : 'escritorio', fps.toFixed(1), 'fps'); await ctx.close();
    }
  }
  await b.close();
})();
