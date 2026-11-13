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
  assert.strictEqual(errs.length, 0); console.log('SONIDO OK'); await b.close();
})();
