// Perfiles de estrategia de la Era 2 (se inyecta en la página; simula llamando __e2.step(.05), sin dibujar).
// window.runProfile(o) -> resultado. o: {seed, diff 0|1|2, spec, profile, biome='pradera', maxT=900, abOff:[...ids de habilidades prohibidas], fast:false}
// Perfiles: razonable (referencia), cazador, defensivo, migrador, enjambre, habil (solo habilidades con criterio), ordenes (solo órdenes por animal), tactico (ambos), pasivo.
// El bot usa su PROPIO azar (mulberry32), nunca R() de la simulación, y solo usa la API que tiene un jugador (doLay, placeNest, travel, useAbility,
// issueOrder, stance, pickEvo...): no toca el estado.
// Además mide por qué pierde: causas de muerte (Bus 'kill'), reparto de estados, hambre/energía medias, golpes, presas, colapsos.
(function () {
  const SPEC2CLS = { ter_cazador: 'ter', ter_gigante: 'ter', ter_ingeniero: 'ter', ins_colmena: 'ins', ins_enjambre: 'ins', ins_parasito: 'ins', acu_abisal: 'acu', acu_arrecife: 'acu', acu_anfibio: 'acu', ave_rapaz: 'ave', ave_carronera: 'ave', ave_migratoria: 'ave' };
  // knobs de cada perfil: stance (regla), lay (s entre puestas), nests (cuántos), colPop (población mínima para colonizar), ab ('none'|'basic'|'smart'), ord ('none'|'focus'|'retreat'|'all'), wEvo (multiplicadores del puntaje de rasgos)
  const PROF = {
    razonable: { stance: 'forage', lay: 6, nests: 2, colPop: 8, ab: 'basic', ord: 'none', wEvo: {} },
    cazador: { stance: 'agresivo', lay: 7, nests: 2, colPop: 8, ab: 'smart', ord: 'focus', wEvo: { hunt: 2.5, coop: 1.5, def: 0.7 } },
    defensivo: { stance: 'defensivo', lay: 8, nests: 3, colPop: 12, ab: 'smart', ord: 'retreat', wEvo: { def: 2, nest: 2, stealth: 1.5, hunt: 0.5 } },
    migrador: { stance: 'forage', lay: 6, nests: 2, colPop: 8, ab: 'smart', ord: 'none', wEvo: { m: 2, cF: 2, search: 2, cold: 1.5, drought: 1.5 }, travelFirst: true },
    enjambre: { stance: 'forage', lay: 2.5, nests: 3, colPop: 8, ab: 'basic', ord: 'none', wEvo: { r: 3, nest: 2, hunt: 0.5 } },
    habil: { stance: 'forage', lay: 6, nests: 2, colPop: 8, ab: 'smart', ord: 'none', wEvo: {} },   // solo habilidades con criterio de situación y nivel
    ordenes: { stance: 'forage', lay: 6, nests: 2, colPop: 8, ab: 'basic', ord: 'all', wEvo: {} },   // solo órdenes por animal (fuego concentrado, retirada de heridos, ir a las plantas)
    tactico: { stance: 'forage', lay: 6, nests: 2, colPop: 8, ab: 'smart', ord: 'all', wEvo: {} },
    pasivo: { stance: 'forage', lay: 10, nests: 0, colPop: 1e9, ab: 'none', ord: 'none', wEvo: {}, passive: true }
  };
  window.PERFILES = Object.keys(PROF);
  let HOOK = null;   // acumuladores de la corrida actual (los listeners del Bus se instalan una sola vez por página)
  window.runProfile = function (o) {
    const E = window.__e2, TR = {}; E.TRAITS.forEach(t => TR[t.id] = t);
    const P = PROF[o.profile || 'razonable'];
    let br = (s => { let a = 0; for (let i = 0; i < s.length; i++) a = (Math.imul(a, 31) + s.charCodeAt(i)) >>> 0; return a || 1; })('bot' + o.seed + o.profile);
    const BR = () => { br = (br + 0x6D2B79F5) >>> 0; let t = br; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const H = HOOK = { dc: {}, dl: [], eat: { plant: 0, carc: 0, animal: 0, egg: 0 }, hitMade: 0, hitTaken: 0, miss: 0, kills: 0, exh: 0, rest: 0, dis: 0, disWhy: {}, ordEnd: 0, ab: {}, abR: {}, born: 0, lay: 0, st: {}, nS: 0, hu: 0, en: 0, hp: 0, inj: 0, terr: 0, spr: 0, aSec: 0, hrS: 0, wat: 0, seen: new Set(), sprAt: {}, tNow: () => E.G && E.G.t };
    if (!window.__hookOn) {
      window.__hookOn = 1; const B = E.Bus, mine = a => a && a.sp && a.sp.team === 'player' && !a.sp.domestic;
      B.on('kill', (b, src) => { const h = HOOK; if (!h) return; if (mine(b)) { const k = src ? (src.sp.team === 'rival' ? 'rival' : src.sp.team === 'player' ? 'x' : src.sp.boss ? 'jefe' : 'depredador:' + src.sp.key) : (b.lc || (b.hunger <= 0 ? 'hambre' : 'otro')); h.dc[k] = (h.dc[k] || 0) + 1; h.dl.push([Math.round(h.tNow()), k, b.hunger < 25 ? 1 : 0]); if (h.dl.length > 40) h.dl.shift(); } else if (src && mine(src)) h.kills++; });
      B.on('eat', (a, t, k) => { const h = HOOK; if (h && mine(a) && h.eat[k] != null) h.eat[k]++; });
      B.on('hit', (a, b) => { const h = HOOK; if (!h) return; if (mine(a)) h.hitMade++; else if (mine(b)) h.hitTaken++; });
      B.on('miss', a => { const h = HOOK; if (h && mine(a)) h.miss++; });
      B.on('exhausted', a => { const h = HOOK; if (h && mine(a)) h.exh++; });
      B.on('rest', a => { const h = HOOK; if (h && mine(a)) h.rest++; });
      B.on('disobey', (a, why) => { const h = HOOK; if (h && mine(a)) { h.dis++; h.disWhy[why] = (h.disWhy[why] || 0) + 1; } });
      B.on('orderEnd', a => { const h = HOOK; if (h && mine(a)) h.ordEnd++; });
      B.on('ability', (id, m) => { const h = HOOK; if (h) h.ab[id] = (h.ab[id] || 0) + 1; });
      B.on('abilityEnd', (id, o) => { const h = HOOK; if (!h) return; const q = h.abR[id] || (h.abR[id] = { n: 0 }); q.n++; for (const k in o) if (typeof o[k] === 'number') q[k] = (q[k] || 0) + o[k]; });   // resultado MEDIDO de cada habilidad (evento abilityEnd)
      B.on('born', a => { const h = HOOK; if (h && mine(a)) h.born++; });
      B.on('lay', a => { const h = HOOK; if (h && mine(a)) h.lay++; });
    }
    const col = E.colonized(); for (const k in col) delete col[k];
    E.cls = SPEC2CLS[o.spec]; E.specKey = o.spec; E.diffI = o.diff; E.stance = 'forage';
    E.newGame(o.biome || 'pradera', null, o.seed); E.setStarted(true);
    const abOff = new Set(o.abOff || []), abMode = P.ab, orders = P.ord;
    const BADK = { cF: 1, m: 1, cold: 1, drought: 1, fire: 1, plague: 1 }, W0 = { r: 3, hunt: 2, d: 1, def: 6, stealth: 5, nest: 4, inst: 2, eff: 3, search: 1, coop: 3, scav: 2, cF: 3, m: 3, cold: 1.5, drought: 1.5, fire: 1, water: 0, fert: 1, mind: 2, plague: 0.5 };
    const fxScore = fx => { let s = 0; for (const k in fx) { const [op, v] = fx[k], w = (W0[k] || 0.5) * (P.wEvo[k] || 1), bad = BADK[k] ? -1 : 1; s += op === '*' ? bad * w * Math.log(v) * 4 : w * v * 10; } return s; };
    const TIERRA = { lobuladas: 1, pulmones: 1, amniota: 1 };
    const offerScore = of => { const t = TR[of.id]; if (o.tierra === 'si' && TIERRA[of.id]) return 1e6; if (o.tierra === 'no') { if (TIERRA[of.id]) return -1e6; if (of.id === 'radiadas') return 1e6; } return of.v ? fxScore(t[of.v].fx) + 0.3 : fxScore(t.fx); };
    const mineL = () => E.G.A.filter(a => a.sp === E.G.me && !a.dead);
    const herd = m => { let x = 0, y = 0; for (const a of m) { x += a.x; y += a.y; } return { x: x / m.length, y: y / m.length }; };
    const M = { evoT: [], tNest1: null, tNest2: null, tEvo4: null, tPop: null, tCol2: null, tPhase2: null, minPop: 1e9, maxPop: 0, popSum: 0, popN: 0, nTravel: 0, ordN: 0, popAt: {} };
    let tick = 0, lastLay = -99, lastNestTry = -99, lastOrd = -99, gatherUntil = 0;
    const maxT = o.maxT || 900, isHerb = SPEC2CLS && E.SP2[o.spec].diet === 'herb';
    const reach = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    while (E.G.t < maxT && !E.G.over) {
      E.step(.05); tick++; let G = E.G; if (G.modal) G.modal = false;
      if (tick % 20) continue;
      const st = E.stats(), t = G.t;
      if (!M.tNest1 && st.nests >= 1) M.tNest1 = Math.round(t); if (!M.tNest2 && st.nests >= 2) M.tNest2 = Math.round(t);
      if (!M.tEvo4 && G.evos >= 4) M.tEvo4 = Math.round(t); if (!M.tPop && st.pop >= (o.diff ? 28 : 20)) M.tPop = Math.round(t);
      if (!M.tCol2 && Object.keys(E.colonized()).length >= 2) M.tCol2 = Math.round(t);
      if (!M.tPhase2 && G.phase === 2) M.tPhase2 = Math.round(t);
      if (t > 60) M.minPop = Math.min(M.minPop, st.pop); M.maxPop = Math.max(M.maxPop, st.pop); M.popSum += st.pop; M.popN++;
      for (const T of [60, 120, 240, 480]) if (t >= T && M.popAt[T] == null) M.popAt[T] = st.pop;
      const mine = mineL();
      // ---- muestreo de diagnóstico (1 vez por s): estados, hambre, energía, vida, heridas
      if (mine.length) { H.nS++; let hu = 0, en = 0, hp = 0, inj = 0; for (const a of mine) { H.st[a.st] = (H.st[a.st] || 0) + 1; hu += a.hunger; en += a.en == null ? 70 : a.en; hp += a.hp / a.mhp; inj += a.inj || 0; } H.hu += hu / mine.length; H.en += en / mine.length; H.hp += hp / mine.length; H.inj += inj / mine.length;
        // identidad de clase: territorio (celdas de 80 px con algún animal propio), dispersión (distancia media al centro), animal-segundos
        const cells = new Set(); let cx = 0, cy = 0; for (const a of mine) { cells.add(Math.floor(a.x / 80) * 100 + Math.floor(a.y / 80)); H.seen.add(Math.floor(a.x / 80) * 100 + Math.floor(a.y / 80)); cx += a.x; cy += a.y; } cx /= mine.length; cy /= mine.length;
        let sd = 0; for (const a of mine) sd += Math.hypot(a.x - cx, a.y - cy); sd /= mine.length; { const L = G.biome.lake; for (const a of mine) { H.hrS += a._hr || 0; const dx = (a.x - L.x) / L.rx, dy = (a.y - L.y) / L.ry; if (dx * dx + dy * dy < 1) H.wat++; } } H.terr += cells.size; H.spr += sd; H.aSec += mine.length; for (const T of [60, 120, 240]) if (G.t >= T && H.sprAt[T] == null) H.sprAt[T] = Math.round(sd); }
      // ---- evolución
      while (G.pending > 0) { const offs = E.offers(); let b = offs[0]; if (!P.passive) for (const x of offs) if (offerScore(x) > offerScore(b)) b = x; E.pickEvo(b); M.evoT.push(Math.round(G.t)); }
      if (!mine.length) continue;
      if (t - lastLay >= P.lay) { lastLay = t; E.doLay(); }
      if (P.passive) continue;
      const h = herd(mine);
      if (G.N.length < P.nests && !G.nestB && !G.bB && t > 8 && t - lastNestTry > 5) { lastNestTry = t; E.placeNest({ x: h.x + (G.N.length ? 50 * G.N.length : 0), y: h.y }); }
      // ---- colonizar
      if (G.phase === 1 && st.pop >= P.colPop && E.colonized()[G.biomeKey] && Object.keys(E.colonized()).length < 2 && !G.nestB) {
        // el jugador elige el ecosistema con más comida para SU hábitat (agua: algas; tierra y vuelo: plantas)
        let best = null, bs2 = -1; if (o.col2 && E.colonized()[G.biomeKey] && !E.colonized()[o.col2] && o.col2 !== G.biomeKey && (o.col2 !== 'oceano' || ['water', 'amph', 'fly'].includes(G.me.hab))) best = o.col2; else for (const k in E.BIOMES) { if (E.colonized()[k] || k === G.biomeKey) continue; if (k === 'oceano' && !['water', 'amph', 'fly'].includes(G.me.hab)) continue; const B = E.BIOMES[k], food = G.me.hab === 'water' ? B.alg : G.me.hab === 'amph' ? B.plants * .5 + B.alg : B.plants, sc = food * B.grow * (1 + .5 * B.help.filter(id => G.me.traits.includes(id)).length); if (sc > bs2) { bs2 = sc; best = k; } }
        if (best && (G.N.filter(n => n.done).length >= Math.min(2, P.nests) || P.travelFirst)) { E.travel(best); M.nTravel++; G = E.G; if (G.modal) G.modal = false; continue; }
      }
      // ---- civilización
      if (G.phase === 2 && !G.bB && !G.nestB) {
        const need = [['fogata', 1], ['refugio', 3], ['corral', 1], ['totem', 1]];
        for (const [k, n] of need) { if (E.bdone(k).length >= n) continue; const cost = { fogata: 4, refugio: 3, corral: 6, totem: 12 }[k]; if (G.trad < cost) break; for (let i = 0; i < 20; i++) { const a = BR() * 6.283, r = 25 + BR() * 70, b0 = G.B.length; E.placeBuilding(k, { x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r }); if (G.B.length > b0) break; } break; }
      }
      // ---- amenazas cerca de la manada
      const foes = [], seen = new Set(); const sample = mine.length > 14 ? mine.filter((_, i) => i % Math.ceil(mine.length / 14) === 0) : mine;
      for (const m of sample) for (const b of G.A) { if (b.dead || b.sp.team === 'player' || seen.has(b.id) || (b.sp.team === 'wild' && b.sp.diet === 'herb')) continue; if (Math.hypot(b.x - m.x, b.y - m.y) < 130) { seen.add(b.id); foes.push(b); } }
      const avgHp = mine.reduce((s, a) => s + a.hp / a.mhp, 0) / mine.length, avgHu = mine.reduce((s, a) => s + a.hunger, 0) / mine.length;
      const avgEn = mine.reduce((s, a) => s + (a.en == null ? 70 : a.en), 0) / mine.length;
      // ---- actitud según el perfil
      if (P.stance === 'agresivo') { const near = foes.some(f => f.sp.team === 'rival' || f.sp.atk >= 6); E.stance = (near && avgHu > 45 && avgEn > 30 && (!isHerb || foes.length <= mine.length / 3)) ? 'attack' : 'forage'; }
      else if (P.stance === 'defensivo') { const big = foes.some(f => f.sp.boss) || foes.length >= 3; if (big && t > gatherUntil) gatherUntil = t + 8; E.stance = (t < gatherUntil && avgHu > 30 && G.N.some(n => n.done)) ? 'gather' : 'forage'; }
      // ---- habilidades
      const nearPl = c => { let v = 0; for (const p of G.plants) if (p.v > .5 && Math.hypot(p.x - c.x, p.y - c.y) < 100 && (G.me.hab === 'water' ? p.w : !p.w)) v++; return v; };
      const lv = id => E.abilityInfo(id), can = id => abMode !== 'none' && !abOff.has(id) && !(G.ab[id] > 0) && avgEn > (abMode === 'smart' ? lv(id).costo + 22 : 35);
      if (abMode === 'basic') {
        if (foes.length) {
          const boss = foes.some(f => f.sp.boss), pow = foes.reduce((s, f) => s + (f.sp.boss ? 8 : 1) * (f.sp.atk || 1) / 6, 0);
          if (can('rug') && (foes.length >= 2 || boss || avgHp < .7)) E.useAbility('rug');
          if (can('ala') && mine.length >= 5 && (pow > mine.length * .35 || boss)) E.useAbility('ala');
          if (can('exc') && avgHp < .5) E.useAbility('exc');
          if (can('cam') && (avgHp < .65 || boss) && !(G.digT > 0)) E.useAbility('cam');
        }
      } else if (abMode === 'smart') {
        // uso con criterio de situación y de nivel: Alarma ANTES del contacto (con depredadores que se acercan), Camuflaje para emboscar o evadir, Excavar herido, Rugido con varios enemigos o jefe
        const preds = []; for (const b of G.A) { if (b.dead || b.sp.team === 'player' || (b.sp.team === 'wild' && b.sp.diet === 'herb')) continue; if (!b.sp.boss && b.st !== 'hunt') continue; let near = 0; for (const m of sample) if (Math.hypot(b.x - m.x, b.y - m.y) < 190) { near++; break; } if (near) preds.push(b); }
        const boss = preds.some(f => f.sp.boss), pw = preds.reduce((s, f) => s + (f.sp.boss ? 8 : 1) * (f.sp.atk || 1) / 6, 0);
        if (preds.length) {
          // Alarma (Ciclo 4: «¡al nido!»): además de la fuerza del peligro, se usa con 2 o más cazadores cerca (o crías/heridos) si hay nido y la manada no pasa hambre (retirarse cuesta comer)
          const vuln = mine.filter(a => a.age < 20 || a.hp < a.mhp * .6 || (a.inj || 0) > .3).length;
          if (can('ala') && mine.length >= 4 && (pw > mine.length * .2 || boss || (G.N.some(n => n.done) && avgHu > 45 && (preds.length >= 2 || vuln >= 2)))) E.useAbility('ala');
          if (foes.length && can('rug') && (foes.length >= 2 || boss || avgHp < .7)) E.useAbility('rug');
          if (foes.length && can('exc') && avgHp < .5) E.useAbility('exc');
          if (can('cam') && (avgHp < .65 || boss || (E.G.me.diet !== 'herb' && lv('cam').nivel >= 2 && avgHu < 60)) && !(G.digT > 0)) E.useAbility('cam');
        }
        // Excavar = hibernar (Ciclo 4): para aguantar la escasez (invierno, sequía, plantas agotadas) con hambre baja; no se usa con enemigos encima
        if (!preds.length && can('exc') && !abOff.has('exc') && avgHu < 38 && ((G.ev && G.ev.k === 'sequia') || (G.x2 && G.x2.scar >= 1) || G.season === 3 || nearPl(h) < 2) && !(G.digT > 0) && G.migT <= 0) E.useAbility('exc');
      }
      if (abMode !== 'none' && !abOff.has('mig') && !(G.ab.mig > 0) && avgEn > (abMode === 'smart' ? 40 : 35) && avgHu < 62 && !G.migT && nearPl(h) < 3) {
        let bx = null, bv = 0; for (let k = 0; k < 6; k++) { const c = G.plants[Math.floor(BR() * G.plants.length)]; if (!c || (G.me.hab === 'water' ? !c.w : c.w)) continue; let v = 0; for (const p of G.plants) if (p.v > .5 && Math.hypot(p.x - c.x, p.y - c.y) < 90) v++; if (v > bv && Math.hypot(c.x - h.x, c.y - h.y) > 60) { bv = v; bx = c; } }
        if (bx) E.placeMig(bx);
      }
      // ---- órdenes por animal
      if (orders !== 'none' && t - lastOrd >= 2) {
        lastOrd = t; const ids = [];
        if (orders === 'focus' || orders === 'all') {
          // fuego concentrado: los sanos y con hambre atacan a la presa/enemigo más cercano a la manada
          const can2 = mine.filter(a => a.hp > a.mhp * .6 && (a.en == null ? 70 : a.en) > 45 && !a.ord && a.hunger < 75 && a.age >= 20);
          if (can2.length && G.me.diet !== 'herb') {
            let tg = null, bd = 1e9; for (const b of G.A) { if (b.dead || b.sp.team === 'player' || b.sp.boss) continue; const e = b.sp.team === 'wild' && b.sp.diet === 'herb'; if (!e && b.sp.team !== 'rival') continue; if (b.rr > G.me.r * 1.3) continue; const d = reach(b, h); if (d < bd && d < 220) { bd = d; tg = b; } }
            if (tg) { const grp = can2.filter(a => reach(a, tg) < 220).slice(0, 5).map(a => a.id); if (grp.length >= Math.min(2, can2.length)) { E.issueOrder(grp, { k: 'attack', tid: tg.id }); M.ordN += grp.length; } }
          }
        }
        if (orders === 'retreat' || orders === 'all') {
          // los heridos se retiran al nido; los curados vuelven a lo automático
          const home = G.N.find(n => n.done) || h;
          const weak = mine.filter(a => a.hp < a.mhp * .4 && !a.ord && foes.length && foes.some(f => reach(f, a) < 160)).map(a => a.id);
          if (weak.length) { E.issueOrder(weak, { k: 'move', x: home.x, y: home.y }); M.ordN += weak.length; }
          const healed = mine.filter(a => a.ord && a.ord.k === 'move' && a.hp > a.mhp * .8).map(a => a.id); if (healed.length) E.issueOrder(healed, { k: 'forage' });
        }
        if (orders === 'all') {
          // los hambrientos lejos de plantas van a la mancha más rica
          if (G.me.diet !== 'carn') { const lost = mine.filter(a => a.hunger < 40 && !a.ord && nearPl(a) < 2).slice(0, 4); if (lost.length) { let bx = null, bv = 0; for (let k = 0; k < 8; k++) { const c = G.plants[Math.floor(BR() * G.plants.length)]; if (!c || (G.me.hab === 'water' ? !c.w : c.w)) continue; let v = 0; for (const p of G.plants) if (p.v > .5 && Math.hypot(p.x - c.x, p.y - c.y) < 70) v++; if (v > bv) { bv = v; bx = c; } } if (bx && bv >= 3) { E.issueOrder(lost.map(a => a.id), { k: 'move', x: bx.x, y: bx.y }); M.ordN += lost.length; } } }
        }
      }
    }
    const G = E.G, st = E.stats();
    const end = G.over ? (G.phase === 2 && st.pop > 0 ? 'win' : 'lose') : 'timeout';
    const ns = Math.max(1, H.nS);
    // causa de la derrota: la más frecuente entre las últimas 12 muertes propias (solo si se extinguió); para «estancada» la más frecuente de todas
    let loseCause = null;
    if (end !== 'win') { const src = end === 'lose' ? H.dl.slice(-12) : H.dl; const c = {}; for (const [, k, hungry] of src) { c[k] = (c[k] || 0) + 1; } const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; loseCause = top ? top[0] : (end === 'lose' ? 'sin registro' : 'sin muertes'); }
    const stSh = {}; let tot = 0; for (const k in H.st) tot += H.st[k]; for (const k in H.st) stSh[k] = Math.round(100 * H.st[k] / tot);
    return Object.assign({ seed: o.seed, diff: o.diff, spec: o.spec, profile: o.profile, biome: o.col2 ? (o.biome || 'pradera') + '>' + o.col2 : (o.biome || 'pradera'), biomeEnd: G.biomeKey, end, loseCause, t: Math.round(G.t), phase: G.phase, pop: st.pop, evos: G.evos, nests: st.nests, ncol: Object.keys(E.colonized()).length, avgPop: Math.round(M.popSum / Math.max(1, M.popN)), dc: H.dc, hungryDeaths: H.dl.filter(x => x[2]).length, kills: H.kills, eat: H.eat, hitMade: H.hitMade, hitTaken: H.hitTaken, miss: H.miss, exh: H.exh, rest: H.rest, dis: H.dis, disWhy: H.disWhy, ordEnd: H.ordEnd, abUse: H.ab, abRes: H.abR, born: H.born, lay: H.lay, stSh, avgHu: Math.round(H.hu / ns), avgEn: Math.round(H.en / ns), avgHp: Math.round(100 * H.hp / ns), avgInj: Math.round(100 * H.inj / ns) / 100, hr: Math.round(1000 * H.hrS / Math.max(1, H.aSec)) / 1000, wat: Math.round(1000 * H.wat / Math.max(1, H.aSec)) / 1000, cover: H.seen.size, carcShare: Math.round(1000 * H.eat.carc / Math.max(1, H.eat.plant + H.eat.carc + H.eat.animal + H.eat.egg)) / 1000, terr: Math.round(10 * H.terr / ns) / 10, spr: Math.round(H.spr / ns), sprAt: H.sprAt, eatPA: Math.round(1000 * (H.eat.plant + H.eat.carc + H.eat.animal + H.eat.egg) / Math.max(1, H.aSec)) / 1000, hitTakenPA: Math.round(1000 * H.hitTaken / Math.max(1, H.aSec)) / 1000, bornPA: Math.round(1000 * H.born / Math.max(1, H.aSec)) / 1000, deathPA: Math.round(1000 * Object.values(H.dc).reduce((s, v) => s + v, 0) / Math.max(1, H.aSec)) / 1000 }, M);
  };
})();
