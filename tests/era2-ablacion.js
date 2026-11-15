// Ablación de mecánicas de la Era 2: cuánto pesa cada mecánica en el desbalance de una especie (método causal, no «ajustar hasta que dé»).
// Genera copias temporales de eras/era2-animales.html con UNA mecánica desactivada (eras/_abl-<variante>.html, se borran al terminar),
// corre tests/era2-perfiles.js sobre cada una y compara victorias, extinciones, hambre media y colapsos con la línea base.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-ablacion.js [--src <commit, por defecto 1166564 = el código del que salen las tablas de tests/era2-balance.md §1>|trabajo] [--specs ter_cazador,ter_gigante,ter_ingeniero] [--n 8] [--diff 1] [--profile razonable] [--variants a,b,c] [--maxT 600]
const fs = require('fs'), path = require('path'), cp = require('child_process');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].slice(2)] = process.argv[i + 1];
// la fuente es el archivo de un COMMIT (por defecto 1166564, el estado previo al Ciclo 3) salvo --src trabajo (el archivo del árbol de trabajo; las variantes buscaActiva y gananciaProp se miden así): así la ablación mide el código de referencia aunque haya cambios sin commitear
const SRC = path.join(__dirname, '../eras/era2-animales.html'), src = A.src === 'trabajo' ? fs.readFileSync(SRC, 'utf8') : cp.execSync('git show ' + (A.src || '1166564') + ':eras/era2-animales.html', { cwd: path.join(__dirname, '..'), maxBuffer: 1 << 26 }).toString();
const VARIANTS = {
  base: [],
  sinFallos: [['miss = Math.min(.75, miss);', 'miss = 0;']],
  sinContragolpe: [['if (R() < q) { const d2', 'if (false && R() < q) { const d2']],
  sinHeridas: [['if (f >= .05) { const was', 'if (false) { const was']],
  sinCostoMover: [['const EN0 = 70, ENK = 1.0', 'const EN0 = 70, ENK = 0']],
  sinCostoGolpe: [['a.cd = .9; a.en = enOf(a) - 1.2;', 'a.cd = .9;'], ['{ a.en -= 3; a.cd = 1.1;', '{ a.cd = 1.1;']],
  sinDescanso: [['else if (a.en < 40 && !threat && (a.hunger >= 55', 'else if (false && a.en < 40 && !threat && (a.hunger >= 55']],
  reproSinEnergia: [['a.hunger >= 75 && a.en >= 40 && a.age >= MAT && a.rc <= 0 && a.inj <= .5', 'a.hunger >= 75 && a.age >= MAT && a.rc <= 0 && a.inj <= .5'], ['a.hunger -= cost; a.en = Math.max(0, enOf(a) - 18);', 'a.hunger -= cost;']],
  carronaX15: [['food: 30 + b.sp.r * 4', 'food: 45 + b.sp.r * 6']],
  hambreNormal26: [],   // se aplica con --ov (hd 2.6)
  biteFlat: [['tgt.v = Math.max(0, tgt.v - .25 * clamp(a.rr / 9, .7, 1.25));', 'tgt.v = Math.max(0, tgt.v - .25);']],
  biteFlatHd26: [['tgt.v = Math.max(0, tgt.v - .25 * clamp(a.rr / 9, .7, 1.25));', 'tgt.v = Math.max(0, tgt.v - .25);']],
  repro60: [['a.hunger < 75 || enOf(a) < 40 || (a.inj || 0) > .5', 'a.hunger < 60 || enOf(a) < 40 || (a.inj || 0) > .5'], ['a.hunger >= 75 && a.en >= 40 && a.age >= MAT && a.rc <= 0 && a.inj <= .5', 'a.hunger >= 60 && a.en >= 40 && a.age >= MAT && a.rc <= 0 && a.inj <= .5']],
  repro65: [['a.hunger < 75 || enOf(a) < 40 || (a.inj || 0) > .5', 'a.hunger < 65 || enOf(a) < 40 || (a.inj || 0) > .5'], ['a.hunger >= 75 && a.en >= 40 && a.age >= MAT && a.rc <= 0 && a.inj <= .5', 'a.hunger >= 65 && a.en >= 40 && a.age >= MAT && a.rc <= 0 && a.inj <= .5']],
  buscaActiva: [["a.wt = rnd(2, 5); const c = (isP || team === 'rival') ? herdCenter(sp) : mg || null; const q = randPos(sp, c ? c.x : a.x, c ? c.y : a.y, c ? (mg ? 60 : 80) : 60);", "a.wt = rnd(2, 5); const hs = isP && a.hunger < 62; const c = hs ? null : (isP || team === 'rival') ? herdCenter(sp) : mg || null; const q = randPos(sp, c ? c.x : a.x, c ? c.y : a.y, hs ? 220 : c ? (mg ? 60 : 80) : 60);"], ["gx = a.tx; gy = a.ty; spd *= mg ? .75 : .45; if (st === 'idle' && a.hunger < 62) st = 'forage';", "gx = a.tx; gy = a.ty; spd *= mg ? .75 : (isP ? .45 + .4 * clamp((62 - a.hunger) / 62, 0, 1) : .45); if (st === 'idle' && a.hunger < 62) st = 'forage';"]],
  gananciaProp: [['a.hunger = Math.min(100, a.hunger + 24 * p.eff * (isP && warmNear(a.x, a.y) ? 1.25 : 1)); a.en = Math.min(100, a.en + 5);', 'a.hunger = Math.min(100, a.hunger + 24 * clamp(a.rr / 9, .7, 1.25) * p.eff * (isP && warmNear(a.x, a.y) ? 1.25 : 1)); a.en = Math.min(100, a.en + 5);']],
  // ---- tundra (Ciclo 4): una palanca por vez, para medir CUAL pesa (se corre con --biome tundra --src trabajo)
  tPlantas2: [['plants: 44, alg: 10, heat: 1, coldAll', 'plants: 88, alg: 10, heat: 1, coldAll']],
  tCrece2: [['gmin: .6, seasons: [3, 3, 0, 3, 1, 3], grow: 1,', 'gmin: 1.2, seasons: [3, 3, 0, 3, 1, 3], grow: 2,']],
  tSinFrio: [['dmg(a, .35 * p.cold * dt', 'dmg(a, 0 * p.cold * dt']],
  tSinHg: [["tundra: { en: 1.1, sp: .93, hg: 1.12,", "tundra: { en: 1.1, sp: .93, hg: 1,"]],
  tHambre50: [["hr *= BM('hg');", "hr *= BM('hg') * (G.biomeKey === 'tundra' ? .5 : 1);"]],
  tMeta25: [["kw: .5, kp: .55, gmin", "kw: .5, kp: .25, gmin"]],
  tSinSalvajes: [["kw: .5, kp: .55, gmin", "kw: .1, kp: .55, gmin"]],
  tSinHuevoCosto: [['a.hunger -= cost; a.en = Math.max(0, enOf(a) - 18); a.vul = 8;', "a.hunger -= cost * (G.biomeKey === 'tundra' ? .3 : 1); a.en = Math.max(0, enOf(a) - 18); a.vul = 8;"]],
  // ---- Rugido (Ciclo 4): ¿el costo de energía es lo que resta? (se corre con --src trabajo --profile habil --biome pradera)
  rugGratis: [['L: [{ cd: 25, en: 10, r: 120, stun: 3, push: 26, dbf: 0 }, { cd: 24, en: 12, r: 150, stun: 4, push: 34, dbf: 0 }, { cd: 22, en: 14, r: 180, stun: 5, push: 42, dbf: 5 }]', 'L: [{ cd: 25, en: 0, r: 120, stun: 3, push: 26, dbf: 0 }, { cd: 24, en: 0, r: 150, stun: 4, push: 34, dbf: 0 }, { cd: 22, en: 0, r: 180, stun: 5, push: 42, dbf: 5 }]']],
  rugBarato: [['L: [{ cd: 25, en: 10, r: 120, stun: 3, push: 26, dbf: 0 }, { cd: 24, en: 12, r: 150, stun: 4, push: 34, dbf: 0 }, { cd: 22, en: 14, r: 180, stun: 5, push: 42, dbf: 5 }]', 'L: [{ cd: 25, en: 5, r: 120, stun: 3, push: 26, dbf: 0 }, { cd: 24, en: 6, r: 150, stun: 4, push: 34, dbf: 0 }, { cd: 22, en: 7, r: 180, stun: 5, push: 42, dbf: 5 }]']],
  rugCercanos: [['pay(P, mine.filter(m => foes.some(([b]) => hyp(b.x - m.x, b.y - m.y) < P.r)));', 'pay(P, mine.filter(m => foes.some(([b]) => hyp(b.x - m.x, b.y - m.y) < P.r * .5)));']],
  sinDesistir: [['else if (a.en < 20 && !oa && !(isP && stance === \'attack\')) {', 'else if (false) {']]
};
const names = (A.variants ? A.variants.split(',') : Object.keys(VARIANTS)), diff = A.diff || '1', specs = A.specs || 'ter_cazador,ter_gigante,ter_ingeniero', n = A.n || '8', prof = A.profile || 'razonable', bio = A.biome || 'pradera', maxT = A.maxT || '600';
const res = {};
for (const v of names) {
  let t = src; for (const [o, nw] of (VARIANTS[v] || [])) { const c = t.split(o).length - 1; if (c !== 1) { console.log('variante ' + v + ': el texto a reemplazar aparece ' + c + ' veces (se esperaba 1): ' + o.slice(0, 60)); process.exit(1); } t = t.replace(o, nw); }
  const f = path.join(__dirname, '../eras/_abl-' + v + '.html'); fs.writeFileSync(f, t);
  const args = ['tests/era2-perfiles.js', 'abl-' + v, '--n', n, '--diffs', diff, '--profiles', prof, '--specs', specs, '--maxT', maxT, '--biomes', bio, '--html', f]; if (v === 'hambreNormal26' || v === 'biteFlatHd26') args.push('--ov', JSON.stringify({ 1: { hd: 2.6 } }));
  cp.spawnSync(process.execPath, args, { cwd: path.join(__dirname, '..'), stdio: 'ignore', env: process.env }); fs.unlinkSync(f);
  const rs = JSON.parse(fs.readFileSync(path.join(__dirname, '.balance-out', 'abl-' + v + '.json'))).filter(r => !r.error), N = rs.length, w = rs.filter(r => r.end === 'win').length, e = rs.filter(r => r.end === 'lose').length;
  const av = f2 => (rs.reduce((s, r) => s + f2(r), 0) / N);
  res[v] = { N, win: w, ext: e, hu: av(r => r.avgHu).toFixed(0), en: av(r => r.avgEn).toFixed(0), exh: av(r => r.exh).toFixed(1), pop: av(r => r.avgPop).toFixed(0), starve: av(r => (r.dc.hambre || 0)).toFixed(1) };
  console.log(v.padEnd(18), 'gana ' + w + '/' + N, 'extinción ' + e, 'hambre media ' + res[v].hu, 'energía media ' + res[v].en, 'colapsos/partida ' + res[v].exh, 'pob media ' + res[v].pop, 'muertes por hambre/partida ' + res[v].starve);
}
