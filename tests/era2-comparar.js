// Compara dos corridas de tests/era2-perfiles.js (antes / después) con semillas pareadas: victorias, IC95 de Wilson y diferencia pareada con IC95 (McNemar/Wald).
// Uso: node tests/era2-comparar.js <antes> <despues> [--by clase,especie,perfil,bioma,dif]
// Las semillas son iguales entre corridas (P<dif><perfil><bioma><especie>#<i>), así que se parean por (spec, profile, biome, diff, seed).
const fs = require('fs'), path = require('path');
const A = process.argv.slice(2), labels = A.filter(a => !a.startsWith('--')).slice(0, 2), byArg = (A[A.indexOf('--by') + 1] || 'clase,perfil,especie,bioma').split(',');
const load = l => JSON.parse(fs.readFileSync(path.join(__dirname, '.balance-out', l + '.json'))).filter(r => !r.error);
const wilson = (k, n) => { if (!n) return [0, 0]; const p = k / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / 2 / n) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / 4 / n / n) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
const [b0, b1] = labels.map(load), key = r => [r.spec, r.profile, r.biome, r.diff, r.seed].join('|'), m1 = new Map(b1.map(r => [key(r), r]));
const GROUPS = { clase: r => ({ ter: 'Terrestres', ins: 'Insectos', acu: 'Acuáticos', ave: 'Aves' })[r.spec.slice(0, 3)], especie: r => r.spec, perfil: r => r.profile, bioma: r => r.biome, dif: r => ['Fácil', 'Normal', 'Difícil'][r.diff], todo: () => 'TOTAL' };
const pc = x => Math.round(100 * x);
console.log('antes = ' + labels[0] + ' (N=' + b0.length + ') · después = ' + labels[1] + ' (N=' + b1.length + ')');
for (const by of byArg.concat(['todo'])) {
  console.log('\n-- por ' + by + '\ngrupo | N pareadas | antes gana % [IC95] | después gana % [IC95] | diferencia pareada (puntos) ± IC95 | solo antes / solo después | extinción antes → después');
  const g = {}; for (const r of b0) { const q = m1.get(key(r)); if (!q) continue; (g[GROUPS[by](r)] = g[GROUPS[by](r)] || []).push([r, q]); }
  for (const k of Object.keys(g).sort()) {
    const ps = g[k], n = ps.length, w0 = ps.filter(([a]) => a.end === 'win').length, w1 = ps.filter(([, b]) => b.end === 'win').length, o0 = ps.filter(([a, b]) => a.end === 'win' && b.end !== 'win').length, o1 = ps.filter(([a, b]) => a.end !== 'win' && b.end === 'win').length;
    const d = (o1 - o0) / n, se = Math.sqrt(Math.max(0, (o0 + o1) / n - d * d) / n), [l0, h0] = wilson(w0, n), [l1, h1] = wilson(w1, n);
    const e0 = ps.filter(([a]) => a.end === 'lose').length, e1 = ps.filter(([, b]) => b.end === 'lose').length;
    console.log([k, n, pc(w0 / n) + ' [' + pc(l0) + '-' + pc(h0) + ']', pc(w1 / n) + ' [' + pc(l1) + '-' + pc(h1) + ']', (d >= 0 ? '+' : '') + (100 * d).toFixed(1) + ' ± ' + (196 * se).toFixed(1), o0 + ' / ' + o1, pc(e0 / n) + ' → ' + pc(e1 / n)].join(' | '));
  }
}
