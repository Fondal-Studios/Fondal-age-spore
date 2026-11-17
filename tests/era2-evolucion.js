// Prueba de la Era 2 · Ciclo 4 · módulo Evolución y claridad.
// 1) Cada evolución cambia el DIBUJO (hash de píxeles): los 40 rasgos, las variantes A y B (y A ≠ B), las 12 maestrías, los 12 híbridos y las 3 etapas de la transición a tierra.
// 2) Cada rasgo da una CAPACIDAD (sp.cap) y un grupo de pruebas funcionales verifica que la mecánica cambia de verdad (terreno, presas, defensas, cría...).
// 3) Ramas excluyentes: lo que cierra un rasgo no vuelve a ofrecerse (500 ofertas).
// 4) Transición a tierra: cada etapa abre terreno (orilla → tierra), tiene sus costos (cría junto al agua, piel seca) y la especie que la completa escribe evo_lineage.era2.tierra = true.
// 5) Modo foco: dibujar con foco o sin foco no cambia el hash de la simulación.
// 6) Partida vieja (sin rasgos nuevos) carga y corre; sin errores de consola.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-evolucion.js
const { chromium } = require('playwright');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_(INTERNET|NAME|FAILED|CONNECTION)|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('evo_tut2', 'skip'); localStorage.removeItem('evo_lineage'); } catch (e) {} });
  await p.goto('file://' + path.resolve(__dirname, '../eras/era2-animales.html')); await p.waitForTimeout(300);

  // ---------- 1. el dibujo cambia con cada evolución ----------
  const art = await p.evaluate(() => {
    const E = window.__e2, cn = document.createElement('canvas'); cn.width = 200; cn.height = 140; const x = cn.getContext('2d', { willReadFrequently: true });
    const hashOf = (sp, traits, vars) => { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 200, 140); E.drawAnimal(x, sp, { px: 100, py: 70, a: 0, s: 2.2, tt: 1.234, ph: 0, mv: 0, st: 'idle', traits, vars }); const d = x.getImageData(0, 0, 200, 140).data; let h = 2166136261; for (let i = 0; i < d.length; i += 3) { h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
    E.cls = 'ter'; E.specKey = 'ter_ingeniero'; E.diffI = 1; E.newGame('pradera', null, 'ARTE-EVO'); E.G.modal = false;
    const mk = (key, traits, vars) => { const sp = Object.assign({}, E.G.me, { key, traits: traits.slice(), vars: Object.assign({}, vars || {}) }, { cls: E.SP2[key].cls, g: E.SP2[key].g, r: E.SP2[key].r, col: E.SP2[key].col, hab0: E.SP2[key].hab }); E.recalcSp(sp); return sp; };
    const out = { same: [], varSame: [], abSame: [], mastSame: [], hybSame: [], stages: [], n: 0 };
    const nonTx = E.TRAITS.filter(t => !t.tx);
    for (const t of nonTx) {   // base: un rasgo «vecino» ya elegido para que el cambio se mida sobre un animal que no está vacío
      const key = 'ter_ingeniero', base = ['olfato'].filter(i => i !== t.id);
      const h0 = hashOf(mk(key, base), base, {}), sp1 = mk(key, base.concat([t.id])), h1 = hashOf(sp1, sp1.traits, {}); out.n++;
      if (h0 === h1) out.same.push(t.id);
      if (t.A) { const hA = hashOf(mk(key, sp1.traits, { [t.id]: 'A' }), sp1.traits, { [t.id]: 'A' }), hB = hashOf(mk(key, sp1.traits, { [t.id]: 'B' }), sp1.traits, { [t.id]: 'B' }); out.n += 2; if (hA === h1 || hB === h1) out.varSame.push(t.id); if (hA === hB) out.abSame.push(t.id); }
    }
    // maestrías: tres rasgos del mismo hilo; se compara con la misma especie sin la maestría (sp.mast vacío) => el aura es lo que cambia
    const byH = {}; for (const t of nonTx) (byH[t.h] = byH[t.h] || []).push(t.id);
    for (const h in byH) { const ids = byH[h].slice(0, 3); const sp = mk('ter_ingeniero', ids); const hm = hashOf(sp, ids, {}); const sp2 = Object.assign({}, sp, { mast: [] }); const hn = hashOf(sp2, ids, {}); out.n++; if (!sp.mast.length || hm === hn) out.mastSame.push(h); }
    for (const [a, c, n] of [['Química', 'Engaño'], ['Movimiento', 'Sentidos'], ['Defensa', 'Social'], ['Metabolismo', 'Entorno'], ['Reproducción', 'Construcción'], ['Mente', 'Social'], ['Ataque', 'Mente'], ['Química', 'Metabolismo'], ['Movimiento', 'Entorno'], ['Construcción', 'Defensa'], ['Mente', 'Química'], ['Engaño', 'Mente']]) {
      const pick = (h, cur) => { const got = []; for (const id of byH[h]) { if (got.length >= 2) break; if (cur.concat(got).some(g => E.exclOf(g).some(([o]) => o === id))) continue; got.push(id); } return got; };
      let ids = pick(a, []); ids = ids.concat(pick(c, ids));
      const sp = mk('ter_ingeniero', ids), hy = hashOf(sp, ids, {}), hn = hashOf(Object.assign({}, sp, { hyb: [] }), ids, {}); out.n++; if (!sp.hyb.length || hy === hn) out.hybSame.push(a + '+' + c);
    }
    // transición: cada etapa cambia el dibujo y el cuerpo (pez → anfibio → tetrápodo)
    for (const key of ['acu_arrecife', 'acu_abisal']) { let tr = [], prev = hashOf(mk(key, tr), tr, {}); for (const id of ['lobuladas', 'pulmones', 'amniota']) { tr = tr.concat([id]); const h = hashOf(mk(key, tr), tr, {}); out.stages.push(key + ':' + id + ':' + (h !== prev)); prev = h; } }
    { const h0 = hashOf(mk('acu_anfibio', []), [], {}), h1 = hashOf(mk('acu_anfibio', ['amniota']), ['amniota'], {}); out.stages.push('acu_anfibio:amniota:' + (h0 !== h1)); }
    { const h0 = hashOf(mk('acu_arrecife', []), [], {}), h1 = hashOf(mk('acu_arrecife', ['radiadas']), ['radiadas'], {}); out.stages.push('acu_arrecife:radiadas:' + (h0 !== h1)); }
    return out;
  });
  ok(art.same.length === 0, 'cada uno de los 36 rasgos cambia el dibujo (' + (art.same.join(',') || 'todos distintos') + ')');
  ok(art.varSame.length === 0, 'cada variante A/B cambia el dibujo respecto del rasgo (' + (art.varSame.join(',') || 'todas') + ')');
  ok(art.abSame.length === 0, 'la variante A y la B se ven distintas (' + (art.abSame.join(',') || 'todas') + ')');
  ok(art.mastSame.length === 0, 'cada una de las 12 maestrías agrega algo visible (aura) (' + (art.mastSame.join(',') || 'todas') + ')');
  ok(art.hybSame.length === 0, 'cada uno de los 12 híbridos agrega algo visible (bandas) (' + (art.hybSame.join(',') || 'todos') + ')');
  ok(art.stages.every(s => /true$/.test(s)), 'cada etapa de la transición cambia el dibujo: ' + art.stages.join(' '));
  console.log('      dibujos comparados: ' + art.n);

  // ---------- 2. cada rasgo da una capacidad, y las capacidades cambian la mecánica ----------
  const mech = await p.evaluate(() => {
    const E = window.__e2, out = {}, R = {};
    const game = (spec, seed) => { E.cls = spec.slice(0, 3); E.specKey = spec; E.diffI = 1; E.newGame('pradera', null, seed || 'MEC'); E.setStarted(true); E.G.modal = false; return E.G; };
    const give = (ids, vars) => { const me = E.G.me; for (const id of ids) if (!me.traits.includes(id)) me.traits.push(id); Object.assign(me.vars, vars || {}); E.recalcSp(me); return me; };
    const reset = () => { const me = E.G.me; me.traits.length = 0; for (const k in me.vars) delete me.vars[k]; E.recalcSp(me); return me; };
    game('ter_ingeniero');
    out.capsAll = E.TRAITS.every(t => { reset(); give([t.id]); return E.G.me.cap[t.id] === 1 || (t.tx && t.id !== 'radiadas'); });   // (la transición solo vale para acuáticos)
    reset(); give(['garras'], { garras: 'A' }); out.capVar = E.G.me.cap.garras === 2;
    reset(); give(['garras', 'cuernos', 'aguijon']); out.capMast = E.G.me.cap.garras === 3 && E.G.me.mast.includes('Ataque');
    reset(); give(['veneno', 'feromonas', 'senuelo', 'imitacion']); out.capHyb = E.G.me.hyb.includes('Emboscador tóxico') && E.G.me.cap.camuflaje === 1;
    const me = () => E.G.me, mine = () => E.G.A.filter(a => a.sp === E.G.me);
    const lake = E.BIOMES.pradera.lake, inWater = { x: lake.x, y: lake.y }, land = { x: 150, y: 330 };
    // terreno
    reset(); R.landNoWater = E.okPos(me(), inWater.x, inWater.y); give(['aletas']); R.aletas = E.okPos(me(), inWater.x, inWater.y) && me().hab === 'amph';
    reset(); give(['alas']); R.alas = E.okPos(me(), inWater.x, inWater.y) && me().hab === 'fly';
    // presas: un herbívoro (gigante) no caza; con garras sí
    game('ter_gigante'); const gi = mine()[0], rab = E.spawn(E.G.sp.conejo, gi.x + 5, gi.y, false); E.G.A.forEach(a => a.rr = a.sp.r);
    R.herbNo = !E.canEat(gi, rab); give(['garras']); R.garras = E.canEat(gi, rab);
    // presas grandes: un cazador de manada no puede con un ciervo adulto grande... con caza en manada sí
    game('ins_parasito'); const pa = mine()[0], ci = E.spawn(E.G.sp.escarabajo, pa.x + 5, pa.y, false); ci.rr = pa.rr * 1.6; R.bigNo = !E.canEat(pa, ci); give(['manada']); R.manada = E.canEat(pa, ci);
    // defensas
    game('ter_ingeniero'); const a0 = mine()[0]; a0.age = 40; a0.mv = 1; const wolf = E.spawn(E.G.sp.lobo, a0.x + 20, a0.y, false); wolf.rr = 9; a0.rr = 10; R.wolfYes = E.canEat(wolf, a0);
    give(['veneno']); R.veneno = !E.canEat(wolf, a0); reset(); give(['camuflaje']); a0.mv = 1; R.camMove = E.canEat(wolf, a0); a0.mv = 0; R.camuflaje = !E.canEat(wolf, a0); a0.mv = 1; reset();
    give(['imitacion']); R.imitacion = !E.canEat(wolf, a0); reset();
    { const t = E.spawn(E.G.sp.lobo, a0.x, a0.y, false), b0 = mine()[1]; b0.rr = 10; t.rr = 7; b0.hp = b0.mhp = 100; E.dmg(b0, 10, t); const d0 = 100 - b0.hp; b0.hp = 100; give(['caparazon']); E.dmg(b0, 10, t); const d1 = 100 - b0.hp; R.coraza = d1 < d0 * .5; R.corazaN = [Math.round(d0 * 10) / 10, Math.round(d1 * 10) / 10]; reset(); }
    // cría y nido
    game('ins_colmena'); const c0 = E.capOf(me()); give(['colmena']); R.colmena = E.capOf(me()) === c0 + 15;
    game('ter_ingeniero'); E.G.N.push({ x: 300, y: 300, done: true, prog: 1, work: 0 }); R.nest58 = !E.nestNear(370, 300); give(['madriguera']); R.madriguera = !!E.nestNear(370, 300);
    reset(); R.mig8 = E.travelNeed() === 8; give(['migracion']); R.migracion = E.travelNeed() === 4;
    // ramas excluyentes: con camadas nunca se ofrece cuidado; con veneno nunca camuflaje (500 ofertas)
    reset(); give(['camadas', 'veneno']); E.G.pending = 0; let seen = new Set(); for (let i = 0; i < 500; i++) for (const o of E.offers()) seen.add(o.id); R.excl = !seen.has('cuidado') && !seen.has('camuflaje') && !seen.has('lobuladas');
    // una decisión excluyente aparece en las ofertas (los dos lados juntos)
    reset(); let pairSeen = 0; for (let i = 0; i < 200; i++) { const o = E.offers().map(q => q.id); if (E.EXCL.some(([a, c]) => o.includes(a) && o.includes(c))) pairSeen++; } R.pairs = pairSeen;
    out.R = R; return out;
  });
  ok(mech.capsAll, 'los 36 rasgos (más radiadas) dan una capacidad de nivel 1');
  ok(mech.capVar && mech.capMast && mech.capHyb, 'variante = nivel 2, maestría = nivel 3, híbrido da su capacidad (Emboscador tóxico → Cripsis)');
  const R = mech.R;
  ok(!R.landNoWater && R.aletas, 'Nado (aletas): un terrestre entra al lago y pasa a anfibio');
  ok(R.alas, 'Vuelo (alas): un terrestre vuela (cruza el lago)');
  ok(R.herbNo && R.garras, 'Cazador (garras): un herbívoro que no cazaba ahora caza conejos');
  ok(R.bigNo && R.manada, 'Caza en manada: presas ×1,6 de tamaño pasan a ser cazables');
  ok(R.wolfYes && R.veneno && R.imitacion, 'Aposematismo y Falsa advertencia: el lobo deja de elegirlos como presa');
  ok(R.camMove && R.camuflaje, 'Cripsis: quieto es invisible, moviéndose no');
  ok(R.coraza, 'Coraza: un atacante más chico hace ≤ 50 % del daño (' + R.corazaN.join(' → ') + ')');
  ok(R.colmena, 'Castas (colmena): +15 de población máxima');
  ok(R.nest58 && R.madriguera, 'Madriguera: el refugio del nido pasa de 58 a 80');
  ok(R.mig8 && R.migracion, 'Rutas (migración): colonizar pide 4 animales en vez de 8');
  ok(R.excl, 'ramas excluyentes: lo cerrado no vuelve a ofrecerse en 500 ofertas');
  ok(R.pairs > 20, 'las decisiones excluyentes aparecen juntas en la pantalla de evolución (' + R.pairs + ' de 200 ofertas)');

  // ---------- 3. capacidades en partida: efecto medido (escenarios cerrados, pareados) ----------
  const live = await p.evaluate(() => {
    const E = window.__e2, out = {};
    const run = (spec, seed, ids, steps, setup) => { E.cls = spec.slice(0, 3); E.specKey = spec; E.diffI = 1; E.newGame(E.BIOMES[setup && setup.biome] ? setup.biome : 'pradera', null, seed); E.setStarted(true); E.G.modal = false; const me = E.G.me; for (const id of ids) me.traits.push(id); E.recalcSp(me); if (setup && setup.fn) setup.fn(E.G); let acc = { coldDmg: 0, algae: 0, water: 0, n: 0 }; E.Bus.on('dmg', () => {}); for (let i = 0; i < steps; i++) { E.G.pending = 0; E.step(.05); if (i % 20 === 0) { for (const a of E.G.A) if (a.sp === E.G.me) { acc.n++; const L = E.G.biome.lake, dx = (a.x - L.x) / L.rx, dy = (a.y - L.y) / L.ry; if (dx * dx + dy * dy < 1) acc.water++; } } } acc.pop = E.stats().pop; acc.hash = E.stateHash(); return acc; };
    // Abrigo (piel) en la tundra: sin nido ni fogata, menos muertos por frío
    const cold = (ids, seed) => { E.cls = 'ter'; E.specKey = 'ter_ingeniero'; E.diffI = 1; E.newGame('tundra', null, seed); E.setStarted(true); E.G.modal = false; const me = E.G.me; for (const id of ids) me.traits.push(id); E.recalcSp(me);
      E.G.A = E.G.A.filter(a => a.sp === me || a.sp.diet === 'herb' && a.sp.team === 'wild'); E.G.riv.length = 0; let lost = 0;
      for (let i = 0; i < 600; i++) { E.G.pending = 0; for (const a of E.G.A) if (a.sp === me) { a.hunger = 100; a.hp = a.mhp; } E.G.ev = null; E.step(.05); for (const a of E.G.A) if (a.sp === me) lost += a.mhp - a.hp; } return Math.round(lost); };
    let cA = 0, cB = 0; for (let s = 0; s < 3; s++) { cA += cold([], 'FRIO' + s); cB += cold(['piel'], 'FRIO' + s); }
    out.piel = [cA, cB];
    // Nado: un terrestre con aletas pasa tiempo en el agua; sin aletas, nunca
    let w0 = 0, w1 = 0; for (let s = 0; s < 3; s++) { const near = { fn: G => { for (const a of G.A) if (a.sp === G.me) { a.x = 520 + (a.id % 3) * 4; a.y = 420 + (a.id % 4) * 6; } } }, a = run('ter_ingeniero', 'NADO' + s, [], 1200, near), b2 = run('ter_ingeniero', 'NADO' + s, ['aletas'], 1200, near); w0 += a.water; w1 += b2.water; }
    out.nado = [w0, w1];
    return out;
  });
  ok(live.piel[0] > 0 && live.piel[1] < live.piel[0] * .25, 'Abrigo en partida: 30 s de tundra sin nido, vida perdida ' + live.piel.join(' → ') + ' (3 semillas, hambre llena, sin depredadores; lo que queda son contragolpes al cazar)');
  ok(live.nado[0] === 0 && live.nado[1] > 0, 'Nado en partida: un terrestre con aletas usa el lago (muestras en el agua ' + live.nado.join(' → ') + ')');

  // ---------- 4. transición a tierra ----------
  const tierra = await p.evaluate(() => {
    const E = window.__e2, o = {}; E.cls = 'acu'; E.specKey = 'acu_arrecife'; E.diffI = 1; E.newGame('pradera', null, 'TIERRA'); E.setStarted(true); E.G.modal = false;
    const me = E.G.me, L = E.BIOMES.pradera.lake, shore = { x: L.x - L.rx - 40, y: L.y }, inland = { x: 150, y: 150 };
    const offerIds = () => { const s = new Set(); for (let i = 0; i < 30; i++) for (const q of E.offers()) s.add(q.id); return s; };
    o.s0 = { lst: me.lst, shore: E.okPos(me, shore.x, shore.y), inland: E.okPos(me, inland.x, inland.y), offers: [...offerIds()].filter(i => ['radiadas', 'lobuladas', 'pulmones', 'amniota'].includes(i)) };
    E.G.pending = 1; E.pickEvo({ id: 'lobuladas' }); o.s1 = { lst: me.lst, shore: E.okPos(me, shore.x, shore.y), inland: E.okPos(me, inland.x, inland.y), offers: [...offerIds()].filter(i => ['radiadas', 'lobuladas', 'pulmones', 'amniota'].includes(i)), meta: !!E.META };
    { const a = E.G.A.find(q => q.sp === me); a.x = shore.x; a.y = shore.y; a.age = 40; const w = E.spawn(E.G.sp.lobo, shore.x + 10, shore.y, false); o.s1.exposed = E.canEat(w, a); a.x = L.x; a.y = L.y; o.s1.safeInWater = !E.canEat(w, a); }
    E.G.pending = 1; E.pickEvo({ id: 'pulmones' }); const a = E.G.A.find(q => q.sp === me); a.x = inland.x; a.y = inland.y;
    o.s2 = { lst: me.lst, hab: me.hab, inland: E.okPos(me, inland.x, inland.y), layFar: E.layOk(a), dry: E.bioInfo(a).effects.some(e => e.id === 'dry') }; a.x = L.x; a.y = L.y; o.s2.layWet = E.layOk(a);
    E.G.pending = 1; E.pickEvo({ id: 'amniota' }); a.x = inland.x; a.y = inland.y; o.s3 = { lst: me.lst, layFar: E.layOk(a), dry: E.bioInfo(a).effects.some(e => e.id === 'dry'), offers: [...offerIds()].filter(i => ['radiadas', 'lobuladas', 'pulmones', 'amniota'].includes(i)) };
    // velocidad nadando por etapa (relativa): cada etapa nada peor
    o.swim = []; for (const tr of [[], ['lobuladas'], ['lobuladas', 'pulmones'], ['lobuladas', 'pulmones', 'amniota']]) { me.traits = me.traits.filter(i => !['lobuladas', 'pulmones', 'amniota'].includes(i)).concat(tr); E.recalcSp(me); a.x = L.x; a.y = L.y; a.age = 40; a.en = 80; a.inj = 0; a.vul = 0; o.swim.push(Math.round(E.spdOf ? E.spdOf(a) : 0)); }
    // linaje
    try { localStorage.removeItem('evo_lineage'); } catch (e) {} E.win(); const lin = JSON.parse(localStorage.getItem('evo_lineage') || 'null'); o.lin = lin && lin.era2 ? { tierra: lin.era2.tierra, cls: lin.era2.cls, species: lin.era2.species, etapa: lin.era2.etapa, has: ['traits', 'vars', 'evos', 'kills', 'biomes', 'path', 'abil'].every(k => k in lin.era2) } : null;
    // la otra rama: radiadas cierra la salida y escribe tierra = false
    E.cls = 'acu'; E.specKey = 'acu_abisal'; E.newGame('pradera', null, 'MAR'); E.setStarted(true); E.G.modal = false; E.G.pending = 1; E.pickEvo({ id: 'radiadas' }); o.rad = { offers: [...offerIds()].filter(i => ['lobuladas', 'pulmones', 'amniota'].includes(i)), lst: E.G.me.lst };
    localStorage.removeItem('evo_lineage'); E.win(); const l2 = JSON.parse(localStorage.getItem('evo_lineage') || 'null'); o.rad.tierra = l2 && l2.era2 ? l2.era2.tierra : 'sin linaje';
    document.querySelectorAll('.ov.show').forEach(x => x.classList.remove('show'));
    return o;
  });
  ok(tierra.s0.lst === 0 && !tierra.s0.shore && !tierra.s0.inland && tierra.s0.offers.includes('lobuladas') && tierra.s0.offers.includes('radiadas'), 'etapa 0 (agua): no sale del lago; se ofrece la decisión aletas lobuladas / radiadas');
  ok(tierra.s1.lst === 1 && tierra.s1.shore && !tierra.s1.inland && tierra.s1.offers.includes('pulmones') && !tierra.s1.offers.includes('radiadas') && tierra.s1.meta, 'etapa 1 (orilla): sale hasta la costa pero no tierra adentro; radiadas quedó cerrada; hay metamorfosis');
  ok(tierra.s1.exposed && tierra.s1.safeInWater, 'etapa 1: en la orilla un lobo puede cazarlo; dentro del agua no');
  ok(tierra.s2.lst === 2 && tierra.s2.hab === 'amph' && tierra.s2.inland && !tierra.s2.layFar && tierra.s2.layWet && tierra.s2.dry, 'etapa 2 (anfibio): camina tierra adentro, pero cría solo junto al agua y lejos de ella se seca');
  ok(tierra.s3.lst === 3 && tierra.s3.layFar && !tierra.s3.dry && tierra.s3.offers.length === 0, 'etapa 3 (tierra): cría en cualquier lado y no se seca; no quedan etapas');
  ok(tierra.swim.length === 4 && tierra.swim[1] < tierra.swim[0] && tierra.swim[2] < tierra.swim[1] && tierra.swim[3] < tierra.swim[2], 'costo: cada etapa nada más lento (' + tierra.swim.join(' → ') + ')');
  ok(tierra.lin && tierra.lin.tierra === true && tierra.lin.cls === 'acu' && tierra.lin.etapa === 3 && tierra.lin.has, 'al ganar, evo_lineage.era2.tierra = true y el resto de era2 sigue igual (' + JSON.stringify(tierra.lin) + ')');
  ok(tierra.rad.offers.length === 0 && tierra.rad.lst === 0 && tierra.rad.tierra === false, 'la rama «radiadas» cierra la salida del agua y escribe tierra = false');

  // ---------- 5. modo foco: no cambia la simulación ----------
  const foco = await p.evaluate(() => {
    const E = window.__e2, run = (on, toggle) => { E.setFocus(on); E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'FOCO'); E.setStarted(true); E.G.modal = false; for (let i = 0; i < 900; i++) { if (E.G.pending > 0) E.pickEvo(E.offers()[0]); E.step(.05); if (i % 30 === 0) { E.render(); E.hud(); } if (toggle && i % 100 === 0) E.setFocus(!E.FOCUS); } return E.stateHash(); };
    const a = run(true), b2 = run(false), c = run(true, true); E.setFocus(true); return { a, b: b2, c, cls: document.body.classList.contains('foco'), pressed: document.getElementById('tFoco').getAttribute('aria-pressed') };
  });
  ok(foco.a === foco.b && foco.b === foco.c, 'modo foco prendido, apagado o alternando: mismo hash (' + foco.a + ')');
  ok(foco.cls && foco.pressed === 'true', 'el botón Foco refleja el estado (aria-pressed) y el cuerpo tiene la clase foco');

  // ---------- 6. partida vieja (sin capacidades) carga; la pantalla de evolución muestra antes/después ----------
  const old = await p.evaluate(() => {
    const E = window.__e2; E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'VIEJA'); E.setStarted(true); E.G.modal = false; for (let i = 0; i < 300; i++) { E.G.pending = 0; E.step(.05); }
    E.saveGame(true); const d = E.readSave(); d.me.traits = ['garras', 'manada']; d.me.vars = { garras: 'A' }; for (const n of d.N) delete n.gard; const okR = E.restoreGame(d); for (let i = 0; i < 200; i++) { E.G.pending = 0; E.step(.05); }
    E.G.pending = 1; E.openEvo(); const cards = [...document.querySelectorAll('#offers .offer')].map(c => ({ cv: !!c.querySelector('canvas'), cap: !!c.querySelector('.cap'), lose: /Pierde/.test(c.textContent), gain: /Gana/.test(c.textContent) }));
    document.getElementById('mut').classList.remove('show'); E.G.modal = false;
    return { okR, caps: Object.keys(E.G.me.cap), cards };
  });
  ok(old.okR && old.caps.includes('garras') && old.caps.includes('manada'), 'una partida guardada con rasgos viejos carga y recupera sus capacidades (' + old.caps.join(',') + ')');
  ok(old.cards.length === 3 && old.cards.every(c => c.cv && c.cap && c.lose && c.gain), 'pantalla de evolución: 3 cartas con dibujo antes/después, capacidad, lo que gana y lo que pierde');

  ok(errs.length === 0, 'sin errores de consola' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' FALLAS' : 'TODO OK'); process.exit(fails ? 1 : 0);
})();
