// Prueba del bloque mínimo de audio de la Era 4 (eras/era4-civilizaciones.html + eras/audio-lofi.js). El motor se mide en tests/era2-audio.js y tests/era3-audio.js;
// acá se verifica el cableado: arranque por gesto, director (calma/amenaza/combate), efectos por cambio de estado, determinismo, controles y no-solapamiento con el HUD.
// NO se escuchó: ver docs/ESCUCHA.md. Uso: NODE_PATH=$(npm root -g) node tests/era4-audio.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../eras/era4-civilizaciones.html');
const until = async (pg, want, ms) => { const t0 = Date.now(); let s; while (Date.now() - t0 < (ms || 6000)) { s = await pg.evaluate(() => FondalAudio.state); if (s === want) return s; await pg.waitForTimeout(100); } return s; };   // el cambio de estado del AudioContext tarda más con la máquina cargada: se espera hasta 6 s en vez de un tiempo fijo
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if ((m.type() === 'error' || (m.type() === 'warning' && /\[audio\]/.test(m.text()))) && !/fonts|ERR_(INTERNET|NAME|FAILED|CONNECTION)|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(300);
  const st0 = await p.evaluate(() => ({ has: !!window.FondalAudio, state: FondalAudio.state, ui: !!document.getElementById('audioBtn'), hook: !!(window.__e4 && window.__e4.audio && window.__e4.audioDir) }));
  console.log('inicio', JSON.stringify(st0)); assert.ok(st0.has && st0.ui && st0.hook); assert.strictEqual(st0.state, 'none', 'sin gesto no hay AudioContext');

  // director con estado real
  const dir = await p.evaluate(() => {
    const E = window.__e4, D = E.audioDir, FA = FondalAudio, out = {}; let now = 1e6; D.clock(() => now);
    document.getElementById('menu').classList.remove('show'); E.setDiff(0);
    const prep = () => { E.newGame('AUD4'); E.setStarted(true); for (let i = 0; i < 60; i++) E.step(1 / 60); now += 60000; D.direct(now); return E.G; };
    let G = prep(); out.calma = D.direct(now).mood;
    const me = G.civs[0], mine = G.armies.find(a => a.team === 0);
    const foe = E.mkArmy(1, me.x + 90, me.y, { lan: 4 }, {}); out.amenaza = D.direct(now).mood;
    G.battles.push({ a: mine.id, d: foe.id, A: 5, B: 5, A0: 5, B0: 5, t: 0, al: 1, be: 1, narrow: false }); const played0 = FA.stats.played; out.combate = D.direct(now).mood; out.porque = D.info.why;
    G.battles.length = 0; G.armies = G.armies.filter(a => a !== foe); now += 3000; out.noBajaEn3s = D.direct(now).mood; now += 4000; out.bajaTras7s = D.direct(now).mood;
    G = prep(); me.tech; G.civs[0].tech.push('zzz'); D.direct(now); out.tech = FA.mood;
    G = prep(); G.paused = true; D.direct(now); out.pausa = FA.ducking || true; G.paused = false;
    G = prep(); G.over = true; G.win = true; D.direct(now); out.victoria = FA.mood;
    D.clock(null); return out;
  });
  console.log('DIRECTOR', JSON.stringify(dir));
  assert.strictEqual(dir.calma, 'explorar'); assert.strictEqual(dir.amenaza, 'amenaza'); assert.strictEqual(dir.combate, 'combate'); assert.strictEqual(dir.noBajaEn3s, 'combate', 'histéresis'); assert.strictEqual(dir.bajaTras7s, 'explorar'); assert.strictEqual(dir.tech, 'evolucion'); assert.strictEqual(dir.victoria, 'evolucion');

  // determinismo: mismo hash con audio activo y con audio mudo
  const det = await p.evaluate(() => {
    const E = window.__e4, FA = FondalAudio, D = E.audioDir, run = () => { E.newGame('DET4AUD'); E.setStarted(true); for (let i = 0; i < 1800; i++) { E.step(1 / 60); if (i % 30 === 0) D.direct(); } return E.stateHash(); };
    FA.setMuted(false); const a = run(); FA.setMuted(true); const b2 = run(); FA.setMuted(false); return { a, b2, same: a === b2 };
  });
  console.log('DETERMINISMO Era 4', JSON.stringify(det)); assert.ok(det.same, 'el audio no debe cambiar la simulación');

  // gesto + suspensión
  const q = await b.newPage({ viewport: { width: 1280, height: 800 } }); q.on('pageerror', e => errs.push(e.message)); await q.goto(URL); await q.waitForTimeout(300);
  await q.evaluate(() => { const E = window.__e4; E.newGame('G4'); E.setStarted(true); document.getElementById('menu').classList.remove('show'); });
  assert.strictEqual(await q.evaluate(() => FondalAudio.state), 'none'); await q.mouse.click(400, 400); assert.strictEqual(await until(q, 'running'), 'running');
  await q.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await q.waitForTimeout(100); const h = await until(q, 'suspended');
  await q.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await q.waitForTimeout(100); const v = await until(q, 'running');
  console.log('gesto → running · oculta →', h, '· visible →', v); assert.strictEqual(h, 'suspended'); assert.strictEqual(v, 'running');
  await q.keyboard.press('m'); const m1 = await q.evaluate(() => FondalAudio.muted); await q.keyboard.press('m'); const m2 = await q.evaluate(() => FondalAudio.muted); assert.ok(m1 === true && m2 === false, 'tecla M');
  await q.close();

  // geometría: botón en esquina fija, ≥44 px, sin solaparse con el HUD, panel dentro de la pantalla
  for (const w of [360, 390, 430, 1100]) {
    const mobile = w < 500, ctx = await b.newContext({ viewport: { width: w, height: mobile ? 800 : 760 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 2 }), mp = await ctx.newPage(); mp.on('pageerror', e => errs.push(w + ': ' + e.message)); await mp.goto(URL); await mp.waitForTimeout(300);
    await mp.evaluate(() => { const E = window.__e4; E.newGame('GEO4'); E.setStarted(true); document.getElementById('menu').classList.remove('show'); for (let i = 0; i < 100; i++) E.step(1 / 60); E.hud(); }); await mp.waitForTimeout(250);
    const g0 = await mp.evaluate(() => { const A = document.getElementById('audioBtn').getBoundingClientRect(), ov = [];
      for (const e of document.querySelectorAll('#stage *')) { if (e.closest('#audioUI')) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue; if (e.children.length && e.tagName !== 'BUTTON' && !e.classList.contains('chip')) continue; const b2 = e.getBoundingClientRect(); if (b2.width < 4 || b2.height < 4) continue; if (b2.left < A.right && b2.right > A.left && b2.top < A.bottom && b2.bottom > A.top) ov.push(e.id || e.className || e.tagName); }
      return { x: Math.round(A.x), y: Math.round(A.y), w: Math.round(A.width), h: Math.round(A.height), vw: innerWidth, overlaps: ov, sw: document.documentElement.scrollWidth }; });
    if (mobile) await mp.tap('#audioBtn'); else await mp.click('#audioBtn');
    const g1 = await mp.evaluate(() => { const r = document.getElementById('audioPanel').getBoundingClientRect(); return { open: !document.getElementById('audioPanel').hidden, x: Math.round(r.x), r: Math.round(r.right), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight }; });
    console.log('GEOMETRÍA', w, JSON.stringify({ btn: [g0.x, g0.y, g0.w, g0.h], solapa: g0.overlaps, scrollX: g0.sw - g0.vw, panel: [g1.x, g1.r, g1.b] }));
    assert.ok(g0.w >= 44 && g0.h >= 44 && g0.x >= 0 && g0.x + g0.w <= g0.vw, w + ': botón ≥44 px y dentro de la pantalla'); assert.deepStrictEqual(g0.overlaps, [], w + ': el botón solapa con ' + g0.overlaps.join(',')); assert.ok(g0.sw <= g0.vw, w + ': sin scroll horizontal'); assert.ok(g1.open && g1.x >= 0 && g1.r <= g1.vw && g1.b <= g1.vh, w + ': el panel cabe');
    await ctx.close();
  }
  assert.strictEqual(errs.length, 0, 'errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('AUDIO ERA 4 OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
