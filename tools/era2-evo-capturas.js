// Capturas de legibilidad de la Era 2 (Ciclo 4, módulo Evolución y claridad): mismo escenario en dos versiones del juego.
// Uso: NODE_PATH=$(npm root -g) node tools/era2-evo-capturas.js <ruta del html> <carpeta de salida> <prefijo (antes|despues)>
// Escenario: Normal, cazadores de manada, semilla fija, 150 s simulados eligiendo siempre la primera evolución, la manada seleccionada no,
// pausa y captura del mapa (1280x800 y 390x800) y de la pantalla de evolución (1280x800).
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const html = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), pre = process.argv[4] || 'shot';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const [w, h, tag] of [[1280, 800, 'd'], [390, 800, 'm']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.addInitScript(() => { try { localStorage.setItem('evo_tut2', 'skip'); localStorage.removeItem('evo_save2_v1'); } catch (e) {} });
    await p.goto('file://' + html); await p.waitForTimeout(300);
    await p.evaluate(() => { const E = window.__e2; E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; });
    await p.click('#startBtn'); await p.waitForTimeout(200);
    await p.evaluate(() => {
      const E = window.__e2; E.newGame('pradera', null, 'CAPTURA-EVO'); const G = E.G; G.modal = false;
      for (let i = 0; i < 3000; i++) { E.step(.05); while (E.G.pending > 0) E.pickEvo(E.offers()[0]); if (i % 200 === 0) E.doLay(); if (i === 300) E.placeNest({ x: 200, y: 320 }); }
      document.querySelectorAll('.ov.show').forEach(o => o.classList.remove('show')); E.G.modal = false; E.G.paused = true;
    });
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(out, pre + '-mapa-' + tag + '-' + w + 'x' + h + '.png'), fullPage: tag === 'm' });
    if (tag === 'd') {
      await p.evaluate(() => { const E = window.__e2; E.G.paused = false; E.G.pending = 1; E.openEvo(); });
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(out, pre + '-evolucion-' + tag + '-' + w + 'x' + h + '.png') });
    }
    await p.close();
  }
  await b.close(); console.log('capturas en', out);
})();
