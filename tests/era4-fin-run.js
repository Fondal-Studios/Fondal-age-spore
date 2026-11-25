// Era 4 · ¿la partida termina? Bot de tests/era4-bot.js sin dibujar (E.step(2) + una acción cada 2 s de juego), N partidas por dificultad.
// Reporta victorias, derrotas, sin terminar, mediana de duración y los intervalos de Wilson (95 %) de «terminó antes de 40 min» y «victoria».
// Uso: NODE_PATH=$(npm root -g) node tests/era4-fin-run.js [dificultades=0,1,2] [N=6] [maxT=2700] [civ=ter|ins|acu|ave|mix] [archivo.html]
// Metas (docs/ERA4.md, Ciclo 5): Fácil y Normal >= 80 % terminan antes de 40 min; Difícil >= 60 %; Fácil gana claramente más que Difícil.
const { chromium } = require('playwright'); const path = require('path');
const [,, diffs = '0,1,2', N = '6', maxT = '2700', civArg = 'mix', file] = process.argv;
const url = 'file://' + path.resolve(file || path.join(__dirname, '../eras/era4-civilizaciones.html'));
const BOT = () => {
  const E = window.__e4, K = ['lan', 'arq', 'jin'];
  window.__act = () => { const G = E.G; if (!G || G.over) return; if (G.dlg) { E.resolveDlg(0); if (G.dlg) E.resolveDlg(1); return; }
    const c = G.civs[0]; if (!c.alive) return; E.recruit(0, 'obrero');
    for (const k of ['granja', 'granja', 'cuartel', 'mina', 'aserr', 'espias', 'muralla', 'templo']) if (E.build(0, k) === null) break;
    for (const k of ['bronce', 'logi', 'coraza', 'engano']) if (E.research(0, k) === null) break;
    const g = E.garr(c), en = { lan: 0, arq: 0, jin: 0 }; for (const a of G.armies) if (a.team) K.forEach(k => en[k] += a.n[k]);
    const top = K.reduce((m, k) => en[k] > en[m] ? k : m, 'lan'), counter = { lan: 'arq', arq: 'jin', jin: 'lan' }[top];
    for (let i = 0; i < 2; i++) if (E.recruit(0, counter)) E.recruit(0, 'lan');
    for (const r of G.civs) if (r.id && r.alive && c.bld.espias > 0 && !(c.intel[r.id] > G.t)) E.spy(0, r.id);
    const field = G.armies.filter(a => a.team === 0 && !a.home), tg = G.civs.filter(x => x.id && x.alive)[0];
    const weakest = Math.min(...G.civs.filter(x => x.id && x.alive).map(x => E.units(x)));
    if (!field.length && g && E.tot(g.n) >= 22 && E.tot(g.n) * .75 >= 1.35 * weakest) { const a = E.formArmy(0, .75); if (a && tg) E.orderMove(a, tg.x, tg.y); }
    for (const a of field) { if (a.bt) continue; if (a.morale < 28 || (a.prov <= 0 && E.tot(a.n) > 0)) E.retreat(a); else if (!a.path.length && a.stance === 'idle' && tg) E.orderMove(a, tg.x, tg.y); } };
};
const wilson = (k, n, z = 1.96) => { if (!n) return [0, 0]; const p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
const pct = x => Math.round(x * 100) + ' %';
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2; };
const fmt = t => t == null ? '—' : Math.floor(t / 60) + ':' + String(Math.round(t % 60)).padStart(2, '0');
const CIVK = ['ter', 'ins', 'acu', 'ave'];
(async () => {
  const b = await chromium.launch(); const all = {};
  for (const d of diffs.split(',').map(Number)) {
    const rows = [];
    for (let i = 0; i < +N; i++) {
      const civ = civArg === 'mix' ? CIVK[i % 4] : civArg;
      const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto(url + '?sinarte'); await p.evaluate(BOT);
      const r = await p.evaluate(([d, i, maxT, civ]) => { const E = window.__e4; localStorage.removeItem('evo_lineage'); E.setDiff(d); E.newGame('A4-' + d + '-' + i, { civ }); E.setStarted(true);
        let endT = null; while (!E.G.over && E.G.t < maxT) { E.step(2); window.__act(); }
        const G = E.G, c = G.civs[0]; if (G.over) endT = G.t;
        return { d, i, civ: G.civ || 'ter', t: Math.round(G.t), over: G.over, win: !!G.win, how: G.how || null, alive: c.alive, rivals: G.civs.filter(x => x.id && x.alive).length, units: E.units(c), maxU: G.maxU || null, rivU: G.civs.filter(x => x.id).map(x => E.units(x)), endT };
      }, [d, i, +maxT, civ]);
      r.errs = errs.slice(0, 2); console.log(JSON.stringify(r)); rows.push(r); await p.close();
    }
    all[d] = rows;
  }
  console.log('\nDificultad | N | victorias | derrotas | sin terminar | terminó <40 min (IC 95 %) | victoria (IC 95 %) | mediana de duración (terminadas) | cómo terminó | ejército máximo visto');
  for (const d of Object.keys(all)) {
    const R = all[d], n = R.length, w = R.filter(r => r.over && r.win).length, l = R.filter(r => r.over && !r.win).length, u = n - w - l, e40 = R.filter(r => r.over && r.endT < 2400).length;
    const ci = wilson(e40, n), cw = wilson(w, n);
    console.log(['Fácil', 'Normal', 'Difícil'][d] + ' | ' + n + ' | ' + w + ' | ' + l + ' | ' + u + ' | ' + e40 + '/' + n + ' = ' + pct(e40 / n) + ' (' + pct(ci[0]) + '–' + pct(ci[1]) + ') | ' + pct(w / n) + ' (' + pct(cw[0]) + '–' + pct(cw[1]) + ') | ' + fmt(med(R.filter(r => r.over).map(r => r.endT))) + ' | ' + Object.entries(R.filter(r => r.over).reduce((m, r) => (m[r.how] = (m[r.how] || 0) + 1, m), {})).map(([k, v]) => k + ' ' + v).join(', ') + ' | ' + Math.max(...R.map(r => r.maxU || 0)));
  }
  await b.close();
})();
