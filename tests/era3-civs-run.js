// Balance de la Era 3 por civilización (Ciclo 4): perfiles de bot × civilización × dificultad, N partidas; victorias con IC de Wilson al 95 % y tiempos hasta cada Edad.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-civs-run.js <dificultades 0,1,2> <perfiles economico,defensivo,militar,clash|todos> <civs ter,ins,acu,ave|todas> <N> <maxT s> [etiqueta] [paralelo=4]
// La especie de cada partida rota entre las 3 de la clase (y en acuáticos, la mitad con transición a tierra = ciudad anfibia).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [,, diffs, perfil, civArg, n, maxT, label, par] = process.argv;
const wilson = (k, n) => { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), a = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - a) / d), Math.min(1, (c + a) / d)]; };
const pct = x => Math.round(x * 100) + '%';
const SPS = { ter: ['ter_cazador', 'ter_gigante', 'ter_ingeniero'], ins: ['ins_colmena', 'ins_enjambre', 'ins_parasito'], acu: ['acu_abisal', 'acu_arrecife', 'acu_anfibio'], ave: ['ave_rapaz', 'ave_carronera', 'ave_migratoria'] };
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const b = await chromium.launch(); const errs = []; const all = [];
  const perfiles = perfil === 'todos' ? ['economico', 'defensivo', 'militar', 'clash'] : perfil.split(',');
  const civs = civArg === 'todas' ? ['ter', 'ins', 'acu', 'ave'] : civArg.split(',');
  const jobs = []; for (const pf of perfiles) for (const c of civs) for (const d of diffs.split(',').map(Number)) for (let i = 0; i < +n; i++) jobs.push({ pf, c, d, i, sp: SPS[c][i % 3], tierra: c === 'acu' && i % 2 === 1 });
  const P = +(par || 4); let next = 0;
  const worker = async () => { const p = await b.newPage({ viewport: { width: 800, height: 600 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '../eras/era3-tribus.html')); await p.addScriptTag({ content: fs.readFileSync(path.resolve(__dirname, 'era3-bots.js'), 'utf8') });
    while (next < jobs.length) { const j = jobs[next++]; const r = await p.evaluate(([s, d, m, k, o]) => window.runBot3(s, d, m, k, o), ['B' + j.d + j.pf[0] + j.c + j.i, j.d, +maxT, j.pf, { species: j.sp, tierra: j.tierra }]); all.push(r); }
    await p.close(); };
  await Promise.all(Array.from({ length: P }, worker));
  const rows = [];
  for (const pf of perfiles) for (const c of civs) for (const d of diffs.split(',').map(Number)) {
    const rs = all.filter(r => r.perfil === pf && r.civ === c && r.diff === d); if (!rs.length) continue;
    const w = rs.filter(r => r.end === 'win'), l = rs.filter(r => r.end === 'lose'), ci = wilson(w.length, rs.length);
    const a2 = rs.filter(r => r.ages[2] !== undefined).map(r => r.ages[2]), a3 = rs.filter(r => r.ages[3] !== undefined).map(r => r.ages[3]), tw = w.map(r => r.t);
    const row = { pf, c, d, N: rs.length, win: w.length, ci: [pct(ci[0]), pct(ci[1])], lose: l.length, e2: a2.length, t2: med(a2), e3: a3.length, t3: med(a3), tw: med(tw), deaths: +(rs.reduce((a, r) => a + r.deaths, 0) / rs.length).toFixed(1), raids: +(rs.reduce((a, r) => a + r.ev.raid, 0) / rs.length).toFixed(1), nodes: +(rs.reduce((a, r) => a + r.nodes, 0) / rs.length).toFixed(1), busErr: rs.reduce((a, r) => a + r.busErr, 0) };
    rows.push(row);
    console.log((label || '') + ' ' + pf + ' ' + c + ' d' + d + ' N' + rs.length + ' victorias ' + w.length + ' (' + pct(w.length / rs.length) + ', IC ' + row.ci.join('-') + ') derrotas ' + l.length + ' · Edad II ' + a2.length + '/' + rs.length + ' (mediana ' + row.t2 + ' s) · Edad III ' + a3.length + '/' + rs.length + ' (mediana ' + row.t3 + ' s) · fundación mediana ' + row.tw + ' s · muertes ' + row.deaths + ' · saqueos ' + row.raids + ' · nodos ' + row.nodes + ' · busErr ' + row.busErr);
  }
  const out = path.resolve(__dirname, '.balance-out'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'era3-civs-' + (label || 'x') + '.json'), JSON.stringify({ rows, all }));
  console.log('errs', errs.slice(0, 3)); await b.close();
})();
