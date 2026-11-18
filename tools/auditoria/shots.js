const { chromium } = require('playwright'); const B = 'file:///home/user/Fondal-age-spore/'; const O = process.argv[2];
(async () => {
  const b = await chromium.launch(); const log = [];
  for (const [w, h, mob, tag] of [[1280, 800, false, 'd'], [390, 844, true, 'm']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(B + 'index.html'); await p.waitForTimeout(600); await p.screenshot({ path: `${O}/index-${tag}.png`, fullPage: true });
    // Era 1
    await p.goto(B + 'eras/era1-celula.html'); await p.waitForTimeout(500); await p.screenshot({ path: `${O}/e1-menu-${tag}.png` });
    await p.click('#startBtn').catch(() => {}); await p.waitForTimeout(800); await p.screenshot({ path: `${O}/e1-inicio-${tag}.png` });
    await p.evaluate(() => { const E = window.__e1; for (let i = 0; i < 90; i++) E.step(1); E.S.modal = false; }); await p.waitForTimeout(400); await p.screenshot({ path: `${O}/e1-90s-${tag}.png` });
    // Era 2
    await p.goto(B + 'eras/era2-animales.html'); await p.waitForTimeout(500); await p.screenshot({ path: `${O}/e2-menu-${tag}.png` });
    await p.click('#startBtn').catch(() => {}); await p.waitForTimeout(800); await p.screenshot({ path: `${O}/e2-inicio-${tag}.png` });
    await p.evaluate(() => { const E = window.__e2; for (let i = 0; i < 180; i++) E.step(1); }); await p.waitForTimeout(400); await p.screenshot({ path: `${O}/e2-180s-${tag}.png` });
    // Era 3 (sin linaje → selector)
    await p.goto(B + 'eras/era3-tribus.html'); await p.waitForTimeout(500); await p.screenshot({ path: `${O}/e3-menu-${tag}.png` });
    await p.click('#startBtn').catch(() => {}); await p.waitForTimeout(800); await p.screenshot({ path: `${O}/e3-inicio-${tag}.png` });
    // Era 4
    await p.goto(B + 'eras/era4-civilizaciones.html'); await p.waitForTimeout(500); await p.screenshot({ path: `${O}/e4-menu-${tag}.png` });
    await p.click('#startBtn').catch(() => {}); await p.waitForTimeout(800); await p.screenshot({ path: `${O}/e4-inicio-${tag}.png` });
    await p.evaluate(() => { const E = window.__e4; for (let i = 0; i < 120; i++) E.step(1); }); await p.waitForTimeout(400); await p.screenshot({ path: `${O}/e4-120s-${tag}.png` });
    log.push(tag + ' errores: ' + JSON.stringify(errs.slice(0, 4))); await ctx.close();
  }
  console.log(log.join('\n')); await b.close();
})();
