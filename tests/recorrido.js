// Recorrido de punta a punta por la interfaz: final de la Era 4 → «Seguir a la Era 5» → menú con tu linaje → final → «Seguir a la Era 6» → epílogo → portada.
// Uso: NODE_PATH=$(npm root -g) node tests/recorrido.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const ok = n => console.log('  ok  ' + n);
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const F = f => 'file://' + path.resolve(__dirname, '..', f);
  await p.goto(F('eras/era4-civilizaciones.html')); await p.waitForTimeout(300);
  // linaje de las Eras 1 a 3 y una Era 4 ganada a la fuerza
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 3, branch: 'colo', tier: 2, mutCount: 11, species: 'Migratorias y polinizadoras', era2: { species: 'ave_migratoria', cls: 'ave' }, era3: { civ: 'ave', especie: 'ave_migratoria', edad: 3, techs: ['a'], maravilla: 'La Gran Ruta Migratoria', ciudad: 'La Bandada', path: 'mercado' } }));
    const E = window.__e4; E.setDiff(0); E.newGame('REC'); E.setStarted(true); E.G.paused = true; E.G.civs[1].alive = false; E.step(.05); });
  await p.waitForSelector('#dlg.show'); const b4 = await p.$$eval('#dBtns button', x => x.map(y => y.textContent)); assert.ok(b4.some(t => /Seguir a la Era 5/.test(t)), b4.join('|'));
  await Promise.all([p.waitForNavigation(), p.click('#dBtns button:has-text("Seguir a la Era 5")')]); assert.ok(/era5-industria\.html$/.test(p.url())); ok('Era 4 ganada → «Seguir a la Era 5»');
  await p.waitForTimeout(300); const m5 = await p.textContent('#linBox'); assert.ok(/Era 4/.test(m5) && /Migratorias/.test(m5) && /Aves/.test(m5), m5); ok('menú de la Era 5: «Venís de la Era 4» con tu especie (' + m5.slice(0, 80).replace(/\s+/g, ' ') + '…)');
  await p.click('#startBtn'); await p.waitForTimeout(300);
  const c5 = await p.evaluate(() => { const E = window.__e5; return { cv: E.G.civs[0].cv, sp: E.G.civs[0].sp, bonus: E.G.bonus }; }); assert.strictEqual(c5.cv, 'ave'); assert.strictEqual(c5.sp, 'ave_migratoria'); assert.ok(c5.bonus.length >= 2); ok('la Era 5 empieza con tus Aves y ' + c5.bonus.length + ' bonos explicados');
  await p.evaluate(() => { const E = window.__e5; E.pause(true); const c = E.G.civs[0]; for (let i = 0; i < 600; i++) { E.step(1); if (i % 16 === 0) E.aiThink(c); } E.end(0, 'arca'); E.ui(true); });
  await p.waitForSelector('#dlg.show'); await Promise.all([p.waitForNavigation(), p.click('#dBtns a:has-text("Seguir a la Era 6")')]); assert.ok(/era6-estrellas\.html$/.test(p.url())); ok('Era 5 ganada → «Seguir a la Era 6»');
  await p.waitForTimeout(300); const m6 = await p.textContent('#linBox'); assert.ok(/Era 5/.test(m6) && /Migratorias/.test(m6), m6); ok('menú de la Era 6: «Venís de la Era 5»');
  await p.click('#startBtn'); await p.waitForTimeout(300);
  await p.evaluate(() => { const E = window.__e6; E.pause(true); E.end(0, 'tipo2'); E.ui(true); }); await p.waitForSelector('#dlg.show');
  const epi = await p.textContent('#dB'); for (const k of ['Era 1', 'Colonial', 'Migratorias', 'La Bandada', 'Era 4', 'Kardashev', 'Tipo II']) assert.ok(epi.includes(k), 'epílogo sin «' + k + '»: ' + epi);
  assert.ok(/Jugaste las seis eras/.test(epi)); ok('epílogo con las seis eras: «' + epi.slice(0, 90) + '…»');
  await Promise.all([p.waitForNavigation(), p.click('#dBtns a')]); assert.ok(/index\.html#recorrido$/.test(p.url())); await p.waitForTimeout(300);
  const tl = await p.$$eval('#tl div.on', x => x.length), rec = await p.textContent('#recTxt'); assert.strictEqual(tl, 6, 'las 6 eras marcadas en el recorrido'); assert.ok(/1 vez/.test(rec), rec); ok('portada: recorrido con las 6 eras y «llegaste a las estrellas 1 vez»');
  assert.deepStrictEqual(errs, []); ok('sin errores de consola'); await b.close(); console.log('RECORRIDO OK');
})().catch(e => { console.error(e); process.exit(1); });
