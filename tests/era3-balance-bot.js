// Bot en página: devuelve resultado. kind: 'auto' | 'con' (sube constructores a 3 al inicio) | 'idle'
window.runBot = function(seed, diff, maxT, kind) {
  const E = window.__e3; E.diffI = diff; E.newGame(seed); E.setStarted(true);
  const has = E.has; let slot = 0, tick = 0;
  const ORDER = ['fuego','piedra','cesta','lanza','ceram','agri','marcas','arco','domes'];
  const spots = k => { const a = k * 2.4, r = 60 + (k % 4) * 14; return { x: 300 + Math.cos(a) * r, y: 330 + Math.sin(a) * r }; };
  const place = kind2 => { const G = E.G; for (let i = 0; i < 12; i++) { const w = spots(slot++); const n0 = G.sites.length; E.placeBuilding(kind2, w); if (G.sites.length > n0) return true; } return false; };
  let conDone = false, firstWin = null; const tt = {};
  while (E.G.t < maxT && !E.G.over) {
    E.step(.05); tick++;
    if (tick % 20 === 0) for (const k of ORDER) if (has(k) && !tt[k]) tt[k] = Math.round(E.G.t);
    if (tick % 20) continue;
    const G = E.G, ad = E.adults(); if (!ad.length) continue;
    const cnt = r => ad.filter(p => p.role === r).length;
    if (kind === 'idle') continue;
    if (kind === 'smart') { if (!conDone) { E.setRole('cha', 1); conDone = true; } if (cnt('cha') < Math.floor(ad.length / 8) && tick % 200 === 0) E.setRole('cha', 1); }
    if (kind === 'con6' && !conDone) { for (let i = 0; i < 6; i++) E.setRole('con', 1); conDone = true; }
    if (kind === 'con' && !conDone) { E.setRole('con', 1); E.setRole('con', 1); conDone = true; }
    for (const k of ORDER) { const t = E.TECH[k]; if (!has(k) && t.req.every(has) && G.know >= t.cost) { E.research(k); break; } }
    if (G.sites.length < 2) {
      const ref = E.done('refugio').length + G.sites.filter(s => s.k === 'refugio').length;
      const need = k => !E.done(k).length && !G.sites.some(s => s.k === k);
      if (!cnt('con')) E.setRole('con', 1);
      if (ref < 3 && G.wood >= 6) place('refugio');
      else if (need('almacen') && G.wood >= 10 && G.stone >= 2) place('almacen');
      else if (need('totem') && G.wood >= 8 && G.stone >= 4) place('totem');
      else if (has('agri') && need('huerto') && G.wood >= 4) place('huerto');
      else if (ref >= 3 && G.P.length > ref * 4 + 4 && ref < 6 && G.wood >= 6) place('refugio');
    }
    if (G.relation < 45 && G.food >= 14) E.dip('gift');
    if (G.relation >= 50 && !G.allied) E.dip('ally');
  }
  const G = E.G, ad = E.adults();
  return { seed, diff, kind, end: G.over ? (ad.length ? 'win' : 'lose') : 'timeout', t: Math.round(G.t), pop: G.P.length, know: +G.know.toFixed(1), techs: Object.keys(G.techs).length, deaths: G.deaths, dc: JSON.stringify(G.dc), winters: G.winters, tt, goals: (G.g||[]).filter(x=>x.ok).length };
};
