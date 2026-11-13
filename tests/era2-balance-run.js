// Corre N partidas del bot de equilibrio de la Era 2 en Chromium (sin dibujar: llama a __e2.step directo).
// Uso: NODE_PATH=$(npm root -g) node tests/era2-balance-run.js <dificultades 0,1,2> <bot razonable|pasivo> <N> <maxT=2400> <etiqueta> [habilidades=rug,cam,exc,ala,mig|ninguna] [htmlAlternativo] [shard=i/n]
// Cada corrida usa semilla 'S<dif>x<i>' y una de las 12 especies (i % 12). Escribe /tmp-scratch JSON en ./tests/.balance-out/ (ignorado) y un resumen por consola.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const [,, diffs, bot, n, maxT, label, abArg, htmlArg, shard] = process.argv;
const SPECS = ['ter_cazador', 'ter_gigante', 'ter_ingeniero', 'ins_colmena', 'ins_enjambre', 'ins_parasito', 'acu_abisal', 'acu_arrecife', 'acu_anfibio', 'ave_rapaz', 'ave_carronera', 'ave_migratoria'];
(async () => {
  const html = path.resolve(htmlArg || path.join(__dirname, '../eras/era2-animales.html'));
  // copia diagnóstica: cuenta de qué mueren los animales propios (no cambia la simulación)
  let src = fs.readFileSync(html, 'utf8');
  src = src.replace("function kill(b, src) {\n  b.dead = true;", "function kill(b, src) {\n  if (b.sp.team === 'player') { const dc = G.dc || (G.dc = {}); const k = src ? (src.sp.team === 'rival' ? 'rival' : src.sp.team === 'player' ? 'x' : 'depredador:' + src.sp.key) : (b.hunger <= 0 ? 'hambre' : 'frio_fuego'); dc[k] = (dc[k] || 0) + 1; }\n  b.dead = true;");
  const tmp = path.join(__dirname, '.balance-out'); fs.mkdirSync(tmp, { recursive: true });
  const tf = path.join(tmp, 'diag-' + (label || 'x') + '.html'); fs.writeFileSync(tf, src);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + tf); await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'era2-balance-bot.js'), 'utf8') });
  const ab = abArg === 'ninguna' ? [] : abArg ? abArg.split(',') : undefined;
  const [si, sn] = (shard || '0/1').split('/').map(Number);
  const out = [];
  for (const d of diffs.split(',').map(Number)) {
    for (let i = 0; i < +n; i++) {
      if (i % sn !== si) continue;
      out.push(await p.evaluate(o => window.runBot2(o), { seed: 'S' + d + 'x' + i, diff: d, spec: SPECS[i % 12], bot, maxT: +maxT || 2400, ab }));
    }
  }
  fs.writeFileSync(path.join(tmp, (label || 'x') + '-' + (si) + '.json'), JSON.stringify(out));
  console.log('errs', errs.slice(0, 3)); await b.close();
})();
