// Agrega los JSON de tests/.balance-out/<etiqueta>-<bot>-*.json. Uso: node tests/era2-balance-agg.js <etiqueta-bot> [porClase]
const fs = require('fs'), path = require('path'); const dir = path.join(__dirname, '.balance-out');
const lab = process.argv[2]; let rs = [];
for (const f of fs.readdirSync(dir)) if (f.startsWith(lab + '-') && /-\d+\.json$/.test(f) && f.slice(lab.length + 1).match(/^\d+\.json$/)) rs = rs.concat(JSON.parse(fs.readFileSync(path.join(dir, f))));
const med = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const avg = a => { a = a.filter(x => x != null); return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null; };
const pc = (k, n) => Math.round(100 * k / n) + '%';
const ci = (k, n) => { const p = k / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / 2 / n) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / 4 / n / n) / d; return '[' + Math.round(100 * (c - h)) + '-' + Math.round(100 * (c + h)) + ']'; };
for (const d of [0, 1, 2]) {
  const r = rs.filter(x => x.diff === d); if (!r.length) continue; const n = r.length;
  const w = r.filter(x => x.end === 'win'), l = r.filter(x => x.end === 'lose'), t = r.filter(x => x.end === 'timeout'), p2 = r.filter(x => x.tPhase2);
  const cause = {}; for (const x of r) for (const k in x.dc) cause[k] = (cause[k] || 0) + x.dc[k];
  console.log(`dif ${d} N=${n} | gana ${w.length} (${pc(w.length, n)} IC95 ${ci(w.length, n)}) | fase2 ${p2.length} (${pc(p2.length, n)}) | extinción ${l.length} (${pc(l.length, n)} ${ci(l.length, n)}) | estancadas(40min) ${t.length} (${pc(t.length, n)})`);
  console.log(`   mediana s: nido1 ${med(r.map(x => x.tNest1))} nido2 ${med(r.map(x => x.tNest2))} evo4 ${med(r.map(x => x.tEvo4))} pob ${med(r.map(x => x.tPop))} col2 ${med(r.map(x => x.tCol2))} fase2 ${med(r.map(x => x.tPhase2))} victoria ${med(w.map(x => x.t))} | extinción a ${med(l.map(x => x.t))} | pob.media ${avg(r.map(x => x.avgPop))} pob.fin(vivas) ${avg(r.filter(x => x.end !== 'lose').map(x => x.pop))}`);
  console.log('   muertes propias por causa (total/partida):', Object.entries(cause).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + ' ' + (v / n).toFixed(1)).join(', '));
  if (process.argv[3]) { const cls = {}; for (const x of r) { const c = x.spec.slice(0, 3); (cls[c] = cls[c] || []).push(x); } console.log('   por clase:', Object.entries(cls).map(([c, a]) => c + ' gana ' + a.filter(x => x.end === 'win').length + '/' + a.length + ' ext ' + a.filter(x => x.end === 'lose').length).join(' | ')); const sp = {}; for (const x of r) (sp[x.spec] = sp[x.spec] || []).push(x); console.log('   por especie:', Object.entries(sp).map(([c, a]) => c + ' ' + a.filter(x => x.end === 'win').length + '/' + a.length).join(' ')); }
}
