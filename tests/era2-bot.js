// Bot de la Era 2: juega ~10 minutos de partida (pasos de 0,05 s) usando los botones y las habilidades; falla si hay errores de consola o NaN.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-bot.js [minutos=10] [dificultad=1] [clase=ter] [spec=ter_cazador]
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
(async () => {
  const MIN = +process.argv[2] || 10, DIFF = process.argv[3] === undefined ? 1 : +process.argv[3], CLS = process.argv[4] || 'ter', SPEC = process.argv[5] || 'ter_cazador';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../eras/era2-animales.html')); await p.waitForTimeout(300);
  await p.evaluate(([c, s, d]) => { const E = window.__e2; E.cls = c; E.specKey = s; E.diffI = d; }, [CLS, SPEC, DIFF]);
  await p.click('#startBtn'); await p.waitForTimeout(200);
  await p.evaluate(() => { window.__e2.G.paused = true; }); // el bucle real queda quieto: el bot avanza con step()
  const click = async sel => { if (await p.isVisible('#dlg') && sel !== '#dBtns button') await p.click('#dBtns button'); await p.click(sel); };
  const used = { evo: 0, nest: 0, lay: 0, travel: 0, build: 0, save: 0, cont: 0 };
  const total = MIN * 60 / 5; const log = []; let games = 1; const combos = [['ter', 'ter_cazador'], ['ave', 'ave_rapaz'], ['acu', 'acu_anfibio'], ['ins', 'ins_colmena'], ['ter', 'ter_gigante']];
  for (let i = 0; i < total; i++) {
    await p.evaluate(() => { const E = window.__e2; for (let k = 0; k < 100; k++) { E.G.modal = false; E.step(.05); if (E.G.over) break; } });
    const st = await p.evaluate(() => {
      const E = window.__e2, G = E.G;
      return { over: G.over, pop: E.stats().pop, pend: G.pending, nests: G.N.length, phase: G.phase, t: Math.round(G.t), biome: G.biomeKey, hasBoss: G.A.some(a => a.sp.boss), foes: G.A.filter(a => a.sp.team !== 'player' && a.sp.diet !== 'herb').length, bad: G.A.some(a => !isFinite(a.x) || !isFinite(a.y) || !isFinite(a.hp) || !isFinite(a.hunger)) };
    });
    assert.ok(!st.bad, 'NaN en un animal');
    if (st.over) { // ganó o perdió: se vuelve al inicio y se juega otra especie hasta completar el tiempo pedido
      log.push('fin de la partida ' + games + ' en t=' + st.t + ', fase ' + st.phase);
      await p.click('#dBtns button'); const cb = combos[games % combos.length]; games++;
      await p.evaluate(([c, s, d]) => { const E = window.__e2; E.cls = c; E.specKey = s; E.diffI = d; }, [cb[0], cb[1], DIFF]);
      await p.click('#startBtn'); await p.evaluate(() => { window.__e2.G.paused = true; }); continue;
    }
    if (i % 12 === 0) log.push(JSON.stringify(st));
    if (await p.isVisible('#dlg')) await p.click('#dBtns button'); // despertar de la especie, etc.
    await p.evaluate(() => { window.__e2.G.paused = false; });
    if (st.pend > 0) { await click('#bEvo'); const o = await p.$$('#offers .offer'); if (o.length) { await o[Math.floor(Math.random() * o.length)].click(); used.evo++; } }
    if (st.nests < 2 && st.t > 20) { await p.evaluate(() => window.__e2.placeNest({ x: 150 + Math.random() * 100, y: 300 + Math.random() * 60 })); used.nest++; }
    await click('#bLay'); used.lay++;
    if (st.foes > 3 || st.hasBoss) { await p.keyboard.press('1'); await p.keyboard.press('4'); }
    if (i % 4 === 0) { const k = 1 + Math.floor(Math.random() * 5); if (k === 5) { await p.keyboard.press('5'); await p.mouse.click(500 + Math.random() * 300, 200 + Math.random() * 200); } else await p.keyboard.press(String(k)); }
    if (st.hasBoss) await click('#bGat');
    if (st.pop >= 8 && st.phase === 1 && i % 20 === 5) {
      const r = await p.evaluate(() => { const E = window.__e2; const k = Object.keys(E.BIOMES).find(q => q !== E.G.biomeKey && !E.colonized()[q] && (q !== 'oceano' || ['water', 'amph', 'fly'].includes(E.G.me.hab))); if (!k) return 0; E.openPlanet(); E.travel(k); return 1; });
      used.travel += r;
    }
    if (st.phase === 2) {
      await p.evaluate(() => {
        const E = window.__e2, G = E.G; G.trad += 3;
        for (const [k, n] of [['fogata', 1], ['refugio', 3], ['corral', 1], ['totem', 1]]) if (E.bdone(k).length < n && !G.bB && !G.nestB) { E.placeBuilding(k, { x: 200 + Math.random() * 120, y: 380 + Math.random() * 80 }); break; }
      });
      used.build++;
    }
    if (i % 20 === 10) { await click('#bSave'); used.save++; }
    await p.evaluate(() => { window.__e2.G.paused = true; });
  }
  // guardado/continuar: recargar y continuar
  const ok = await p.evaluate(() => { const E = window.__e2; E.G.paused = false; return E.G.over ? false : E.saveGame(true); });
  if (ok) {
    await p.reload(); await p.waitForTimeout(300);
    const vis = await p.isVisible('#contBtn'); assert.ok(vis, 'botón Continuar visible');
    await p.click('#contBtn'); await p.waitForTimeout(500);
    used.cont = await p.evaluate(() => (window.__e2.G && window.__e2.G.t > 0 ? 1 : 0));
  }
  const fin = await p.evaluate(() => { const G = window.__e2.G; return { t: Math.round(G.t), pop: window.__e2.stats().pop, evos: G.evos, kills: G.kills, over: G.over, phase: G.phase, colonized: Object.keys(window.__e2.colonized()) }; });
  console.log(log.join('\n')); console.log('partidas jugadas', games, 'usado', JSON.stringify(used)); console.log('final', JSON.stringify(fin), 'errores', errs.slice(0, 5));
  assert.strictEqual(errs.length, 0, 'sin errores de consola'); console.log('BOT ERA 2 OK'); await b.close();
})();
