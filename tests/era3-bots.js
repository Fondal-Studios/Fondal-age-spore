// Bots de la Era 3 (Ciclo 4 · civilizaciones), para inyectar en la página: window.runBot3(seed, diff, maxT, perfil, opts) -> resultado.
// Perfiles: economico, defensivo, militar (expediciones), clash (construye y mejora todo) + 'idle' (no toca nada).
// Juegan SOLO por la API pública de __e3 (placeBuilding/findSpot, upgradeBuilding, research, train, sendExpedition, deal, setPrio, found): nada de modificar G a mano.
// opts: { species, tierra, traits, world: {pers:[a,b]}, stopAge, stopAfter, noFound }
window.BOTS3 = {
  economico: { w: { food: 3, farm: 3, cria: 2, mat1: 2, mat2: 2, cap: 2, build: 2, kn: 2, carry: 2, spoil: 1, birth: 1, cook: 1, def: .5, tower: .5 }, towers: 1, walls: 0, units: { gue: 1 }, upgrade: ['granja', 'ext1', 'almacen', 'vivienda', 'ext2', 'saber', 'cria'], maxWorks: 2, prio: { comida: 2, construccion: 2, defensa: 1, exploracion: 0, saber: 1 }, exp: 'caravana', gifts: 25 },
  defensivo: { w: { def: 3, tower: 3, wallhp: 2, loss: 2, hp: 2, food: 2, farm: 2, mat1: 1, mat2: 1, cap: 1, kn: 1, build: 1 }, towers: 3, walls: 8, units: { gue: 2, tir: 1 }, upgrade: ['torre', 'muro', 'granja', 'vivienda', 'almacen', 'ext1', 'ext2'], maxWorks: 2, prio: { comida: 1, construccion: 1, defensa: 2, exploracion: 0, saber: 1 }, exp: 'nodos', gifts: 0 },
  militar: { w: { atk: 3, hp: 2, ucost: 2, def: 2, tower: 1, spd: 1, food: 2, farm: 2, mat1: 1, mat2: 1, node: 2, kn: 1 }, towers: 1, walls: 0, units: { gue: 4, tir: 2, cam: 1 }, upgrade: ['cuartel', 'granja', 'vivienda', 'ext1', 'almacen', 'ext2'], maxWorks: 2, prio: { comida: 1, construccion: 1, defensa: 1, exploracion: 1, saber: 1 }, exp: 'ataque', gifts: -1 },
  clash: { w: { build: 3, cap: 3, mat1: 2, mat2: 2, food: 2, farm: 2, kn: 1, def: 1, tower: 1 }, towers: 2, walls: 4, units: { gue: 2, tir: 1 }, upgrade: ['vivienda', 'granja', 'almacen', 'ext1', 'ext2', 'saber', 'torre', 'cuartel', 'cria', 'muro'], maxWorks: 3, prio: { comida: 1, construccion: 2, defensa: 1, exploracion: 1, saber: 1 }, exp: 'nodos', gifts: 20 }
};
window.runBot3 = function (seed, diff, maxT, perfil, opts) {
  opts = opts || {}; const E = window.__e3; E.diffI = diff; E.newGame(seed, Object.assign({}, opts.world || {}, opts.species ? { species: opts.species, tierra: !!opts.tierra, traits: opts.traits || [] } : {})); E.setStarted(true);
  const B = window.BOTS3[perfil] || null; let tick = 0; const ev = { raid: 0, raidEnd: 0, built: 0, tech: 0, train: 0, node: 0, exped: 0, wonder: 0 }, dead = {};
  ['raid', 'raidEnd', 'built', 'tech', 'node', 'wonder'].forEach(k => E.Bus.on(k, () => ev[k]++)); E.Bus.on('train', (k, fin) => { if (fin) ev.train++; }); E.Bus.on('expedition', (m, t, n, okk) => { if (okk === null) ev.exped++; });
  E.Bus.on('death', (p, why) => { dead[why] = (dead[why] || 0) + 1; });
  const cnt = k => E.G.B.filter(b => b.k === k).length, cntDone = k => E.done(k).length;
  const place = k => { const s = E.findSpot(k); return s ? E.placeBuilding(k, s) : false; };
  let setP = false, wallN = 0;
  while (E.G.t < maxT && !E.G.over) {
    E.step(.05); tick++; if (tick % 20) continue;
    const G = E.G; if (!B) continue;
    if (!setP) { for (const k in B.prio) E.setPrio(k, B.prio[k]); setP = true; }
    if (opts.stopAge && E.age() >= opts.stopAge && G.t - (G.x3.ages[opts.stopAge] || 0) >= (opts.stopAfter || 0)) break;
    if (E.canFound() && !opts.noFound) { E.found(); break; }
    const ad = E.adults(); if (!ad.length) continue;
    const age = E.age(), core = E.core(), ti = null; void ti;
    // 1. tecnología: la de mejor puntaje del perfil entre las disponibles
    const C = E.CIVS[G.x3.civ]; let best = null, bs = -1; for (const id in C.tech) { const t = C.tech[id]; if (E.techCheck(id).ok) { let sc = 0; for (const k in t.fx) sc += (B.w[k] || .2) * Math.abs(t.fx[k] > 3 ? t.fx[k] / 100 : t.fx[k]); sc += (4 - t.age) * .01; if (sc > bs) { bs = sc; best = id; } } } if (best) E.research(best);
    // 2. Edad: si se puede avanzar, se avanza; si solo falta el costo, se ahorra
    let saving = false;
    if (age < 3 && !core.upg) { const ch = E.upgradeCheck(core); if (ch.ok) E.upgradeBuilding(core); else { const rq = E.ageReq(age + 1); saving = rq.every(r => r.ok || r.id === 'cost'); } }
    const works = E.workItems().length, pop = G.P.length;
    // 3. qué construir (requisitos de la Edad primero, luego necesidades, luego el perfil)
    if (works < B.maxWorks) {
      const want = [];
      const rq = age < 3 ? E.ageReq(age + 1) : []; for (const r of rq) if (!r.ok && E.SL[r.id] && cnt(r.id) < (E.AGE_REQ[age].slots[r.id] || 0)) want.push(r.id);
      if (E.shelterCap() < pop + 3) want.push('vivienda');
      if (E.farmSlots() < Math.max(2, Math.round(pop * .3))) want.push(age >= 2 && cnt('cria') < 1 ? 'cria' : 'granja');
      if (cnt('ext1') < 1 + age) want.push('ext1');
      if (age >= 2 && cnt('ext2') < age) want.push('ext2');
      if (cnt('almacen') < age) want.push('almacen');
      if (cnt('saber') < Math.min(2, age)) want.push('saber');
      if (age >= 2 && cnt('torre') < B.towers) want.push('torre');
      if (age >= 2 && cnt('cuartel') < 1 && (B.units.gue || 0) > 0) want.push('cuartel');
      if (age >= 2 && cnt('unico') < 1) want.push('unico');
      if (age >= 2 && wallN < B.walls) want.push('muro');
      if (age >= 3 && cnt('maravilla') < 1) want.unshift('maravilla');
      let done = false;
      for (const k of want) { if (saving && k !== 'maravilla' && !(rq.find(r => r.id === k))) continue; if (k === 'muro') { const c = E.core(), a = wallN * .8, s = { x: c.x + Math.cos(a) * 90, y: c.y + Math.sin(a) * 90 }; if (E.placeBuilding('muro', s) || place('muro')) { wallN++; done = true; break; } continue; } if (place(k)) { done = true; break; } }
      // 4. mejoras (perfil «clash» y economía): el primero que se pueda
      if (!done && !saving) for (const k of B.upgrade) { const b = G.B.find(x => x.k === k && x.done && !x.upg && E.upgradeCheck(x).ok); if (b) { E.upgradeBuilding(b); break; } }
    }
    // 5. unidades
    if (age >= 2 && E.done('cuartel').length && !saving) for (const k of E.UKEYS) { const want = B.units[k] || 0; const have = G.P.filter(p => p.role === k).length + G.x3.q.filter(q => q.k === k).length; if (have < want && E.trainCheck(k).ok) { E.train(k); break; } }
    // 6. expediciones (Edad III)
    if (age >= 3 && tick % 100 === 0) {
      const idle = E.idleUnits().length;
      if ((B.exp === 'nodos' || B.exp === 'ataque') && idle >= 2) { const nd = G.x3.nodes.filter(n => n.own !== 2 && E.expCheck('node', n.i, 'tomar').ok).sort((a, b) => a.ghp - b.ghp)[0]; if (nd) E.sendExpedition('node', nd.i, 'tomar', Math.max(2, idle - 1)); }
      if (B.exp === 'ataque' && idle >= 4) { const c = G.x3.clans.filter(c => !c.allied && E.expCheck('clan', c.id, 'atacar').ok).sort((a, b) => a.rel - b.rel)[0]; if (c && c.rel < 10) E.sendExpedition('clan', c.id, 'atacar', idle); }
      if (B.exp === 'caravana' && idle >= 1 && G.food > 40) { const c = G.x3.clans.filter(c => E.expCheck('clan', c.id, 'comerciar').ok).sort((a, b) => b.rel - a.rel)[0]; if (c) E.sendExpedition('clan', c.id, 'comerciar', 1); }
    }
    // 7. diplomacia: regalos si el motivo del ataque es la relación; alianza si se puede
    for (const c of G.x3.clans) { const gate = E.raidGate(c), byRel = gate.go && /relación|odia/.test(gate.why); if (B.gifts > 0 && c.rel < B.gifts && G.food > pop * 1.5 + 12 && byRel) E.deal(c.id, 'gift'); if (B.gifts >= 0 && c.rel >= 50 && !c.allied) E.deal(c.id, 'ally'); }
    const al = G.x3.al; if (al.hambruna && al.hambruna.l === 'crit' && G.x3.prio.comida < 2) E.setPrio('comida', 2);
  }
  const G = E.G, ad = E.adults(), cl = G.x3.clans;
  return { seed, diff, perfil, civ: G.x3.civ, sp: G.x3.sp, amph: G.x3.amph, end: G.over ? (G.x3.found ? 'win' : 'lose') : (ad.length ? 'timeout' : 'lose'), t: Math.round(G.t), age: E.age(), ages: Object.assign({}, G.x3.ages), wonder: G.x3.wonder || null,
    pop: G.P.length, techs: Object.keys(G.techs).length, deaths: G.deaths, dc: dead, ev, units: G.P.filter(p => ['gue', 'tir', 'cam'].includes(p.role)).length, nodes: G.x3.nodes.filter(n => n.own === 2).length, loot: G.x3.loot, exps: G.x3.exps,
    lost: { m1: Math.round(G.x3.lost.mat1), m2: Math.round(G.x3.lost.mat2) }, blds: G.B.filter(b => b.done).length, pers: cl.map(c => c.pers).join('/'), sent: cl.map(c => c.sent).join('/'), repelled: cl.map(c => c.repelled).join('/'), busErr: E.Bus.err };
};
