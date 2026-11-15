// Partidas COMPLETAS en los cinco biomas (pradera, selva, desierto, tundra, océano) con varios perfiles y las 12 especies (el océano solo admite acuáticos, anfibios y voladores).
// No son escenarios cerrados: cada partida empieza en el bioma indicado y juega hasta ganar, extinguirse o llegar a maxT (colonizar, evolucionar, anidar, civilización...).
// Uso: NODE_PATH=$(npm root -g) node tests/era2-biomas.js [etiqueta=biomas] [--n 1] [--profiles razonable,defensivo,migrador,tactico] [--diffs 1] [--maxT 700] [--biomes pradera,selva,desierto,tundra,oceano]
// Delega en tests/era2-perfiles.js (mismos bots, mismas tablas) y agrega un informe de problemas por bioma. Resultado crudo: tests/.balance-out/<etiqueta>.json
const cp = require('child_process'), fs = require('fs'), path = require('path');
const a = process.argv.slice(2); const label = a[0] && !a[0].startsWith('--') ? a.shift() : 'biomas';
const opt = { n: '1', profiles: 'razonable,defensivo,migrador,tactico', diffs: '1', maxT: '700', biomes: 'pradera,selva,desierto,tundra,oceano' };
for (let i = 0; i < a.length; i += 2) opt[a[i].slice(2)] = a[i + 1];
const args = ['tests/era2-perfiles.js', label, '--n', opt.n, '--profiles', opt.profiles, '--diffs', opt.diffs, '--maxT', opt.maxT, '--biomes', opt.biomes, '--workers', opt.workers || '4'];
const r = cp.spawnSync(process.execPath, args, { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'inherit'], env: process.env, maxBuffer: 1 << 26 });
process.stdout.write(r.stdout);
const f = path.join(__dirname, '.balance-out', label + '.json'); if (!fs.existsSync(f)) { console.error('sin resultados'); process.exit(1); }
const rs = JSON.parse(fs.readFileSync(f)).filter(x => !x.error), BIO = opt.biomes.split(',');
console.log('\n== INFORME POR BIOMA (partidas completas)');
const problems = [];
for (const b of BIO) {
  const q = rs.filter(x => x.biome === b); if (!q.length) continue;
  const w = q.filter(x => x.end === 'win'), l = q.filter(x => x.end === 'lose'), t = q.filter(x => x.end === 'timeout');
  const cause = {}; for (const x of q.filter(y => y.end !== 'win')) { const k = (x.loseCause || '—').replace(/^depredador:.*/, 'depredación'); cause[k] = (cause[k] || 0) + 1; }
  const ph2 = q.filter(x => x.phase === 2 || x.end === 'win').length, med = a2 => { a2 = a2.filter(v => v != null).sort((x, y) => x - y); return a2.length ? a2[Math.floor(a2.length / 2)] : null; };
  const noWin = [...new Set(q.map(x => x.spec))].filter(s => !q.some(x => x.spec === s && x.end === 'win'));
  console.log(b.padEnd(9) + ': gana ' + w.length + '/' + q.length + ' (' + Math.round(100 * w.length / q.length) + ' %), extinción ' + l.length + ', sin terminar ' + t.length + ', llegaron a la fase 2: ' + ph2 + ' | mediana de victoria ' + med(w.map(x => x.t)) + ' s | causas de no-victoria: ' + JSON.stringify(cause) + (noWin.length ? ' | especies sin victoria: ' + noWin.join(', ') : ''));
  if (w.length / q.length < .15) problems.push(b + ': menos del 15 % de victorias (' + w.length + '/' + q.length + ')');
}
if (problems.length) console.log('\nPOSIBLES PROBLEMAS: ' + problems.join('; ')); else console.log('\nNingún bioma por debajo del 15 % de victorias con estos perfiles.');
