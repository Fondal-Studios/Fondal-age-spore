// Ciclo 4 · Era 3: capturas reproducibles de escenas forzadas (escritorio 1280x800 y móvil 390x800).
// Uso: NODE_PATH=$(npm root -g) node tools/era3-capturas.js <archivo.html> <carpeta-salida> <prefijo: antes|despues>
// Reloj congelado (performance.now) para que los efectos cosméticos sean reproducibles; cada paso de simulación avanza el reloj 50 ms.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../eras/era3-tribus.html'));
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '../docs/ciclo4/era3')); const PRE = process.argv[4] || 'despues';
fs.mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const CLOCK = () => { const real = performance.now.bind(performance); window.__clk = { off: 0, frz: null }; performance.now = () => window.__clk.frz !== null ? window.__clk.frz : real() + window.__clk.off; window.__freeze = dt => { window.__clk.frz = (window.__clk.frz !== null ? window.__clk.frz : real() + window.__clk.off) + (dt || 0); }; window.__thaw = () => { window.__clk.off = (window.__clk.frz || 0) - real(); window.__clk.frz = null; }; };

async function open(browser, mob, tut) {
  const ctx = await browser.newContext(mob ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(CLOCK); if (!tut) await ctx.addInitScript(() => { try { localStorage.setItem('evo_tut3', 'done'); } catch (_) { } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + FILE); await wait(300); await p.addStyleTag({ content: '#pauseTag{display:none!important}' }); return { ctx, p };
}
const shot = async (p, name, clip) => { await wait(160); await p.screenshot(Object.assign({ path: path.join(OUT, PRE + '-' + name + '.png') }, clip ? { clip } : {})); console.log('  ' + name); };
const clipAround = (p, wx, wy, w, h) => p.evaluate(([wx, wy, w, h]) => { const r = document.getElementById('cv').getBoundingClientRect(), s = window.__e3.scr(wx, wy);
  const x = Math.max(r.left, Math.min(r.right - w, s.x - w / 2)), y = Math.max(r.top, Math.min(r.bottom - h, s.y - h / 2)); return { x, y, width: w, height: h }; }, [wx, wy, w, h]);

async function scenes(browser, mob) {
  const tag = mob ? 'm' : 'd', { ctx, p } = await open(browser, mob);
  await p.click('#startBtn'); await wait(300);
  const E3 = (fn, arg) => p.evaluate(fn, arg);
  await E3(() => { const E = window.__e3; E.G.paused = true; window.__thaw(); window.__freeze(0); });
  const run = n => E3(n => { const E = window.__e3; for (let i = 0; i < n; i++) { E.step(.05); window.__freeze(50); } E.hud(); }, n);
  // «antes» no tiene cámara: recorte; «después»: se acerca la cámara (zoom 2) y se captura la pantalla completa con el HUD
  const hasCam = await E3(() => !!window.__e3.ui);
  const look = async (name, x, y, z) => { if (hasCam) { await E3(([x, y, z]) => { window.__e3.ui.camFocus(x, y, z, true); window.__e3.hud(); }, [x, y, mob ? z * .8 : z]); await shot(p, name); await E3(() => window.__e3.ui.camFocus(480, 300, 1, true)); } else await shot(p, name, mob ? undefined : await clipAround(p, x, y, 560, 380)); };
  await E3(() => { const E = window.__e3; E.G.wood = 40; E.G.stone = 20; E.G.food = 30; E.G.know = 60; for (const r of ['rec', 'caz', 'art', 'con', 'cha']) E.setRole(r, 1); E.G.P.forEach(q => { if (q.age < 60) q.age = 70; }); });
  await run(300); await shot(p, 'explorar-' + tag);
  await look('trabajo-' + tag, 300, 330, 2.1);
  // más gente con todos los oficios y edades (para ver siluetas)
  await E3(() => { const E = window.__e3, G = E.G; const roles = ['rec', 'caz', 'agr', 'art', 'con', 'def', 'cha', 'exp']; roles.forEach((r, i) => { const q = E.mkPerson(240 + i * 22, 250, 80 + i * 10, r); G.P.push(q); }); [20, 40, 160, 190].forEach((a, i) => G.P.push(E.mkPerson(250 + i * 22, 285, a, 'libre'))); });
  await run(2); await look('oficios-' + tag, 300, 270, 2.6);
  // se retiran los extras de la escena de oficios y se deja a la tribu trabajando
  await E3(() => { const G = window.__e3.G; G.P = G.P.filter(q => q.id <= 8 || q.role === 'libre' && false); G.P.forEach(q => { q.st = 'idle'; }); });
  // obra en curso: refugio y almacén
  await E3(() => { const E = window.__e3, G = E.G; G.wood += 30; G.stone += 10; E.placeBuilding('refugio', { x: 345, y: 290 }); E.placeBuilding('almacen', { x: 255, y: 395 }); });
  await E3(() => { const E = window.__e3, G = E.G; for (let i = 0; i < 400; i++) { E.step(.05); window.__freeze(50); if (G.sites.length && G.sites[0].prog > .45) break; } E.hud(); });
  await look('obra-' + tag, 345, 295, 2.4);
  // edificios por nivel
  await E3(() => { const E = window.__e3, G = E.G; G.B = G.B.filter(b => b.k === 'fogata'); G.sites = []; G.B[0].lvl = 3; G.B[0].x = 300; G.B[0].y = 330;
    let i = 0; for (const [k, l] of [['refugio', 1], ['refugio', 2], ['refugio', 3], ['almacen', 1], ['almacen', 3], ['taller', 2], ['totem', 2], ['empalizada', 2]]) { G.B.push({ k, x: 150 + (i % 4) * 90, y: 130 + Math.floor(i / 4) * 85, prog: 1, done: true, lvl: l }); i++; }
    G.B.push({ k: 'huerto', x: 480, y: 330, prog: 1, done: true, lvl: 2 }); G.B.push({ k: 'corral', x: 570, y: 330, prog: 1, done: true, lvl: 1 }); });
  await run(2); await look('edificios-' + tag, 390, 220, 1.7);
  // edificio mejorado: transición (pop) al terminar una mejora
  await E3(() => { const E = window.__e3, G = E.G; const r = G.B.find(b => b.k === 'refugio'); r.lvl = 1; r.upg = { to: 2, prog: .98, paid: 4, stall: null, crew: 1 }; G.wood += 20; G.stone += 10; E.G.P.filter(q => q.role === 'con').forEach(q => { q.x = r.x + 10; q.y = r.y + 10; }); E.step(.05); window.__freeze(50); E.step(.05); window.__freeze(50); E.step(.05); });
  await E3(() => { const G = window.__e3.G; const r = G.B.find(b => b.k === 'refugio'); r.upg = null; r.lvl = 2; window.__e3.Bus.emit('built', r, true); window.__freeze(220); });
  await look('mejora-' + tag, 240, 130, 2.6);
  // combate: lobo y saqueo
  await E3(() => { const E = window.__e3, G = E.G; G.B = G.B.filter(b => b.k === 'fogata'); G.sites = []; ['def', 'def', 'caz'].forEach((r, i) => G.P.push(E.mkPerson(310 + i * 16, 350, 90, r)));
    E.spawnRaid(G.x3.clans[0]); G.Rd.forEach((r, i) => { r.x = 360 + i * 14; r.y = 320 + i * 12; }); const q = E.adults()[0]; G.Wv.push({ x: q.x - 26, y: q.y + 8, hp: 10, a: 0, cd: 0, dead: false, tx: q.x, ty: q.y }); });
  await run(24); await look('combate-' + tag, 335, 340, 2.4);
  // muerte
  const d3 = await E3(() => { const E = window.__e3, G = E.G, q = E.adults().filter(x => x.role === 'rec')[0] || E.adults()[0]; G.P.forEach(o => { if (o !== q) o.hp = Math.max(o.hp, 20); }); const k = { x: q.x, y: q.y }; q.hp = 1; E.step(.05); window.__freeze(50); q.hp = 0; q.dead = true; G.deaths++; E.Bus.emit('death', q, 'lobo'); window.__freeze(240); E.hud(); return k; });
  await look('muerte-' + tag, d3.x, d3.y, 2.8);
  // diplomacia
  await E3(() => { const E = window.__e3; E.G.paused = true; E.G.x3.clans[0].rel = -22; E.G.x3.clans[0].why.territorio = -6; document.getElementById('bDip').click(); }); await wait(250); await shot(p, 'diplomacia-' + tag);
  await E3(() => { document.getElementById('dipClose').click(); });
  // HUD con alertas
  await E3(() => { const E = window.__e3, G = E.G; G.Rd = []; G.raidActive = false; G.food = 1.5; G.wood = 0; for (let i = 0; i < 9; i++) G.P.push(E.mkPerson(300 + (i % 3) * 20, 380 + (i % 4) * 10, 80, 'libre')); G.t = 70; G.season = 2; G.x3.clans[0].prep = 14; G.x3.clans[0].prepN = 4; });
  await run(80); await shot(p, 'hud-alertas-' + tag);
  if (mob) { await E3(() => { const s = document.getElementById('side') || document.body; s.scrollIntoView(); }); await shot(p, 'paneles-' + tag); await E3(() => { window.scrollTo(0, 1400); document.body.scrollTop = 1400; }); await shot(p, 'paneles2-' + tag); }
  await ctx.close();
}
(async () => {
  const browser = await chromium.launch();
  try { for (const mob of [false, true]) { console.log(mob ? 'móvil' : 'escritorio'); await scenes(browser, mob); } } finally { await browser.close(); }
  console.log('errores de consola:', errs.length, errs.slice(0, 5));
})();
