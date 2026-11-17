// Prueba Era 3 (Ciclo 4 · civilizaciones): bucle constructor (colocar → construir por etapas → generar → tope de almacén → mejorar → Edad → crecer),
// partida completa hasta fundar, prioridades con efecto, rivales que reaccionan, Bus (contrato y hash), alertas con histéresis, partida vieja migrada y datos para la interfaz.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-ciclo.js
// Convención: los bloques «preparación» fijan recursos/obras solo para llegar al paso que se prueba (se dice en cada uno); lo que se afirma sale de la simulación.
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'); const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
(async () => {
  const b = await chromium.launch(); const errs = []; const mk = async () => { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); }); await p.goto(url); await p.evaluate(() => localStorage.removeItem('evo_lineage')); await p.addScriptTag({ content: fs.readFileSync(path.resolve(__dirname, 'era3-bots.js'), 'utf8') }); return p; };
  const p = await mk();

  console.log('\n[1] Bucle constructor: colocar → construir por etapas → generar → tope → mejorar → crecer');
  const A = await p.evaluate(() => {
    const E = window.__e3, out = {}; E.diffI = 0; E.newGame('CICLO-1', { pers: ['comerciante', 'belicoso'], species: 'ter_ingeniero', traits: [] }); E.setStarted(true); const G = E.G, Bus = E.Bus, evs = {}, log = [];
    ['work', 'carry', 'drop', 'build', 'built', 'born', 'tech', 'eat', 'death', 'alert', 'age'].forEach(k => Bus.on(k, (a, b2) => { evs[k] = (evs[k] || 0) + 1; if (k === 'build' || k === 'built') log.push([k, a.k, k === 'build' ? +b2.toFixed(2) : !!b2]); }));
    const play = s => { for (let i = 0; i < s * 20; i++) E.step(.05); };
    play(30); out.rec = { carry: evs.carry || 0, drop: evs.drop || 0, work: evs.work || 0, eat: evs.eat || 0 };
    // colocar: la granja va a la grilla y paga 1 de 4 etapas
    G.wood = 20; const s = E.findSpot('granja'); const w0 = G.wood; out.placed = E.placeBuilding('granja', s); const gb = G.B[G.B.length - 1]; out.pay = { w0, w1: G.wood, paid: E.buildingInfo(gb).paid, gx: gb.gx, gy: gb.gy, sz: gb.sz };
    let guard = 0; while (!gb.done && guard++ < 4000) { E.step(.05); if (G.wood < 4) G.wood = 10; } out.granjaDone = gb.done;
    // generar: obreros en la granja producen solos (sin viajes)
    for (let i = 0; i < 2; i++) E.setRole('agr', 1); const f0 = G.x3.fl.tot.f_agr || 0; out.crew = 0; for (let t = 0; t < 60; t++) { play(1); out.crew = Math.max(out.crew, E.buildingInfo(gb).workers); } out.farm = (G.x3.fl.tot.f_agr || 0) - f0;
    // extractor + tope: con el almacén lleno, lo producido de más se pierde
    G.wood = 20; G.stone = 10; E.placeBuilding('ext1', E.findSpot('ext1')); const eb = G.B[G.B.length - 1]; guard = 0; while (!eb.done && guard++ < 4000) { E.step(.05); if (G.wood < 4) G.wood = 10; if (G.stone < 2) G.stone = 4; }
    E.setRole('art', 1); E.setRole('art', 1); const cap = E.matCap(); G.wood = cap; G.stone = cap; const l0 = G.x3.lost.mat1; play(30); out.cap = cap; out.wood = G.wood; out.lost = G.x3.lost.mat1 - l0; out.alAlmacen = !!G.x3.al.almacen;
    // obra detenida sin material
    G.wood = 6; E.placeBuilding('vivienda', E.findSpot('vivienda')); const vb = G.B[G.B.length - 1]; out.vPaid = E.buildingInfo(vb).paid; for (let i = 0; i < 20 * 40; i++) { G.wood = 0; E.step(.05); } const bi = E.buildingInfo(vb); out.stall = { stall: bi.stall, paid: bi.paid, alert: !!G.x3.al.obra };
    G.wood = 20; guard = 0; while (!vb.done && guard++ < 4000) { E.step(.05); if (G.wood < 4) G.wood = 10; } out.cap1 = E.shelterCap();
    // mejorar: nivel 2 pide la Edad II
    out.upgNo = E.upgradeCheck(vb).why; E.core().lvl = 2; E.modsDirty(); out.capPre = E.shelterCap();   // preparación: Edad II
    G.wood = 30; G.stone = 20; const nx = E.buildingInfo(vb).next; out.next = nx && { n: nx.n, cap: nx.fx.cap, cost: nx.cost }; out.upg = E.upgradeBuilding(vb); const capDuring = E.shelterCap(); guard = 0; while (vb.upg && guard++ < 4000) { E.step(.05); if (G.wood < 4) G.wood = 20; if (G.stone < 2) G.stone = 10; }
    out.capDuring = capDuring; out.cap2 = E.shelterCap(); out.lvl2 = vb.lvl; out.max = E.upgradeCheck(vb).why;
    // crecer: con comida y camas la población crece; sin camas no
    const pop0 = G.P.length, b0 = G.births; for (let t = 0; t < 300; t++) { play(1); G.food = Math.max(G.food, G.P.length * 2 + 12); } out.grow = { pop0, pop1: G.P.length, births: G.births - b0 };
    while (G.P.length < E.shelterCap() + 8) G.P.push(E.mkPerson(310, 330, 100, 'libre')); G.food = 200; out.noRoom = E.growthCheck(E.adults(), G.P.length).why[0];
    out.stages = log.filter(l => l[1] === 'vivienda').map(l => l[0] + ':' + l[2]); out.evs = evs; return out;
  });
  console.log(JSON.stringify(A));
  ok(A.rec.carry > 0 && A.rec.drop > 0 && A.rec.work > 0, 'recolectar: eventos work/carry/drop en 30 s');
  ok(A.placed && A.pay.w0 - A.pay.w1 === 1.25 && A.pay.paid === 1 && A.pay.sz === 2, 'colocar: la granja (2×2) queda en la grilla (' + A.pay.gx + ',' + A.pay.gy + ') y paga 1 de 4 etapas');
  ok(A.granjaDone && A.farm > 5 && A.crew >= 1, 'generar: la granja produce sola con obreros (' + A.farm.toFixed(1) + ' de comida en 60 s, ' + A.crew + ' obreros)');
  ok(A.wood <= A.cap && A.lost > 0 && A.alAlmacen, 'tope de almacén: lo producido de más se pierde (' + A.lost.toFixed(1) + ' en 30 s) y salta la alerta «almacen»');
  ok(A.vPaid === 1 && /madera/.test(A.stall.stall) && A.stall.paid <= 2 && A.stall.alert, 'sin madera la obra se detiene en el límite de etapa y salta la alerta «obra»');
  ok(/Edad II/.test(A.upgNo) && A.upg && A.next.n === 'Choza' && A.next.cap === 6 && A.capDuring === A.capPre && A.cap2 === A.capPre + 2 && A.lvl2 === 2 && /Edad III/.test(A.max), 'mejorar: nivel 2 pide Edad II; «Madriguera → Choza» suma camas al terminar; el 3 pide Edad III');
  ok(A.stages.filter(s => s.startsWith('build')).length >= 3 && A.stages.includes('built:false') && A.stages.includes('built:true'), 'etapas de obra y mejora emitidas por el Bus');
  ok(A.grow.births > 0 && A.grow.pop1 > A.grow.pop0 && /sin lugar/.test(A.noRoom), 'crecer: con comida y camas nacen (' + A.grow.pop0 + ' → ' + A.grow.pop1 + '); sin camas no («' + A.noRoom + '»)');

  console.log('\n[2] Partida completa con un bot «Clash» (Fácil): orden de eventos hasta fundar la civilización');
  let C = null; for (let i = 0; i < 6 && !(C && C.end === 'win'); i++) { C = await p.evaluate(s => { const E = window.__e3, order = {}; const seen = (k, f) => E.Bus.on(k, (a, b2) => { if (order[k] === undefined && (!f || f(a, b2))) order[k] = Math.round(E.G.t); });
    seen('work'); seen('carry'); seen('drop'); seen('build'); seen('built', (b2, up) => !up); seen('tech'); seen('age', n => n === 2); seen('train'); seen('wonder'); seen('win'); E.Bus.on('age', n => { if (n === 3 && order.age3 === undefined) order.age3 = Math.round(E.G.t); }); E.Bus.on('built', (b2, up) => { if (up && order.upgrade === undefined) order.upgrade = Math.round(E.G.t); });
    const r = window.runBot3(s, 0, 2600, 'clash', { world: { pers: ['comerciante', 'orgulloso'] }, species: 'ter_ingeniero' }); r.order = order; r.goals = (E.G.g || []).map(g => g.id + ':' + g.ok); return r; }, 'FULL-' + i); }
  console.log(JSON.stringify({ seed: C.seed, end: C.end, t: C.t, ages: C.ages, order: C.order, goals: C.goals }));
  ok(C.end === 'win', 'el bot «Clash» funda la civilización (seed ' + C.seed + ', ' + C.t + ' s)');
  const o = C.order; ok(o.work <= o.drop && o.build < o.built && o.built <= o.age && o.age < o.age3 && o.age3 < o.wonder && o.wonder <= o.win && o.tech !== undefined && o.upgrade !== undefined, 'orden: recolectar ' + o.work + ' → obra ' + o.build + ' → terminada ' + o.built + ' → Edad II ' + o.age + ' → Edad III ' + o.age3 + ' → Maravilla ' + o.wonder + ' → fundar ' + o.win);
  ok(C.goals.every(g => /true$/.test(g)) && C.goals.length === 3, 'metas medibles cumplidas: ' + C.goals.join(' '));
  ok(C.busErr === 0, 'sin errores de suscriptores');

  console.log('\n[3] Prioridades: efecto medible en oficios y producción (misma semilla)');
  const Pz = await p.evaluate(() => { const E = window.__e3, res = {}; const run = (pr, seed) => { E.diffI = 1; E.newGame(seed, { pers: ['comerciante', 'orgulloso'], species: 'ter_ingeniero' }); E.setStarted(true); const G = E.G;   // preparación: 22 adultos para que los oficios sean legibles
      for (let i = 0; i < 14; i++) G.P.push(E.mkPerson(300 + i, 330, 100, 'libre')); G.food = 80; G.wood = 30; G.x3.prio = Object.assign({ comida: 1, construccion: 1, defensa: 1, exploracion: 1, saber: 1 }, pr); G.birthT = 1e9;
      for (let i = 0; i < 20 * 60; i++) { E.step(.05); if (G.food < 30) G.food = 60; } E.placeBuilding('vivienda', E.findSpot('vivienda')); const f0 = Object.assign({}, G.x3.fl.tot);
      for (let i = 0; i < 20 * 120; i++) { E.step(.05); if (G.food < 30) G.food = 60; if (G.wood < 8) G.wood = 8; if (G.wood > 30) G.wood = 30; } const ti = E.tribeInfo(), f1 = G.x3.fl.tot; return { roles: ti.roles, foodIn: (f1.f_rec || 0) + (f1.f_caz || 0) - (f0.f_rec || 0) - (f0.f_caz || 0), woodIn: (f1.w_in || 0) - (f0.w_in || 0) }; };
    const sum = (pr) => { const o = { roles: {}, foodIn: 0, woodIn: 0 }; ['P1', 'P2', 'P3'].forEach(sd => { const r = run(pr, sd); for (const k in r.roles) o.roles[k] = (o.roles[k] || 0) + r.roles[k]; o.foodIn += r.foodIn; o.woodIn += r.woodIn; }); return o; };
    res.comidaAlto = sum({ comida: 2, construccion: 0 }); res.construccionAlto = sum({ comida: 0, construccion: 2 }); res.defAlto = sum({ defensa: 2 }); res.defBajo = sum({ defensa: 0 }); return res; });
  const fw = r => r.roles.rec + r.roles.caz + r.roles.agr, bw = r => r.roles.art + r.roles.con;
  console.log(JSON.stringify({ comidaAlto: Pz.comidaAlto, construccionAlto: Pz.construccionAlto }));
  ok(fw(Pz.comidaAlto) > fw(Pz.construccionAlto) && bw(Pz.construccionAlto) > bw(Pz.comidaAlto), 'comida alta → más gente en comida (' + fw(Pz.comidaAlto) + ' vs ' + fw(Pz.construccionAlto) + '); construcción alta → más en materiales/obra (' + bw(Pz.construccionAlto) + ' vs ' + bw(Pz.comidaAlto) + ')');
  ok(Pz.construccionAlto.woodIn > Pz.comidaAlto.woodIn && Pz.comidaAlto.foodIn > Pz.construccionAlto.foodIn, 'efecto en producción: madera ' + Pz.construccionAlto.woodIn.toFixed(1) + ' vs ' + Pz.comidaAlto.woodIn.toFixed(1) + '; comida ' + Pz.comidaAlto.foodIn.toFixed(1) + ' vs ' + Pz.construccionAlto.foodIn.toFixed(1));
  ok(Pz.defAlto.roles.def > Pz.defBajo.roles.def, 'defensa alta: más defensores (' + Pz.defAlto.roles.def + ' vs ' + Pz.defBajo.roles.def + ')');

  console.log('\n[4] Rivales: otras civilizaciones con personalidad, relación con causas y reacción a las decisiones');
  const Rv = await p.evaluate(() => { const E = window.__e3, res = {}; const fresh = (seed, pers, d) => { E.diffI = d === undefined ? 1 : d; E.newGame(seed, { pers, species: 'ter_ingeniero' }); E.setStarted(true); return E.G; };
    let G = fresh('RIVAL-A', ['comerciante', 'belicoso']); const ri = E.rivalInfo(); res.pers = ri.map(c => c.pers + ':' + c.civ + ':' + c.n); res.a = E.PERS;
    G.food = 60; G.wood = 20; const c0 = E.clanOf(0), rb = c0.rel; E.deal(0, 'f2w'); const r1 = c0.rel; E.deal(0, 'gift'); const r2 = c0.rel; E.deal(0, 'gift'); const r3 = c0.rel;
    res.trade = { rb, r1, r2, r3, causes: E.rivalInfo()[0].causes.map(c => c.key), summary: E.rivalInfo()[0].summary };
    // tu gente trabajando en su zona enfría la relación; con derecho de paso no
    const inZone = (pass) => { G = fresh('RIVAL-B', ['comerciante', 'orgulloso']); G.food = 60; const c = E.clanOf(0); if (pass) E.deal(0, 'paso'); const r0 = c.rel; const qs = []; for (let i = 0; i < 5; i++) { const q = E.mkPerson(c.x - 30, c.y + 20, 100, 'rec'); q.pin = true; G.P.push(q); qs.push(q); } for (let i = 0; i < 20 * 60; i++) { qs.forEach(q => { q.x = c.x - 30; q.y = c.y + 20; q.hunger = 100; }); E.step(.05); } return { drop: r0 - c.rel, why: E.rivalInfo()[0].causes.map(x => x.key) }; };
    res.zone = inZone(false); res.zonePass = inZone(true);
    G = fresh('RIVAL-D', ['belicoso', 'comerciante']); G.t = 300; const cB = E.clanOf(0); const wk = E.raidGate(cB), sz = E.raidSize(cB);
    for (let i = 0; i < 6; i++) { const q = E.mkPerson(310, 330, 100, 'def'); q.pin = true; G.P.push(q); } const st = E.raidGate(cB), s1 = E.tribeStr(); res.weak = { weak: wk, sz, strong: st, s1 };
    const raidLoss = nDef => { G = fresh('RIVAL-E', ['belicoso', 'comerciante'], 0); G.t = 200; G.food = 100; for (let i = 0; i < nDef; i++) { const q = E.mkPerson(305 + i * 5, 330, 100, 'def'); q.pin = true; G.P.push(q); } const c = E.clanOf(0); c.prepN = 5; E.spawnRaid(c); let n = 0; while ((G.raidActive || G.Rd.length) && n++ < 20 * 80) E.step(.05); return { food: G.food, deaths: G.dc.saqueo || 0 }; };
    res.loss0 = raidLoss(0); res.loss4 = raidLoss(4);
    const raidsWith = rel => { G = fresh('RIVAL-F', ['comerciante', 'belicoso'], 1); G.food = 500; for (let i = 0; i < 3; i++) { const q = E.mkPerson(305 + i * 5, 330, 100, 'def'); q.pin = true; G.P.push(q); } G.birthT = 1e9; const c = E.clanOf(0), other = E.clanOf(1); other.allied = true; other.rel = 80; c.rel = rel; const s0 = c.sent; for (let i = 0; i < 20 * 900; i++) { E.step(.05); c.rel = rel; other.rel = 80; if (G.food < 100) G.food = 300; } return c.sent - s0; };
    res.raidsHigh = raidsWith(40); res.raidsLow = raidsWith(-40);
    return res; });
  console.log(JSON.stringify(Rv));
  ok(Rv.pers[0].startsWith('comerciante') && Rv.pers[1].startsWith('belicoso') && !Rv.pers.some(x => x.split(':')[1] === 'ter') && Rv.a.comerciante.tradeMul > Rv.a.belicoso.tradeMul, 'rivales: otras civilizaciones con personalidad (' + Rv.pers.join(' | ') + ')');
  ok(Rv.trade.r1 > Rv.trade.rb && Rv.trade.r2 > Rv.trade.r1 && (Rv.trade.r2 - Rv.trade.r1) > (Rv.trade.r3 - Rv.trade.r2) && Rv.trade.causes.includes('comercio') && Rv.trade.causes.includes('regalo'), 'comerciar y regalar suben la relación con causas visibles (' + Rv.trade.summary + ')');
  ok(Rv.zone.drop > 2 && Rv.zone.why.includes('recursos') && Rv.zonePass.drop < Rv.zone.drop - 2, 'trabajar en su zona enfría la relación (' + Rv.zone.drop.toFixed(1) + '); con derecho de paso casi no (' + Rv.zonePass.drop.toFixed(1) + ')');
  ok(Rv.weak.weak.go && /débil/.test(Rv.weak.weak.why) && !Rv.weak.strong.go && Rv.weak.s1 >= Rv.weak.sz, 'el belicoso ataca si te ve débil (' + Rv.weak.weak.why + ') y se frena con 6 defensores');
  ok(Rv.loss4.food > Rv.loss0.food, 'defender sirve: comida tras el saqueo ' + Rv.loss0.food.toFixed(0) + ' sin defensores vs ' + Rv.loss4.food.toFixed(0) + ' con 4');
  ok(Rv.raidsLow > Rv.raidsHigh, 'sin causa no hay saqueo: relación −40 → ' + Rv.raidsLow + ' saqueos en 15 min; +40 → ' + Rv.raidsHigh);

  console.log('\n[5] Bus: contrato de eventos, suscriptor que falla, hash idéntico con y sin suscriptores');
  const Bs = await p.evaluate(() => { const E = window.__e3, res = {}; const play = () => { E.diffI = 1; E.newGame('BUS-1', { pers: ['belicoso', 'orgulloso'], species: 'ave_rapaz' }); E.setStarted(true); const G = E.G;
      for (let i = 0; i < 20 * 700; i++) { E.step(.05); if (i % 20 === 0) { if (G.wood < 30) G.wood += 15; for (const id in E.TECH) if (E.techCheck(id).ok) { E.research(id); break; } if (i % 400 === 0 && G.B.length < 8) { const s = E.findSpot(['vivienda', 'granja', 'ext1'][G.B.length % 3]); if (s) E.placeBuilding(['vivienda', 'granja', 'ext1'][G.B.length % 3], s); } if (i === 8000) E.setPrio('defensa', 2); } } return E.stateHash(); };
    res.h0 = play(); const types = ['work', 'hit', 'kill', 'born', 'death', 'carry', 'drop', 'eat', 'build', 'built', 'tech', 'season', 'raid', 'raidEnd', 'raidPrep', 'alert', 'rel', 'prio', 'role', 'trade', 'gift', 'ally', 'deal', 'discover', 'fission', 'disease', 'path', 'win', 'lose', 'age', 'train', 'node', 'expedition', 'move', 'demolish', 'wonder'], seen = {};
    types.forEach(t => E.Bus.on(t, () => { seen[t] = (seen[t] || 0) + 1; throw new Error('suscriptor roto ' + t); })); res.h1 = play(); res.err = E.Bus.err; res.seen = seen; return res; });
  console.log(JSON.stringify(Bs.seen), 'err', Bs.err);
  ok(Bs.h0 === Bs.h1, 'el hash de estado es idéntico con y sin suscriptores (aunque lancen excepciones): ' + Bs.h0);
  ok(Bs.err > 100, 'los suscriptores rotos se cuentan (' + Bs.err + ') y la partida sigue');
  const need = ['work', 'carry', 'drop', 'eat', 'build', 'built', 'season', 'born', 'hit', 'role', 'prio', 'alert', 'rel', 'tech'];
  ok(need.every(k => Bs.seen[k] > 0), 'eventos emitidos en 700 s: ' + need.map(k => k + ' ' + Bs.seen[k]).join(', '));
  const forced = await p.evaluate(() => { const E = window.__e3, seen = {}, K = ['raid', 'raidEnd', 'raidPrep', 'tech', 'trade', 'gift', 'ally', 'deal', 'discover', 'path', 'win', 'kill', 'age', 'train', 'node', 'expedition', 'move', 'demolish', 'wonder', 'fission', 'disease']; K.forEach(t => E.Bus.on(t, () => { seen[t] = (seen[t] || 0) + 1; }));
    E.diffI = 0; E.newGame('BUS-2', { pers: ['comerciante', 'comerciante'], species: 'acu_abisal' }); E.setStarted(true); const G = E.G; G.food = 300; G.know = 50; G.wood = 300; G.stone = 300; E.research('concha');
    E.deal(0, 'f2w'); E.deal(0, 'gift'); E.clanOf(0).rel = 60; E.deal(0, 'ally'); E.deal(1, 'paso'); E.choosePath('mercado'); const c1 = E.clanOf(1); G.t = 300; c1.rel = -90; c1.rt = 0; G.x3.gap = 0; for (let i = 0; i < 20 * 80; i++) E.step(.05);
    E.discoverPoi(G.x3.pois[0], G.P[0]);
    // preparación: requisitos de la Edad II cumplidos a mano para disparar «age», luego Edad III, cuartel, unidad, nodo, mover, demoler y Maravilla
    const fin = k => { G.wood = 300; G.stone = 300; G.food = 300; E.placeBuilding(k, E.findSpot(k)); const bb = G.B[G.B.length - 1]; bb.done = true; bb.prog = 1; bb.paid = 4; G.sites.length = 0; E.modsDirty(); return bb; };
    ['vivienda', 'vivienda', 'almacen', 'granja'].forEach(fin); G.know = 99; E.research('cardumen'); E.research('algas'); G.food = 300; G.wood = 300; G.stone = 300; E.upgradeBuilding(E.core()); let n = 0; while (E.age() < 2 && n++ < 8000) { E.step(.05); G.food = Math.max(G.food, 100); G.wood = Math.max(G.wood, 100); G.stone = Math.max(G.stone, 100); }
    E.core().lvl = 3; E.modsDirty(); const cu = fin('cuartel'); while (G.P.length < 14) G.P.push(E.mkPerson(310, 330, 100, 'libre')); E.train('gue'); E.train('gue'); n = 0; while (G.x3.q.length && n++ < 4000) { E.step(.05); G.food = Math.max(G.food, 100); }
    E.sendExpedition('node', 0, 'tomar'); n = 0; while (G.x3.nodes[0].own !== 2 && n++ < 8000) { E.step(.05); G.food = Math.max(G.food, 100); }
    const v = fin('vivienda'); E.moveBuilding(v, E.findSpot('vivienda', { x: 200, y: 300 })); E.demolish(v);
    const mw = fin('maravilla'); mw.done = false; mw.prog = 1; mw.paid = 4; G.sites.push(mw); E.step(.05); document.getElementById('dlg').classList.remove('show'); G.modal = false;
    const lim = E.cohLimit(); while (G.P.length < lim + 6) G.P.push(E.mkPerson(310, 330, 100, 'libre')); G.fissT = 100; for (let i = 0; i < 20; i++) E.step(.05); while (G.P.length < E.shelterCap() + 12) G.P.push(E.mkPerson(310, 330, 100, 'libre')); G.x3.dis = 59; for (let i = 0; i < 60; i++) E.step(.05);
    E.found(); return seen; });
  console.log(JSON.stringify(forced)); ok(['raid', 'raidEnd', 'raidPrep', 'tech', 'trade', 'gift', 'ally', 'deal', 'discover', 'path', 'win', 'kill', 'age', 'train', 'node', 'expedition', 'move', 'demolish', 'wonder', 'fission', 'disease'].every(k => forced[k] > 0), 'eventos nuevos del Bus (age, train, node, expedition, move, demolish, wonder) y los de siempre');

  console.log('\n[6] Histéresis de alertas');
  const Al = await p.evaluate(() => { const E = window.__e3, log = []; E.Bus.on('alert', a => log.push([a.kind, a.level, Math.round(E.G.t)])); window.runBot3('ALERT-1', 1, 900, 'economico', { species: 'ins_colmena' }); return { log }; });
  const last = {}; let minDown = 999, flaps = 0; for (const [k, l, t] of Al.log) { const prev = last[k]; if (prev && l === 'ok') minDown = Math.min(minDown, t - prev.t); if (prev && prev.l === 'ok' && l === 'warn' && t - prev.t < 10) flaps++; last[k] = { l, t }; }
  ok(flaps === 0 && Al.log.length > 5 && minDown >= 10, 'alertas sin parpadeo: mínimo encendida ' + (minDown === 999 ? 'n/a' : minDown) + ' s, ' + Al.log.length + ' cambios en 15 min, ' + flaps + ' reencendidos en < 10 s');

  console.log('\n[7] Partida vieja (evo_save3_v1 del commit base) migrada a Terrestres con grilla, y guardado nuevo');
  const fx = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/era3-save-v1-base.json'), 'utf8')); ok(!fx.G.x3 && fx.v === 1 && fx.G.B.some(b => b.k === 'refugio'), 'el guardado de referencia es de la versión anterior (fogata, refugios, almacén en obra)');
  const Old = await p.evaluate(fxs => { const E = window.__e3; localStorage.setItem('evo_save3_v1', fxs); const d = JSON.parse(fxs); E.restoreGame(d); const G = E.G, B = G.B;
    const over = []; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], c = B[j]; if (a.gx < c.gx + c.sz && c.gx < a.gx + a.sz && a.gy < c.gy + c.sz && c.gy < a.gy + a.sz) over.push(a.k + 'x' + c.k); }
    const res = { civ: G.x3.civ, v: G.x3.v, slots: B.map(b => b.k + (b.done ? '' : '*')).join(','), grid: B.every(b => Number.isInteger(b.gx) && Number.isInteger(b.gy) && b.x === (b.gx + b.sz / 2) * 20), over, core: !!E.core(), camp: [G.camp.x, G.camp.y], techs: Object.keys(G.techs), sites: G.sites.length, t0: Math.round(G.t), pop0: G.P.length, mig: G.x3.mig };
    for (let i = 0; i < 20 * 600; i++) E.step(.05); const ti = E.tribeInfo(); res.t1 = Math.round(G.t); res.pop1 = G.P.length; res.info = !!(ti && E.rivalInfo() && ti.buildings.length); res.hashA = E.stateHash();
    E.restoreGame(JSON.parse(fxs)); for (let i = 0; i < 20 * 600; i++) E.step(.05); res.hashB = E.stateHash(); E.clearSave(); return res; }, JSON.stringify(fx));
  console.log(JSON.stringify(Old));
  ok(Old.civ === 'ter' && Old.v === 2 && Old.mig === 1 && Old.core && /^corazon,vivienda,vivienda,vivienda,vivienda,almacen\*$/.test(Old.slots), 'migración: civilización Terrestre, fogata → Corazón, refugios → viviendas, almacén en obra sigue en obra (' + Old.slots + ')');
  ok(Old.grid && Old.over.length === 0 && Old.techs.join() === 'fuego' && Old.sites === 1, 'cada edificio quedó en una celda libre de la grilla, sin solapes; tecnología Fuego conservada');
  ok(Old.info && (Old.t1 - Old.t0 >= 599 || Old.pop1 === 0) && Old.hashA === Old.hashB, 'la partida migrada sigue 10 min sin errores (población ' + Old.pop0 + ' → ' + Old.pop1 + ') y es determinista');
  const Sv = await p.evaluate(() => { const E = window.__e3; const run = viaSave => { E.diffI = 1; E.newGame('SAVE-X', { pers: ['belicoso', 'comerciante'], species: 'acu_anfibio', tierra: true, traits: ['garras'] }); E.setStarted(true); const G = E.G; G.know = 30; G.wood = 60; G.stone = 30; G.food = 60;
      const stepN = n => { for (let i = 0; i < n; i++) E.step(.05); }; E.research('concha'); E.placeBuilding('vivienda', { gx: 10, gy: 14 }); E.placeBuilding('granja', E.findSpot('granja')); E.setRole('con', 1); stepN(900); E.core().lvl = 3; E.modsDirty(); G.wood = 300; G.stone = 300; G.food = 300;
      const cu = (() => { E.placeBuilding('cuartel', E.findSpot('cuartel')); const bb = G.B[G.B.length - 1]; bb.done = true; bb.prog = 1; bb.paid = 4; G.sites.length = 0; return bb; })(); while (G.P.length < 14) G.P.push(E.mkPerson(310, 330, 100, 'libre')); E.train('gue'); E.train('gue'); stepN(400); E.sendExpedition('node', 1, 'tomar'); stepN(60); E.train('gue'); G.x3.clans[0].rt = 1; G.t = Math.max(G.t, 300); stepN(200);
      const mid = { upgOrQ: G.x3.q.length, ord: G.P.filter(p => p.ord).length, land: G.B.some(b => b.civ === 'ter'), prep: G.x3.clans.some(c => c.prep > 0) };
      if (viaSave) { E.saveGame(); const d = E.readSave(); E.newGame('OTRA'); E.restoreGame(d); mid.wk = E.G.P.filter(p => p.wk).every(p => E.G.B.includes(p.wk)); mid.sum = d.summary; } stepN(2400); return { h: E.stateHash(), mid }; };
    const a = run(false), b2 = run(true); return { a: a.h, b: b2.h, mid: a.mid, mid2: b2.mid }; });
  console.log(JSON.stringify(Sv)); ok(Sv.mid.ord > 0 && Sv.mid.land && Sv.mid2.wk, 'el guardado cubre lo nuevo: expedición en curso (' + Sv.mid.ord + ' unidades), cola del cuartel, edificio de tierra de la anfibia, obreros con su extractor');
  ok(Sv.a === Sv.b && /La Ciudad del Arrecife · Edad III · \d+ habitantes/.test(Sv.mid2.sum), 'guardar/cargar no cambia el futuro (resumen: ' + Sv.mid2.sum + ')');

  console.log('\n[8] Datos para la interfaz: tribeInfo / rivalInfo / buildingInfo / roleInfo');
  const Ui = await p.evaluate(() => { const E = window.__e3; E.diffI = 1; E.newGame('UI-1', { species: 'ins_parasito' }); E.setStarted(true); for (let i = 0; i < 20 * 150; i++) E.step(.05); const ti = E.tribeInfo(), ri = E.rivalInfo(), bi = E.buildingInfo(0), rl = E.RORDER.map(r => E.roleInfo(r));
    const nan = []; (function walk(o, p) { if (typeof o === 'number' && !isFinite(o)) nan.push(p); else if (o && typeof o === 'object') for (const k in o) walk(o[k], p + '.' + k); })({ ti, ri, bi, rl }, 'x');
    return { keys: Object.keys(ti), rk: Object.keys(ri[0]), bk: Object.keys(bi), nan, res: ti.res, asset: bi.asset }; });
  console.log(JSON.stringify(Ui)); ok(Ui.nan.length === 0, 'ningún valor no finito en los datos de interfaz');
  ok(['civ', 'city', 'species', 'age', 'ageReq', 'res', 'bonuses', 'army', 'nodes', 'canFound', 'pop', 'roles', 'food', 'wood', 'stone', 'know', 'housing', 'needs', 'buildings', 'works', 'threats', 'alerts', 'goals', 'prio', 'targets'].every(k => Ui.keys.includes(k)), 'tribeInfo trae civilización, Edad, requisitos, recursos con nombre, bonos, ejército y nodos');
  ok(Ui.res.comida.n === 'Jalea' && Ui.asset === 'ins.corazon.1' && ['civ', 'civN', 'camp', 'rel', 'causes', 'deals'].every(k => Ui.rk.includes(k)) && ['lvl', 'gx', 'gy', 'sz', 'asset', 'canMove', 'canDemolish', 'refund', 'next'].every(k => Ui.bk.includes(k)), 'rivalInfo y buildingInfo traen civilización, grilla, id de asset, mover/demoler');
  ok(errs.length === 0, 'sin errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('\nERA 3 CICLO OK'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
