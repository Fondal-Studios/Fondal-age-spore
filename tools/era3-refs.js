// Captura las 12 especies de la Era 2 (Era2Arte.drawAnimal, de lado mirando a la derecha, sin rasgos ni cinta)
// sobre magenta #FF00FF a 1024x1024: referencias @ref para Runway (docs/ARTE-RUNWAY-ERA3.md §3.4).
// Uso: NODE_PATH=$(npm root -g) node tools/era3-refs.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SP = ['ter_cazador', 'ter_gigante', 'ter_ingeniero', 'ins_colmena', 'ins_enjambre', 'ins_parasito', 'acu_abisal', 'acu_arrecife', 'acu_anfibio', 'ave_rapaz', 'ave_carronera', 'ave_migratoria'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../eras/era3-tribus.html')); await p.waitForTimeout(300);
  const out = path.resolve(__dirname, '../art/runway/era3/_ref'); fs.mkdirSync(out, { recursive: true });
  for (const k of SP) {
    const url = await p.evaluate(k => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
      x.fillStyle = '#FF00FF'; x.fillRect(0, 0, 1024, 1024); const sp = window.__e3.art.spObj(k, [], {});
      const s = 440 / (sp.r * 2.6); window.Era2Arte.drawAnimal(x, sp, { px: 512, py: 540, a: 0, s, tt: 0, ph: 0, mv: false, st: 'idle', traits: [], vars: {} });
      return c.toDataURL('image/png'); }, k);
    fs.writeFileSync(path.join(out, k + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log(k);
  }
  await b.close();
})();
