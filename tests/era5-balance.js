// Balance de la Era 5 con bots: el jugador lo maneja la misma IA de los rivales (perfil elegible).
// Uso: NODE_PATH=… node tests/era5-balance.js [dificultades=0,1,2] [n=6] [perfil=industrial|verde|cientifica] [maxT=1500]
const { chromium } = require('playwright'); const path = require('path');
const [D = '0,1,2', N = '6', PF = 'industrial', MT = '1500'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../eras/era5-industria.html')); await p.waitForTimeout(300);
  for (const d of D.split(',').map(Number)) {
    const res = await p.evaluate(([d, n, pf, mt]) => { const E = window.__e5, out = [];
      for (let k = 0; k < n; k++) { E.setDiff(d); localStorage.removeItem('evo_lineage'); E.newGame('BAL' + d + '-' + k, { noLineage: true }); const c = E.G.civs[0]; c.pers = pf;
        let t1 = -1; while (!E.G.over && E.G.t < mt) { E.step(1); if (E.G.tick % 16 === 0) { E.aiThink(c); if (c.dlg) E.resolveDlg(c, E.EVS[c.dlg.k].ai(c)); } if (t1 < 0 && c.sp5.st >= 1) t1 = E.G.t; }
        out.push({ how: E.G.over ? E.G.how : 'tiempo', win: E.G.win, t: Math.round(E.G.t), temp: +E.G.temp.toFixed(2), sat: Math.round(t1), K: +c.r.K.toFixed(3), regs: E.regOf(c).length }); }
      return out; }, [d, +N, PF, +MT]);
    const wins = res.filter(r => r.win).length, med = a => a.sort((x, y) => x - y)[a.length >> 1];
    console.log('Dificultad ' + d + ' · perfil ' + PF + ': victorias ' + wins + '/' + res.length + ' · mediana ' + Math.round(med(res.map(r => r.t)) / 60) + ' min · temp mediana +' + med(res.map(r => r.temp)) + ' °C · fines ' + JSON.stringify(res.reduce((a, r) => (a[r.how] = (a[r.how] || 0) + 1, a), {})));
    for (const r of res) console.log('   ', JSON.stringify(r));
  }
  await b.close();
})();
