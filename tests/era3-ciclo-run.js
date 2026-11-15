// Balance de la Era 3 (Ciclo 4) con bots por perfil, 3 dificultades y N partidas; intervalo de Wilson al 95 %.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-ciclo-run.js <dificultades 0,1,2> <perfil|todos> <N> <maxT s> [etiqueta] [pers=a,b]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [,, diffs, perfil, n, maxT, label, persArg] = process.argv;
const wilson = (k, n) => { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), a = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - a) / d), Math.min(1, (c + a) / d)]; };
const pct = x => Math.round(x * 100) + '%';
(async () => {
  const b = await chromium.launch(); const errs = []; const all = [];
  const perfiles = perfil.split(',').flatMap(x => x === 'todos' ? ['economico', 'defensivo', 'comerciante', 'agresivo'] : [x]);
  for (const pf of perfiles) for (const d of diffs.split(',').map(Number)) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '../eras/era3-tribus.html')); await p.addScriptTag({ content: fs.readFileSync(path.resolve(__dirname, 'era3-bots.js'), 'utf8') });
    const rs = []; for (let i = 0; i < +n; i++) rs.push(await p.evaluate(([s, d, m, k, w]) => window.runBot3(s, d, m, k, w ? { world: { pers: w } } : {}), ['C' + d + pf[0] + i, d, +maxT, pf, persArg ? persArg.split(',') : null]));
    await p.close();
    const w = rs.filter(r => r.end === 'win'), l = rs.filter(r => r.end === 'lose'), t = rs.filter(r => r.end === 'timeout'), ci = wilson(w.length, rs.length), cl = wilson(l.length, rs.length);
    const dc = {}; rs.forEach(r => { for (const k in r.dc) dc[k] = (dc[k] || 0) + r.dc[k]; });
    const avg = w.length ? Math.round(w.reduce((a, r) => a + r.t, 0) / w.length) : null;
    console.log((label || '') + ' ' + pf + ' d' + d + ' N' + rs.length + ' victorias ' + w.length + ' (' + pct(w.length / rs.length) + ', IC ' + pct(ci[0]) + '-' + pct(ci[1]) + ') derrotas ' + l.length + ' (' + pct(l.length / rs.length) + ', IC ' + pct(cl[0]) + '-' + pct(cl[1]) + ') estancadas ' + t.length + ' t_vic ' + avg + ' muertes/partida ' + JSON.stringify(Object.fromEntries(Object.entries(dc).map(([k, v]) => [k, +(v / rs.length).toFixed(1)]))) + ' saqueos ' + (rs.reduce((a, r) => a + r.ev.raid, 0) / rs.length).toFixed(1) + ' repelidos ' + (rs.reduce((a, r) => a + r.raidsOk, 0) / rs.length).toFixed(1) + ' busErr ' + rs.reduce((a, r) => a + r.busErr, 0));
    all.push(...rs);
  }
  const out = path.resolve(__dirname, '.balance-out'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'era3-ciclo-' + (label || 'x') + '.json'), JSON.stringify(all));
  console.log('errs', errs.slice(0, 3)); await b.close();
})();
