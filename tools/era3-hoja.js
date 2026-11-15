// Hoja comparativa antes/después de la Era 3 (Ciclo 4): docs/ciclo4/era3/hoja-d.png (escritorio) y hoja-m.png (móvil).
// Uso: NODE_PATH=$(npm root -g) node tools/era3-hoja.js   (lee docs/ciclo4/era3/antes-*.png y despues-*.png)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const D = path.resolve(__dirname, '../docs/ciclo4/era3'); const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
(async () => {
  const browser = await chromium.launch(); const p = await browser.newPage();
  for (const vp of ['d', 'm']) {
    const scenes = fs.readdirSync(D).filter(f => f.startsWith('despues-') && f.endsWith('-' + vp + '.png')).sort().filter(f => fs.existsSync(path.join(D, f.replace('despues-', 'antes-'))));
    const data = scenes.map(f => ({ n: f.replace('despues-', '').replace('-' + vp + '.png', ''), a: b64(path.join(D, f.replace('despues-', 'antes-'))), d: b64(path.join(D, f)) }));
    const url = await p.evaluate(async ([data, vp]) => {
      const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; }); const imgs = []; for (const s of data) imgs.push([await load(s.a), await load(s.d)]);
      const desk = vp === 'd', CW = desk ? 640 : 200, CH = desk ? 400 : 410, G = 10, HD = 28, cv = document.createElement('canvas'), x = cv.getContext('2d');
      if (desk) { cv.width = CW * 2 + G * 3; cv.height = HD + data.length * (CH + HD) + G; } else { cv.width = data.length * (CW + G) + G; cv.height = HD + 2 * (CH + HD) + G; }
      x.fillStyle = '#1d1a24'; x.fillRect(0, 0, cv.width, cv.height); x.font = '700 16px sans-serif'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
      const put = (im, px, py) => { const k = Math.min(CW / im.width, CH / im.height), w = im.width * k, h = im.height * k; x.imageSmoothingQuality = 'high'; x.drawImage(im, px + (CW - w) / 2, py + (CH - h) / 2, w, h); };
      if (desk) { x.fillText('ERA 3 · escritorio 1280x800 · ANTES (izquierda) / DESPUÉS (derecha)', G, 14); data.forEach((s, i) => { const y = HD + i * (CH + HD); x.fillStyle = '#ffd23a'; x.fillText(s.n, G, y + 6); x.fillStyle = '#2c3a30'; x.fillRect(G, y + 14, CW, CH); x.fillRect(CW + 2 * G, y + 14, CW, CH); put(imgs[i][0], G, y + 14); put(imgs[i][1], CW + 2 * G, y + 14); x.fillStyle = '#fff'; }); }
      else { x.fillText('ERA 3 · móvil 390x800 · ANTES (arriba) / DESPUÉS (abajo)', G, 14); data.forEach((s, i) => { const px = G + i * (CW + G); x.fillStyle = '#ffd23a'; x.font = '700 12px sans-serif'; x.fillText(s.n.slice(0, 22), px, HD + 6); x.fillStyle = '#2c3a30'; x.fillRect(px, HD + 14, CW, CH); put(imgs[i][0], px, HD + 14); x.fillRect(px, HD + 14 + CH + 14, CW, CH); put(imgs[i][1], px, HD + 14 + CH + 14); }); }
      return cv.toDataURL('image/png');
    }, [data, vp]);
    const out = path.join(D, 'hoja-' + vp + '.png'); fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(out, data.length + ' escenas');
  }
  await browser.close();
})();
