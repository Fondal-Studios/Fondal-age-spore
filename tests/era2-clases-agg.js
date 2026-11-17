// Resumen de identidad de clase a partir de tests/.balance-out/<etiqueta>.json (lo escribe tests/era2-perfiles.js).
// Uso: node tests/era2-clases-agg.js etiqueta [etiqueta2 ...]   (con 2+ etiquetas imprime lado a lado y la diferencia)
// Métricas por clase (media por partida): victorias [IC95 de Wilson], población media y máxima, territorio (celdas de 80 px ocupadas),
// dispersión (distancia media al centro de la manada), comida por animal-segundo, nacimientos por animal-segundo, golpes recibidos por animal-segundo,
// muertes por animal-segundo, muertes por causa.
const fs = require('fs'), path = require('path');
const wilson = (k, n) => { if (!n) return [0, 0]; const p = k / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / 2 / n) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / 4 / n / n) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
const pc = x => Math.round(100 * x);
const CLS = { ter: 'Terrestres', ins: 'Insectos', acu: 'Acuáticos', ave: 'Aves' };
const SPEC = s => s;
function load(l) { return JSON.parse(fs.readFileSync(path.join(__dirname, '.balance-out', l + '.json'))).filter(r => !r.error); }
function summ(rs) {
  const n = rs.length, w = rs.filter(r => r.end === 'win').length, [lo, hi] = wilson(w, n), av = f => rs.reduce((s, r) => s + (f(r) || 0), 0) / Math.max(1, n);
  const dc = {}; for (const r of rs) for (const k in r.dc) { const g = k.startsWith('depredador:') ? 'depred' : k === 'x' ? 'rival' : k; dc[g] = (dc[g] || 0) + r.dc[k] / n; }
  return { n, w, win: pc(w / Math.max(1, n)), ci: pc(lo) + '-' + pc(hi), pop: av(r => r.avgPop), max: av(r => r.maxPop), terr: av(r => r.terr), hr: av(r => r.hr), cover: av(r => r.cover), wat: av(r => r.wat * 100), carc: av(r => r.carcShare * 100), exh: av(r => r.exh), spr: av(r => r.spr), eat: av(r => r.eatPA * 100), born: av(r => r.bornPA * 100), hit: av(r => r.hitTakenPA * 100), dead: av(r => r.deathPA * 100), dc, ext: pc(rs.filter(r => r.end === 'lose').length / Math.max(1, n)), t: av(r => r.t) };
}
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
function groups(rs, by) { const g = {}; for (const r of rs) (g[by(r)] = g[by(r)] || []).push(r); return g; }
for (const label of process.argv.slice(2)) {
  const rs = load(label); console.log('\n== ' + label + ' (N=' + rs.length + ')');
  for (const [title, by, order] of [['clase', r => r.spec.slice(0, 3), Object.keys(CLS)], ['especie', r => r.spec, null], ['perfil', r => r.profile, null], ['bioma', r => r.biome, null]]) {
    const g = groups(rs, by); const keys = order || Object.keys(g).sort(); console.log('-- por ' + title);
    console.log('grupo | N | gana % [IC95] | extinción % | pob.media | pob.máx | hambre/s x100 | % tiempo en agua | % comida carroña | colapsos | cobertura (celdas visitadas de ~96) | territorio | dispersión | comida/animal-s x100 | nac/animal-s x100 | golpes recibidos/animal-s x100 | muertes/animal-s x100 | muertes por causa');
    for (const k of keys) { if (!g[k]) continue; const s = summ(g[k]); console.log([(CLS[k] || SPEC(k)), s.n, s.win + ' [' + s.ci + ']', s.ext, f1(s.pop), f1(s.max), f1(s.hr * 100), f1(s.wat), f1(s.carc), f1(s.exh), f1(s.cover), f1(s.terr), f1(s.spr), f1(s.eat), f1(s.born), f1(s.hit), f1(s.dead), Object.entries(s.dc).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k2, v]) => k2 + ' ' + f1(v)).join(', ')].join(' | ')); }
  }
  const s = summ(rs); console.log('TOTAL | ' + s.n + ' | ' + s.win + ' [' + s.ci + ']');
}
