// Prueba: el sonido gana capas con el nivel evolutivo (renderizado offline, sin audio real).
// Uso: NODE_PATH=$(npm root -g) node tests/sonido.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../eras/era1-celula.html')); await p.waitForTimeout(300);
  const r = await p.evaluate(async () => {
    const Snd = __e1.Snd, out = {};
    for (const br of ['pred', 'para', 'foto', 'colo']) for (const tier of [0, 1, 2, 3]) {
      let sum = 0; // promedio de 3 renders: las notas se eligen al azar
      for (let k = 0; k < 3; k++) {
        const oc = new OfflineAudioContext(1, 44100 * 10, 44100); Snd.attach(oc); Snd.setState(tier, br, false); Snd.schedule(10);
        const d = (await oc.startRendering()).getChannelData(0).slice(44100 * 5); let e = 0; for (let i = 0; i < d.length; i++) e += d[i] * d[i]; sum += Math.sqrt(e / d.length);
      }
      out[br + tier] = +(sum / 3).toFixed(4);
    } return out;
  });
  console.log(r);
  for (const br of ['pred', 'para', 'foto', 'colo']) { assert.ok(r[br + 3] > r[br + 0] * 1.25, br + ': el nivel 3 debe sonar con más capas que el 0'); assert.ok(r[br + 1] > r[br + 0] * 1.1, br + ': el nivel 1 suma el colchón'); }
  // Ciclo 4: persistencia unificada con las demás eras (evo_audio_v1) y suspensión en pestaña oculta (sin tocar el motor Snd)
  await p.evaluate(() => { localStorage.setItem('evo_audio_v1', JSON.stringify({ master: .4, music: .7, sfx: .85, amb: .7, mute: true, bm: { music: false, sfx: false, amb: false } })); localStorage.removeItem('evo_snd'); });
  await p.reload(); await p.waitForTimeout(300);
  const u = await p.evaluate(() => { const S = __e1.Snd, o = { muted0: S.muted, vol0: +S.volume.toFixed(3) }; S.toggle(); const d = JSON.parse(localStorage.getItem('evo_audio_v1')); o.muted1 = S.muted; o.saved = { mute: d.mute, master: d.master, music: d.music }; o.old = localStorage.getItem('evo_snd'); return o; });
  console.log('persistencia unificada', JSON.stringify(u));
  assert.ok(u.muted0 === true && Math.abs(u.vol0 - .5) < .01, 'Snd lee el silencio y el maestro de evo_audio_v1'); assert.ok(u.muted1 === false && u.saved.mute === false && Math.abs(u.saved.master - .4) < 1e-9 && Math.abs(u.saved.music - .7) < 1e-9 && u.old === '1', 'alternar escribe evo_audio_v1 sin pisar los demás volúmenes (y la clave vieja)');
  await p.mouse.click(400, 300); await p.waitForTimeout(500);
  const h = await p.evaluate(async () => { const S = __e1.Snd, o = { run: S.ctx && S.ctx.state }, until = async w => { const t0 = performance.now(); while (performance.now() - t0 < 6000 && S.ctx.state !== w) await new Promise(r => setTimeout(r, 100)); return S.ctx.state; }; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); o.hid = await until('suspended'); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); o.vis = await until('running'); return o; });   // se espera el cambio de estado hasta 6 s (con la máquina cargada tarda más que un tiempo fijo)
  console.log('gesto y pestaña oculta', JSON.stringify(h)); assert.strictEqual(h.run, 'running', 'el primer gesto crea y reanuda el contexto'); assert.strictEqual(h.hid, 'suspended', 'pestaña oculta => suspendido'); assert.strictEqual(h.vis, 'running');
  await p.evaluate(() => { localStorage.removeItem('evo_audio_v1'); localStorage.removeItem('evo_snd'); });
  assert.strictEqual(errs.length, 0); console.log('SONIDO OK'); await b.close();
})();
