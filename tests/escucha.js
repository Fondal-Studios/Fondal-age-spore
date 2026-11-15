// Prueba de la página de escucha humana (eras/escucha.html): abre sin errores en Chromium y los botones de la Era 2 y de la Era 3 funcionan.
// NO sustituye la escucha: solo verifica que la herramienta anda. Uso: NODE_PATH=$(npm root -g) node tests/escucha.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../eras/escucha.html');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_(INTERNET|NAME|FAILED|CONNECTION)|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(300);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload(); await p.waitForTimeout(300);
  // Era 2 (por defecto): no cambió
  const e2 = await p.evaluate(() => ({ moods: document.querySelectorAll('#moods button').length, biomes: document.querySelectorAll('#biomes button').length, fx: document.querySelectorAll('#fx button').length, qs: document.querySelectorAll('#qs fieldset').length, work: document.getElementById('workBox').hidden, big: document.getElementById('bigBox').hidden }));
  console.log('Era 2', JSON.stringify(e2)); assert.deepStrictEqual(e2, { moods: 4, biomes: 5, fx: 28, qs: 12, work: true, big: true });
  await p.tap('#go'); await p.waitForTimeout(500); assert.strictEqual(await p.evaluate(() => FondalAudio.state), 'running', 'tras tocar «Activar sonido» el audio corre');
  await p.tap('#moods button:nth-child(3)'); await p.tap('#biomes button:nth-child(2)'); await p.tap('#fx button:nth-child(1)');
  // Era 3
  await p.evaluate(() => window.__escucha.setEra('3')); await p.waitForTimeout(200);
  const e3 = await p.evaluate(() => ({ moods: [...document.querySelectorAll('#moods button')].map(x => x.dataset.k), biomes: [...document.querySelectorAll('#biomes button')].map(x => x.dataset.k), fx: document.querySelectorAll('#fx button').length, qs: document.querySelectorAll('#qs fieldset').length, work: document.getElementById('workBox').hidden, big: document.getElementById('bigBox').hidden, era: window.__escucha.era, note: document.getElementById('eraNote').textContent }));
  console.log('Era 3', JSON.stringify(e3)); assert.deepStrictEqual(e3.moods, ['explorar', 'construccion', 'supervivencia', 'amenaza', 'combate', 'evolucion']); assert.ok(e3.biomes.includes('campamento') && e3.biomes.includes('campamento_frio')); assert.strictEqual(e3.qs, 20); assert.ok(e3.fx >= 40, 'efectos de la Era 3: ' + e3.fx); assert.ok(!e3.work && !e3.big);
  // cada botón nuevo
  const before = await p.evaluate(() => FondalAudio.stats.played);
  for (const sel of ['#moods button', '#biomes button']) { const n = await p.locator(sel).count(); for (let i = 0; i < n; i++) { await p.locator(sel).nth(i).click(); await p.waitForTimeout(30); } }
  const nfx = await p.locator('#fx button').count(); for (let i = 0; i < nfx; i++) { await p.locator('#fx button').nth(i).click(); await p.waitForTimeout(220); }
  const after = await p.evaluate(() => FondalAudio.stats.played); console.log('efectos tocados al recorrer los botones:', after - before, 'de', nfx);
  assert.ok(after - before >= nfx * .8, 'los botones de efectos suenan (' + (after - before) + ' de ' + nfx + ')');
  for (const v of ['.35', '.7', '1', '0']) { await p.locator('input[name=wk][value="' + v + '"]').check(); await p.waitForTimeout(40); const w = await p.evaluate(() => FondalAudio.work); assert.ok(Math.abs(w.chop - +v) < .001, 'trabajo al ' + v + ' (' + JSON.stringify(w) + ')'); }
  await p.locator('#tribeL').click(); await p.waitForTimeout(1200); const wl = await p.evaluate(() => FondalAudio.work); assert.ok(wl.chop > .5 && wl.gather > .5, 'tribu grande sube el trabajo: ' + JSON.stringify(wl)); await p.locator('#tribeS').click(); await p.waitForTimeout(600); const ws = await p.evaluate(() => FondalAudio.work); assert.ok(ws.chop <= wl.chop, 'tribu chica trabaja menos'); await p.locator('#duckB').click(); assert.ok(await p.evaluate(() => FondalAudio.ducking), 'el botón de ducking baja la música');
  // simulación guionada: arranca, avanza y se corta
  await p.locator('#sim60').click(); await p.waitForTimeout(1500); const sim = await p.evaluate(() => ({ now: document.querySelectorAll('#tl li.now').length, items: document.querySelectorAll('#tl li').length, w: FondalAudio.work })); console.log('simulación', JSON.stringify(sim)); assert.ok(sim.now === 1 && sim.items === 7);
  await p.locator('#simStop').click();
  // simulación larga: se verifica el guion sin esperar 5 min (se adelanta el reloj)
  const sc = await p.evaluate(() => { const S = window.__escucha.SCRIPT, ok = S.every((s, i) => i === 0 || s.t > S[i - 1].t) && S[S.length - 1].end === 1, moods = new Set(S.filter(s => s.m).map(s => s.m)); return { n: S.length, ok, moods: [...moods] }; });
  console.log('guion de 5 min', JSON.stringify(sc)); assert.ok(sc.ok && sc.moods.length >= 5, 'el guion recorre los ánimos y termina');
  // ficha
  await p.locator('input[name=mood_amenaza][value="4"]').check(); await p.fill('#who', 'prueba'); await p.locator('#gen').click(); const out = await p.evaluate(() => document.getElementById('out').textContent);
  assert.ok(/Era 3/.test(out) && /mood_amenaza|amenaza/.test(out) && /Promedio \(1 respuestas\): 4\.00/.test(out), 'la ficha menciona la Era 3 y el valor cargado'); assert.ok(/SOLO si esta ficha la completó una persona/.test(out), 'la ficha no declara aprobación');
  await p.reload(); await p.waitForTimeout(300); await p.evaluate(() => window.__escucha.setEra('3')); const dr = await p.evaluate(() => window.__escucha.collect().mood_amenaza); assert.strictEqual(dr, '4', 'el borrador de la Era 3 persiste por separado');
  await p.locator('#stopAll').click(); const bm = await p.evaluate(() => FondalAudio.busMuted); assert.ok(bm.music && bm.sfx && bm.amb, '«Parar todo» silencia las capas');
  // sin desbordes horizontales a 390 px
  const sw = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth })); assert.ok(sw.sw <= sw.vw, 'sin scroll horizontal a 390 px (' + sw.sw + ')');
  assert.strictEqual(errs.length, 0, 'errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('ESCUCHA.HTML OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
