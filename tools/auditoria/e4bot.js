const { chromium } = require('playwright');
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

const [,, diffs = '0,1,2', N = '4', maxT = '1800'] = process.argv;
(async () => {
  const b = await chromium.launch();
  for (const d of diffs.split(',').map(Number)) for (let i = 0; i < +N; i++) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/user/Fondal-age-spore/eras/era4-civilizaciones.html'); await p.evaluate(BOT);
    const r = await p.evaluate(([d, i, maxT]) => { const E = window.__e4; E.setDiff(d); E.newGame('A4-' + d + '-' + i); E.setStarted(true); const G0 = E.G;
      let t = 0; while (!E.G.over && E.G.t < maxT) { E.step(2); window.__act(); }
      const G = E.G, c = G.civs[0]; return { d, i, t: Math.round(G.t), over: G.over, win: G.win ?? G.winner ?? null, alive: c.alive, rivals: G.civs.filter(x => x.id && x.alive).length, units: E.units(c), techs: Object.keys(c.tech || c.techs || {}).length };
    }, [d, i, +maxT]);
    r.errs = errs.slice(0, 2); console.log(JSON.stringify(r)); await p.close();
  }
  await b.close();
})();
