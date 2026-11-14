// ART GATE de la Era 2: hoja de contacto (12 especies x 6 estados, a 4x) para juzgar el arte antes/después.
// Uso: NODE_PATH=$(npm root -g) node tools/art-gate-era2.js antes   [commitBase]   -> docs/artgate/antes.png
//      NODE_PATH=$(npm root -g) node tools/art-gate-era2.js despues                  -> docs/artgate/despues.png
// «antes» NO sale del repo actual: se extrae `git show <commitBase>:eras/era2-animales.html` a una copia temporal (fuera del repo)
// y se le agrega un gancho `window.__dA = drawAnimal` solo en esa copia. El HTML viejo no conoce los estados nuevos
// (comer, atacar, descansar, morir): se muestran igual, sin animación, y eso es justamente lo que mide la hoja.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const which = process.argv[2] === 'antes' ? 'antes' : 'despues', base = process.argv[3] || '1bd2b9d3';
  let html = path.join(ROOT, 'eras/era2-animales.html');
  if (which === 'antes') {
    const t = fs.mkdtempSync(path.join(os.tmpdir(), 'era2-antes-')); html = path.join(t, 'era2-animales.html');
    fs.writeFileSync(html, execSync('git show ' + base + ':eras/era2-animales.html', { cwd: ROOT, maxBuffer: 1 << 26 }).toString().replace('window.__e2 = {', 'window.__dA = drawAnimal; window.__e2 = {'));
  }
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + html); await p.waitForTimeout(300);
  const url = await p.evaluate(() => {
    const E = window.__e2, dA = window.__dA || E.drawAnimal, keys = Object.keys(E.SP2);
    const STATES = [['caminar', { st: 'move', mv: 1 }], ['comer', { st: 'eat', mv: 0 }], ['atacar', { st: 'hunt', mv: 1, lunge: .8 }], ['descansar', { st: 'rest', mv: 0 }], ['herido', { st: 'move', mv: 0, flash: .1 }], ['muerto', { st: 'dead', mv: 0, dead: .55 }]];
    const BG = { ter: '#b4cf86', ins: '#6aa456', acu: '#7cc0e4', ave: '#cfe3ee' }, CW = 240, LW = 150, EX = 2;
    const cv = document.createElement('canvas'), n = keys.length; cv.width = LW + (STATES.length + EX) * CW; cv.height = 40 + n * CW; const x = cv.getContext('2d');
    x.fillStyle = '#1d1a24'; x.fillRect(0, 0, cv.width, cv.height); x.font = '700 15px sans-serif'; x.fillStyle = '#fff'; x.textBaseline = 'middle';
    const heads = STATES.map(s => s[0]).concat(['juego 1x', '12 px (x4)']); heads.forEach((h, i) => x.fillText(h, LW + i * CW + 10, 20));
    keys.forEach((k, ri) => {
      const d = E.SP2[k], sp = Object.assign({ key: k, traits: [], vars: {} }, d), y0 = 40 + ri * CW;
      x.fillStyle = '#fff'; x.font = '700 14px sans-serif'; x.fillText(k, 8, y0 + 18); x.font = '12px sans-serif'; x.fillText(d.n.slice(0, 22), 8, y0 + 38); x.fillText('r=' + d.r, 8, y0 + 56);
      STATES.forEach(([nm, o], ci) => {
        const x0 = LW + ci * CW; x.fillStyle = k === 'acu_anfibio' ? '#7fb08a' : BG[d.cls]; x.fillRect(x0 + 2, y0 + 2, CW - 4, CW - 4);
        const oo = Object.assign({ px: x0 + CW / 2, py: y0 + CW / 2, a: 0, s: 3.6, tt: .31 + ci * .07, ph: 0, mv: 0, flash: 0, cloth: false, traits: [], vars: {} }, o);
        if (window.__dA && nm === 'muerto') { x.save(); x.fillStyle = 'rgba(0,0,0,.55)'; x.font = '12px sans-serif'; x.fillText('(no existía)', x0 + 70, y0 + CW / 2); x.restore(); return; }
        dA(x, sp, oo);
      });
      // juego 1x: tamaño real en pantalla (r*1.4), nativo
      let x0 = LW + STATES.length * CW; x.fillStyle = k === 'acu_anfibio' ? '#7fb08a' : BG[d.cls]; x.fillRect(x0 + 2, y0 + 2, CW - 4, CW - 4);
      dA(x, sp, { px: x0 + 60, py: y0 + 60, a: 0, s: 1.4, tt: .3, ph: 0, mv: 1, st: 'move', flash: 0, traits: [], vars: {} });
      dA(x, sp, { px: x0 + 150, py: y0 + 60, a: .8, s: 1.4, tt: .6, ph: 0, mv: 0, st: 'idle', flash: 0, traits: [], vars: {} });
      dA(x, sp, { px: x0 + 60, py: y0 + 150, a: -.5, s: 1.4, tt: 1, ph: 1, mv: 1, st: 'move', flash: 0, traits: [], vars: {} });
      dA(x, sp, { px: x0 + 150, py: y0 + 150, a: Math.PI, s: 1.4, tt: 1.3, ph: 2, mv: 1, st: 'move', flash: 0, traits: [], vars: {} });
      // 12 px de largo, ampliado x4 sin suavizar
      x0 += CW; x.fillStyle = k === 'acu_anfibio' ? '#7fb08a' : BG[d.cls]; x.fillRect(x0 + 2, y0 + 2, CW - 4, CW - 4);
      const small = document.createElement('canvas'); small.width = small.height = 40; const sx = small.getContext('2d'); sx.fillStyle = k === 'acu_anfibio' ? '#7fb08a' : BG[d.cls]; sx.fillRect(0, 0, 40, 40);
      dA(sx, sp, { px: 20, py: 20, a: 0, s: 12 / (2.3 * d.r), tt: .3, ph: 0, mv: 1, st: 'move', flash: 0, traits: [], vars: {} });
      x.imageSmoothingEnabled = false; x.drawImage(small, x0 + 40, y0 + 40, 160, 160);
    });
    return cv.toDataURL('image/png');
  });
  const out = path.join(ROOT, 'docs/artgate', which + '.png'); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log('hoja:', out, 'errores:', errs.length, errs.slice(0, 3)); await b.close();
})();
