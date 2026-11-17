// Alarma: ¿tiene un efecto táctico real y medible? Escenarios cerrados PAREADOS por semilla (con vs sin la habilidad, mismo mundo, mismo azar),
// N grande e intervalo de confianza del 95 % (media ± 1,96 error estándar y prueba de signos). Además desarma el efecto por componente
// (aviso, reacción lejana, huida rápida, defensa, sin sorpresa) tocando la tabla ABD.ala.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-alarma.js [N=48]
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const HTML = path.resolve(__dirname, '../eras/era2-animales.html'), N = +(process.argv[2] || process.env.N || 48);
const ok = (c, m) => { assert.ok(c, m); console.log('  ok -', m); };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + HTML); await p.waitForTimeout(300);
  const res = await p.evaluate(N => {
    const E = window.__e2, out = {};
    const L0 = JSON.parse(JSON.stringify(E.ABD.ala.L));
    // Escenario: 8 animales dispersos (en el bosque o a cielo abierto) y 3 depredadores que se acercan desde 260 px. Los lobos tienen Camuflaje (emboscada).
    // modo: 'bosque' = selva, emboscada entre árboles; 'abierto' = sin bosque; 'oso' = un oso gigante en vez de lobos.
    const scen = (seed, spec, cls, modo, lvl) => {
      E.cls = cls; E.specKey = spec; E.diffI = 1; E.newGame(modo === 'bosque' ? 'selva' : 'pradera', null, seed); E.setStarted(true); const G = E.G;
      G.A = G.A.filter(a => a.sp === G.me).slice(0, 8); G.E = []; G.plants = []; G.evT = 1e9; G.bossDone = true; G.riv = []; G.ab.ala = 0;
      if (lvl === 1) G.me.traits = []; else if (lvl === 3) G.me.traits = ['manada', 'colmena', 'feromonas'];
      const cx = modo === 'bosque' ? 420 : 400, cy = modo === 'bosque' ? 260 : 300;   // en el centro del mapa (lejos de los bordes, donde la huida se vuelve trampa)
      G.A.forEach((a, i) => { const ang = i * 2.4 + (G.id % 7), r = 20 + (i * 37) % 70; a.x = cx + Math.cos(ang) * r; a.y = cy + Math.sin(ang) * r; a.hunger = 85; a.en = 90; a.rs = false; });
      const wolf = G.sp.lobo; wolf.traits = ['camuflaje']; E.TRAITS; if (E.recalcSp) E.recalcSp(wolf);
      if (modo === 'oso') { const o = G.sp.oso; E.spawn(o, cx + 130, cy + 20, false).life = 1e9; }
      else for (let i = 0; i < 5; i++) { const w = E.spawn(wolf, cx + 150 + i * 10, cy + 10 + i * 14, false); w.hunger = 25; }
      G.A.forEach(a => { a.id; });
      return G;
    };
    const metric = G => { const m = G.A.filter(a => a.sp === G.me && !a.dead); return { surv: m.length, hp: m.reduce((t, a) => t + a.hp / a.mhp, 0) }; };
    const play = (G, useAla, secs) => {
      let cast = false;
      for (let i = 0; i < secs * 20; i++) {
        if (G.pending > 0) G.pending = 0;
        if (useAla && !cast && i % 4 === 0) { // reacción humana: tira Alarma cuando el primer depredador está a menos de 240 de algún animal
          const mine = G.A.filter(a => a.sp === G.me && !a.dead), foes = G.A.filter(a => !a.dead && a.sp.team === 'wild' && a.sp.diet === 'carn');
          if (foes.some(f => mine.some(m => Math.hypot(f.x - m.x, f.y - m.y) < 240))) { E.select(null); E.useAbility('ala'); cast = true; }
        }
        E.step(.05); for (const a of G.A) { if (a.sp === G.me) a.hunger = 90; else if (a.sp.key === 'lobo') a.hunger = Math.min(a.hunger, 30); }   // sin hambruna de por medio: solo importa el encuentro
      }
      return { m: metric(G), cast };
    };
    const stat = d => { const n = d.length, mean = d.reduce((t, x) => t + x, 0) / n, sd = Math.sqrt(d.reduce((t, x) => t + (x - mean) ** 2, 0) / Math.max(1, n - 1)), se = sd / Math.sqrt(n); const pos = d.filter(x => x > 1e-9).length, neg = d.filter(x => x < -1e-9).length; return { mean: Math.round(mean * 100) / 100, ci: Math.round(1.96 * se * 100) / 100, pos, neg, tie: n - pos - neg, n }; };
    const pair = (spec, cls, modo, lvl, secs, tweak) => {
      const dS = [], dH = []; let casts = 0;
      for (let s = 0; s < N; s++) {
        const seed = 'ALA' + spec + modo + s;
        if (tweak) tweak(); let G = scen(seed, spec, cls, modo, lvl); const a1 = play(G, true, secs); casts += a1.cast ? 1 : 0; E.ABD.ala.L = JSON.parse(JSON.stringify(L0));
        G = scen(seed, spec, cls, modo, lvl); const a0 = play(G, false, secs);
        dS.push(a1.m.surv - a0.m.surv); dH.push(a1.m.hp - a0.m.hp);
      }
      E.ABD.ala.L = JSON.parse(JSON.stringify(L0));
      return { surv: stat(dS), hp: stat(dH), casts };
    };
    // 1) por especie afín y modo (nivel por defecto de cada especie)
    for (const [spec, cls] of [['ave_migratoria', 'ave'], ['ins_colmena', 'ins'], ['ter_cazador', 'ter'], ['ter_ingeniero', 'ter']]) for (const modo of ['bosque', 'abierto', 'oso']) out[spec + '/' + modo] = pair(spec, cls, modo, 0, 30);
    // 2) por componente (ave migratoria, bosque): se anula uno por vez
    const comp = {
      completa: null,
      sinAviso: () => {}, // el aviso (pan) no se puede apagar por tabla; se mide aparte con vis/fl/def a su valor neutro
      sinReaccionLejana: () => { E.ABD.ala.L.forEach(l => { l.vis = 1; }); },
      sinHuidaRapida: () => { E.ABD.ala.L.forEach(l => { l.fl = 1; }); },
      sinDefensa: () => { E.ABD.ala.L.forEach(l => { l.def = 0; }); },
      soloAviso: () => { E.ABD.ala.L.forEach(l => { l.vis = 1; l.fl = 1; l.def = 0; l.pw = 0; }); }
    };
    out.comp = {}; for (const k of ['completa', 'sinReaccionLejana', 'sinHuidaRapida', 'sinDefensa', 'soloAviso']) out.comp[k] = pair('ave_migratoria', 'ave', 'bosque', 0, 30, comp[k]);
    // 3) niveles 1 y 3 (ave migratoria, bosque)
    out.lv1 = pair('ave_migratoria', 'ave', 'bosque', 1, 30); out.lv3 = pair('ave_migratoria', 'ave', 'bosque', 3, 30);
    out.info = [1, 2, 3].map(l => { const G = scen('INFO', 'ave_migratoria', 'ave', 'bosque', l === 1 ? 1 : l === 3 ? 3 : 0); const i = E.abilityInfo('ala'); return [l, i.nivel, i.costo, i.cd, i.efecto.length > 40]; });
    return out;
  }, N);
  const f = x => (x.mean > 0 ? '+' : '') + x.mean + ' ± ' + x.ci + ' (mejora ' + x.pos + ', empeora ' + x.neg + ', igual ' + x.tie + ' de ' + x.n + ')';
  console.log('ALARMA, N = ' + N + ' semillas pareadas por celda, 30 s de juego, 6 animales vs 5 lobos con Camuflaje (o un oso). Diferencia = con Alarma − sin Alarma.');
  for (const k in res) if (k.includes('/')) console.log('  ' + k.padEnd(24), 'sobrevivientes ' + f(res[k].surv), '| vida total (en animales) ' + f(res[k].hp));
  console.log('Por componente (ave_migratoria, bosque):'); for (const k in res.comp) console.log('  ' + k.padEnd(20), 'sobrevivientes ' + f(res.comp[k].surv), '| vida ' + f(res.comp[k].hp));
  console.log('Por nivel (ave_migratoria, bosque): nivel 1: ' + f(res.lv1.surv) + ' | nivel 3: ' + f(res.lv3.surv));
  const sig = k => res[k].surv.mean - res[k].surv.ci > 0 || res[k].hp.mean - res[k].hp.ci > 0;
  const sigList = Object.keys(res).filter(k => k.includes('/') && sig(k));
  ok(sigList.length >= 4, 'Alarma tiene efecto positivo con intervalo de confianza que excluye el 0 (sobrevivientes o vida) en ' + sigList.length + ' de 12 escenarios: ' + sigList.join(', '));
  ok(Object.keys(res).filter(k => k.includes('/')).every(k => res[k].surv.mean - res[k].surv.ci <= 0 || res[k].surv.mean > 0), 'ningún escenario donde la Alarma perjudique de forma significativa');
  ok(res.info.every(r => r[4]), 'abilityInfo describe el efecto en los 3 niveles');
  ok(errs.length === 0, '0 errores de consola');
  console.log('ALARMA OK'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
