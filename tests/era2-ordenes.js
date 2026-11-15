// Etapa 3 (profundidad): las órdenes por animal CAMBIAN el comportamiento y el juego explica causa y consecuencia.
//  - attack: el animal persigue y golpea a ESE objetivo aunque haya otro más cerca; move: llega y no se distrae (comida, miedo normal) salvo pánico;
//    forage: vuelve a lo automático; desobediencia por pánico / agotamiento / herida.
//  - Bus 'cause'(animal, texto, tipo): frases reales con los números del motor, con límite de frecuencia, solo animales propios, sin tocar la simulación.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-ordenes.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const HTML = path.resolve(__dirname, '../eras/era2-animales.html');
const ok = (c, m) => { assert.ok(c, m); console.log('  ok -', m); };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + HTML); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const E = window.__e2, out = {}, tipos = {}, frases = [];
    E.Bus.on('cause', (a, txt, tipo) => { tipos[tipo] = (tipos[tipo] || 0) + 1; frases.push([a.id, txt, tipo, E.G.t]); });
    const fresh = (seed, spec, cls, n) => { E.cls = cls; E.specKey = spec; E.diffI = 1; E.newGame('pradera', null, seed); E.setStarted(true); const G = E.G; G.A = G.A.filter(a => a.sp === G.me).slice(0, n || 1); G.E = []; G.plants = []; G.evT = 1e9; G.bossDone = true; G.riv = []; G.A.forEach(a => { a.hunger = 90; a.en = 90; a.x = 300; a.y = 300; a.age = 40; }); return G; };
    const run = (n, f) => { for (let i = 0; i < n; i++) { const g = E.G; if (g.pending > 0) g.pending = 0; E.step(.05); if (f) f(i); } };
    // ---- 1. attack: ataca al objetivo elegido aunque haya otro más cerca
    { const G = fresh('O1', 'ter_cazador', 'ter'); const a = G.A[0]; a.hunger = 95;
      const far = E.spawn(G.sp.ciervo, 400, 300, false), near = E.spawn(G.sp.conejo, 318, 300, false); far.hp = far.mhp = 400; near.hp = near.mhp = 400; far.life = near.life = 1e9;   // dos blancos duraderos para medir a quién golpea
      const hits = { far: 0, near: 0 }; const h = (x, y) => { if (x === a) { if (y === far) hits.far++; else if (y === near) hits.near++; } }; E.Bus.on('hit', h);
      E.issueOrder([a.id], { k: 'attack', tid: far.id }); const d0 = Math.hypot(a.x - far.x, a.y - far.y); run(300); const d1 = Math.hypot(a.x - far.x, a.y - far.y);
      out.atk = { far: hits.far, near: hits.near, d0: Math.round(d0), d1: Math.round(d1), ord: a.ord && a.ord.k };
      // sin orden (automático, con hambre) golpea al más cercano
      const G2 = fresh('O1b', 'ter_cazador', 'ter'); const a2 = G2.A[0]; a2.hunger = 30; const far2 = E.spawn(G2.sp.ciervo, 400, 300, false), near2 = E.spawn(G2.sp.conejo, 318, 300, false); far2.hp = far2.mhp = 400; near2.hp = near2.mhp = 400; far2.stun = near2.stun = 100; far2.life = near2.life = 1e9;
      const h2 = { far: 0, near: 0 }; E.Bus.on('hit', (x, y) => { if (x === a2) { if (y === far2) h2.far++; else if (y === near2) h2.near++; } }); run(200); out.auto = h2; }
    // ---- 2. move: llega y no se distrae con comida ni con un depredador normal; con pánico sí se cancela
    { const G = fresh('O2', 'ter_ingeniero', 'ter'); const a = G.A[0]; a.hunger = 25; G.plants.push({ x: 380, y: 300, v: 1, w: false, s: 1 }, { x: 420, y: 305, v: 1, w: false, s: 1 });
      let eats = 0, eatsAtArrival = -1; E.Bus.on('eat', (x) => { if (x === a) eats++; }); E.issueOrder([a.id], { k: 'move', x: 520, y: 300 }); let arrivedAt = -1; run(160, i => { if (arrivedAt < 0 && Math.hypot(a.x - 520, a.y - 300) < 10) { arrivedAt = i; eatsAtArrival = eats; } });
      out.mv = { eatsBefore: eatsAtArrival, dist: arrivedAt, arrivedAt, ord: !!a.ord };
      // con un lobo cerca (sin pánico) igual llega
      const G3 = fresh('O2b', 'ter_ingeniero', 'ter'); const a3 = G3.A[0]; const w = E.spawn(G3.sp.lobo, 215, 330, false); w.hunger = 20; E.issueOrder([a3.id], { k: 'move', x: 560, y: 300 }); let fl3 = 0; run(60, () => { if (a3.st === 'flee') fl3++; }); out.mvWolf = { adv: Math.round(a3.x - 300), flee: fl3, alive: !a3.dead };
      // sin orden y con el mismo lobo, huye
      const G4 = fresh('O2c', 'ter_ingeniero', 'ter'); const a4 = G4.A[0]; const w4 = E.spawn(G4.sp.lobo, 215, 330, false); w4.hunger = 20; let fl = 0; run(60, () => { if (a4.st === 'flee') fl++; }); out.noOrdFlee = fl;
      // pánico (vida < 30 % con el lobo encima): cancela la orden
      const G5 = fresh('O2d', 'ter_ingeniero', 'ter'); const a5 = G5.A[0]; a5.hp = a5.mhp * .2; const w5 = E.spawn(G5.sp.lobo, 330, 320, false); w5.hunger = 20; let dis = 0; E.Bus.on('disobey', (x, why) => { if (x === a5) dis = why; }); E.issueOrder([a5.id], { k: 'move', x: 560, y: 300 }); run(40); out.panic = { dis, ord: !!a5.ord }; }
    // ---- 3. forage: vuelve a automático (hambriento va a las plantas en vez de seguir la orden)
    { const G = fresh('O3', 'ter_gigante', 'ter'); const a = G.A[0]; a.hunger = 30; G.plants.push({ x: 330, y: 300, v: 1, w: false, s: 1 }); E.issueOrder([a.id], { k: 'move', x: 800, y: 500 }); run(10); out.o3a = a.st; E.issueOrder([a.id], { k: 'forage' }); const hadOrd = !!a.ord; let eat = 0; E.Bus.on('eat', x => { if (x === a) eat++; }); run(120); out.forage = { hadOrd, eat, st: a.st, x: Math.round(a.x) }; }
    // ---- 4. desobediencia por agotamiento y por herida
    { const G = fresh('O4', 'ter_cazador', 'ter'); const a = G.A[0]; a.en = 10; a.rs = false; let dis = null; E.Bus.on('disobey', (x, why) => { if (x === a) dis = dis || why; }); E.issueOrder([a.id], { k: 'move', x: 900, y: 500 }); run(120); out.exh = { dis, ord: !!a.ord };
      const G2 = fresh('O4b', 'ter_cazador', 'ter'); const b2 = G2.A[0]; b2.inj = .8; let dis2 = null; E.Bus.on('disobey', (x, why) => { if (x === b2) dis2 = dis2 || why; }); E.issueOrder([b2.id], { k: 'move', x: 900, y: 500 }); run(120); out.inj = { dis: dis2, ord: !!b2.ord };
      const G4 = fresh('O4d', 'ter_cazador', 'ter'); const h4 = G4.A[0]; h4.hunger = 4; let dis4 = null; E.Bus.on('disobey', (x, why) => { if (x === h4) dis4 = dis4 || why; }); E.issueOrder([h4.id], { k: 'move', x: 900, y: 500 }); run(120); out.starv = { dis: dis4, ord: !!h4.ord };
      const G3 = fresh('O4c', 'ter_cazador', 'ter'); const c3 = G3.A[0]; let dis3 = null; E.Bus.on('disobey', (x, why) => { if (x === c3) dis3 = dis3 || why; }); E.issueOrder([c3.id], { k: 'move', x: 900, y: 500 }); run(120); out.healthy = { dis: dis3, moved: Math.round(c3.x) }; }
    // ---- 5. feedback causa/consecuencia con límite de frecuencia
    frases.length = 0; for (const k in tipos) delete tipos[k];
    { E.cls = 'ave'; E.specKey = 'ave_migratoria'; E.diffI = 1; E.newGame('pradera', null, 'CZ'); E.setStarted(true); const G = E.G;
      for (let i = 0; i < 300; i++) E.spawn(G.me, 100 + (i * 29) % 800, 60 + (i * 47) % 480, false);
      G.A.forEach(a => { if (a.sp === G.me) { a.age = 40; a.hunger = 50 + (a.id % 40); a.en = 30 + (a.id % 60); } }); G.evT = 1e9;
      const sel = G.A.find(a => a.sp === G.me); E.select(sel.id); const w = E.spawn(G.sp.lobo, sel.x + 60, sel.y, false); w.hunger = 10;
      let maxSec = 0; const bySec = {}; E.Bus.on('cause', (a, txt) => { const s = Math.floor(E.G.t); bySec[s] = (bySec[s] || 0) + (a.id === sel.id ? 0 : 1); });
      run(600, i => { if (i % 5 === 0 && sel.dead) { /* sigue */ } }); for (const s in bySec) maxSec = Math.max(maxSec, bySec[s]);
      out.cz = { total: frases.length, tipos: Object.assign({}, tipos), maxNoSelPerSec: maxSec, selMsgs: frases.filter(f => f[0] === sel.id).map(f => f[1] + ' [' + f[2] + ']').slice(0, 8), sample: frases.slice(0, 12).map(f => f[1] + ' [' + f[2] + ']'), onlyMine: frases.every(f => true) };
      out.czMine = frases.every(f => { const a = E.G.A.find(q => q.id === f[0]); return !a || a.sp.team === 'player'; });
      out.czStr = frases.every(f => typeof f[1] === 'string' && f[1].length > 8 && f[1].length < 140); }
    // ---- 6. los mensajes no alteran la simulación: misma semilla, con y sin animal seleccionado => mismo estado
    { const hash = sel => { E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'HZ'); E.setStarted(true); const G = E.G; if (sel) E.select(G.A.find(a => a.sp === G.me).id); else E.select(null); for (let i = 0; i < 800; i++) { if (G.pending > 0) G.pending = 0; E.step(.05); } return E.stateHash(); };
      out.h1 = hash(true); out.h2 = hash(false); out.h3 = hash(true); }
    out.tipos = Object.assign({}, tipos); return out;
  });
  console.log(JSON.stringify(r, null, 1).slice(0, 3500));
  ok(r.atk.far >= 3 && r.atk.near === 0, 'attack: golpeó ' + r.atk.far + ' veces al objetivo elegido y 0 al más cercano (distancia ' + r.atk.d0 + ' → ' + r.atk.d1 + ')');
  ok(r.auto.near > 0 && r.auto.far === 0, 'sin orden y con hambre ataca al más cercano (' + r.auto.near + ' golpes) y no al lejano: la orden sí cambia a quién ataca');
  ok(r.mv.arrivedAt > 0 && r.mv.eatsBefore === 0, 'move: llegó al punto (tick ' + r.mv.arrivedAt + ') sin comer en el camino aunque tenía hambre 25 y dos plantas a su paso');
  ok(r.mvWolf.flee === 0 && r.mvWolf.adv > 80 && r.mvWolf.alive, 'move con un lobo a la vista (sin pánico): no huye (' + r.mvWolf.flee + ' ticks huyendo) y avanza ' + r.mvWolf.adv + ' px hacia el punto');
  ok(r.noOrdFlee > 5, 'sin orden, el mismo lobo lo hace huir (' + r.noOrdFlee + ' ticks huyendo): la orden de mover sí ignora el miedo normal');
  ok(r.panic.dis === 'pánico' && !r.panic.ord, 'move con pánico (vida < 30 % y depredador a < 105): desobedece por pánico y suelta la orden');
  ok(r.forage.hadOrd === false && r.forage.eat > 0, 'forage: la orden se borra y el animal hambriento vuelve a comer solo (' + r.forage.eat + ' bocados); antes iba a un punto lejano');
  ok(r.exh.dis === 'agotado', 'desobediencia por agotamiento (energía 10 < 15): ' + JSON.stringify(r.exh));
  ok(r.inj.dis === 'muy herido', 'desobediencia por herida (herida 80 % > 70 %): ' + JSON.stringify(r.inj));
  ok(r.starv.dis === 'hambriento' && !r.starv.ord, 'desobediencia por hambre (hambre 4 < 8): ' + JSON.stringify(r.starv));
  ok(r.healthy.dis === null && r.healthy.moved > 500, 'un animal sano obedece y camina hasta x = ' + r.healthy.moved);
  ok(r.cz.total > 5 && r.czMine && r.czStr, 'Bus cause: ' + r.cz.total + ' frases cortas, todas de animales propios; tipos: ' + JSON.stringify(r.cz.tipos));
  ok(r.cz.maxNoSelPerSec <= 3, 'límite de frecuencia: con 300 animales, como mucho ' + r.cz.maxNoSelPerSec + ' frases por segundo de animales no seleccionados (tope 3)');
  ok(r.cz.selMsgs.length >= 2, 'el animal seleccionado recibe sus frases (' + r.cz.selMsgs.length + '): ' + r.cz.selMsgs.slice(0, 4).join(' | '));
  ok(Object.keys(r.tipos).length >= 3, 'varios tipos de causa: ' + Object.keys(r.tipos).join(', '));
  ok(r.h1 === r.h2 && r.h1 === r.h3, 'las frases de causa no alteran la simulación: mismo hash con y sin animal seleccionado (' + r.h1 + ')');
  ok(errs.length === 0, '0 errores de consola' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  console.log('ORDENES Y CAUSAS OK'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
