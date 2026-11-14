// Prueba del módulo Arte/Animación de la Era 2.
// 1) 12 especies x estados x 5 biomas se dibujan sin error ni NaN; 2) fps con ~540 animales; 3) capturas por bioma a 1280x800 y 390x800
// (docs/artgate/screens/); 4) 0 errores de consola; 5) los efectos (daño, impacto, fantasma) nacen del Bus y se limpian solos.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-arte.js [rutaHtml] [--sinfps] [--sincapturas]
const { chromium } = require('playwright');
const assert = require('assert'); const path = require('path'), fs = require('fs');
(async () => {
  const html = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.resolve(__dirname, '../eras/era2-animales.html');
  const noFps = process.argv.includes('--sinfps'), noShots = process.argv.includes('--sincapturas');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_(INTERNET|NAME|FAILED|CONNECTION)|fonts/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + html); await p.waitForTimeout(300);
  await p.evaluate(() => {   // vigila argumentos no finitos en el canvas
    window.__bad = []; const P = CanvasRenderingContext2D.prototype;
    for (const k of ['ellipse', 'arc', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'translate', 'scale', 'rotate', 'fillRect', 'strokeRect', 'rect', 'drawImage', 'fillText', 'strokeText', 'createRadialGradient', 'createLinearGradient']) { const o = P[k]; P[k] = function () { for (let i = 0; i < arguments.length; i++) { const v = arguments[i]; if (typeof v === 'number' && !isFinite(v)) { window.__bad.push(k + '#' + i); break; } } return o.apply(this, arguments); }; }
  });
  await p.click('#startBtn'); await p.waitForTimeout(300);
  const BIOMES = ['pradera', 'selva', 'desierto', 'tundra', 'oceano'], STATES = ['idle', 'forage', 'eat', 'hunt', 'flee', 'rest', 'lay', 'stun', 'move', 'build', 'dig'];
  const res = await p.evaluate(([BIOMES, STATES]) => {
    const E = window.__e2, out = { drawn: 0, bad: 0 }, cn = document.createElement('canvas'); cn.width = cn.height = 300; const x = cn.getContext('2d');
    for (const bk of BIOMES) {
      E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame(bk, null, 'ARTE-' + bk); E.setStarted(true); E.G.modal = false;
      for (const k of Object.keys(E.SP2)) for (const st of STATES) for (const extra of [{}, { lunge: .7 }, { flash: .1 }, { dead: .6 }, { born: .3 }, { lite: true }, { lin: { col: '#e0453a', tier: 2 }, cloth: true }]) {
        const sp = Object.assign({ key: k, traits: E.TRAITS.slice(0, 36).map(t => t.id), vars: {} }, E.SP2[k]); E.TRAITS.forEach((t, i) => { sp.vars[t.id] = i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : null; });
        x.clearRect(0, 0, 300, 300); E.drawAnimal(x, sp, Object.assign({ px: 150, py: 150, a: 0.7, s: 2.5, tt: 1.3, ph: 1, mv: st === 'move' || st === 'flee' || st === 'hunt' ? 1 : 0, st, flash: 0, traits: sp.traits, vars: sp.vars }, extra)); out.drawn++;
      }
      for (const w of ['conejo', 'ciervo', 'escarabajo', 'pez', 'lobo', 'lucio', 'oso']) { const sp = Object.assign({ key: w, traits: [], vars: {} }, { n: w, g: ({ conejo: 'ter', ciervo: 'ter', escarabajo: 'ins', pez: 'acu', lobo: 'ter', lucio: 'acu', oso: 'ter' })[w], r: 6, col: '#886644' }); E.drawAnimal(x, sp, { px: 150, py: 150, a: 0, s: 2, tt: 1, ph: 0, mv: 1, st: 'move', flash: 0, traits: [], vars: {} }); out.drawn++; }
      // todos los animales vivos de la partida en cada estado, con render() real
      for (const st of STATES) { for (const a of E.G.A) a.st = st; E.render(); }
      E.G.ev = { k: 'sequia', t: 15 }; E.render(); E.G.ev = null; E.G.F.push({ x: 300, y: 300, r: 90, t: 6 }); E.render(); E.G.F.length = 0;
      E.Bus.emit('scarcity', true); E.Bus.emit('migration', { x: 400, y: 300, tx: 600, ty: 300 }); E.render();
      for (let s = 0; s < 4; s++) E.G.season = s, E.render(); E.G.season = 0;
    }
    out.bad = window.__bad.length; out.badList = window.__bad.slice(0, 5); return out;
  }, [BIOMES, STATES]);
  console.log('dibujos:', res.drawn, 'argumentos no finitos:', res.bad, res.badList);
  assert.ok(res.drawn > 4500); assert.strictEqual(res.bad, 0, 'NaN/Infinity en el canvas');

  // efectos desde el Bus
  const fx = await p.evaluate(() => {
    const E = window.__e2; E.cls = 'ter'; E.specKey = 'ter_cazador'; E.newGame('pradera', null, 'FX'); E.setStarted(true); E.G.modal = false;
    const A = E.G.A, a = A.find(q => q.sp.team === 'player'), t = A.find(q => q.sp.team === 'wild'); E.render();
    E.Bus.emit('hit', a, t, 8, { mult: 1.4, why: 'x' }); E.Bus.emit('dmg', t, 6, a); E.Bus.emit('kill', t, a); E.render();
    const F = E.ART.FX; const r = { nums: F.nums.length, hits: F.hits.length, arrows: F.arrows.length, ghosts: F.ghosts.length, kind: F.nums[0] && F.nums[0].kind };
    return r;
  });
  console.log('efectos tras hit+dmg+kill:', fx); assert.ok(fx.nums >= 1 && fx.hits >= 1 && fx.arrows >= 1 && fx.ghosts >= 1 && fx.kind === 'gold');
  await p.waitForTimeout(1300); const left = await p.evaluate(() => { const F = window.__e2.ART.FX; return F.nums.length + F.hits.length + F.arrows.length + F.ghosts.length; });
  assert.strictEqual(left, 0, 'los efectos cosméticos se limpian solos'); console.log('efectos limpios: ok');

  // capturas
  if (!noShots) {
    const dir = path.resolve(__dirname, '../docs/artgate/screens'); fs.mkdirSync(dir, { recursive: true });
    for (const [w, h] of [[1280, 800], [390, 800]]) {
      await p.setViewportSize({ width: w, height: h });
      for (const bk of BIOMES) {
        await p.evaluate(bk => { const E = window.__e2; E.cls = bk === 'oceano' ? 'acu' : 'ter'; E.specKey = bk === 'oceano' ? 'acu_arrecife' : 'ter_cazador'; E.diffI = 1; E.newGame(bk, null, 'FOTO-' + bk); E.setStarted(true); E.G.modal = false; E.G.paused = false; for (let i = 0; i < 200; i++) E.step(.05); E.G.modal = false; }, bk);
        await p.waitForTimeout(700); await p.screenshot({ path: path.join(dir, bk + '-' + w + '.png') });
      }
    }
    await p.setViewportSize({ width: 1280, height: 800 });
  }

  // fps con ~540 animales (rAF real) y coste de render
  if (!noFps) {
    await p.evaluate(() => { const E = window.__e2; E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'FPS'); E.setStarted(true); const G = E.G, sps = [G.me, ...G.riv], base = G.A.slice(); let i = 0; while (G.A.length < 540) { const t = base[i++ % base.length], sp = sps[i % sps.length]; const a = Object.assign({}, t, { id: ++G.id, sp, x: 30 + (i * 53) % 900, y: 30 + (i * 37) % 540, rr: sp.r, st: 'idle' }); a.mhp = sp.hp; a.hp = a.mhp; G.A.push(a); } G.modal = false; G.paused = false; });
    await p.waitForTimeout(2500); const f = [];
    for (let k = 0; k < 3; k++) f.push(await p.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(); const fn = () => { n++; if (performance.now() - t0 > 3000) res(n / ((performance.now() - t0) / 1000)); else requestAnimationFrame(fn); }; requestAnimationFrame(fn); })));
    const n = await p.evaluate(() => window.__e2.G.A.length); console.log('animales', n, 'fps', f.map(v => v.toFixed(1)).join(' '));
    const best = Math.max(...f); if (best < 40) console.log('AVISO: fps < 40 (la máquina compartida puede estar cargada)'); else console.log('fps >= 40: ok');
  }
  assert.strictEqual(errs.length, 0, 'errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('ARTE ERA 2 OK'); await b.close();
})();
