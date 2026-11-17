// Prueba Era 3 (Ciclo 4 · civilizaciones): las 4 civilizaciones (nombres, edificios, tecnologías con efecto, Edades, Maravilla y fin de era),
// continuidad desde el linaje de las 12 especies de la Era 2 (rasgos → bonos con origen) y ciudad acuática submarina vs anfibia.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-civs.js
// Convención: los bloques «preparación» fijan recursos/Edad/obras terminadas solo para llegar al paso que se prueba (se dice en cada uno); lo que se afirma sale de la simulación.
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const ok = (c, m) => { assert.ok(c, m); console.log('  ok  ' + m); };
const DOC = {   // nombres del contrato (docs/ERA3-CIVILIZACIONES.md §4): nivel 1 → 3 de algunos casilleros, recursos, único y Maravilla
  ter: { res: ['Carne y bayas', 'Madera', 'Piedra', 'Saber'], corazon: ['Fogón del clan', 'Gran hogar', 'Salón de piedra'], vivienda: ['Madriguera', 'Choza', 'Casa de barro y piedra'], torre: ['Torre de honderos', 'Torre de arqueros', 'Bastión'], unico: 'Madriguera profunda', mar: 'Círculo de piedras' },
  ins: { res: ['Jalea', 'Fibra masticada', 'Cera y resina', 'Memoria de la colmena'], corazon: ['Cámara de la Reina', 'Gran cámara real', 'Corazón de la Colmena'], vivienda: ['Celdas de cría', 'Panal de celdas', 'Torre de panales'], torre: ['Torre de aguijones', 'Torre de ácido', 'Torre de enjambre'], unico: 'Chimenea de ventilación', mar: 'La Reina Madre' },
  acu: { res: ['Algas y peces', 'Coral', 'Nácar', 'Cantos'], corazon: ['Concha del consejo', 'Gran anémona', 'Palacio de nácar'], vivienda: ['Grieta-refugio', 'Pólipo-vivienda', 'Torre de coral'], torre: ['Pulpo vigía', 'Torre de erizos', 'Torre de luz'], unico: 'Fumarola domada', mar: 'Corriente domada' },
  ave: { res: ['Semillas e insectos', 'Ramas', 'Barro', 'Rutas'], corazon: ['Nido mayor', 'Árbol de la bandada', 'Ciudad del acantilado'], vivienda: ['Nidos', 'Nidos tejidos', 'Colonia de nidos'], torre: ['Percha de vigías', 'Nido de rapaces', 'Torre de halcones'], unico: 'Dormidero', mar: 'La Gran Ruta Migratoria' }
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(300); await p.evaluate(() => { localStorage.removeItem('evo_lineage'); localStorage.removeItem('evo_save3_v1'); });

  console.log('\n[1] Datos de las 4 civilizaciones: nombres por casillero, recursos, edificios, único, Maravilla, unidades');
  const D = await p.evaluate(() => { const E = window.__e3, out = {}; for (const c of ['ter', 'ins', 'acu', 'ave']) { const C = E.CIVS[c]; out[c] = { res: ['comida', 'mat1', 'mat2', 'saber'].map(k => C.res[k].n), B: C.B, nTech: Object.keys(C.tech).length, perAge: [1, 2, 3].map(a => Object.values(C.tech).filter(t => t.age === a).length), techFx: Object.values(C.tech).every(t => Object.keys(t.fx).length > 0), units: C.units, slots: E.SLOTS.every(k => C.B[k] && C.B[k].length === E.SL[k].max), unicoFx: Object.keys(C.unico.fx).length, marFx: Object.keys(C.mar.fx).length }; } out.assets = E.assets.ids().length; out.sample = ['ter.corazon.1', 'ins.vivienda.2', 'acu.unidad.guerrero', 'ave.maravilla.1'].map(id => !!E.ASSETS[id]); return out; });
  for (const c of ['ter', 'ins', 'acu', 'ave']) { const d = D[c], doc = DOC[c];
    ok(JSON.stringify(d.res) === JSON.stringify(doc.res), c + ': recursos con los nombres del contrato (' + d.res.join(', ') + ')');
    ok(['corazon', 'vivienda', 'torre'].every(k => JSON.stringify(d.B[k]) === JSON.stringify(doc[k])) && d.B.unico[0] === doc.unico && d.B.maravilla[0] === doc.mar && d.slots, c + ': 13 casilleros con nombre propio por nivel; único «' + doc.unico + '» y Maravilla «' + doc.mar + '»');
    ok(d.nTech === 12 && d.perAge.join() === '4,4,4' && d.techFx && d.unicoFx > 0 && d.marFx > 0, c + ': árbol propio de 12 tecnologías (4 por Edad), todas con efecto; único y Maravilla con efecto');
  }
  ok(new Set(['ter', 'ins', 'acu', 'ave'].map(c => D[c].units.guerrero)).size === 4, 'unidades con nombre por civilización: ' + ['ter', 'ins', 'acu', 'ave'].map(c => D[c].units.guerrero + '/' + D[c].units.campeon).join(', '));
  ok(D.assets >= 196 && D.sample.every(Boolean), 'tabla ASSETS con ids estables (' + D.assets + ' ids, p. ej. ter.corazon.1, ins.vivienda.2, acu.unidad.guerrero)');

  console.log('\n[2] Tecnologías: cada una cambia el efecto acumulado exactamente según su fx, y una muestra se mide en la simulación');
  const T = await p.evaluate(() => {
    const E = window.__e3, out = { bad: [], n: 0 };
    for (const c of ['ter', 'ins', 'acu', 'ave']) {
      const sp = Object.keys(E.SPECIES).find(k => E.SPECIES[k].cls === c); E.newGame('TECH-' + c, { species: sp, traits: [] }); E.setStarted(true); const G = E.G;
      E.core().lvl = 3; E.modsDirty();   // preparación: Edad III para que se puedan investigar las 12
      for (const id in E.CIVS[c].tech) { const t = E.CIVS[c].tech[id], m0 = Object.assign({}, E.mods()); G.know = 999; const r = E.research(id), m1 = E.mods(); out.n++;
        for (const k in t.fx) if (Math.abs((m1[k] || 0) - (m0[k] || 0) - t.fx[k]) > 1e-9) out.bad.push(c + '.' + id + '.' + k); if (!r) out.bad.push(c + '.' + id + ' no se investigó'); }
    }
    // medición en la simulación (misma semilla con y sin la tecnología): granjas (agri), almacenamiento (hexa), obra (castas), torres (acido), frío (pieles)
    const run = (sp, techs, fn) => { E.newGame('MED', { species: sp, traits: [] }); E.setStarted(true); E.core().lvl = 3; E.modsDirty(); E.G.know = 999; techs.forEach(t => E.research(t)); return fn(E, E.G); };
    const farm = (E, G) => { const b = E.G.B; const s = E.findSpot('granja'); E.placeBuilding('granja', s); const f = b[b.length - 1]; f.done = true; f.prog = 1; f.paid = 4; E.G.sites.length = 0; E.modsDirty(); for (let i = 0; i < 3; i++) E.setRole('agr', 1); const t0 = G.x3.fl.tot.f_agr || 0; for (let i = 0; i < 20 * 90; i++) E.step(.05); return (G.x3.fl.tot.f_agr || 0) - t0; };
    out.farm = [run('ter_cazador', [], farm), run('ter_cazador', ['agri'], farm)];
    out.cap = [run('ins_colmena', [], (E) => [E.foodCap(), E.matCap()]), run('ins_colmena', ['hexa'], (E) => [E.foodCap(), E.matCap()])];
    const build = (E, G) => { G.wood = 200; G.stone = 50; const s = E.findSpot('vivienda'); E.placeBuilding('vivienda', s); const bb = G.B[G.B.length - 1]; let n = 0; while (!bb.done && n++ < 4000) E.step(.05); return n; };
    out.build = [run('ins_parasito', [], build), run('ins_parasito', ['castas'], build)];
    const tower = (E, G) => { G.wood = 300; G.stone = 300; const s = E.findSpot('torre'); E.placeBuilding('torre', s); const tw = G.B[G.B.length - 1]; tw.done = true; tw.prog = 1; tw.paid = 4; G.sites.length = 0; G.Rd.push({ x: tw.x + 60, y: tw.y, hp: 1000, cd: 0, dead: false, fleeing: false, cl: 0 }); const r = G.Rd[0]; for (let i = 0; i < 20; i++) { r.x = tw.x + 60; r.y = tw.y; E.step(.05); } return 1000 - r.hp; };
    out.tower = [run('ins_colmena', [], tower), run('ins_colmena', ['acido'], tower)];
    // frío: 4 jóvenes sin cama (las camas van a los mayores), lejos del Corazón, con hambre media (no se curan), en invierno
    const cold = (E, G) => { G.season = 3; G.t = 3 * 40 + 1; const p0 = []; for (let i = 0; i < 4; i++) { const q = E.mkPerson(40, 40, 50, 'rec'); q.hunger = 45; G.P.push(q); p0.push(q); } const h0 = p0.reduce((a, q) => a + q.hp, 0); for (let i = 0; i < 10; i++) { p0.forEach(q => { q.x = 40; q.y = 40; q.hunger = 45; }); E.update(.05); } return +(h0 - p0.reduce((a, q) => a + Math.max(0, q.hp), 0)).toFixed(3); };
    out.cold = [run('ter_cazador', [], cold), run('ter_cazador', ['pieles'], cold)];
    return out;
  });
  console.log(JSON.stringify(T));
  ok(T.n === 48 && T.bad.length === 0, 'las 48 tecnologías suman exactamente su efecto (' + (T.bad.join(', ') || 'sin diferencias') + ')');
  ok(T.farm[1] > T.farm[0] * 1.2, 'Agricultura (terrestres): la granja rinde ' + T.farm[0].toFixed(1) + ' → ' + T.farm[1].toFixed(1) + ' en 90 s');
  ok(T.cap[1][0] > T.cap[0][0] && T.cap[1][1] > T.cap[0][1], 'Celdas hexagonales (insectos): almacenamiento ' + T.cap[0].join('/') + ' → ' + T.cap[1].join('/'));
  ok(T.build[1] < T.build[0], 'Castas (insectos): la vivienda se termina en ' + T.build[0] + ' → ' + T.build[1] + ' pasos');
  ok(T.tower[1] > T.tower[0] * 1.2, 'Ácido fórmico (insectos): la torre hace ' + T.tower[0].toFixed(1) + ' → ' + T.tower[1].toFixed(1) + ' de daño en 1 s');
  ok(T.cold[0] > 0 && T.cold[1] < T.cold[0], 'Pieles (terrestres): el frío quita ' + T.cold[0].toFixed(2) + ' → ' + T.cold[1].toFixed(2) + ' de vida');

  console.log('\n[3] Edades: requisitos visibles, avance del Corazón, territorio y aperturas');
  const A = await p.evaluate(() => {
    const E = window.__e3, out = {}; E.diffI = 0; E.newGame('EDADES', { species: 'ave_rapaz', traits: [] }); E.setStarted(true); const G = E.G;
    out.r0 = E.terrR(); out.req = E.ageReq(2).map(r => r.id + ':' + r.ok); out.check0 = E.upgradeCheck(E.core()); out.torre1 = E.placeCheck('torre', 16, 10).why; out.techII = E.techCheck('vigias').why;
    // preparación: obras terminadas y recursos para cumplir los requisitos de la Edad II
    const fin = k => { const s = E.findSpot(k); G.wood = 200; G.stone = 100; G.food = 120; E.placeBuilding(k, s); const bb = G.B[G.B.length - 1]; bb.done = true; bb.prog = 1; bb.paid = 4; G.sites.length = 0; E.modsDirty(); return bb; };
    fin('vivienda'); fin('vivienda'); fin('almacen'); fin('granja'); G.know = 50; E.research('tejidos'); E.research('vuelov');
    while (G.P.length < 8) G.P.push(E.mkPerson(300, 330, 100, 'libre'));
    G.wood = 200; G.stone = 100; G.food = 120; out.req2 = E.ageReq(2).every(r => r.ok); out.check1 = E.upgradeCheck(E.core()).ok; const evs = []; E.Bus.on('age', n => evs.push(n));
    E.upgradeBuilding(E.core()); let n = 0; while (E.age() < 2 && n++ < 6000) { E.step(.05); G.wood = Math.max(G.wood, 60); G.stone = Math.max(G.stone, 30); G.food = Math.max(G.food, 60); }
    out.age2 = E.age(); out.r2 = E.terrR(); out.ev = evs.slice(); out.torre2 = E.placeCheck('torre', 16, 10).ok || E.findSpot('torre') !== null; out.techII2 = E.techCheck('vigias').ok; out.name2 = E.bName(E.core()); out.req3 = E.ageReq(3).map(r => r.id);
    out.lim = E.upgradeCheck(G.B.find(b => b.k === 'vivienda')).ok; out.maxV = E.buildingInfo(G.B.find(b => b.k === 'vivienda')).maxLvl;
    out.trainNo = E.trainCheck('gue').why; out.expNo = E.expCheck('node', 0, 'tomar').why; out.wonderNo = E.placeCheck('maravilla', 10, 10).why;
    return out;
  });
  console.log(JSON.stringify(A));
  ok(A.r0 === 120 && A.req.length >= 5 && !A.check0.ok && /falta/.test(A.check0.why), 'Edad I: territorio de 6 celdas; el Corazón no sube sin requisitos («' + A.check0.why.slice(0, 70) + '…»)');
  ok(/Edad II/.test(A.torre1) && /Edad II/.test(A.techII), 'la torre y las tecnologías II están cerradas en la Edad I (' + A.torre1 + ')');
  ok(A.req2 && A.check1 && A.age2 === 2 && A.ev.join() === '2' && A.r2 === 200, 'con los requisitos cumplidos el Corazón sube a la Edad II (evento age), territorio de 10 celdas');
  ok(A.name2 === 'Árbol de la bandada' && A.torre2 && A.techII2, 'Edad II: «' + A.name2 + '», abre torre y tecnologías II');
  ok(A.maxV === 2 && /hace falta/.test(A.trainNo) && /Edad III/.test(A.expNo) && /Edad III/.test(A.wonderNo), 'niveles hasta 2 en la Edad II; unidades piden cuartel, expediciones y Maravilla piden Edad III');

  console.log('\n[4] Maravilla y fin de la era (fundar la civilización, linaje para la Era 4)');
  const M = await p.evaluate(() => {
    const E = window.__e3, out = {}; localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 2, branch: 'colo', tier: 2, mutCount: 7, owned: [], seed: 's', era2: { species: 'ins_enjambre', name: 'Enjambre migratorio', cls: 'ins', traits: ['alas', 'colmena'], vars: {} } }));
    E.newGame('MARAVILLA'); E.setStarted(true); const G = E.G; out.civ = G.x3.civ; out.sp = G.x3.sp;
    E.core().lvl = 3; E.modsDirty(); G.wood = 0; G.stone = 0; G.food = 0;   // preparación: Edad III
    out.spotNull = E.findSpot('maravilla') === null; G.wood = 500; G.stone = 500; G.food = 500; const s2 = E.findSpot('maravilla'); G.wood = 0; out.noRes = E.placeCheck('maravilla', s2.gx, s2.gy).why; G.wood = 500; out.placed = E.placeBuilding('maravilla', s2); const mw = G.B[G.B.length - 1]; out.k = mw.k;
    const birth0 = E.mul('birth'), ucost0 = E.unitCost('gue'); out.canFound0 = E.canFound(); let n = 0; while (!mw.done && n++ < 40000) { E.step(.05); G.wood = Math.max(G.wood, 100); G.stone = Math.max(G.stone, 100); G.food = Math.max(G.food, 100); }
    document.getElementById('dlg').classList.remove('show'); G.modal = false;
    out.done = mw.done; out.wonder = G.x3.wonder > 0; out.birth = [birth0, E.mul('birth')]; out.ucost = [ucost0.f, E.unitCost('gue').f]; out.canFound = E.canFound();
    out.found = E.found(); out.over = G.over; const L = JSON.parse(localStorage.getItem('evo_lineage')); out.lin = L; out.save = localStorage.getItem('evo_save3_v1');
    return out;
  });
  console.log(JSON.stringify(M));
  ok(M.civ === 'ins' && M.sp === 'ins_enjambre', 'linaje de la Era 2 (Enjambre) → La Colmena');
  ok(M.spotNull && /materiales/.test(M.noRes) && M.placed && M.k === 'maravilla' && !M.canFound0, 'la Maravilla se coloca en la Edad III con recursos; antes de terminarla no se puede fundar');
  ok(M.done && M.wonder && M.birth[1] > M.birth[0] && M.ucost[1] < M.ucost[0], 'La Reina Madre en pie: efecto real (nacimientos ×' + M.birth[0].toFixed(2) + ' → ×' + M.birth[1].toFixed(2) + ', guerrero ' + M.ucost[0] + ' → ' + M.ucost[1] + ' de jalea)');
  ok(M.canFound && M.found && M.over && M.save === null, 'fundar la civilización termina la Era 3 y borra el guardado');
  ok(M.lin.v === 1 && M.lin.from === 3 && M.lin.era3 && M.lin.era3.civ === 'ins' && M.lin.era3.especie === 'ins_enjambre' && M.lin.era3.edad === 3 && Array.isArray(M.lin.era3.techs) && M.lin.era3.maravilla === 'La Reina Madre' && M.lin.branch === 'colo' && M.lin.tier === 2 && M.lin.era2 && M.lin.era2.species === 'ins_enjambre', 'evo_lineage.era3 = {civ, especie, edad, techs, maravilla} y conserva rama, nivel y era2');

  console.log('\n[5] Continuidad: las 12 especies del linaje → civilización, especialización, rasgos con origen, habitantes y rivales');
  const C = await p.evaluate(() => {
    const E = window.__e3, out = [];
    for (const sp of E.SP_KEYS) { localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 2, branch: 'pred', tier: 1, mutCount: 3, owned: [], seed: 's', era2: { species: sp, name: E.SPECIES[sp].n, cls: E.SPECIES[sp].cls, traits: ['garras', 'madriguera', 'nada'], vars: {} } }));
      E.newGame('CONT-' + sp); const G = E.G, ti = E.tribeInfo(); out.push({ sp, civ: G.x3.civ, cls: E.SPECIES[sp].cls, spec: ti.bonuses.find(x => x.kind === 'especie').n, traits: ti.bonuses.filter(x => x.kind === 'rasgo').map(x => x.n), atk: E.mods().atk || 0, beds: E.mods().beds || 0, rivals: G.x3.clans.map(c => c.civ), amph: G.x3.amph, res: ti.res.comida.n }); }
    return out;
  });
  for (const c of C) assert.ok(c.civ === c.cls && c.rivals.every(r => r !== c.civ) && c.rivals[0] !== c.rivals[1] && c.traits.length === 2 && c.traits[0] === 'Rasgo Colmillos y garras de la Era 2' && c.beds === 2, JSON.stringify(c));
  ok(C.length === 12, 'las 12 especies: la clase decide la civilización, los rivales son de otras clases, y los rasgos dan bonos con su origen (' + C.map(c => c.sp + '→' + c.civ).join(', ') + ')');
  ok(new Set(C.map(c => c.spec)).size === 12, 'cada especie da una especialización distinta (' + C.map(c => c.spec).join(' · ') + ')');
  const pic = await p.evaluate(() => { const E = window.__e3; localStorage.removeItem('evo_lineage'); document.getElementById('menu').classList.add('show'); E.ui.renderLin(); const n = document.querySelectorAll('#spPick button').length; document.querySelector('#spPick button[data-sp=acu_abisal]').click(); document.getElementById('startBtn').click(); const r = { n, civ: E.G.x3.civ, sp: E.G.x3.sp, amph: E.G.x3.amph }; localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 2, branch: 'foto', tier: 1, mutCount: 1, owned: [], seed: 's', era2: { species: 'acu_anfibio', name: 'Anfibios pioneros', cls: 'acu', traits: [], vars: {}, tierra: true } })); document.getElementById('menu').classList.add('show'); E.ui.renderLin(); r.hidden = document.getElementById('spPick').style.display === 'none'; r.txt = document.getElementById('linBox').textContent; return r; });
  ok(pic.n === 12 && pic.civ === 'acu' && pic.sp === 'acu_abisal' && !pic.amph, 'sin linaje: selector de las 12 especies en el menú (elegir Abisales → ciudad submarina)');
  ok(pic.hidden && /anfibia/.test(pic.txt), 'con linaje: el menú muestra la continuidad («' + pic.txt.slice(0, 90) + '…») y oculta el selector');

  console.log('\n[6] Acuáticos: ciudad submarina vs anfibia (era2.tierra)');
  const W = await p.evaluate(() => {
    const E = window.__e3, out = {};
    const mk = tierra => { localStorage.setItem('evo_lineage', JSON.stringify({ v: 1, from: 2, branch: 'foto', tier: 0, mutCount: 0, owned: [], seed: 's', era2: { species: 'acu_arrecife', name: 'Arrecife constructor', cls: 'acu', traits: [], vars: {}, tierra } })); E.newGame('AGUA'); E.setStarted(true); const G = E.G; G.wood = 200; G.stone = 200; G.food = 200; return G; };
    let G = mk(false); out.sub = { amph: G.x3.amph, west: E.placeCheck('vivienda', 10, 15), east: E.placeCheck('vivienda', 17, 15) };
    G = mk(true); E.core().lvl = 2; E.modsDirty(); out.anf = { amph: G.x3.amph, west: E.placeCheck('vivienda', 10, 15), east: E.placeCheck('vivienda', 17, 15), unicoW: E.placeCheck('unico', 10, 15) }; E.core().lvl = 1; E.modsDirty();
    E.placeBuilding('vivienda', { gx: 10, gy: 15 }); const lb = G.B[G.B.length - 1]; lb.done = true; lb.prog = 1; lb.paid = 4; G.sites.length = 0; E.core().lvl = 3; E.modsDirty();
    out.anf.landName = E.bName(lb); out.anf.landCiv = lb.civ; out.anf.landMax = E.buildingInfo(lb).maxLvl; out.anf.bon = E.tribeInfo().bonuses.map(x => x.n);
    // anfibia: los extractores en tierra rinden +20 %
    // (2 obreros fijos en el extractor durante 2 s: misma gente, mismo tiempo; solo cambia la zona)
    const ex = (gx) => { const G2 = mk(true); E.placeBuilding('ext1', { gx, gy: 15 }); const b2 = G2.B[G2.B.length - 1]; b2.done = true; b2.prog = 1; b2.paid = 4; G2.sites.length = 0; G2.wood = 0; const ws = G2.P.slice(0, 2); ws.forEach(q => { E.setRoleOf(q, 'art'); q.wk = b2; q.hunger = 100; }); const t0 = G2.x3.fl.tot.w_ext || 0; for (let i = 0; i < 40; i++) { ws.forEach(q => { q.x = b2.x; q.y = b2.y; q.hunger = 100; q.wk = b2; q.carry = null; }); G2.wood = 0; E.step(.05); } return (G2.x3.fl.tot.w_ext || 0) - t0; };
    out.extLand = ex(10); out.extWater = ex(17);
    return out;
  });
  console.log(JSON.stringify(W));
  ok(!W.sub.amph && W.sub.west.ok && !W.sub.west.civ && W.sub.east.ok, 'submarina: todo el territorio es agua (edificios del Arrecife en las dos mitades)');
  ok(W.anf.amph && W.anf.west.ok && W.anf.west.civ === 'ter' && W.anf.east.ok && !W.anf.east.civ && !W.anf.unicoW.ok, 'anfibia: costa con zona de tierra (edificios terrestres) y zona de agua; el único va al agua');
  ok(W.anf.landName === 'Madriguera' && W.anf.landCiv === 'ter' && W.anf.landMax === 2, 'en tierra la anfibia usa «Madriguera» y llega hasta el nivel 2');
  ok(W.extLand > W.extWater * 1.15, 'anfibia: en tierra gana material (+20 %): ' + W.extLand.toFixed(1) + ' vs ' + W.extWater.toFixed(1));

  console.log('\n[7] Edificio único con efecto real (las 4 civilizaciones)');
  const U = await p.evaluate(() => {
    const E = window.__e3, out = {};
    const withU = (sp, fn) => { localStorage.removeItem('evo_lineage'); const r = []; for (const has of [false, true]) { E.newGame('UNICO', { species: sp, traits: [] }); E.setStarted(true); const G = E.G; E.core().lvl = 2; if (has) { G.wood = 200; G.stone = 200; E.placeBuilding('unico', E.findSpot('unico')); const u = G.B[G.B.length - 1]; u.done = true; u.prog = 1; u.paid = 4; G.sites.length = 0; } E.modsDirty(); r.push(fn(E, G)); } return r; };
    out.ter = withU('ter_cazador', (E) => E.mul('loss'));
    out.ins = withU('ins_colmena', (E, G) => { G.season = 3; G.t = 121; const q = []; for (let i = 0; i < 3; i++) { const o = E.mkPerson(40, 40, 50, 'rec'); o.hunger = 45; G.P.push(o); q.push(o); } const h0 = q.reduce((a, o) => a + o.hp, 0); for (let i = 0; i < 10; i++) { q.forEach(o => { o.x = 40; o.y = 40; o.hunger = 45; }); E.update(.05); } return +(h0 - q.reduce((a, o) => a + o.hp, 0)).toFixed(3); });
    out.acu = withU('acu_abisal', (E) => [E.G.B[0] && Math.round(E.mods().rad || 0), +E.mul('kn').toFixed(2)]);
    out.ave = withU('ave_rapaz', (E, G) => { const c = G.x3.clans[0]; c.rel = -90; c.rt = 0; G.t = 400; G.x3.gap = 0; let n = 0; while (!(c.prep > 0) && n++ < 400) E.step(.05); return Math.round(c.prep); });
    return out;
  });
  console.log(JSON.stringify(U));
  ok(U.ter[1] < U.ter[0], 'Madriguera profunda: pérdidas por saqueo ×' + U.ter[0].toFixed(2) + ' → ×' + U.ter[1].toFixed(2));
  ok(U.ins[0] > 0 && U.ins[1] === 0, 'Chimenea de ventilación: sin daño por frío (' + U.ins[0] + ' → ' + U.ins[1] + ')');
  ok(U.acu[1][0] > U.acu[0][0] && U.acu[1][1] > U.acu[0][1], 'Fumarola domada: más radio de abrigo y más saber (' + JSON.stringify(U.acu) + ')');
  ok(U.ave[1] > U.ave[0] + 15, 'Dormidero: el saqueo se anuncia antes (' + U.ave[0] + ' → ' + U.ave[1] + ' s de preparación)');

  console.log('\n[8] Defensa y expediciones: cuartel, torre, nodo tomado que produce, ataque y caravana');
  const X = await p.evaluate(() => {
    const E = window.__e3, out = {}; localStorage.removeItem('evo_lineage'); E.diffI = 0; E.newGame('EXPED', { species: 'ter_cazador', traits: [] }); E.setStarted(true); const G = E.G;
    E.core().lvl = 3; E.modsDirty(); G.wood = 400; G.stone = 400; G.food = 400;   // preparación: Edad III con recursos
    const fin = k => { E.placeBuilding(k, E.findSpot(k)); const bb = G.B[G.B.length - 1]; bb.done = true; bb.prog = 1; bb.paid = 4; bb.lvl = 3; G.sites.length = 0; E.modsDirty(); return bb; };
    fin('cuartel'); while (G.P.length < 16) G.P.push(E.mkPerson(310, 330, 100, 'libre'));
    out.qmax = 0; let n = 0;   // cola de 3 por cuartel: se entrena por tandas
    while ((G.P.filter(p => p.role === 'gue').length < 5 || !G.P.some(p => p.role === 'cam')) && n++ < 20 * 400) { if (n % 20 === 0) { G.food = 400; G.wood = 400; G.stone = 400; const ng = G.P.filter(p => p.role === 'gue').length + G.x3.q.filter(q => q.k === 'gue').length; E.train(ng < 5 ? 'gue' : 'cam'); out.qmax = Math.max(out.qmax, G.x3.q.length); } E.step(.05); }
    out.units = G.P.filter(p => p.role === 'gue').length; out.cam = G.P.filter(p => p.role === 'cam').length; out.camHp = (G.P.find(p => p.role === 'cam') || {}).mhp;
    const nd = G.x3.nodes[0]; out.exp = E.sendExpedition('node', 0, 'tomar', 4); n = 0; const evs = []; E.Bus.on('node', (x, o) => evs.push(o));
    while (nd.own !== 2 && n++ < 20 * 300) { E.step(.05); G.food = Math.max(G.food, 200); } out.taken = nd.own === 2; out.ev = evs.slice(); const f0 = G.x3.fl.tot.f_node || 0; for (let i = 0; i < 20 * 60; i++) { E.step(.05); G.food = Math.min(G.food, 100); } out.prod = (G.x3.fl.tot.f_node || 0) - f0;
    const c = G.x3.clans[0]; c.rel = -50; c.allied = false; c.dhp = 30; const loot0 = G.x3.loot; out.atk = E.sendExpedition('clan', 0, 'atacar'); n = 0; while (G.x3.loot === loot0 && n++ < 20 * 400) { E.step(.05); G.food = Math.max(G.food, 150); } out.loot = G.x3.loot - loot0; out.relAfter = Math.round(c.rel);
    n = 0; while (E.idleUnits().length < 1 && n++ < 20 * 200) E.step(.05); const c1 = G.x3.clans[1]; c1.rel = 20; const t0 = G.trades; G.food = 200; out.car = E.sendExpedition('clan', 1, 'comerciar', 1); n = 0; while (G.trades === t0 && n++ < 20 * 400) E.step(.05); out.trade = G.trades - t0;
    // torre: defensa activa contra un saqueo
    const tw = fin('torre'); G.Rd.length = 0; const r = { x: tw.x + 80, y: tw.y, hp: 60, cd: 0, dead: false, fleeing: false, cl: 0 }; G.Rd.push(r); n = 0; while (!r.dead && n++ < 20 * 30) { E.step(.05); } out.towerKill = r.dead;
    out.busErr = E.Bus.err; return out;
  });
  console.log(JSON.stringify(X));
  ok(X.units >= 5 && X.cam === 1 && X.camHp > 100 && X.qmax === 3, 'el cuartel entrena por tandas (cola de 3) guerreros y el campeón (' + X.units + ' guerreros, campeón con ' + X.camHp + ' de vida)');
  ok(X.exp && X.taken && X.ev.includes(2) && X.prod > 3, 'expedición: el nodo salvaje se toma (evento node) y produce ' + X.prod.toFixed(1) + ' de comida en 60 s');
  ok(X.atk && X.loot === 1 && X.relAfter < -50, 'atacar el campamento rival: botín y la relación cae (' + X.relAfter + ')');
  ok(X.car && X.trade === 1, 'caravana: comercio con el campamento rival');
  ok(X.towerKill && X.busErr === 0, 'la torre abate sola a un saqueador; Bus sin errores');

  console.log('\n[9] Grilla: fantasma válido/ inválido con motivo, mover y demoler (devuelve 50 %)');
  const Gd = await p.evaluate(() => {
    const E = window.__e3, out = {}; E.newGame('GRILLA', { species: 'ter_ingeniero', traits: [] }); E.setStarted(true); const G = E.G; G.wood = 100; G.stone = 50;
    out.far = E.placeCheck('vivienda', 1, 1).why; out.occ = E.placeCheck('vivienda', 14, 15).why; out.lake = E.footprintWhy(38, 22, 2, null); const s = E.findSpot('vivienda'); out.okc = E.placeCheck('vivienda', s.gx, s.gy).ok;
    E.placeBuilding('vivienda', s); const v = G.B[G.B.length - 1]; out.paid = E.buildingInfo(v).paid; v.done = true; v.prog = 1; v.paid = 4; G.sites.length = 0;
    const s2 = E.findSpot('vivienda', { x: 230, y: 330 }); out.mv = E.moveBuilding(v, s2); out.moved = v.gx === s2.gx && v.gy === s2.gy; const w0 = G.wood; out.dm = E.demolish(v); out.refund = +(G.wood - w0).toFixed(2); out.gone = !G.B.includes(v);
    out.core = E.demolish(E.core()); return out;
  });
  console.log(JSON.stringify(Gd));
  ok(/territorio/.test(Gd.far) && /ocupado/.test(Gd.occ) && /lago/.test(Gd.lake) && Gd.okc, 'motivos: fuera del territorio, ocupado, sobre el lago; y un lugar válido');
  ok(Gd.paid === 1 && Gd.mv && Gd.moved && Gd.dm && Gd.refund === 3 && Gd.gone && !Gd.core, 'colocar paga la 1.ª etapa; mover sin costo; demoler devuelve el 50 % (3 de 6); el Corazón no se demuele');

  ok(errs.length === 0, 'sin errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('ERA 3 CIVILIZACIONES OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
