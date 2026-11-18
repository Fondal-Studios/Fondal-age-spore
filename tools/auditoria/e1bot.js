// Bot «humano» de la Era 1: divide, especializa, muta, construye, fusiona, ataca y usa habilidades. Mide resultado y ritmo.
const { chromium } = require('playwright');
const [,, di = '1', N = '4', maxT = '1500', nriv = '2', modo = 'agr'] = process.argv;
(async () => {
  const b = await chromium.launch(); const out = [];
  for (let i = 0; i < +N; i++) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/user/Fondal-age-spore/eras/era1-celula.html'); await p.waitForTimeout(300);
    const r = await p.evaluate(([di, i, maxT, nriv, modo]) => {
      const E = window.__e1, MODO = modo; E.newGame(di, nriv, 'AUD' + di + '-' + i); E.setStarted(true);
      if (MODO === 'ia') { const T0 = E.S.teams[0], T1 = E.S.teams[1]; T0.branch = ['pred', 'para', 'foto', 'colo'][i % 4]; T0.ai = Object.assign({}, T1.ai, { target: null, tTeam: -1, seq: E.MUT.filter(m => m.br === T0.branch).sort((a, b) => (a.t || 0) - (b.t || 0)).concat(E.MUT.filter(m => m.br === 'gen')) }); }
      let S = E.S, rs = 12345 + i; const rnd = () => (rs = (rs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const ev = { firstMut: null, stage1: null, fusion: null, canEvo: null, muts: 0, peakCells: 0, tells: 0 };
      const sel = f => { S.sel = new Set(S.cells.filter(c => c.team === 0 && !c.struct && (!f || f(c))).map(c => c.id)); };
      let tick = 0;
      while (!S.over && S.t < maxT) {
        E.step(1); tick++; S = E.S; if (S.modal) S.modal = false;
        if (MODO === 'ia') { const T = S.teams[0]; ev.peakCells = Math.max(ev.peakCells, S.cells.filter(c => c.team === 0).length); if (ev.firstMut === null && T.mutCount) ev.firstMut = Math.round(S.t); continue; }
        const T = S.teams[0], mine = S.cells.filter(c => c.team === 0);
        ev.peakCells = Math.max(ev.peakCells, mine.length);
        while (T.pending >= 1) { const o = E.offers(); sel(); E.dispatch('mut', { id: o[Math.floor(rnd() * o.length)].id }); ev.muts++; if (ev.firstMut === null) ev.firstMut = Math.round(S.t); }
        if (T.stage >= 1 && ev.stage1 === null) ev.stage1 = Math.round(S.t);
        if (T.fusion && ev.fusion === null) ev.fusion = Math.round(S.t);
        if (S.canEvolve && ev.canEvo === null) ev.canEvo = Math.round(S.t);
        sel(); E.dispatch('divide');
        if (tick % 6 === 0) { sel(c => !c.type || c.type === 'base'); const k = ['recol', 'recol', 'guerr', 'explo', 'acora'][Math.floor(rnd() * 5)]; E.dispatch('spec', { ty: k }); }
        if (T.stage >= 1 && tick % 15 === 0) { sel(); E.dispatch('build', { kind: ['mito', 'cloro', 'ribo', 'vacu', 'centri', 'liso'][Math.floor(rnd() * 6)] }); }
        if (T.fusion && tick % 12 === 0) { sel(); E.dispatch('fuse'); }
        if (tick % 20 === 0) { const foe = S.cells.find(c => c.team !== 0 && !c.struct); if (foe && mine.length > (MODO === 'pas' ? 999 : 14)) { sel(c => c.type === 'guerr' || mine.length > 25); E.dispatch('order', { x: foe.x, y: foe.y, eid: foe.id }); } }
        if (tick % 9 === 0) for (const k of Object.keys(E.AB)) { sel(); E.dispatch('ab', { k, aim: mine[0] ? { x: mine[0].x, y: mine[0].y } : null }); }
      }
      const T = S.teams[0];
      return { t: Math.round(S.t), over: S.over, winner: S.winner, mine: S.cells.filter(c => c.team === 0).length, branch: T.branch, mutCount: T.mutCount, share: +(T.share || 0).toFixed(2), ...ev };
    }, [+di, i, +maxT, +nriv, modo]);
    r.errs = errs.length; out.push(r); console.log(JSON.stringify(r)); await p.close();
  }
  await b.close();
})();
