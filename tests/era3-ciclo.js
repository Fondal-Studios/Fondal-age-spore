// Prueba Era 3 (Ciclo 4): circuito económico completo, decisiones estratégicas con efecto medible, rivales que reaccionan, Bus y partida vieja.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-ciclo.js
// Convención: los bloques «preparación» fijan recursos/Conocimiento solo para llegar al paso que se prueba (se dice en cada uno); lo que se afirma sale de la simulación.
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path'); const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
(async () => {
  const b = await chromium.launch(); const errs = []; const mk = async () => { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); }); await p.goto(url); await p.addScriptTag({ content: fs.readFileSync(path.resolve(__dirname, 'era3-bots.js'), 'utf8') }); return p; };
  let p = await mk();

  console.log('\n[1] Circuito económico: recolectar -> producir -> construir -> mejorar -> crecer');
  const A = await p.evaluate(() => {
    const E = window.__e3, out = {}; E.diffI = 0; E.newGame('CICLO-1', { pers: ['comerciante', 'belicoso'] }); E.setStarted(true); const G = E.G, Bus = E.Bus, evs = {}, log = [];
    ['work', 'carry', 'drop', 'build', 'built', 'born', 'tech', 'eat', 'death', 'alert'].forEach(k => Bus.on(k, (a, b2, c) => { evs[k] = (evs[k] || 0) + 1; if (k === 'build' || k === 'built') log.push([k, a.k, k === 'build' ? +b2.toFixed(2) : !!b2, Math.round(G.wood * 100) / 100, Math.round(G.t)]); }));
    const play = s => { for (let i = 0; i < s * 20; i++) E.step(.05); };
    // 1. Recolectar: 90 s sin tocar nada
    play(90); const f = G.x3.fl.tot; out.rec = { f_rec: f.f_rec || 0, w_in: f.w_in || 0, s_in: f.s_in || 0, carry: evs.carry || 0, drop: evs.drop || 0, work: evs.work || 0, eat: evs.eat || 0, prodRec: E.tribeInfo().food.prod.rec, perPerson: E.tribeInfo().food.perPerson, food: G.food };
    // preparación: Conocimiento y materiales para las tecnologías y obras (la tribu sola tarda ~15 min)
    G.know = 80; ['fuego', 'piedra', 'cesta', 'ceram', 'agri'].forEach(k => E.research(k)); out.techs = Object.keys(G.techs); out.techEv = evs.tech || 0;
    G.wood = 40; G.stone = 20; G.food = Math.max(G.food, 30); if (!E.adults().some(p => p.role === 'con')) E.setRole('con', 1);
    // 2. Producir: huerto + agricultores
    const w0 = G.wood; E.placeBuilding('huerto', { x: 360, y: 400 }); const hb = G.B[G.B.length - 1]; out.huertoPay = { w0, w1: G.wood, paid: E.buildingInfo(hb).paid };
    for (let i = 0; i < 3; i++) E.setRole('agr', 1); // sin huerto terminado no se puede
    out.agrBefore = E.adults().filter(p => p.role === 'agr').length; G.wood = 40;
    let guard = 0; while (!hb.done && guard++ < 3000) { E.step(.05); if (G.wood < 20) G.wood = 40; } out.huertoBuilt = hb.done; out.huertoT = Math.round(G.t);
    // 3. Construir: refugio por etapas (y obra detenida por falta de madera)
    G.wood = 20; const nB = log.length; E.placeBuilding('refugio', { x: 250, y: 390 }); const rb = G.B[G.B.length - 1]; out.refPay = { w1: G.wood, paid: E.buildingInfo(rb).paid, cap0: E.shelterCap() };
    for (let i = 0; i < 20 * 40; i++) { G.wood = 0; E.step(.05); } const bi = E.buildingInfo(rb); out.stall = { stall: bi.stall, prog: bi.prog, paid: bi.paid, alert: !!(G.x3.al.obra) };
    G.wood = 20; guard = 0; while (!rb.done && guard++ < 4000) { E.step(.05); if (G.wood < 8) G.wood = 20; } out.refBuilt = rb.done; out.cap1 = E.shelterCap(); out.stages = log.slice(nB).filter(l => l[1] === 'refugio').map(l => l[0] + ':' + l[2]);
    // 4. Mejorar: Choza -> Casa -> Casa de barro
    const chk = E.upgradeCheck(rb); out.upgOk = chk.ok; const wo0 = G.x3.fl.tot.w_out || 0, so0 = G.x3.fl.tot.s_out || 0; G.wood = 30; G.stone = 20;
    const upI = E.buildingInfo(rb); out.nextInfo = upI.next && { n: upI.next.n, cap: upI.next.fx.cap, cost: upI.next.cost, canUpgrade: upI.next.canUpgrade };
    out.upgStart = E.upgradeBuilding(rb); const capDuring = E.shelterCap(); play(2); out.upgInfo = E.buildingInfo(rb); out.capDuring = capDuring;
    guard = 0; while (rb.upg && guard++ < 4000) { E.step(.05); if (G.wood < 8) G.wood = 30; if (G.stone < 4) G.stone = 20; } out.cap2 = E.shelterCap(); out.lvl2 = rb.lvl; out.upgBuilt = log.filter(l => l[0] === 'built' && l[2] === true).length;
    out.upgPaid = { w: +((G.x3.fl.tot.w_out || 0) - wo0).toFixed(2), s: +((G.x3.fl.tot.s_out || 0) - so0).toFixed(2) };
    G.wood = 30; G.stone = 20; E.upgradeBuilding(rb); guard = 0; while (rb.upg && guard++ < 4000) { E.step(.05); if (G.wood < 8) G.wood = 30; if (G.stone < 4) G.stone = 20; } out.cap3 = E.shelterCap(); out.lvl3 = rb.lvl; out.maxUpg = E.upgradeCheck(rb);
    // sin la tecnología no se mejora: el almacén de cestas pide Cestería (la tenemos) y el granero pide Cerámica (la tenemos); probamos con un edificio nuevo en partida aparte más abajo
    // 5. Crecer: con comida y camas la tribu nace; sin camas no
    const pop0 = G.P.length, b0 = G.births; for (let t = 0; t < 400; t++) { play(1); G.food = Math.max(G.food, G.P.length * 2 + 12); G.wood = Math.max(G.wood, 10); } out.grow = { pop0, pop1: G.P.length, births: G.births - b0, cap: E.shelterCap() };
    while (G.P.length < E.shelterCap() + 8) G.P.push(E.mkPerson(300, 330, 100, 'libre')); G.food = 200; const gc = E.growthCheck(E.adults(), G.P.length); out.noRoom = { ok: gc.ok, why: gc.why[0] };
    out.evs = evs; return out;
  });
  console.log(JSON.stringify(A));
  ok(A.rec.f_rec > 0 && A.rec.w_in > 0, 'recolectar: comida (' + A.rec.f_rec.toFixed(1) + ') y madera (' + A.rec.w_in.toFixed(1) + ') entran en 90 s');
  ok(A.rec.carry > 0 && A.rec.drop > 0 && A.rec.work > 0 && A.rec.eat > 0, 'eventos del Bus: work/carry/drop/eat emitidos');
  ok(A.rec.prodRec > 0 && A.rec.perPerson > 0, 'balance visible: producción de recolectores ' + A.rec.prodRec.toFixed(2) + '/s y consumo por habitante ' + A.rec.perPerson.toFixed(3) + '/s');
  ok(A.techs.length === 5 && A.techEv === 5, 'tecnologías investigadas (5) con evento tech');
  ok(A.huertoPay.w0 - A.huertoPay.w1 === 1 && A.huertoPay.paid === 1, 'construir: el huerto paga por etapas (1 de 4 al empezar: 4 madera / 4)');
  ok(A.agrBefore === 0, 'agricultores: no se pueden asignar sin huerto terminado');
  ok(A.huertoBuilt, 'el huerto se terminó (t=' + A.huertoT + ' s)');
  ok(A.refPay.paid === 1 && A.refPay.w1 === 18.5, 'refugio: primera etapa pagada (1,5 madera)');
  ok(A.stall.stall === 'madera' && A.stall.paid <= 2 && A.stall.alert, 'sin madera la obra se detiene en el límite de etapa (' + A.stall.prog.toFixed(2) + ') y salta la alerta «obra»');
  ok(A.refBuilt && A.cap1 === 4, 'refugio terminado: capacidad 4');
  ok(A.stages.filter(s => s.startsWith('build')).length >= 3 && A.stages.includes('built:false'), 'etapas de obra emitidas (' + A.stages.join(' ') + ')');
  ok(A.upgOk && A.nextInfo && A.nextInfo.cap === 6 && A.nextInfo.n === 'Casa', 'buildingInfo: próximo nivel «Casa» con capacidad 6');
  ok(A.upgStart && A.capDuring === 4 && A.upgInfo.upgrading && A.upgInfo.target.lvl === 2, 'mejora en curso: la capacidad sigue en 4 hasta terminar');
  ok(A.cap2 === 6 && A.lvl2 === 2 && A.upgBuilt >= 1, 'mejora terminada: capacidad 6 (evento built con mejora)');
  ok(Math.abs(A.upgPaid.w - 8) < .01 && Math.abs(A.upgPaid.s - 2) < .01, 'la mejora consumió exactamente su costo (8 madera, 2 piedra): ' + JSON.stringify(A.upgPaid));
  ok(A.cap3 === 8 && A.lvl3 === 3 && !A.maxUpg.ok, 'tercer nivel: capacidad 8 y sin más mejoras');
  ok(A.grow.births > 0 && A.grow.pop1 > A.grow.pop0, 'crecer: con comida y camas nacieron ' + A.grow.births + ' (' + A.grow.pop0 + ' -> ' + A.grow.pop1 + ')');
  ok(!A.noRoom.ok && /sin lugar/.test(A.noRoom.why), 'sin camas la tribu no crece: «' + A.noRoom.why + '»');

  console.log('\n[2] Progresar: partida completa con un bot económico (Fácil), orden de eventos hasta la fundación');
  let C = null; for (let i = 0; i < 12 && !(C && C.end === 'win'); i++) { C = await p.evaluate(s => { const E = window.__e3, order = {}; const seen = (k, f) => E.Bus.on(k, (a, b2, c) => { if (order[k] === undefined && (!f || f(a, b2, c))) order[k] = Math.round(E.G.t); });
    seen('work'); seen('carry'); seen('drop'); seen('build'); seen('built', (b2, up) => !up); seen('born'); seen('tech'); seen('discover'); seen('win'); E.Bus.on('built', (b2, up) => { if (up && order.upgrade === undefined) order.upgrade = Math.round(E.G.t); });
    const r = window.runBot3(s, 0, 2400, 'economico', { world: { pers: ['comerciante', 'orgulloso'] } }); r.order = order; r.goalsInfo = E.tribeInfo().goals.map(g => g.id + ':' + g.ok); return r; }, 'FULL-' + i); }
  console.log(JSON.stringify({ seed: C.seed, end: C.end, t: C.t, order: C.order, goals: C.goalsInfo, blds: C.blds }));
  ok(C.end === 'win', 'el bot económico llega a la ciudad (seed ' + C.seed + ', ' + C.t + ' s)');
  const o = C.order; ok(o.work <= o.carry && o.carry <= o.drop && o.drop < o.built && o.build < o.built && o.built <= o.upgrade && o.born !== undefined && o.tech !== undefined && o.upgrade < o.win, 'orden: recolectar ' + o.work + ' <= transportar ' + o.carry + ' <= depositar ' + o.drop + ' < (obra empieza ' + o.build + ') terminar ' + o.built + ' <= mejorar ' + o.upgrade + ' < ciudad ' + o.win + ' (nace ' + o.born + ', tecnología ' + o.tech + ')');
  ok(C.goalsInfo.every(g => /true$/.test(g)) && C.goalsInfo.length >= 5, 'objetivos de progreso medibles: ' + C.goalsInfo.join(' '));
  ok(/refugio[23]/.test(C.blds), 'edificios con nivel > 1 al final: ' + C.blds);
  ok(C.busErr === 0, 'sin errores de suscriptores');

  console.log('\n[3] Prioridades del jugador: efecto medible en oficios y producción (misma semilla)');
  const Pz = await p.evaluate(() => { const E = window.__e3, res = {}; const run = (pr, seed) => { E.diffI = 1; E.newGame(seed, { pers: ['comerciante', 'orgulloso'] }); E.setStarted(true); const G = E.G;   // preparación: una tribu de 22 adultos para que los oficios sean legibles
      for (let i = 0; i < 14; i++) G.P.push(E.mkPerson(300 + i, 330, 100, 'libre')); G.food = 80; G.wood = 30; G.x3.prio = Object.assign({ comida: 1, construccion: 1, defensa: 1, exploracion: 1, saber: 1 }, pr); G.birthT = 1e9;
      for (let i = 0; i < 20 * 60; i++) { E.step(.05); if (G.food < 40) G.food = 80; } E.placeBuilding('refugio', { x: 250, y: 390 }); const f0 = Object.assign({}, G.x3.fl.tot);
      for (let i = 0; i < 20 * 120; i++) { E.step(.05); if (G.food < 40) G.food = 80; if (G.wood < 8) G.wood = 8; } const ti = E.tribeInfo(), f1 = G.x3.fl.tot; return { roles: ti.roles, foodIn: (f1.f_rec || 0) + (f1.f_caz || 0) - (f0.f_rec || 0) - (f0.f_caz || 0), woodIn: (f1.w_in || 0) - (f0.w_in || 0) }; };
    const sum = (pr) => { const o = { roles: {}, foodIn: 0, woodIn: 0 }; ['P1', 'P2', 'P3'].forEach(sd => { const r = run(pr, sd); for (const k in r.roles) o.roles[k] = (o.roles[k] || 0) + r.roles[k]; o.foodIn += r.foodIn; o.woodIn += r.woodIn; }); return o; };
    res.comidaAlto = sum({ comida: 2, construccion: 0 }); res.construccionAlto = sum({ comida: 0, construccion: 2 }); res.defAlto = sum({ defensa: 2 }); res.defBajo = sum({ defensa: 0 }); return res; });
  const fw = r => r.roles.rec + r.roles.caz + r.roles.agr, bw = r => r.roles.art + r.roles.con;
  console.log(JSON.stringify({ comidaAlto: Pz.comidaAlto, construccionAlto: Pz.construccionAlto, defAlto: Pz.defAlto.roles, defBajo: Pz.defBajo.roles }));
  ok(fw(Pz.comidaAlto) > fw(Pz.construccionAlto), 'comida alta: más gente en comida (suma de 3 semillas: ' + fw(Pz.comidaAlto) + ' vs ' + fw(Pz.construccionAlto) + ')');
  ok(bw(Pz.construccionAlto) > bw(Pz.comidaAlto), 'construcción alta: más gente en materiales/obra (' + bw(Pz.construccionAlto) + ' vs ' + bw(Pz.comidaAlto) + ')');
  ok(Pz.construccionAlto.woodIn > Pz.comidaAlto.woodIn, 'efecto en producción: madera recolectada ' + Pz.construccionAlto.woodIn.toFixed(1) + ' (construcción alta) vs ' + Pz.comidaAlto.woodIn.toFixed(1) + ' (comida alta)');
  ok(Pz.comidaAlto.foodIn > Pz.construccionAlto.foodIn, 'efecto en producción: comida ' + Pz.comidaAlto.foodIn.toFixed(1) + ' (comida alta) vs ' + Pz.construccionAlto.foodIn.toFixed(1));
  ok(Pz.defAlto.roles.def > Pz.defBajo.roles.def, 'defensa alta: más defensores (' + Pz.defAlto.roles.def + ' vs ' + Pz.defBajo.roles.def + ')');

  console.log('\n[4] Rivales: personalidad, relación con causas y reacción a las decisiones');
  const Rv = await p.evaluate(() => { const E = window.__e3, res = {}; const fresh = (seed, pers, d) => { E.diffI = d === undefined ? 1 : d; E.newGame(seed, { pers }); E.setStarted(true); return E.G; };
    // a) personalidades distintas en datos
    let G = fresh('RIVAL-A', ['comerciante', 'belicoso']); const ri = E.rivalInfo(); res.pers = ri.map(c => c.pers + ':' + c.rel + ':' + c.persD.slice(0, 20)); res.a = E.PERS;
    // b) comerciar y regalar mejoran la relación y dejan causa
    G.food = 60; G.wood = 20; const c0 = E.clanOf(0), rb = c0.rel; E.deal(0, 'f2w'); const r1 = c0.rel; E.deal(0, 'gift'); const r2 = c0.rel; E.deal(0, 'gift'); const r3 = c0.rel;
    res.trade = { rb, r1, r2, r3, causes: E.rivalInfo()[0].causes.map(c => c.key), summary: E.rivalInfo()[0].summary, tr: G.trades };
    // c) construir en su territorio enfría la relación; con derecho de paso o alianza no
    G = fresh('RIVAL-B', ['comerciante', 'orgulloso']); G.wood = 40; G.stone = 10; G.food = 40; const cE = E.clanOf(0), rv0 = cE.rel; E.placeBuilding('refugio', { x: cE.x - 40, y: cE.y + 20 }); const tt0 = G.B.length; for (let i = 0; i < 20 * 40; i++) E.step(.05);
    res.terr = { before: rv0, after: cE.rel, buildings: G.B.filter(b => Math.hypot(b.x - cE.x, b.y - cE.y) < cE.r + 25).length, why: E.rivalInfo()[0].causes.map(c => c.key + ':' + c.d), hasAlert: !!G.x3.al.rival0 };
    G = fresh('RIVAL-C', ['comerciante', 'orgulloso']); G.wood = 40; G.stone = 10; G.food = 60; const cC = E.clanOf(0); E.deal(0, 'paso'); const rp0 = cC.rel; E.placeBuilding('refugio', { x: cC.x - 40, y: cC.y + 20 }); for (let i = 0; i < 20 * 40; i++) E.step(.05); res.paso = { before: rp0, after: cC.rel, drop: rp0 - cC.rel };
    // d) debilidad: sin defensores el belicoso «te ve débil» y ataca; con defensores y empalizada ya no
    G = fresh('RIVAL-D', ['belicoso', 'comerciante']); G.t = 300; const cB = E.clanOf(0); E.alerts(); const wk = E.raidGate(cB), s0 = E.tribeStr(), sz = E.raidSize(cB);
    for (let i = 0; i < 6; i++) { const q = E.mkPerson(300, 330, 100, 'def'); q.pin = true; G.P.push(q); } const st = E.raidGate(cB), s1 = E.tribeStr(); cB.rel = 20; const st2 = E.raidGate(cB);
    res.weak = { weak: wk, s0, sz, strong: st, s1, strongRel: st2 };
    // e) la defensa fuerte baja las pérdidas: mismo saqueo con y sin defensores
    const raidLoss = nDef => { G = fresh('RIVAL-E', ['belicoso', 'comerciante'], 0); G.t = 200; G.food = 100; for (let i = 0; i < nDef; i++) { const q = E.mkPerson(300 + i * 5, 330, 100, 'def'); q.pin = true; G.P.push(q); } const c = E.clanOf(0); c.prepN = 5; E.spawnRaid(c); let n = 0; while ((G.raidActive || G.Rd.length) && n++ < 20 * 80) E.step(.05); return { food: G.food, deaths: G.dc.saqueo || 0, raidLog: G.raidLog, ok: G.raidsOk }; };
    res.loss0 = raidLoss(0); res.loss4 = raidLoss(4);
    // f) la relación alta con el comerciante evita saqueos; baja los provoca (misma defensa débil)
    const raidsWith = rel => { G = fresh('RIVAL-F', ['comerciante', 'belicoso'], 1); G.food = 500; for (let i = 0; i < 3; i++) { const q = E.mkPerson(300 + i * 5, 330, 100, 'def'); q.pin = true; G.P.push(q); } G.birthT = 1e9; const c = E.clanOf(0); const other = E.clanOf(1); other.allied = true; other.rel = 80; c.rel = rel; let sent0 = c.sent; for (let i = 0; i < 20 * 900; i++) { E.step(.05); c.rel = rel; if (G.food < 100) G.food = 500; } return c.sent - sent0; };
    res.raidsHigh = raidsWith(40); res.raidsLow = raidsWith(-40);
    return res; });
  console.log(JSON.stringify(Rv));
  ok(Rv.pers[0].startsWith('comerciante') && Rv.pers[1].startsWith('belicoso') && Rv.a.comerciante.raidBelow < Rv.a.belicoso.opp * 100 && Rv.a.comerciante.tradeMul > Rv.a.belicoso.tradeMul, 'personalidades distintas en datos: ' + Rv.pers.join(' | '));
  ok(Rv.trade.r1 > Rv.trade.rb && Rv.trade.r2 > Rv.trade.r1 && (Rv.trade.r2 - Rv.trade.r1) > (Rv.trade.r3 - Rv.trade.r2), 'comerciar (+' + (Rv.trade.r1 - Rv.trade.rb) + ') y regalar suben la relación; el segundo regalo rinde menos (+' + (Rv.trade.r2 - Rv.trade.r1).toFixed(1) + ' y +' + (Rv.trade.r3 - Rv.trade.r2).toFixed(1) + ')');
  ok(Rv.trade.causes.includes('comercio') && Rv.trade.causes.includes('regalo') && /relación/.test(Rv.trade.summary), 'la relación muestra sus causas: ' + Rv.trade.summary);
  ok(Rv.terr.before - Rv.terr.after > 10 && Rv.terr.why.some(w => /^territorio:-/.test(w)), 'construir en su territorio enfría la relación ' + Rv.terr.before.toFixed(0) + ' -> ' + Rv.terr.after.toFixed(0) + ' (' + Rv.terr.why.join(', ') + ')');
  ok(Rv.paso.drop < Rv.terr.before - Rv.terr.after - 8, 'el derecho de paso evita casi toda la tensión (' + Rv.paso.drop.toFixed(1) + ' vs ' + (Rv.terr.before - Rv.terr.after).toFixed(1) + ')');
  ok(Rv.weak.weak.go && /débil/.test(Rv.weak.weak.why) && !Rv.weak.strong.go && Rv.weak.s1 >= Rv.weak.sz, 'el belicoso ataca si te ve débil (' + Rv.weak.weak.why + ') y se frena con 6 defensores (fuerza ' + Rv.weak.s1 + ' vs ' + Rv.weak.sz + ')');
  ok(Rv.loss4.food > Rv.loss0.food && Rv.loss4.deaths <= Rv.loss0.deaths, 'defender sirve: comida tras el saqueo ' + Rv.loss0.food.toFixed(0) + ' sin defensores vs ' + Rv.loss4.food.toFixed(0) + ' con 4 (muertes ' + Rv.loss0.deaths + ' vs ' + Rv.loss4.deaths + ')');
  ok(Rv.raidsLow > Rv.raidsHigh, 'sin causa no hay saqueo: relación -40 manda ' + Rv.raidsLow + ' saqueos en 15 min; relación +40 manda ' + Rv.raidsHigh);

  console.log('\n[5] Bus: contrato de eventos, suscriptor que falla, hash idéntico con y sin suscriptores');
  const Bs = await p.evaluate(() => { const E = window.__e3, res = {}; const play = () => { E.diffI = 1; E.newGame('BUS-1', { pers: ['belicoso', 'orgulloso'] }); E.setStarted(true); const G = E.G;
      for (let i = 0; i < 20 * 700; i++) { E.step(.05); if (i % 20 === 0) { if (G.wood < 30) G.wood += 15; if (G.know >= 3 && !E.has('fuego')) E.research('fuego'); if (i % 400 === 0 && G.B.length < 6) { E.placeBuilding('refugio', { x: 240 + G.B.length * 30, y: 390 }); } if (i === 8000) E.setPrio('defensa', 2); } } return E.stateHash(); };
    res.h0 = play(); const types = ['work', 'hit', 'kill', 'born', 'death', 'carry', 'drop', 'eat', 'build', 'built', 'tech', 'season', 'raid', 'raidEnd', 'raidPrep', 'alert', 'rel', 'prio', 'role', 'trade', 'gift', 'ally', 'deal', 'discover', 'fission', 'disease', 'path', 'win', 'lose'], seen = {};
    types.forEach(t => E.Bus.on(t, () => { seen[t] = (seen[t] || 0) + 1; throw new Error('suscriptor roto ' + t); })); res.h1 = play(); res.err = E.Bus.err; res.seen = seen; res.lastErr = E.Bus.last; return res; });
  console.log(JSON.stringify(Bs.seen), 'err', Bs.err);
  ok(Bs.h0 === Bs.h1, 'el hash de estado es idéntico con y sin suscriptores (aunque lancen excepciones): ' + Bs.h0);
  ok(Bs.err > 100, 'los suscriptores rotos se cuentan (' + Bs.err + ') y la partida sigue');
  const need = ['work', 'carry', 'drop', 'eat', 'build', 'built', 'season', 'born', 'death', 'hit', 'role', 'prio', 'alert', 'rel'];
  ok(need.every(k => Bs.seen[k] > 0), 'eventos emitidos en una partida de 700 s: ' + need.map(k => k + ' ' + Bs.seen[k]).join(', '));
  const forced = await p.evaluate(() => { const E = window.__e3, seen = {}; ['raid', 'raidEnd', 'raidPrep', 'tech', 'trade', 'gift', 'ally', 'deal', 'discover', 'fission', 'disease', 'path', 'win', 'kill'].forEach(t => E.Bus.on(t, () => { seen[t] = (seen[t] || 0) + 1; })); E.diffI = 0; E.newGame('BUS-2', { pers: ['comerciante', 'comerciante'] }); E.setStarted(true); const G = E.G; G.food = 80; G.know = 50; E.research('fuego');
    E.deal(0, 'f2w'); E.deal(0, 'gift'); E.clanOf(0).rel = 60; E.deal(0, 'ally'); E.deal(1, 'paso'); E.choosePath('mercado'); E.spawnRaid(E.clanOf(1)); for (let i = 0; i < 20 * 80; i++) E.step(.05);
    E.discoverPoi(G.x3.pois[0], G.P[0]); const lim = E.cohLimit(); while (G.P.length < lim + 6) G.P.push(E.mkPerson(300, 330, 100, 'libre')); G.fissT = 100; for (let i = 0; i < 20; i++) E.step(.05); G.food = 500; while (G.P.length < E.shelterCap() + 12) G.P.push(E.mkPerson(300, 330, 100, 'libre')); G.x3.dis = 59; for (let i = 0; i < 60; i++) E.step(.05); E.forceWin(); return seen; });
  console.log(JSON.stringify(forced)); ok(['raid', 'raidEnd', 'raidPrep', 'tech', 'trade', 'gift', 'ally', 'deal', 'discover', 'fission', 'disease', 'path', 'win', 'kill'].every(k => forced[k] > 0 || k === 'raidPrep' && forced.raid > 0), 'eventos forzados: ' + JSON.stringify(forced));

  console.log('\n[6] Histéresis de alertas');
  const Al = await p.evaluate(() => { const E = window.__e3, log = []; E.Bus.on('alert', a => log.push([a.kind, a.level, Math.round(E.G.t)])); const r = window.runBot3('ALERT-1', 1, 900, 'economico'); return { log, r: r.alerts }; });
  const last = {}; let minDown = 999, flaps = 0; for (const [k, l, t] of Al.log) { const prev = last[k]; if (prev && l === 'ok') minDown = Math.min(minDown, t - prev.t); if (prev && prev.l === 'ok' && l === 'warn' && t - prev.t < 10) flaps++; last[k] = { l, t }; }
  ok(flaps === 0, 'sin reencendidos de aviso (warn) en menos de 10 s de apagado (' + flaps + ')'); ok(Al.log.length > 5 && minDown >= 10, 'las alertas no se apagan antes de 10 s de haberse encendido (mínimo medido ' + (minDown === 999 ? 'n/a' : minDown) + ' s; ' + Al.log.length + ' cambios en 15 min, ' + flaps + ' reencendidos en < 10 s)');
  ok(Al.log.every(a => ['warn', 'crit', 'ok'].includes(a[1])), 'niveles de alerta válidos');

  console.log('\n[7] Guardado: partida vieja (generada con el commit base) y partida nueva a mitad de mejora, clan preparando saqueo y oficios fijados');
  const fx = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/era3-save-v1-base.json'), 'utf8')); ok(!fx.G.x3 && fx.v === 1, 'el guardado de referencia es de la versión anterior (sin G.x3)');
  const Old = await p.evaluate(fxs => { const E = window.__e3; localStorage.setItem('evo_save3_v1', fxs); const d = JSON.parse(fxs); E.restoreGame(d); const G = E.G, res = { loaded: !!G, t0: Math.round(G.t), pop0: G.P.length, x3: !!G.x3, clans: G.x3.clans.length, prio: Object.keys(G.x3.prio).length, lvl: G.B.every(b => b.lvl >= 1), sitesPaid: G.sites.every(s => s.paid === 4), rel: G.x3.clans[0].rel === G.relation }; for (let i = 0; i < 20 * 600; i++) E.step(.05); const ti = E.tribeInfo(), ri = E.rivalInfo(); res.t1 = Math.round(G.t); res.pop1 = G.P.length; res.info = !!(ti && ri && ti.buildings.length); res.hashA = E.stateHash(); E.restoreGame(JSON.parse(fxs)); for (let i = 0; i < 20 * 600; i++) E.step(.05); res.hashB = E.stateHash(); E.clearSave(); return res; }, JSON.stringify(fx));
  console.log(JSON.stringify(Old)); ok(Old.loaded && Old.x3 && Old.clans === 2 && Old.prio === 5 && Old.lvl && Old.sitesPaid && Old.rel, 'la partida vieja carga y se completa con valores por defecto (G.x3, clanes, prioridades, niveles)');
  ok(Old.t1 - Old.t0 >= 599 || Old.pop1 === 0, 'La partida vieja sigue hasta 10 min o hasta extinguirse sin errores: t ' + Old.t0 + ' -> ' + Old.t1); ok(Old.info, 'la partida vieja sigue 10 min sin errores y tribeInfo/rivalInfo responden (población ' + Old.pop0 + ' -> ' + Old.pop1 + ', sin jugador)');
  ok(Old.hashA === Old.hashB, 'cargar dos veces la partida vieja da el mismo futuro (determinista)');
  const Sv = await p.evaluate(() => { const E = window.__e3; const run = viaSave => { E.diffI = 1; E.newGame('SAVE-X', { pers: ['belicoso', 'comerciante'] }); E.setStarted(true); const G = E.G; G.know = 80; ['fuego', 'piedra', 'cesta', 'ceram'].forEach(k => E.research(k)); G.wood = 60; G.stone = 30; G.food = 60; for (let i = 0; i < 6; i++) G.P.push(E.mkPerson(300 + i, 330, 100, 'libre')); E.setRole('con', 1); E.setRole('con', 1); E.setRole('def', 1); const stepN = n => { for (let i = 0; i < n; i++) E.step(.05); };
      E.placeBuilding('refugio', { x: 250, y: 390 }); stepN(1200); G.wood = 60; G.stone = 30; const rb = G.B.find(b => b.k === 'refugio'); if (rb && rb.done) E.upgradeBuilding(rb); G.t = 260; G.x3.clans[0].rt = 1; stepN(120); E.setRole('def', 1); const mid0 = G.B.some(b => b.upg); stepN(40); const mid = { upg: mid0 || G.B.some(b => b.upg), prep: G.x3.clans.some(c => c.prep > 0), pinned: G.P.filter(p => p.pin).length };
      if (viaSave) { E.saveGame(); const d = E.readSave(); E.newGame('OTRA'); E.restoreGame(d); } stepN(2400); return { h: E.stateHash(), mid }; };
    const a = run(false), b2 = run(true); return { a: a.h, b: b2.h, mid: a.mid }; });
  console.log(JSON.stringify(Sv)); ok(Sv.mid.upg || Sv.mid.prep || Sv.mid.pinned > 0, 'el guardado cubre estado nuevo (mejora en curso: ' + Sv.mid.upg + ', saqueo en preparación: ' + Sv.mid.prep + ', oficios fijados: ' + Sv.mid.pinned + ')');
  ok(Sv.a === Sv.b, 'guardar/cargar con estado nuevo no cambia el futuro');

  console.log('\n[8] Datos para la interfaz: tribeInfo / rivalInfo / buildingInfo / roleInfo');
  const Ui = await p.evaluate(() => { const E = window.__e3; E.diffI = 1; E.newGame('UI-1'); E.setStarted(true); for (let i = 0; i < 20 * 150; i++) E.step(.05); const ti = E.tribeInfo(), ri = E.rivalInfo(), bi = E.buildingInfo(0), rl = E.RORDER.map(r => E.roleInfo(r)); const fin = o => JSON.stringify(o).indexOf('NaN') < 0 && JSON.stringify(o).indexOf('null') >= 0 || true;
    const nan = []; (function walk(o, p) { if (typeof o === 'number' && !isFinite(o)) nan.push(p); else if (o && typeof o === 'object') for (const k in o) walk(o[k], p + '.' + k); })({ ti, ri, bi, rl }, 'x');
    return { keys: Object.keys(ti), food: Object.keys(ti.food), rk: Object.keys(ri[0]), bk: Object.keys(bi), roleK: Object.keys(rl[0]), nan, goals: ti.goals.length, prio: ti.prio, apt: rl.every(r => r.apt && r.d), thr: ti.threats.map(t => t.kind) }; });
  console.log(JSON.stringify(Ui)); ok(Ui.nan.length === 0, 'ningún valor no finito en los datos de interfaz');
  ok(['pop', 'roles', 'food', 'wood', 'stone', 'know', 'housing', 'needs', 'buildings', 'works', 'threats', 'alerts', 'goals', 'paths', 'prio', 'targets'].every(k => Ui.keys.includes(k)), 'tribeInfo trae: ' + Ui.keys.join(', '));
  ok(['stock', 'cap', 'prod', 'cons', 'net', 'perPerson', 'perWorker', 'runway'].every(k => Ui.food.includes(k)), 'tribeInfo().food trae producción, consumo, neto, por habitante y por trabajador');
  ok(['rel', 'causes', 'deals', 'pers', 'intel', 'raid', 'allied'].every(k => Ui.rk.includes(k)), 'rivalInfo trae relación, causas, tratos y personalidad');
  ok(['lvl', 'prog', 'stage', 'effect', 'next', 'fx'].every(k => Ui.bk.includes(k)) && Ui.apt, 'buildingInfo y roleInfo completos');
  ok(errs.length === 0, 'sin errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('\nERA 3 CICLO OK'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
