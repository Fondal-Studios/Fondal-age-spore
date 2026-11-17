// Capturas de legibilidad de la Era 2 (Ciclo 4, módulo Evolución y claridad): mismo escenario en dos versiones del juego.
// Uso: NODE_PATH=$(npm root -g) node tools/era2-evo-capturas.js <ruta del html> <carpeta de salida> <prefijo (antes|despues)> [--todo]
// Escenario: Normal, cazadores de manada con 3 rasgos fijos (patas, garras, piel), semilla fija, 120 s simulados sin elegir evoluciones,
// pausa y captura del mapa (1280x800 y 390x800) y de la pantalla de evolución (1280x800).
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const html = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), pre = process.argv[4] || 'shot', todo = process.argv.includes('--todo');   // --todo: modo foco apagado (para comparar foco sí/no con el MISMO estado)
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const [w, h, tag] of [[1280, 800, 'd'], [390, 800, 'm']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.addInitScript(t => { try { localStorage.setItem('evo_tut2', 'skip'); localStorage.removeItem('evo_save2_v1'); localStorage.setItem('evo_foco2', t ? 'off' : 'on'); } catch (e) {} }, todo);
    await p.goto('file://' + html); await p.waitForTimeout(300);
    await p.evaluate(() => { const E = window.__e2; E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; });
    await p.click('#startBtn'); await p.waitForTimeout(200);
    await p.evaluate(() => {
      const E = window.__e2; E.newGame('pradera', null, 'CAPTURA-EVO'); const G = E.G; G.modal = false;
      E.G.me.traits.push('patas', 'garras', 'piel'); E.recalcSp(E.G.me);   // los mismos 3 rasgos en las dos versiones (sin elegir evoluciones: el estado no diverge por las ofertas)
      for (let i = 0; i < 2400; i++) { E.G.pending = 0; E.step(.05); if (i % 200 === 0) E.doLay(); if (i === 300) E.placeNest({ x: 200, y: 320 }); }
      document.querySelectorAll('.ov.show').forEach(o => o.classList.remove('show')); E.G.modal = false; E.G.paused = true; const mc = document.getElementById('metaCard'); if (mc) mc.click(); document.querySelectorAll('.toast').forEach(t => t.remove());
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
