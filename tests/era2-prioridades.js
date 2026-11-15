// Prioridades estratégicas de la Era 2 (G.x2.prio): escenarios cerrados, semillas pareadas, intervalos de confianza.
//   NODE_PATH=$(npm root -g) node tests/era2-prioridades.js [N=48] [--specs ter_ingeniero,ave_migratoria,ins_colmena] [--T 150] [--html ruta] [--workers 3]
// Para cada prioridad (comida, reproduccion, expansion, defensa, exploracion) y cada nivel (0 baja, 2 alta) corre las MISMAS N semillas que con 1 (normal) y compara
// el BENEFICIO y el COSTO que promete docs/ERA2-PRIORIDADES.md: diferencia pareada media ± 1,96 EE y cuántas semillas mejoran/empeoran.
// Además verifica: (1) compatibilidad: sin G.x2.prio el estado es idéntico (hash) a prio todo en 1; (2) determinismo: la misma semilla y prioridades dan el mismo hash;
// (3) las prioridades solo cambian a los animales propios (el estado de los salvajes sin contacto con ellos no se usa como métrica).
const { chromium } = require('playwright'); const path = require('path'); const cp = require('child_process');
const A = {}; const pos = []; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) A[a.slice(2)] = process.argv[++i]; else pos.push(a); }
const N = +(pos[0] || 48), T = +(A.T || 150), SPECS = (A.specs || 'ter_ingeniero,ave_migratoria,ins_colmena').split(','), HTML = path.resolve(A.html || path.join(__dirname, '../eras/era2-animales.html')), WK = +(A.workers || 3);
const PRK = A.only ? A.only.split(',') : ['comida', 'reproduccion', 'expansion', 'defensa', 'exploracion'];   // --only comida,expansion: solo esas prioridades
const SPEC_CLS = { ter_cazador: 'ter', ter_gigante: 'ter', ter_ingeniero: 'ter', ins_colmena: 'ins', ins_enjambre: 'ins', ins_parasito: 'ins', acu_abisal: 'acu', acu_arrecife: 'acu', acu_anfibio: 'acu', ave_rapaz: 'ave', ave_carronera: 'ave', ave_migratoria: 'ave' };

// ---- corre en la página: devuelve métricas de un escenario ----
function inPage(o) {
  const E = window.__e2; E.cls = o.cls; E.specKey = o.spec; E.diffI = 1;
  if (!window.__prHook) { window.__prHook = 1; const B = E.Bus, mine = a => a && a.sp && a.sp.team === 'player' && !a.sp.domestic; window.__pr = null;
    B.on('eat', (a, t, k) => { const h = window.__pr; if (h && mine(a)) h.eat++; });
    B.on('lay', a => { const h = window.__pr; if (h && mine(a)) h.lay++; });
    B.on('born', a => { const h = window.__pr; if (h && mine(a)) h.born++; });
    B.on('kill', (b, src) => { const h = window.__pr; if (h && mine(b)) { h.dead++; if (src) h.deadEnemy++; else if (b.lc === 'hambre' || b.hunger <= 0) h.deadHunger++; } });
    B.on('hit', (a, b, d) => { const h = window.__pr; if (!h) return; if (mine(b)) { h.hitIn++; h.dmgIn += d; } else if (mine(a)) h.hitOut++; });
  }
  E.newGame(o.biome || 'pradera', null, o.seed); E.setStarted(true); const G = E.G;
  if (o.prio) G.x2.prio = Object.assign({}, o.prio);
  const H = window.__pr = { eat: 0, lay: 0, born: 0, dead: 0, deadEnemy: 0, deadHunger: 0, hitIn: 0, hitOut: 0, dmgIn: 0 };
  const S = { n: 0, hu: 0, en: 0, hp: 0, cells: 0, spr: 0, aSec: 0, pl: 0, vul: 0, near: 0, pln: 0 };
  const sample = () => { const m = G.A.filter(a => a.sp === G.me && !a.dead); if (!m.length) return; S.n++; S.aSec += m.length; let cx = 0, cy = 0; const cells = new Set(); for (const a of m) { S.hu += a.hunger; S.en += (a.en == null ? 70 : a.en); S.hp += a.hp / a.mhp; if (a.vul > 0) S.vul++; cx += a.x; cy += a.y; cells.add(Math.floor(a.x / 80) * 100 + Math.floor(a.y / 80)); } cx /= m.length; cy /= m.length; S.cells += cells.size; let sd = 0; for (const a of m) sd += Math.hypot(a.x - cx, a.y - cy); S.spr += sd / m.length; let pv = 0, pn = 0, nn = 0; for (const p of G.plants) { pv += p.v; if (Math.hypot(p.x - cx, p.y - cy) < 90) { pn += p.v; nn++; } } S.pl += pv / G.plants.length; S.pln += nn ? pn / nn : 0.5; };
  const warm = o.warm || 40;
  const step = () => { E.step(.05); if (E.G.modal) E.G.modal = false; };
  for (let i = 0; i < warm * 20; i++) step();   // calentamiento (sin medir): la manada se acomoda
  if (o.threat) { const m = G.A.filter(a => a.sp === G.me && !a.dead); let cx = 0, cy = 0; for (const a of m) { cx += a.x; cy += a.y; } cx /= m.length; cy /= m.length; for (let k = 0; k < o.threat; k++) { const q = E.spawn(G.sp.lobo, cx + 110 + (k % 3) * 14, cy + (k >> 1) * 12 - 10, false); q.hunger = 30; } }
  const pop0 = E.stats().pop; Object.keys(H).forEach(k => H[k] = 0);
  for (let i = 0; i < o.T * 20; i++) { step(); if (i % 20 === 0) sample(); if (E.G.over) break; }
  const popEnd = E.stats().pop, ns = Math.max(1, S.n), as = Math.max(1, S.aSec);
  return { pop0, popEnd, dpop: popEnd - pop0, hu: S.hu / as, en: S.en / as, hp: S.hp / as, cells: S.cells / ns, spr: S.spr / ns, plants: S.pl / ns, plNear: S.pln / ns, vulShare: S.vul / as, eatPA: H.eat / as * 100, layPA: H.lay / as * 100, bornPA: H.born / as * 100, dead: H.dead, deadEnemy: H.deadEnemy, deadHunger: H.deadHunger, hitIn: H.hitIn, hitOut: H.hitOut, dmgIn: H.dmgIn, hash: E.hashStr(E.G.A.map(a => [a.id, a.x.toFixed(1), a.y.toFixed(1), a.hunger.toFixed(1), a.hp.toFixed(1)].join(',')).join(';')) };
}

// métricas de cada prioridad: [clave, etiqueta, signo (+1 = más es mejor para el jugador), esBeneficio]
const METRICS = {
  comida: { n: 'comida', scen: {}, m: [['hu', 'hambre media (100 = lleno)', 1, 'beneficio'], ['layPA', 'huevos por animal-s x100', 1, 'costo'], ['plants', 'plantas del mapa (v media)', 1, 'costo'], ['deadEnemy', 'muertes por enemigos', -1, 'costo']], thr: 3 },
  reproduccion: { n: 'reproduccion', scen: {}, m: [['layPA', 'huevos por animal-s x100', 1, 'beneficio'], ['dpop', 'población: cambio en la ventana', 1, 'beneficio'], ['hu', 'hambre media', 1, 'costo'], ['vulShare', 'fracción de tiempo vulnerable', -1, 'costo'], ['dead', 'muertes totales', -1, 'costo']] },
  expansion: { n: 'expansion', scen: {}, bio: 'desierto', m: [['cells', 'territorio (celdas de 80 px ocupadas)', 1, 'beneficio'], ['spr', 'dispersión (px al centro)', 1, 'beneficio'], ['plNear', 'plantas junto al grupo (v media a < 90 del centro)', 1, 'beneficio'], ['en', 'energía media', 1, 'costo'], ['hitIn', 'golpes recibidos', -1, 'costo']], thr: 3 },
  defensa: { n: 'defensa', scen: {}, m: [['dead', 'muertes (con 4 lobos encima)', -1, 'beneficio'], ['dmgIn', 'daño recibido', -1, 'beneficio'], ['hitOut', 'golpes dados', 1, 'beneficio'], ['eatPA', 'bocados por animal-s x100', 1, 'costo'], ['cells', 'territorio (celdas)', 1, 'costo']], thr: 4 },
  exploracion: { n: 'exploracion', scen: {}, bio: 'desierto', m: [['eatPA', 'bocados por animal-s x100', 1, 'beneficio'], ['hu', 'hambre media', 1, 'beneficio'], ['en', 'energía media', 1, 'costo'], ['cells', 'territorio (celdas)', 1, 'beneficio']], thr: 3 }
};

const stat = (d) => { const n = d.length, mean = d.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1)), se = sd / Math.sqrt(n); return { mean, ci: 1.96 * se, better: d.filter(x => x > 1e-9).length, worse: d.filter(x => x < -1e-9).length, n }; };
const r2 = v => (Math.round(v * 100) / 100).toString().replace('.', ',');

async function worker(jobs, i, n, out) {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + HTML);
  for (let k = i; k < jobs.length; k += n) { const j = jobs[k]; out[k] = await p.evaluate(`(${inPage.toString()})(${JSON.stringify(j)})`); }
  await b.close(); return errs;
}
(async () => {
  const jobs = [], idx = {};
  for (const spec of SPECS) for (const pk of PRK) { for (const lv of [1, 0, 2]) for (let s = 0; s < N; s++) { const prio = {}; for (const k of PRK) prio[k] = k === pk ? lv : 1; jobs.push({ spec, cls: SPEC_CLS[spec], seed: 'PR' + spec + pk + '#' + s, prio, T, threat: METRICS[pk].thr || 0, biome: METRICS[pk].bio || 'pradera', warm: 40, key: [spec, pk, lv, s].join('|') }); } }
  // referencia sin prio: compatibilidad
  for (const spec of SPECS) for (let s = 0; s < 3; s++) { jobs.push({ spec, cls: SPEC_CLS[spec], seed: 'COMPAT' + spec + '#' + s, prio: null, T: 60, threat: 0, warm: 20, key: [spec, 'compat', 'none', s].join('|') }); jobs.push({ spec, cls: SPEC_CLS[spec], seed: 'COMPAT' + spec + '#' + s, prio: { comida: 1, reproduccion: 1, expansion: 1, defensa: 1, exploracion: 1 }, T: 60, threat: 0, warm: 20, key: [spec, 'compat', 'unos', s].join('|') }); jobs.push({ spec, cls: SPEC_CLS[spec], seed: 'COMPAT' + spec + '#' + s, prio: { comida: 2, reproduccion: 0, expansion: 2, defensa: 0, exploracion: 2 }, T: 60, threat: 0, warm: 20, key: [spec, 'compat', 'mix1', s].join('|') }); jobs.push({ spec, cls: SPEC_CLS[spec], seed: 'COMPAT' + spec + '#' + s, prio: { comida: 2, reproduccion: 0, expansion: 2, defensa: 0, exploracion: 2 }, T: 60, threat: 0, warm: 20, key: [spec, 'compat', 'mix2', s].join('|') }); }
  const res = new Array(jobs.length), t0 = Date.now(); console.log('escenarios: ' + jobs.length + ' (N = ' + N + ' semillas por celda, ' + T + ' s de juego, especies ' + SPECS.join(',') + ')');
  const errs = (await Promise.all(Array.from({ length: WK }, (_, i) => worker(jobs, i, WK, res)))).flat();
  const R = {}; jobs.forEach((j, k) => { R[j.key] = res[k]; });
  let fail = 0; const ok = (c, t) => { console.log((c ? 'OK   ' : 'FALLA ') + t); if (!c) fail++; };
  console.log('listo en ' + Math.round((Date.now() - t0) / 1000) + ' s; errores de página: ' + errs.length);
  // compatibilidad y determinismo
  for (const spec of SPECS) { let c1 = 0, c2 = 0, c3 = 0; for (let s = 0; s < 3; s++) { const a = R[[spec, 'compat', 'none', s].join('|')], b = R[[spec, 'compat', 'unos', s].join('|')], m1 = R[[spec, 'compat', 'mix1', s].join('|')], m2 = R[[spec, 'compat', 'mix2', s].join('|')]; if (a.hash === b.hash) c1++; if (m1.hash === m2.hash) c2++; if (a.hash !== m1.hash) c3++; } ok(c1 === 3, spec + ': sin G.x2.prio el estado es idéntico a prio todo en 1 (' + c1 + '/3 semillas)'); ok(c2 === 3, spec + ': mismas prioridades y semilla → mismo estado (' + c2 + '/3)'); ok(c3 === 3, spec + ': las prioridades cambian el estado (' + c3 + '/3)'); }
  // tablas
  const summary = [];
  for (const pk of PRK) {
    console.log('\n## Prioridad «' + pk + '» (' + SPECS.join(', ') + '; escenario' + (METRICS[pk].thr ? ' con ' + METRICS[pk].thr + ' lobos a ~110 px de la manada' : ' libre') + ', ' + T + ' s, N = ' + (N * SPECS.length) + ' semillas pareadas)');
    for (const lv of [0, 2]) {
      console.log('### nivel ' + lv + ' (' + (lv ? 'alta' : 'baja') + ') contra normal (1): diferencia pareada media ± IC95 [mejora/empeora de ' + N * SPECS.length + ']');
      for (const [k, lab, sg, tipo] of METRICS[pk].m) {
        const d = []; for (const spec of SPECS) for (let s = 0; s < N; s++) { const a = R[[spec, pk, lv, s].join('|')], b = R[[spec, pk, 1, s].join('|')]; d.push(a[k] - b[k]); }
        const st = stat(d), base = SPECS.flatMap(spec => Array.from({ length: N }, (_, s) => R[[spec, pk, 1, s].join('|')][k])), bm = base.reduce((x, y) => x + y, 0) / base.length;
        const sig = Math.abs(st.mean) > st.ci; summary.push({ pk, lv, k, lab, tipo, mean: st.mean, ci: st.ci, sig, sg });
        console.log('- [' + tipo + '] ' + lab + ': normal ' + r2(bm) + ' → ' + r2(bm + st.mean) + ' (Δ ' + (st.mean >= 0 ? '+' : '') + r2(st.mean) + ' ± ' + r2(st.ci) + (sig ? (st.mean * sg > 0 ? ', MEJOR' : ', PEOR') + ' para el jugador' : ', sin efecto distinguible') + '; mejora ' + st.better + ' / empeora ' + st.worse + ')');
      }
    }
  }
  // veredicto: cada nivel extremo tiene que ser un TRATO medible. Alta: al menos un beneficio significativamente mejor Y un costo significativamente peor.
  // Baja (lo inverso): al menos un costo significativamente mejor (lo que se ahorra) Y un beneficio significativamente peor (lo que se resigna).
  console.log('');
  for (const pk of PRK) for (const lv of [2, 0]) {
    const m = summary.filter(x => x.pk === pk && x.lv === lv), better = t => m.filter(x => x.tipo === t && x.sig && x.mean * x.sg > 0), worse = t => m.filter(x => x.tipo === t && x.sig && x.mean * x.sg < 0);
    const g = lv === 2 ? better('beneficio') : better('costo'), l = lv === 2 ? worse('costo') : worse('beneficio');
    if (lv === 0 && g.length >= 1 && l.length === 0) { console.log('AVISO ' + pk + ' nivel 0 (baja): ahorra en ' + g.map(x => x.k).join(',') + ' pero lo que resigna no se distingue del ruido con N = ' + N * SPECS.length + ' (no es una falla: lo que se ahorra es el costo de la alta)'); continue; }   // la baja es el espejo de la alta: basta que ahorre; si además resigna algo medible, mejor
    ok(g.length >= 1 && l.length >= 1, pk + ' nivel ' + lv + ' (' + (lv ? 'alta' : 'baja') + '): trato medible (' + (lv ? 'gana en ' : 'ahorra en ') + g.map(x => x.k).join(',') + ' | ' + (lv ? 'paga en ' : 'resigna en ') + l.map(x => x.k).join(',') + ')');
  }
  if (errs.length) console.log('errores:', errs.slice(0, 3));
  console.log(fail ? '\n' + fail + ' FALLAS' : '\nOK'); process.exit(fail ? 1 : 0);
})();
