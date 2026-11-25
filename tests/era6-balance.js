// Balance de la Era 6 con bots: el jugador lo maneja la misma IA (perfil elegible).
// Uso: NODE_PATH=… node tests/era6-balance.js [dificultades=0,1,2] [n=6] [perfil=conquista|enjambre|dyson|ciencia] [maxT=1800]
const { chromium } = require('playwright'); const path = require('path');
const [D = '0,1,2', N = '6', PF = 'dyson', MT = '1800'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../eras/era6-estrellas.html')); await p.waitForTimeout(300);
  for (const d of D.split(',').map(Number)) {
    const res = await p.evaluate(([d, n, pf, mt]) => { const E = window.__e6, out = [];
      for (let k = 0; k < n; k++) { E.setDiff(d); E.newGame('B6-' + d + '-' + k, { noLineage: true }); const c = E.G.civs[0]; c.pers = pf; let t15 = -1;
        while (!E.G.over && E.G.t < mt) { E.step(1); if (E.G.tick % 18 === 0) E.aiThink(c); if (t15 < 0 && c.K >= 1.5) t15 = E.G.t; }
        out.push({ how: E.G.over ? E.G.how : 'tiempo', win: E.G.win, t: Math.round(E.G.t), K: +c.K.toFixed(2), t15: Math.round(t15), sys: E.starsOf(c).length, Ks: E.G.civs.map(x => +x.K.toFixed(2)) }); }
      return out; }, [d, +N, PF, +MT]);
    const wins = res.filter(r => r.win).length, med = a => a.sort((x, y) => x - y)[a.length >> 1];
    console.log('Dificultad ' + d + ' · perfil ' + PF + ': victorias ' + wins + '/' + res.length + ' · mediana ' + Math.round(med(res.map(r => r.t)) / 60) + ' min · fines ' + JSON.stringify(res.reduce((a, r) => (a[r.how] = (a[r.how] || 0) + 1, a), {})));
    for (const r of res) console.log('   ', JSON.stringify(r));
  }
  console.log('errores', errs.slice(0, 5)); await b.close();
})();
