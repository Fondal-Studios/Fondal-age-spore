// Bots de la Era 3 (Ciclo 4), para inyectar en la página: window.runBot3(seed, diff, maxT, perfil, opts) -> resultado.
// Perfiles: economico, defensivo, comerciante, agresivo (+ 'idle' que no toca nada). Todos juegan solo por la API pública de __e3
// (setPrio, placeBuilding, upgradeBuilding, research, deal, choosePath): nada de modificar G a mano.
window.BOTS3 = {
  economico: { adapt: true, tech: ['fuego', 'piedra', 'cesta', 'ceram', 'agri', 'lanza', 'marcas', 'domes'], prio: { comida: 2, construccion: 2, defensa: 1, exploracion: 0, saber: 1 }, gifts: 25, trade: false, empal: false, expand: false, path: null },
  defensivo: { tech: ['fuego', 'piedra', 'lanza', 'cesta', 'ceram', 'agri', 'marcas', 'arco'], prio: { comida: 1, construccion: 1, defensa: 2, exploracion: 0, saber: 1 }, gifts: 0, trade: false, empal: true, expand: false, path: 'jefatura' },
  comerciante: { adapt: true, tech: ['fuego', 'piedra', 'cesta', 'ceram', 'agri', 'marcas', 'lanza', 'domes'], prio: { comida: 1, construccion: 1, defensa: 1, exploracion: 2, saber: 2 }, gifts: 40, trade: true, empal: false, expand: false, path: 'mercado' },
  auto: { adapt: false, tech: ['fuego', 'piedra', 'cesta', 'lanza', 'ceram', 'agri', 'marcas', 'arco', 'domes'], prio: { comida: 1, construccion: 1, defensa: 1, exploracion: 1, saber: 1 }, gifts: 45, trade: false, empal: false, expand: false, path: null },   // equivalente al bot «auto» de la Era 3 original (referencia de comparación)
  ingenuo: { adapt: false, tech: ['fuego', 'piedra', 'cesta', 'ceram', 'agri', 'lanza', 'marcas', 'domes'], prio: { comida: 1, construccion: 1, defensa: 0, exploracion: 0, saber: 1 }, gifts: 0, trade: false, empal: false, expand: false, path: null },
  agresivo: { tech: ['fuego', 'piedra', 'lanza', 'arco', 'cesta', 'ceram', 'agri', 'marcas'], prio: { comida: 1, construccion: 1, defensa: 2, exploracion: 2, saber: 0 }, gifts: -1, trade: false, empal: true, expand: true, path: 'jefatura' }
};
window.runBot3 = function (seed, diff, maxT, perfil, opts) {
  opts = opts || {}; const E = window.__e3; E.diffI = diff; E.newGame(seed, opts.world); E.setStarted(true);
  const B = window.BOTS3[perfil] ? Object.assign({}, window.BOTS3[perfil]) : null, has = E.has; let slot = 0, tick = 0; const tt = {}, ev = { raid: 0, raidEnd: 0, alert: 0, born: 0, built: 0, trade: 0, gift: 0, discover: 0 }, alerts = {}, dead = {};
  ['raid', 'raidEnd', 'born', 'built', 'trade', 'gift', 'discover'].forEach(k => E.Bus.on(k, () => ev[k]++));
  E.Bus.on('alert', a => { if (a.level !== 'ok') alerts[a.kind] = (alerts[a.kind] || 0) + 1; });
  E.Bus.on('death', (p, why) => { dead[why] = (dead[why] || 0) + 1; });
  const spots = () => { const k = slot++; const a = k * 2.4, r = 55 + (k % 5) * 16; return B && B.expand && k % 3 === 0 ? { x: 560 + Math.cos(a) * 40, y: 90 + Math.sin(a) * 30 } : { x: 300 + Math.cos(a) * r, y: 330 + Math.sin(a) * r }; };
  const place = kind => { const G = E.G; for (let i = 0; i < 14; i++) { const n0 = G.B.length; E.placeBuilding(kind, spots()); if (G.B.length > n0) return true; } return false; };
  let setP = false;
  while (E.G.t < maxT && !E.G.over) {
    E.step(.05); tick++; if (tick % 20) continue;
    const G = E.G; for (const k in E.TECH) if (has(k) && !tt[k]) tt[k] = Math.round(G.t);
    if (!B) continue;
    if (!setP) { for (const k in B.prio) E.setPrio(k, B.prio[k]); setP = true; if (B.path) E.choosePath(B.path); }
    const ad = E.adults(); if (!ad.length) continue;
    for (const k of B.tech) { const t = E.TECH[k]; if (!has(k) && t.req.every(has) && !(t.excl || []).some(has) && G.know >= E.techCost(k)) { E.research(k); break; } }
    // adaptación mínima del jugador: si hay hambruna sube Comida; si pasó, la baja
    // adaptación: si te saquearon y no repeliste, defensa alta (y empalizada); cuando hay calma vuelve a normal
    if (B.adapt) { const hit = G.x3.clans.reduce((a, c) => a + c.sent, 0) - G.raidsOk, hot = hit >= 2 || (G.dc.saqueo || 0) >= 1; if (hot && G.x3.prio.defensa < 2) E.setPrio('defensa', 2); B.empal = B.empal || hot; }
    const al = G.x3.al; if (al.hambruna && al.hambruna.l === 'crit' && G.x3.prio.comida < 2) E.setPrio('comida', 2);
    const works = E.workItems().length, ref = E.done('refugio').length + G.sites.filter(s => s.k === 'refugio').length;
    if (works < 2) {
      const need = k => !E.done(k).length && !G.B.some(b => b.k === k && !b.done), cap = E.shelterCap();
      if (ref < 3 && G.wood >= 2) place('refugio');
      else if (need('almacen') && G.wood >= 3 && G.stone >= 1) place('almacen');
      else if (need('totem') && G.wood >= 2.5 && G.stone >= 1) place('totem');
      else if (has('agri') && E.done('huerto').length + G.sites.filter(s => s.k === 'huerto').length < 2 && G.wood >= 1) place('huerto');
      else if (B.empal && has('lanza') && need('empalizada') && G.wood >= 3.5) place('empalizada');
      else if (cap < G.P.length + 3 && ref < 8 && G.wood >= 2) place('refugio');
      else { // mejoras: las que se puedan, en orden de utilidad
        const ups = G.B.map((b, i) => [b, i]).filter(([b]) => b.done && !b.upg && E.upgradeCheck(b).ok && (b.k === 'refugio' || b.k === 'almacen' || b.k === 'huerto' || b.k === 'fogata' || b.k === 'totem' || (b.k === 'empalizada' && B.empal)));
        const pr = { refugio: 0, huerto: 1, almacen: 2, fogata: 3, totem: 4, empalizada: 5 }; ups.sort((a, b) => pr[a[0].k] - pr[b[0].k]); if (ups.length) E.upgradeBuilding(ups[0][1]);
        else if (has('piedra') && need('taller') && G.wood >= 2 && G.stone >= 2) place('taller');
      }
    }
    // diplomacia por perfil
    for (const c of G.x3.clans) {
      // lee el motivo visible: un regalo sirve si el motivo del ataque es la relación; si es «te ve débil» no sirve, hay que defenderse
      const surplus = G.food >= G.P.length * 1.5 + 10, gate = E.raidGate(c), byRel = gate.go && /relación|odia/.test(gate.why);
      if (B.gifts > 0 && c.rel < B.gifts && (surplus || (byRel && G.food >= 9))) E.deal(c.id, 'gift');
      if (B.gifts >= 0 && c.rel >= 50 && !c.allied) E.deal(c.id, 'ally');
      if (B.trade && G.food >= G.P.length * 2 + 12 && tick % 2000 === 0 && c.rel > -10) E.deal(c.id, G.wood < 8 ? 'f2w' : 'f2s');   // un trato cada 100 s, solo con comida de sobra
    }
  }
  const G = E.G, ad = E.adults(), cl = G.x3.clans;
  return { seed, diff, perfil, end: G.over ? (ad.length ? 'win' : 'lose') : (ad.length ? 'timeout' : 'lose'), t: Math.round(G.t), pop: G.P.length, know: +G.know.toFixed(1), techs: Object.keys(G.techs).length, deaths: G.deaths, dc: dead, winters: G.winters, tt, ev, alerts,
    goals: (G.g || []).filter(x => x.ok).length, path: G.x3.path || null, pers: cl.map(c => c.pers).join('/'), rel: cl.map(c => Math.round(c.rel)).join('/'), sent: cl.map(c => c.sent).join('/'), repelled: cl.map(c => c.repelled).join('/'), allied: cl.map(c => c.allied ? 1 : 0).join('/'),
    blds: G.B.filter(b => b.done).map(b => b.k + (b.lvl || 1)).join(','), roles: JSON.stringify(E.tribeInfo().roles), raidsOk: G.raidsOk, trades: G.trades, busErr: E.Bus.err };
};
