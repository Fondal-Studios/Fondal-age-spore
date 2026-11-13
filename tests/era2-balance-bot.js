// Bots de equilibrio de la Era 2 (se inyectan en la página). Simulan llamando __e2.step(.05) directo, sin dibujar.
// window.runBot2(opts) -> resultado. opts: {seed, diff, spec, bot:'razonable'|'pasivo', maxT, ab:['rug','cam','exc','ala','mig'] (habilidades permitidas)}
// El bot usa su PROPIO azar (mulberry32), nunca R() de la simulación: así no altera la partida.
window.runBot2 = function (o) {
  const E = window.__e2, TR = {}; E.TRAITS.forEach(t => TR[t.id] = t);
  const bs = (s => { let a = 0; for (let i = 0; i < s.length; i++) a = (Math.imul(a, 31) + s.charCodeAt(i)) >>> 0; return a || 1; })('bot' + o.seed);
  let br = bs; const BR = () => { br = (br + 0x6D2B79F5) >>> 0; let t = br; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const SPEC2CLS = { ter_cazador: 'ter', ter_gigante: 'ter', ter_ingeniero: 'ter', ins_colmena: 'ins', ins_enjambre: 'ins', ins_parasito: 'ins', acu_abisal: 'acu', acu_arrecife: 'acu', acu_anfibio: 'acu', ave_rapaz: 'ave', ave_carronera: 'ave', ave_migratoria: 'ave' };
  const col = E.colonized(); for (const k in col) delete col[k];
  E.cls = SPEC2CLS[o.spec]; E.specKey = o.spec; E.diffI = o.diff; E.stance = 'forage';
  E.newGame('pradera', null, o.seed); E.setStarted(true);
  const abOn = new Set(o.ab || ['rug', 'cam', 'exc', 'ala', 'mig']), razon = o.bot === 'razonable';
  const BADK = { cF: 1, m: 1, cold: 1, drought: 1, fire: 1, plague: 1 }, W = { r: 3, hunt: 2, d: 1, def: 6, stealth: 5, nest: 4, inst: 2, eff: 3, search: 1, coop: 3, scav: 2, cF: 3, m: 3, cold: 1.5, drought: 1.5, fire: 1, water: 0, fert: 1, mind: 2, plague: 0.5 };
  const fxScore = fx => { let s = 0; for (const k in fx) { const [op, v] = fx[k], w = W[k] || 0.5, bad = BADK[k] ? -1 : 1; s += op === '*' ? bad * w * Math.log(v) * 4 : w * v * 10; } return s; };
  const offerScore = of => { const t = TR[of.id]; return of.v ? fxScore(t[of.v].fx) + 0.3 : fxScore(t.fx); };
  const mineL = () => E.G.A.filter(a => a.sp === E.G.me && !a.dead);
  const herd = m => { let x = 0, y = 0; for (const a of m) { x += a.x; y += a.y; } return { x: x / m.length, y: y / m.length }; };
  const M = { tNest1: null, tNest2: null, tEvo4: null, tPop: null, tCol2: null, tPhase2: null, tFogata: null, tRef3: null, tCorral: null, tTotem: null, minPop: 1e9, maxPop: 0, popSum: 0, popN: 0, nTravel: 0 };
  let tick = 0, endT = 0, lastLay = -99, lastNestTry = -99, travelWait = 0;
  const maxT = o.maxT || 2400;
  while (E.G.t < maxT && !E.G.over) {
    E.step(.05); tick++; let G = E.G; if (G.modal) G.modal = false;
    if (tick % 20) continue;
    const st = E.stats(), t = G.t;
    if (!M.tNest1 && st.nests >= 1) M.tNest1 = Math.round(t); if (!M.tNest2 && st.nests >= 2) M.tNest2 = Math.round(t);
    if (!M.tEvo4 && G.evos >= 4) M.tEvo4 = Math.round(t); if (!M.tPop && st.pop >= (o.diff ? 28 : 20)) M.tPop = Math.round(t);
    if (!M.tCol2 && Object.keys(E.colonized()).length >= 2) M.tCol2 = Math.round(t);
    if (!M.tPhase2 && G.phase === 2) M.tPhase2 = Math.round(t);
    if (G.phase === 2) { if (!M.tFogata && E.bdone('fogata').length) M.tFogata = Math.round(t); if (!M.tRef3 && E.bdone('refugio').length >= 3) M.tRef3 = Math.round(t); if (!M.tTotem && E.bdone('totem').length) M.tTotem = Math.round(t); if (!M.tCorral && G.g && G.g[2] && G.g[2].ok) M.tCorral = Math.round(t); }
    if (t > 60) { M.minPop = Math.min(M.minPop, st.pop); } M.maxPop = Math.max(M.maxPop, st.pop); M.popSum += st.pop; M.popN++;
    // ---- evolución (ambos bots: elige una oferta; el razonable la puntúa, el pasivo toma la primera)
    while (G.pending > 0) { const offs = E.offers(); let b = offs[0]; if (razon) for (const x of offs) if (offerScore(x) > offerScore(b)) b = x; E.pickEvo(b); }
    const mine = mineL(); if (!mine.length) continue;
    // ---- reproducir: el pasivo solo lo hace cada tanto; el razonable cada 6 s
    if (t - lastLay >= (razon ? 6 : 10)) { lastLay = t; E.doLay(); }
    if (!razon) continue;
    const h = herd(mine);
    // ---- nidos (hasta 2, de a uno)
    if (G.N.length < 2 && !G.nestB && !G.bB && t > 8 && t - lastNestTry > 5) { lastNestTry = t; E.placeNest({ x: h.x + (G.N.length ? 50 : 0), y: h.y }); }
    // ---- colonizar: con >=10 individuos 45 s queda colonizado; luego viajar al ecosistema compatible más productivo
    if (G.phase === 1 && st.pop >= 8 && E.colonized()[G.biomeKey] && Object.keys(E.colonized()).length < 2 && !G.nestB) {
      let best = null, bs2 = -1; for (const k in E.BIOMES) { if (E.colonized()[k] || k === G.biomeKey) continue; if (k === 'oceano' && !['water', 'amph', 'fly'].includes(G.me.hab)) continue; const B = E.BIOMES[k], sc = B.npp * (1 + .5 * B.help.filter(id => G.me.traits.includes(id)).length); if (sc > bs2) { bs2 = sc; best = k; } }
      if (best && G.N.filter(n => n.done).length >= 2) { E.travel(best); M.nTravel++; G = E.G; if (G.modal) G.modal = false; continue; }
    }
    // ---- civilización (fase 2)
    if (G.phase === 2 && !G.bB && !G.nestB) {
      const need = [['fogata', 1], ['refugio', 3], ['corral', 1], ['totem', 1]];
      for (const [k, n] of need) { if (E.bdone(k).length >= n) continue; const cost = { fogata: 4, refugio: 3, corral: 6, totem: 12 }[k]; if (G.trad < cost) break; for (let i = 0; i < 20; i++) { const a = BR() * 6.283, r = 25 + BR() * 70, b0 = G.B.length; E.placeBuilding(k, { x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r }); if (G.B.length > b0) break; } break; }
    }
    // ---- habilidades con criterio
    const foes = [], seen = new Set(); const sample = mine.length > 14 ? mine.filter((_, i) => i % Math.ceil(mine.length / 14) === 0) : mine;
    for (const m of sample) for (const b of G.A) { if (b.dead || b.sp.team === 'player' || seen.has(b.id) || (b.sp.team === 'wild' && b.sp.diet === 'herb')) continue; if (Math.hypot(b.x - m.x, b.y - m.y) < 130) { seen.add(b.id); foes.push(b); } }
    const avgHp = mine.reduce((s, a) => s + a.hp / a.mhp, 0) / mine.length, avgHu = mine.reduce((s, a) => s + a.hunger, 0) / mine.length;
    const can = id => abOn.has(id) && !(G.ab[id] > 0);
    if (foes.length) {
      const boss = foes.some(f => f.sp.boss), pow = foes.reduce((s, f) => s + (f.sp.boss ? 8 : 1) * (f.sp.atk || 1) / 6, 0);
      if (can('rug') && (foes.length >= 2 || boss || avgHp < .7)) E.useAbility('rug');
      if (can('ala') && mine.length >= 5 && (pow > mine.length * .35 || boss)) E.useAbility('ala');
      if (can('exc') && avgHp < .5) E.useAbility('exc');
      if (can('cam') && (avgHp < .65 || boss) && !(G.digT > 0)) E.useAbility('cam');
    }
    if (can('mig') && avgHu < 38 && !G.migT) {
      // ir hacia donde hay más plantas útiles lejos de la manada
      let bx = null, bv = 0; for (let k = 0; k < 6; k++) { const c = G.plants[Math.floor(BR() * G.plants.length)]; if (!c || (G.me.hab === 'water' ? !c.w : c.w)) continue; let v = 0; for (const p of G.plants) if (p.v > .5 && Math.hypot(p.x - c.x, p.y - c.y) < 90) v++; if (v > bv && Math.hypot(c.x - h.x, c.y - h.y) > 60) { bv = v; bx = c; } }
      if (bx) E.placeMig(bx);
    }
  }
  const G = E.G, st = E.stats();
  const end = G.over ? (G.phase === 2 && st.pop > 0 ? 'win' : 'lose') : 'timeout';
  return Object.assign({ seed: o.seed, diff: o.diff, spec: o.spec, bot: o.bot, end, t: Math.round(G.t), phase: G.phase, pop: st.pop, evos: G.evos, nests: st.nests, ncol: Object.keys(E.colonized()).length, avgPop: Math.round(M.popSum / Math.max(1, M.popN)), dc: G.dc || {}, kills: G.kills, ab: [...abOn].join('') }, M);
};
