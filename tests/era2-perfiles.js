// Balance de la Era 2 por especie x dificultad x perfil x bioma, con causas de derrota. Reproducible con una sola orden:
//   NODE_PATH=$(npm root -g) node tests/era2-perfiles.js <etiqueta> [--n 2] [--diffs 0,1,2] [--profiles razonable,cazador,...|all] [--specs ter_cazador,...|all]
//        [--biomes pradera,selva,...] [--maxT 900] [--workers 4] [--html ruta] [--ov '{"1":{"hd":3}}'] [--abOff rug,ala] [--agg]
// n = repeticiones por (especie, dificultad, perfil, bioma); la semilla es 'P<dif><perfil><bioma><especie>#<i>'.
// Con --agg solo vuelve a imprimir las tablas de tests/.balance-out/<etiqueta>.json. Los bots viven en tests/era2-perfiles-bot.js.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), cp = require('child_process');
const OUT = path.join(__dirname, '.balance-out'); fs.mkdirSync(OUT, { recursive: true });
const ALL_SPECS = ['ter_cazador', 'ter_gigante', 'ter_ingeniero', 'ins_colmena', 'ins_enjambre', 'ins_parasito', 'acu_abisal', 'acu_arrecife', 'acu_anfibio', 'ave_rapaz', 'ave_carronera', 'ave_migratoria'];
const HAB = { acu_abisal: 'water', acu_arrecife: 'water', acu_anfibio: 'amph', ins_colmena: 'fly', ins_enjambre: 'fly', ins_parasito: 'fly', ave_rapaz: 'fly', ave_carronera: 'fly', ave_migratoria: 'fly' };
const ALL_PROF = ['razonable', 'cazador', 'defensivo', 'migrador', 'enjambre', 'tactico'];
function parse(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); if (['agg'].includes(k)) o[k] = true; else o[k] = argv[++i]; } else o._.push(a); } return o; }
const wilson = (k, n) => { if (!n) return [0, 0]; const p = k / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / 2 / n) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / 4 / n / n) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
const pc = x => Math.round(100 * x) + '%';
const cell = (rs) => { const n = rs.length, w = rs.filter(r => r.end === 'win').length; const [lo, hi] = wilson(w, n); return { n, w, txt: w + '/' + n, ci: '[' + Math.round(100 * lo) + '-' + Math.round(100 * hi) + ']' }; };
const CAUSE_NAME = k => k == null ? '—' : k === 'hambre' ? 'hambruna' : k === 'frio' ? 'frío' : k === 'fuego' ? 'fuego' : k === 'rival' ? 'rival' : k === 'jefe' ? 'jefe (oso)' : k.startsWith('depredador:') ? 'depredación (' + k.slice(11) + ')' : k;
const CAUSE_GROUP = k => k == null ? '—' : k.startsWith('depredador:') ? 'depredación' : CAUSE_NAME(k);

function table(title, rowKeys, colKeys, rs, rowF, colF) {
  console.log('\n' + title);
  console.log(['', ...colKeys].join(' | '));
  for (const r of rowKeys) { const line = [r]; for (const c of colKeys) { const q = rs.filter(x => rowF(x) === r && colF(x) === c); line.push(q.length ? cell(q).txt : '·'); } console.log(line.join(' | ')); }
}
function aggregate(rs) {
  if (!rs.length) { console.log('sin resultados'); return; }
  const uniq = f => [...new Set(rs.map(f))];
  const diffs = uniq(x => x.diff).sort(), profs = uniq(x => x.profile), specs = ALL_SPECS.filter(s => rs.some(x => x.spec === s)), biomes = uniq(x => x.biome);
  const D = d => ['Fácil', 'Normal', 'Difícil'][d];
  // 1) general por dificultad
  console.log('\n== Victorias por dificultad (todas las partidas; IC95 de Wilson)');
  for (const d of diffs) { const q = rs.filter(x => x.diff === d), c = cell(q), ext = q.filter(x => x.end === 'lose').length, to = q.filter(x => x.end === 'timeout').length; console.log(D(d) + ': ' + c.txt + ' = ' + pc(c.w / c.n) + ' ' + c.ci + ' | extinción ' + pc(ext / q.length) + ' | sin terminar a ' + (q[0].maxT || '') + ' s: ' + pc(to / q.length)); }
  // 2) perfil x dificultad
  table('== Victorias por perfil x dificultad', profs, diffs.map(D), rs, x => x.profile, x => D(x.diff));
  // 3) especie x dificultad (todos los perfiles juntos) y especie x perfil
  table('== Victorias por especie x dificultad (todos los perfiles)', specs, diffs.map(D), rs, x => x.spec, x => D(x.diff));
  if (profs.length > 1) for (const d of diffs) table('== Victorias por especie x perfil, ' + D(d), specs, profs, rs.filter(x => x.diff === d), x => x.spec, x => x.profile);
  // 4) por clase
  const clsOf = x => x.spec.slice(0, 3), cls = ['ter', 'ins', 'acu', 'ave'].filter(c => rs.some(x => clsOf(x) === c));
  table('== Victorias por clase x dificultad', cls, diffs.map(D), rs, clsOf, x => D(x.diff));
  // 5) biomas
  if (biomes.length > 1) { table('== Victorias por bioma inicial x dificultad', biomes, diffs.map(D), rs, x => x.biome, x => D(x.diff)); table('== Victorias por bioma inicial x clase', biomes, cls, rs, x => x.biome, clsOf); }
  // 6) causas de derrota (partidas no ganadas): causa principal
  const lost = rs.filter(x => x.end !== 'win');
  if (lost.length) {
    const causes = [...new Set(lost.map(x => CAUSE_GROUP(x.loseCause)))].sort();
    console.log('\n== Causa principal de derrota (partidas no ganadas: extinción o sin terminar), por clase');
    console.log(['clase', 'no ganadas', ...causes].join(' | '));
    for (const c of cls) { const q = lost.filter(x => clsOf(x) === c); if (!q.length) continue; console.log([c, q.length, ...causes.map(k => q.filter(x => CAUSE_GROUP(x.loseCause) === k).length)].join(' | ')); }
    console.log('\n== Causa principal de derrota por especie (solo extinciones)');
    const ext = lost.filter(x => x.end === 'lose'), ec = [...new Set(ext.map(x => CAUSE_NAME(x.loseCause)))].sort();
    console.log(['especie', 'extinciones', ...ec].join(' | '));
    for (const s of specs) { const q = ext.filter(x => x.spec === s); if (!q.length) continue; console.log([s, q.length, ...ec.map(k => q.filter(x => CAUSE_NAME(x.loseCause) === k).length)].join(' | ')); }
    console.log('\n== Muertes propias totales por causa (por partida, media) y por especie');
    const keys = {}; for (const x of rs) for (const k in x.dc) keys[CAUSE_GROUP(k === 'x' ? 'rival' : k)] = 0; const kk = Object.keys(keys).sort();
    console.log(['especie', ...kk, 'hambrientos al morir'].join(' | '));
    for (const s of specs) { const q = rs.filter(x => x.spec === s); const line = [s]; for (const g of kk) { let t = 0; for (const x of q) for (const k in x.dc) if (CAUSE_GROUP(k === 'x' ? 'rival' : k) === g) t += x.dc[k]; line.push((t / q.length).toFixed(1)); } line.push((q.reduce((t, x) => t + x.hungryDeaths, 0) / q.length).toFixed(1)); console.log(line.join(' | ')); }
  }
  // 7) diagnóstico de conducta por especie
  console.log('\n== Conducta media por especie (hambre/energía/vida medias, % del tiempo en cada estado, golpes dados/recibidos, presas)');
  for (const s of specs) { const q = rs.filter(x => x.spec === s), av = f => (q.reduce((t, x) => t + f(x), 0) / q.length); const sh = {}; for (const x of q) for (const k in x.stSh) sh[k] = (sh[k] || 0) + x.stSh[k] / q.length; console.log(s + ': hambre ' + av(x => x.avgHu).toFixed(0) + ' en ' + av(x => x.avgEn).toFixed(0) + ' vida ' + av(x => x.avgHp).toFixed(0) + '% | ' + Object.entries(sh).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + ' ' + v.toFixed(0) + '%').join(' ') + ' | golpes ' + av(x => x.hitMade).toFixed(0) + '/' + av(x => x.hitTaken).toFixed(0) + ' presas ' + av(x => x.kills).toFixed(1) + ' bocados pl/ca/an/hu ' + ['plant', 'carc', 'animal', 'egg'].map(k => av(x => x.eat[k]).toFixed(0)).join('/') + ' colapsos ' + av(x => x.exh).toFixed(1) + ' nacidos ' + av(x => x.born).toFixed(0) + ' (n=' + q.length + ')'); }
}
async function worker(jobFile, i, n, tag) {
  const J = JSON.parse(fs.readFileSync(jobFile)), html = path.resolve(J.html || path.join(__dirname, '../eras/era2-animales.html'));
  const errs = []; let b = null, p = null;
  const open = async () => {   // (re)abre el navegador: si Chromium muere a mitad de la tanda se reintenta la partida con uno nuevo
    if (b) { try { await b.close(); } catch (e) {} }
    b = await chromium.launch(); p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    p.on('crash', () => errs.push('CRASH de la página')); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
    await p.goto('file://' + html); await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'era2-perfiles-bot.js'), 'utf8') });
    if (J.ov) await p.evaluate(o => { const D = window.__e2.DIFFS; for (const k in o) Object.assign(D[k], o[k]); }, J.ov);
  };
  await open(); const out = [];
  for (let k = i; k < J.jobs.length; k += n) {
    const j = J.jobs[k]; let r = null;
    for (let intento = 0; intento < 3 && !r; intento++) {
      try { r = await p.evaluate(o => window.runProfile(o), Object.assign({ maxT: J.maxT, abOff: J.abOff }, j)); r.maxT = J.maxT; }
      catch (e) { const m = String(e.message).slice(0, 200); if (/closed|crash|disconnected/i.test(m) && intento < 2) { errs.push('reintento: ' + m.slice(0, 60)); await open(); } else r = { error: m, job: j, end: 'error', diff: j.diff, spec: j.spec, profile: j.profile, biome: j.biome, dc: {}, stSh: {}, eat: {}, hungryDeaths: 0 }; }
    }
    out.push(r); fs.writeFileSync(path.join(OUT, tag + '-w' + i + '.json'), JSON.stringify({ out, errs: errs.slice(0, 8) }));
  }
  await b.close();
}
(async () => {
  const a = parse(process.argv.slice(2));
  if (a.worker) { await worker(a.worker, +a.i, +a.n, a.tag); return; }
  const label = a._[0] || 'perfiles', file = path.join(OUT, label + '.json');
  if (a.agg) { aggregate(JSON.parse(fs.readFileSync(file))); return; }
  const diffs = (a.diffs || '0,1,2').split(',').map(Number), profs = !a.profiles || a.profiles === 'all' ? ALL_PROF : a.profiles.split(','), specsA = !a.specs || a.specs === 'all' ? ALL_SPECS : a.specs.split(','), biomes = (a.biomes || 'pradera').split(','), n = +(a.n || 2), maxT = +(a.maxT || 900), W = +(a.workers || 4);
  const jobs = []; for (const bio of biomes) for (const d of diffs) for (const pr of profs) for (const sp of specsA) { if (bio === 'oceano' && !HAB[sp]) continue; for (let i = 0; i < n; i++) jobs.push({ seed: 'P' + d + pr + bio + sp + '#' + i, diff: d, spec: sp, profile: pr, biome: bio }); }
  // mezcla estable para repartir las partidas largas entre los workers
  jobs.sort((x, y) => (x.seed < y.seed ? -1 : 1)); const jf = path.join(OUT, label + '-jobs.json'); fs.writeFileSync(jf, JSON.stringify({ jobs, maxT, html: a.html || null, ov: a.ov ? JSON.parse(a.ov) : null, abOff: a.abOff ? a.abOff.split(',') : [] }));
  console.log('partidas: ' + jobs.length + ', workers: ' + W); const t0 = Date.now();
  await Promise.all(Array.from({ length: W }, (_, i) => new Promise(res => { const c = cp.spawn(process.execPath, [__filename, '--worker', jf, '--i', String(i), '--n', String(W), '--tag', label], { stdio: 'inherit', env: process.env }); c.on('exit', res); })));
  let rs = [], errs = []; for (let i = 0; i < W; i++) { const f = path.join(OUT, label + '-w' + i + '.json'); if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f)); rs = rs.concat(d.out); errs = errs.concat(d.errs); fs.unlinkSync(f); } }
  fs.writeFileSync(file, JSON.stringify(rs)); console.log('listo en ' + Math.round((Date.now() - t0) / 1000) + ' s; errores de consola/página: ' + errs.length + (errs.length ? ' ' + JSON.stringify(errs.slice(0, 3)) : '')); const bad = rs.filter(r => r.error); if (bad.length) console.log('partidas con error de bot: ' + bad.length + ' ' + bad[0].error);
  aggregate(rs.filter(r => !r.error));
})();
