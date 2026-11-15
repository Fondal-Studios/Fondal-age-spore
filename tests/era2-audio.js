// Prueba del audio de la Era 2 (motor eras/audio-lofi.js + bloque AUDIO). NO se puede escuchar: se MIDE con OfflineAudioContext.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-audio.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../eras/era2-animales.html');

// utilidades que corren DENTRO de la página
const LIB = () => {
  window.__T = {};
  const T = window.__T, SR = 32000;
  T.mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // renderiza como en vivo: agenda por tramos de 1 s (si no, el grafo offline tiene miles de nodos a la vez y no mide nada real)
  T.render = async (setup, dur, hooks, seed) => {
    const orig = Math.random; Math.random = T.mulberry(seed || 7);
    try {
      const oc = new OfflineAudioContext(2, SR * dur, SR), A = FondalAudio.create({ storageKey: null }); A.attach(oc); setup && setup(A);
      for (let t = 1; t < dur; t++) oc.suspend(t).then(() => { for (const h of hooks || []) if (h.t === t) h.fn(A); A.schedule(t + 1.5); oc.resume(); });
      A.schedule(1.5); const buf = await oc.startRendering();
      return { l: buf.getChannelData(0), r: buf.getChannelData(1), A };
    } finally { Math.random = orig; }
  };
  const rms = (d, a, b) => { a = a || 0; b = b || d.length; let e = 0; for (let i = a; i < b; i++) e += d[i] * d[i]; return Math.sqrt(e / (b - a)); };
  const peak = d => { let p = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > p) p = v; } return p; };
  const mono = r => { const m = new Float32Array(r.l.length); for (let i = 0; i < m.length; i++) m[i] = (r.l[i] + r.r[i]) / 2; return m; };
  // actividad rítmica: suma de los aumentos positivos de la envolvente (ventanas de 16 ms) por segundo
  T.activity = d => { const w = 512; let prev = 0, s = 0; for (let i = 0; i + w <= d.length; i += w) { const e = rms(d, i, i + w); if (e > prev) s += e - prev; prev = e; } return s / (d.length / SR); };
  function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } }
  // espectro promedio -> energía (dB) en 5 bandas y centroide (Hz)
  T.spectrum = d => {
    const N = 2048, ed = [0, 150, 500, 1500, 4000, SR / 2], pw = new Float64Array(N / 2); let nf = 0;
    for (let s = 0; s + N <= d.length; s += N) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = d[s + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / N)); fft(re, im); for (let k = 0; k < N / 2; k++) pw[k] += re[k] * re[k] + im[k] * im[k]; nf++; }
    const bands = [0, 0, 0, 0, 0]; let num = 0, den = 0;
    for (let k = 1; k < N / 2; k++) { const f = k * SR / N; for (let b = 0; b < 5; b++) if (f >= ed[b] && f < ed[b + 1]) bands[b] += pw[k]; num += f * pw[k]; den += pw[k]; }
    return { bands: bands.map(v => +(10 * Math.log10(v / nf / N + 1e-20)).toFixed(1)), centroid: Math.round(num / den) };
  };
  T.rms = rms; T.peak = peak; T.mono = mono;
};

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_(INTERNET|NAME|FAILED|CONNECTION)|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(300); await p.evaluate(LIB);
  const T = fn => p.evaluate(fn);

  // 0) el motor existe y el juego arranca con el audio sin crear (suspendido) hasta el primer gesto
  const st0 = await T(() => ({ has: !!window.FondalAudio, state: FondalAudio.state, ui: !!document.getElementById('audioBtn'), e2: !!(window.__e2 && window.__e2.audio) }));
  console.log('inicio', st0);
  assert.ok(st0.has && st0.ui && st0.e2, 'FondalAudio, botón de sonido y gancho __e2.audio deben existir');
  assert.strictEqual(st0.state, 'none', 'antes del primer gesto no hay AudioContext (nada bloquea el inicio)');

  // 1) ánimos
  const moods = await T(async () => {
    const T = window.__T, out = {};
    for (const m of FondalAudio.moods) {
      const rr = [];
      for (const seed of [11, 12]) { const r = await T.render(A => { A.setVolume('amb', 0); A.setVolume('sfx', 0); A.setMood(m, { instant: true }); }, 24, null, seed); const d = T.mono(r); const dd = d.slice(32000 * 4); rr.push({ rms: T.rms(dd), pk: Math.max(T.peak(r.l), T.peak(r.r)), act: T.activity(dd), sp: T.spectrum(dd) }); }
      out[m] = { rms: (rr[0].rms + rr[1].rms) / 2, pk: Math.max(rr[0].pk, rr[1].pk), act: (rr[0].act + rr[1].act) / 2, hf: (rr[0].sp.bands[4] + rr[1].sp.bands[4]) / 2, lf: (rr[0].sp.bands[0] + rr[1].sp.bands[0]) / 2, cen: Math.round((rr[0].sp.centroid + rr[1].sp.centroid) / 2) };
    }
    return out;
  });
  console.log('ÁNIMOS (rms, pico, actividad rítmica, banda >4 kHz dB, banda <150 Hz dB, centroide Hz)');
  for (const m in moods) { const v = moods[m]; console.log(' ', m.padEnd(14), v.rms.toFixed(4), v.pk.toFixed(3), v.act.toFixed(4), v.hf.toFixed(1), v.lf.toFixed(1), v.cen); assert.ok(v.rms > .005, m + ': señal vacía'); assert.ok(v.pk < 1, m + ': recorta'); }
  assert.ok(moods.combate.rms > moods.explorar.rms * 1.1, 'combate debe tener más energía que explorar');
  assert.ok(moods.combate.act > moods.explorar.act * 1.25, 'combate debe tener más actividad rítmica que explorar');
  assert.ok(moods.supervivencia.hf < moods.explorar.hf && moods.explorar.hf < moods.combate.hf, 'percusión (>4 kHz): supervivencia < explorar < combate');
  assert.ok(moods.supervivencia.lf > moods.explorar.lf, 'supervivencia tiene más grave sostenido (zumbido y pulso)');

  // 1b) transición suave explorar -> combate (en vivo, sin saltos) y evolución: stinger + cambio de tonalidad + vuelta al ánimo previo
  const tr = await T(async () => {
    const T = window.__T;
    const r = await T.render(A => { A.setVolume('amb', 0); A.setVolume('sfx', 1); A.setMood('explorar', { instant: true }); }, 30, [{ t: 10, fn: A => A.setMood('combate') }, { t: 20, fn: A => A.stinger(6) }], 5);
    const d = T.mono(r), sr = 32000, w = i => T.rms(d, sr * i, sr * (i + 4));
    // el escalón más grande entre muestras consecutivas de la envolvente en la transición (sin clics)
    let jump = 0; for (let i = sr * 9; i < sr * 16; i += 64) jump = Math.max(jump, Math.abs(d[i + 1] - d[i]));
    return { early: w(4), late: w(16), pk: T.peak(d), jump, key: r.A.key, moodEnd: r.A.mood, evo: T.rms(d, sr * 20, sr * 24) };
  });
  console.log('TRANSICIÓN', tr);
  assert.ok(tr.late > tr.early * 1.1, 'tras pasar a combate la señal sube suavemente');
  assert.ok(tr.pk < 1 && tr.jump < .5, 'sin recortes ni saltos bruscos');
  assert.ok(tr.key !== 0, 'la evolución cambia la tonalidad');
  assert.strictEqual(tr.moodEnd, 'combate', 'terminado el stinger vuelve al ánimo que había (combate)');

  // 2) ambientes por ecosistema
  const biomes = await T(async () => {
    const T = window.__T, out = {};
    for (const k of FondalAudio.biomes) { const r = await T.render(A => { A.setVolume('music', 0); A.setVolume('sfx', 0); A.setBiome(k, true); }, 20, null, 3); const d = T.mono(r).slice(32000 * 2); out[k] = { rms: T.rms(d), pk: Math.max(T.peak(r.l), T.peak(r.r)), sp: T.spectrum(d) }; }
    return out;
  });
  console.log('AMBIENTES (rms, pico, bandas dB [<150,<500,<1500,<4000,>4000], centroide)');
  const ks = Object.keys(biomes);
  for (const k of ks) { const v = biomes[k]; console.log(' ', k.padEnd(9), v.rms.toFixed(4), v.pk.toFixed(3), JSON.stringify(v.sp.bands), v.sp.centroid); assert.ok(v.rms > .003, k + ': ambiente vacío'); assert.ok(v.pk < 1, k + ': recorta'); }
  let minD = 1e9; const dist = (x, y) => Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const dd = dist(biomes[ks[i]].sp.bands, biomes[ks[j]].sp.bands), dc = Math.abs(biomes[ks[i]].sp.centroid - biomes[ks[j]].sp.centroid) / Math.max(biomes[ks[i]].sp.centroid, biomes[ks[j]].sp.centroid); minD = Math.min(minD, dd); assert.ok(dd > 3 || dc > .15, ks[i] + ' vs ' + ks[j] + ' no difieren espectralmente (' + dd.toFixed(1) + ' dB, ' + (dc * 100).toFixed(0) + '%)'); }
  console.log('  distancia espectral mínima entre biomas (dB):', minD.toFixed(1));
  { const rs = ks.map(k => biomes[k].rms), mx = Math.max(...rs), mn = Math.min(...rs); console.log('  rango de nivel entre ambientes: ' + (20 * Math.log10(mx / mn)).toFixed(1) + ' dB (rms ' + mn.toFixed(4) + ' a ' + mx.toFixed(4) + ')'); assert.ok(mx / mn < 2, 'los ambientes deben estar nivelados (±6 dB entre el más bajo y el más alto): da ' + (mx / mn).toFixed(1) + '×'); }

  // 3) efectos
  const fxr = await T(async () => {
    const T = window.__T, out = {};
    for (const n of FondalAudio.effects) { const r = await T.render(A => { A.setVolume('music', 0); A.setVolume('amb', 0); A.sfx(n, { force: true, own: true }); }, 4, null, 9); const d = T.mono(r); out[n] = { rms: T.rms(d), pk: Math.max(T.peak(r.l), T.peak(r.r)), early: T.rms(d, 0, 32000 * 2) }; }
    const L = await T.render(A => { A.setVolume('music', 0); A.setVolume('amb', 0); A.sfx('hit', { force: true, pan: -.8 }); }, 2, null, 9), R = await T.render(A => { A.setVolume('music', 0); A.setVolume('amb', 0); A.sfx('hit', { force: true, pan: .8 }); }, 2, null, 9);
    out._pan = { lL: T.rms(L.l), lR: T.rms(L.r), rL: T.rms(R.l), rR: T.rms(R.r) };
    return out;
  });
  console.log('EFECTOS (rms primeros 2 s, pico)');
  for (const n in fxr) { if (n === '_pan') continue; const v = fxr[n]; console.log(' ', n.padEnd(10), v.early.toFixed(4), v.pk.toFixed(3)); assert.ok(v.early > .002, n + ': efecto sin señal'); assert.ok(v.pk < 1, n + ': recorta'); }
  console.log('  paneo', fxr._pan); assert.ok(fxr._pan.lL > fxr._pan.lR * 2 && fxr._pan.rR > fxr._pan.rL * 2, 'el paneo corre el efecto hacia el lado de la posición');
  // 5 habilidades distintas entre sí (no se pueden confundir): comparar espectro/duración
  const abil = await T(async () => { const T = window.__T, out = {}; for (const n of ['rug', 'cam', 'exc', 'ala', 'mig']) { const r = await T.render(A => { A.setVolume('music', 0); A.setVolume('amb', 0); A.sfx(n, { force: true }); }, 3, null, 9); const sp = T.spectrum(T.mono(r)); out[n] = sp.bands.concat([sp.centroid]); } return out; });
  const an = Object.keys(abil); for (let i = 0; i < an.length; i++) for (let j = i + 1; j < an.length; j++) assert.ok(dist(abil[an[i]].slice(0, 5), abil[an[j]].slice(0, 5)) > 2 || Math.abs(abil[an[i]][5] - abil[an[j]][5]) > 150, 'habilidades ' + an[i] + ' y ' + an[j] + ' suenan demasiado parecidas');
  console.log('  habilidades distinguibles por espectro:', an.join(', '));

  // 4) volúmenes independientes
  const vols = await T(async () => {
    const T = window.__T, out = {};
    const run = async (setup, hooks) => { const r = await T.render(setup, 12, hooks, 21); return T.rms(T.mono(r)); };
    const only = (k, v, extra) => A => { for (const q of ['music', 'sfx', 'amb']) A.setVolume(q, q === k ? v : 0); A.setVolume('master', 1); A.setMood('explorar', { instant: true }); A.setBiome('selva', true); extra && extra(A); };
    const sfxHook = [1, 3, 5, 7, 9].map(t => ({ t, fn: A => A.sfx('born', { force: true }) }));
    for (const k of ['music', 'amb']) { out[k + '1'] = await run(only(k, 1)); out[k + '.5'] = await run(only(k, .5)); out[k + '0'] = await run(only(k, 0)); }
    out.sfx1 = await run(only('sfx', 1), sfxHook); out['sfx.5'] = await run(only('sfx', .5), sfxHook); out.sfx0 = await run(only('sfx', 0), sfxHook);
    const all = A => { A.setVolume('music', .8); A.setVolume('sfx', .8); A.setVolume('amb', .8); A.setMood('explorar', { instant: true }); A.setBiome('selva', true); };
    out.m1 = await run(A => { all(A); A.setVolume('master', 1); }, sfxHook); out['m.5'] = await run(A => { all(A); A.setVolume('master', .5); }, sfxHook); out.m0 = await run(A => { all(A); A.setVolume('master', 0); }, sfxHook);
    out.mute = await run(A => { all(A); A.setMuted(true); }, sfxHook);
    return out;
  });
  console.log('VOLÚMENES (rms)', vols);
  for (const k of ['music', 'amb', 'sfx']) { const r = vols[k + '.5'] / vols[k + '1']; assert.ok(r > .42 && r < .58, k + ' al 50% debe dar ~la mitad de señal (da ' + r.toFixed(2) + ')'); assert.ok(vols[k + '0'] < 1e-3 * Math.max(1e-3, vols[k + '1']) * 100 && vols[k + '0'] < 2e-4, k + ' en 0 debe callar'); assert.ok(vols[k + '1'] > .002, k + ' al 100% suena'); }
  const rm = vols['m.5'] / vols.m1; assert.ok(rm > .42 && rm < .58, 'maestro al 50% da ~la mitad (da ' + rm.toFixed(2) + ')'); assert.ok(vols.m0 < 2e-4, 'maestro 0 calla'); assert.ok(vols.mute < 1e-6, 'silencio total ~0 (da ' + vols.mute + ')');

  // 5) el juego inicia con el audio suspendido y se reanuda con el primer gesto
  await p.evaluate(() => { const E = window.__e2; E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'AUDIO1'); E.setStarted(true); for (let i = 0; i < 200; i++) E.step(.05); });
  const sNo = await T(() => ({ state: FondalAudio.state, ctx: !!FondalAudio.ctx }));
  assert.strictEqual(sNo.state, 'none'); console.log('sin gesto: el juego corre y el audio no se creó', sNo);
  await p.mouse.click(300, 300); await p.waitForTimeout(600);
  const sYes = await T(() => ({ state: FondalAudio.state, ctx: !!FondalAudio.ctx }));
  console.log('primer gesto', sYes); assert.strictEqual(sYes.state, 'running', 'tras el primer gesto el AudioContext corre');
  // pestaña oculta -> suspendido; visible -> reanuda
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(400);
  const sHid = await T(() => FondalAudio.state); await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(500);
  const sVis = await T(() => FondalAudio.state); console.log('pestaña oculta:', sHid, '· visible:', sVis); assert.strictEqual(sHid, 'suspended'); assert.strictEqual(sVis, 'running');

  // 6) director de ánimo con estado real
  const dir = await T(async () => {
    const E = window.__e2, D = E.audioDir, out = {}, FA = FondalAudio; let G = E.G;
    const prep = () => { E.newGame('pradera', null, 'AUDIO2'); E.setStarted(true); for (let i = 0; i < 40; i++) E.step(.05); G = E.G; G.paused = false; G.modal = false; G.ev = null; G.season = 0; D.reset(); };
    prep(); for (const a of G.A) if (a.sp.team === 'player') a.hunger = 85; out.calma = D.direct().mood;
    for (const a of G.A) if (a.sp.team === 'player') a.hunger = 12; out.hambre = D.direct().mood;
    for (const a of G.A) if (a.sp.team === 'player') a.hunger = 85; G.ev = { k: 'sequia', t: 20 }; out.evento = D.direct().mood; G.ev = null;
    G.season = 3; out.invierno = D.direct().mood; G.season = 0;
    const mine = G.A.find(a => a.sp.team === 'player'), foe = G.A.find(a => a.sp.team !== 'player' && !a.dead); E.Bus.emit('hit', foe, mine, 3); out.golpe = D.direct().mood;
    out.dirInfo = Object.assign({}, D.info);
    prep(); E.newGame('selva', null, 'AUDIO3'); E.setStarted(true); D.direct(); out.biomaSelva = FA.biome; E.newGame('oceano', null, 'AUDIO4'); E.setStarted(true); D.direct(); out.biomaOceano = FA.biome;
    prep(); E.Bus.emit('evolve', { id: 'alas' }); out.evo = FA.mood; D.direct(); out.evoSigue = FA.mood; out.key = FA.targetKey;
    return out;
  });
  console.log('DIRECTOR', dir);
  assert.strictEqual(dir.calma, 'explorar'); assert.strictEqual(dir.hambre, 'supervivencia'); assert.strictEqual(dir.evento, 'supervivencia'); assert.strictEqual(dir.invierno, 'supervivencia'); assert.strictEqual(dir.golpe, 'combate');
  assert.strictEqual(dir.biomaSelva, 'selva'); assert.strictEqual(dir.biomaOceano, 'oceano'); assert.strictEqual(dir.evo, 'evolucion'); assert.strictEqual(dir.evoSigue, 'evolucion'); assert.notStrictEqual(dir.key, 0);

  // 7) el audio no altera la simulación (mismo hash con eventos sonando que con el audio mudo)
  const det = await T(async () => {
    const E = window.__e2, FA = FondalAudio, run = () => { E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'DET1'); E.setStarted(false); for (let i = 0; i < 1500; i++) { if (E.G.pending > 0) E.G.pending = 0; E.step(.05); } return E.stateHash(); };
    const played0 = FA.stats.played; FA.setMuted(false); const a = run(); const played = FA.stats.played - played0; FA.setMuted(true); const b2 = run(); FA.setMuted(false); return { same: a === b2, played, a, b2 };
  });
  console.log('DETERMINISMO con audio activo vs mudo', det); assert.ok(det.same, 'el audio no debe cambiar la simulación');

  // 8) rendimiento: fps con ~200 animales, audio inactivo (suspendido) vs activo; costo del scheduler
  const perf = await T(async () => {
    const E = window.__e2, FA = FondalAudio, G = () => E.G; FA.setMuted(false);
    E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'PERF'); E.setStarted(true);
    const src = G().A.filter(a => a.sp.team === 'player'); let n = 0; while (G().A.length < 200) { const o = src[n++ % src.length]; G().A.push(Object.assign({}, o, { id: ++G().id, x: 40 + Math.random() * 880, y: 40 + Math.random() * 520 })); }
    G().paused = false; G().modal = false;
    const fps = secs => new Promise(res => { let f = 0, t0 = performance.now(); const tick = () => { f++; const t = performance.now(); if (t - t0 >= secs * 1000) res(+(f / ((t - t0) / 1000)).toFixed(1)); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const out = { animales: G().A.length, off: [], on: [] };
    for (let r = 0; r < 4; r++) {
      await FA.ctx.suspend(); await new Promise(r => setTimeout(r, 300)); out.off.push(await fps(4));
      await FA.ctx.resume(); FA.setMood('combate'); await new Promise(r => setTimeout(r, 300)); const s0 = FA.stats; out.on.push(await fps(4));
      const s1 = FA.stats; out.sched = { ms: +(s1.schedMs - s0.schedMs).toFixed(1), calls: s1.schedCalls - s0.schedCalls, played: s1.played - s0.played };
    }
    const t0 = performance.now(); for (let i = 0; i < 200; i++) E.audioDir.direct(); out.directMs = +((performance.now() - t0) / 200).toFixed(3);
    return out;
  });
  console.log('RENDIMIENTO', JSON.stringify(perf));
  const avg = a => { const q = a.slice().sort((x, y) => x - y), m = q.length >> 1; return q.length % 2 ? q[m] : (q[m - 1] + q[m]) / 2; }; // mediana: el fps del entorno es ruidoso
  console.log('  fps (mediana) audio suspendido:', avg(perf.off).toFixed(1), ' · audio activo (combate):', avg(perf.on).toFixed(1));
  assert.ok(avg(perf.on) > avg(perf.off) * .8, 'el audio activo no debe costar más de 20% de fps (mediana de 4 rondas alternadas)');


  // 9) VERIFICACIÓN TÉCNICA AMPLIADA (Ciclo 3): transiciones sin clics, picos/saturación, NaN, fugas de nodos en una partida larga
  // 9a) las 12 transiciones entre ánimos: el mayor salto de envolvente y el mayor «clic» (derivada segunda) cerca del cambio no superan lo que ya hay en régimen estable
  const trans = await T(async () => {
    const T = window.__T, FA = FondalAudio, sr = 32000, out = {}; const names = FA.moods;
    for (const a of names) for (const b2 of names) {
      if (a === b2) continue;
      const r = await T.render(A => { A.setVolume('amb', .6); A.setVolume('sfx', 0); A.setBiome('selva', true); A.setMood(a, { instant: true }); }, 34, [{ t: 16, fn: A => A.setMood(b2) }], 31);
      const d = T.mono(r), W = 1600; // ventanas de 50 ms
      const env = []; for (let i = 0; i + W <= d.length; i += W) env.push(T.rms(d, i, i + W));
      const jump = (i0, i1) => { let m = 0; for (let i = i0 + 1; i < i1; i++) m = Math.max(m, Math.abs(env[i] - env[i - 1]) / (Math.max(env[i], env[i - 1]) + 1e-4)); return m; };
      const click = (t0, t1) => { let m = 0; for (let i = Math.floor(sr * t0) + 2; i < sr * t1; i++) m = Math.max(m, Math.abs(d[i] - 2 * d[i - 1] + d[i - 2])); return m; };
      out[a + '>' + b2] = { jumpTrans: jump(Math.floor(15 / .05), Math.floor(26 / .05)), jumpSteady: jump(Math.floor(4 / .05), Math.floor(14 / .05)), clickTrans: click(15, 26), clickSteady: click(4, 14), pk: Math.max(T.peak(r.l), T.peak(r.r)), nan: [...r.l, ...r.r].some(v => !isFinite(v)) ? 1 : 0 };
    }
    return out;
  });
  // El régimen estable ya tiene saltos de envolvente (cada nota/golpe de percusión) y «clics» deliberados (el crepitar de vinilo llega a ±1 en la muestra).
  // Una transición es limpia si NO agrega nada sobre lo que ya hace el ánimo de origen o el de destino en régimen estable.
  const base = {}; for (const k in trans) { const m = k.split('>')[0]; base[m] = Math.max(base[m] || 0, trans[k].jumpSteady); }
  let worstJ = 0, worstC = 0, worstPk = 0, worstR = 0;
  for (const k in trans) {
    const v = trans[k], [a0, b0] = k.split('>'), ref = Math.max(base[a0], base[b0]); worstJ = Math.max(worstJ, v.jumpTrans); worstC = Math.max(worstC, v.clickTrans / Math.max(v.clickSteady, 1e-3)); worstPk = Math.max(worstPk, v.pk); worstR = Math.max(worstR, v.jumpTrans / ref);
    console.log('  ', k.padEnd(26), 'salto env. 50 ms: trans', v.jumpTrans.toFixed(2), '(régimen origen/destino', base[a0].toFixed(2) + '/' + base[b0].toFixed(2) + ') · clic: trans', v.clickTrans.toFixed(3), 'régimen', v.clickSteady.toFixed(3), '· pico', v.pk.toFixed(3));
    assert.strictEqual(v.nan, 0, k + ': NaN/Infinity en la señal'); assert.ok(v.pk < .9, k + ': pico ' + v.pk);
    assert.ok(v.clickTrans <= v.clickSteady * 1.25 + .02, k + ': clic nuevo en la transición (' + v.clickTrans.toFixed(3) + ' vs régimen ' + v.clickSteady.toFixed(3) + ')');
    assert.ok(v.jumpTrans <= ref * 1.15 + .05, k + ': salto de envolvente mayor que el de cualquiera de los dos ánimos en régimen (' + v.jumpTrans.toFixed(2) + ' vs ' + ref.toFixed(2) + ')');
  }
  console.log('TRANSICIONES (12 pares): peor salto trans/régimen ' + worstR.toFixed(2) + ' · peor clic trans/régimen ' + worstC.toFixed(2) + ' · pico máx ' + worstPk.toFixed(3));
  // 9b) ambiente por ecosistema: el cambio de bioma en vivo no corta (misma métrica)
  const bt = await T(async () => {
    const T = window.__T, sr = 32000;
    const r = await T.render(A => { A.setVolume('music', 0); A.setVolume('sfx', 0); A.setBiome('pradera', true); }, 34, [{ t: 16, fn: A => A.setBiome('oceano') }], 41);
    const d = T.mono(r), W = 1600, env = []; for (let i = 0; i + W <= d.length; i += W) env.push(T.rms(d, i, i + W));
    const jmp = (i0, i1) => { let m = 0; for (let i = i0 + 1; i < i1; i++) m = Math.max(m, Math.abs(env[i] - env[i - 1]) / (Math.max(env[i], env[i - 1]) + 1e-4)); return m; };
    const clk = (t0, t1) => { let c = 0; for (let i = Math.floor(sr * t0) + 2; i < sr * t1; i++) c = Math.max(c, Math.abs(d[i] - 2 * d[i - 1] + d[i - 2])); return c; };
    return { jump: jmp(300, 520), steadyBefore: jmp(80, 280), steadyAfter: jmp(540, 660), click: clk(15, 26), clickBefore: clk(4, 14), clickAfter: clk(27, 33), before: T.rms(d, sr * 8, sr * 14), after: T.rms(d, sr * 26, sr * 33) };
  });
  // los eventos de ambiente (grillos, burbujas) son pulsos sobre una base baja: la transición no debe agregar nada a lo que ya hacen los dos ambientes por separado
  console.log('CAMBIO DE BIOMA pradera>océano', JSON.stringify(bt)); assert.ok(bt.jump <= Math.max(bt.steadyBefore, bt.steadyAfter) * 1.15 + .05 && bt.click <= Math.max(bt.clickBefore, bt.clickAfter) * 1.25 + .01, 'el cambio de ambiente no debe cortar');
  console.log('  nivel del ambiente (rms): pradera', bt.before.toFixed(4), '· océano', bt.after.toFixed(4), '· cociente', (bt.after / bt.before).toFixed(1) + '×');
  // 9c) PEOR CASO de saturación: todo al 100 %, combate, evolución, ráfaga de efectos simultáneos forzados
  const worst = await T(async () => {
    const T = window.__T, hooks = []; const names = FondalAudio.effects;
    for (let t = 2; t < 28; t++) for (let k = 0; k < 4; k++) hooks.push({ t, fn: A => { for (let j = 0; j < 3; j++) A.sfx(names[(t * 7 + k * 5 + j) % names.length], { force: true, own: true, pan: (j - 1) * .8 }); } });
    hooks.push({ t: 10, fn: A => A.stinger(8) });
    const r = await T.render(A => { for (const k of ['master', 'music', 'sfx', 'amb']) A.setVolume(k, 1); A.setBiome('oceano', true); A.setMood('combate', { instant: true }); }, 30, hooks, 77);
    const all = new Float32Array(r.l.length * 2); all.set(r.l); all.set(r.r, r.l.length);
    let over = 0, over7 = 0, nan = 0, dc = 0; for (let i = 0; i < all.length; i++) { const v = all[i]; if (!isFinite(v)) nan++; else { if (Math.abs(v) > .98) over++; if (Math.abs(v) > .7) over7++; dc += v; } }
    return { pk: T.peak(all), rms: T.rms(all), over, frac7: over7 / all.length, nan, dc: dc / all.length };
  });
  console.log('PEOR CASO (todo al 100 %, 36 efectos/s forzados, combate+stinger)', worst);
  assert.ok(worst.nan === 0 && worst.over === 0 && worst.pk < .9, 'el peor caso no debe recortar ni dar NaN (pico ' + worst.pk.toFixed(3) + ')'); assert.ok(Math.abs(worst.dc) < .01, 'sin componente continua');
  // 9d) partida larga: 10 minutos de audio con cambios de ánimo/bioma/efectos; sin NaN, sin recorte, y los nodos fuente VIVOS no crecen (sin fugas)
  const long = await T(async () => {
    const T = window.__T, SRL = 8000, DUR = 600; // 8 kHz: lo que se mide es el grafo (nodos) y la señal acotada, no la fidelidad
    const OAC = OfflineAudioContext.prototype, orig = { o: OAC.createOscillator, b: OAC.createBufferSource }; let live = 0, made = 0; const samples = [];
    OAC.createOscillator = function () { const n = orig.o.apply(this, arguments); live++; made++; n.addEventListener('ended', () => live--); return n; };
    OAC.createBufferSource = function () { const n = orig.b.apply(this, arguments); live++; made++; n.addEventListener('ended', () => live--); return n; };
    const origRand = Math.random; Math.random = T.mulberry(5);
    try {
      const oc = new OfflineAudioContext(2, SRL * DUR, SRL), A = FondalAudio.create({ storageKey: null }); A.attach(oc);
      A.setBiome('pradera', true); const mo = FondalAudio.moods, bi = FondalAudio.biomes, fx = FondalAudio.effects; let maxActive = 0;
      for (let t = 1; t < DUR; t++) oc.suspend(t).then(() => {
        if (t % 20 === 0) A.setMood(mo[(t / 20) % mo.length]); if (t % 45 === 0) A.setBiome(bi[(t / 45) % bi.length]); if (t % 90 === 0) A.stinger(6);
        for (let j = 0; j < 2; j++) A.sfx(fx[(t * 3 + j * 7) % fx.length], { pan: ((t % 5) - 2) * .3, own: t % 2 === 0 });
        A.schedule(t + 1.5); maxActive = Math.max(maxActive, A.stats.active); if (t % 30 === 0) samples.push(live); oc.resume();
      });
      A.schedule(1.5); const buf = await oc.startRendering(); const l = buf.getChannelData(0), r = buf.getChannelData(1);
      let nan = 0, over = 0, pk = 0; for (let i = 0; i < l.length; i++) { for (const v of [l[i], r[i]]) { if (!isFinite(v)) nan++; else { const a = Math.abs(v); if (a > pk) pk = a; if (a > .98) over++; } } }
      return { nan, over, pk, made, samples, maxActive, stats: A.stats };
    } finally { Math.random = origRand; OAC.createOscillator = orig.o; OAC.createBufferSource = orig.b; }
  });
  const half = long.samples.length >> 1, avgA = long.samples.slice(2, half).reduce((a, b2) => a + b2, 0) / Math.max(1, half - 2), avgB = long.samples.slice(half).reduce((a, b2) => a + b2, 0) / (long.samples.length - half);
  console.log('PARTIDA LARGA 600 s: nodos fuente creados', long.made, '· vivos (cada 30 s)', JSON.stringify(long.samples), '· media 1ª mitad', avgA.toFixed(0), '2ª mitad', avgB.toFixed(0), '· voces activas máx', long.maxActive, '· pico', long.pk.toFixed(3), '· NaN', long.nan, '· muestras >0,98:', long.over, '· efectos tocados/descartados', long.stats.played, long.stats.dropped);
  assert.strictEqual(long.nan, 0, 'NaN en 10 minutos de audio'); assert.strictEqual(long.over, 0, 'recorte en 10 minutos'); assert.ok(long.pk < .9, 'pico en partida larga ' + long.pk);
  assert.ok(avgB < avgA * 1.25 + 10, 'los nodos fuente vivos no deben crecer con el tiempo (1ª mitad ' + avgA.toFixed(0) + ', 2ª ' + avgB.toFixed(0) + ')'); assert.ok(long.maxActive < 40, 'la lista de voces activas queda acotada (' + long.maxActive + ')');
  // 9e) entradas basura no rompen ni llegan a un AudioParam
  const junk = await T(async () => { const T = window.__T; const r = await T.render(A => { A.setVolume('music', NaN); A.setVolume('sfx', 'x'); A.setVolume('nada', 3); A.setMood('inexistente'); A.setBiome('marte'); A.sfx('hit', { pan: NaN, vol: Infinity, at: NaN, force: true }); A.sfx('no-existe'); A.setBusMuted('xx', true); A.setBusMuted('music', true); A.setBusMuted('music', false); }, 3, null, 3); return { nan: [...r.l, ...r.r].some(v => !isFinite(v)), vols: FondalAudio.volumes }; });
  assert.ok(!junk.nan, 'entradas inválidas no deben producir NaN');

  // 10) CONTROLES: volúmenes independientes, silencio por bus, persistencia (evo_audio_v1), teclado, accesibilidad, móvil (tap)
  const busR = await T(async () => {
    const T = window.__T, run = async (setup, hooks) => T.rms(T.mono(await T.render(setup, 10, hooks, 21)));
    const sfxHook = [1, 3, 5, 7].map(t => ({ t, fn: A => A.sfx('born', { force: true }) })), base = A => { for (const k of ['master', 'music', 'sfx', 'amb']) A.setVolume(k, .8); A.setMood('explorar', { instant: true }); A.setBiome('selva', true); };
    const out = { all: await run(base, sfxHook) };
    out.noMusic = await run(A => { base(A); A.setBusMuted('music', true); }, sfxHook); out.noSfx = await run(A => { base(A); A.setBusMuted('sfx', true); }, sfxHook); out.noAmb = await run(A => { base(A); A.setBusMuted('amb', true); }, sfxHook);
    out.onlyMusic = await run(A => { base(A); A.setBusMuted('sfx', true); A.setBusMuted('amb', true); }, sfxHook); out.onlySfx = await run(A => { base(A); A.setBusMuted('music', true); A.setBusMuted('amb', true); }, sfxHook);
    out.none = await run(A => { base(A); for (const k of ['music', 'sfx', 'amb']) A.setBusMuted(k, true); }, sfxHook);
    return out;
  });
  console.log('SILENCIO POR BUS (rms)', busR);
  assert.ok(busR.noMusic < busR.all * .95 && busR.noSfx < busR.all * .995 && busR.noAmb < busR.all * .99, 'silenciar un bus baja la señal'); assert.ok(busR.onlyMusic > busR.none * 3 && busR.onlySfx > busR.none * 1.5 && busR.none < 1e-4, 'cada bus suena solo cuando es el único activo; los tres en silencio callan');
  await p.evaluate(() => { localStorage.removeItem('evo_audio_v1'); });
  const ui1 = await p.evaluate(() => { const E = window.__e2; E.newGame('pradera', null, 'UI1'); E.setStarted(true); const btn = document.getElementById('audioBtn'); btn.click(); const panel = document.getElementById('audioPanel'); const q = s => document.querySelector(s);
    const r = { opened: !panel.hidden, expanded: btn.getAttribute('aria-expanded'), labels: [...panel.querySelectorAll('input[type=range]')].map(i => i.getAttribute('aria-label') + '|' + i.getAttribute('aria-valuetext')), muteBtns: [...panel.querySelectorAll('button.aud-m')].map(b => b.getAttribute('aria-label') + '|' + b.getAttribute('aria-pressed')), size: [...panel.querySelectorAll('button,input')].map(e => { const b2 = e.getBoundingClientRect(); return Math.round(b2.height); }) };
    const m = q('#aud_music'); m.value = 30; m.dispatchEvent(new Event('input')); q('button.aud-m[data-m=sfx]').click(); q('#audioMute').click(); r.saved = JSON.parse(localStorage.getItem('evo_audio_v1')); q('#audioMute').click();
    return r; });
  console.log('CONTROLES', JSON.stringify(ui1)); assert.ok(ui1.opened && ui1.expanded === 'true'); assert.ok(ui1.labels.every(l => !/null/.test(l)) && ui1.labels.length === 4, 'sliders con etiqueta y valuetext'); assert.strictEqual(ui1.muteBtns.length, 3);
  assert.ok(Math.abs(ui1.saved.music - .3) < .001 && ui1.saved.bm.sfx === true && ui1.saved.mute === true, 'persisten volumen, silencio por bus y silencio general en evo_audio_v1'); assert.ok(ui1.size.every(h => h >= 28), 'controles con tamaño táctil');
  await p.reload(); await p.waitForTimeout(400);
  const ui2 = await p.evaluate(() => ({ vols: FondalAudio.volumes, bm: FondalAudio.busMuted })); console.log('tras recargar', JSON.stringify(ui2)); assert.ok(Math.abs(ui2.vols.music - .3) < .001 && ui2.bm.sfx === true && ui2.vols.mute === false, 'los ajustes sobreviven a recargar la página');
  await p.evaluate(LIB);
  // teclado: M alterna el silencio, Escape cierra el panel
  await p.evaluate(() => { const E = window.__e2; E.newGame('pradera', null, 'UI2'); E.setStarted(true); document.getElementById('audioBtn').click(); }); await p.keyboard.press('m'); const km = await p.evaluate(() => FondalAudio.muted); await p.keyboard.press('m'); const km2 = await p.evaluate(() => FondalAudio.muted);
  await p.keyboard.press('Escape'); const esc = await p.evaluate(() => document.getElementById('audioPanel').hidden); console.log('teclado: M ->', km, 'M ->', km2, '· Esc cierra:', esc); assert.ok(km === true && km2 === false && esc === true, 'atajos M y Escape');
  await p.evaluate(() => { localStorage.removeItem('evo_audio_v1'); });
  // móvil real-ish: 390x800 táctil. Se toca el botón (tap), se silencia un bus y se mide dónde queda el panel respecto del HUD (informativo)
  const mctx = await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), mp = await mctx.newPage();
  mp.on('pageerror', e => errs.push('móvil: ' + e.message)); await mp.goto(URL); await mp.waitForTimeout(300);
  await mp.evaluate(() => { const E = window.__e2; E.cls = 'ter'; E.specKey = 'ter_cazador'; E.diffI = 1; E.newGame('pradera', null, 'MOB'); E.setStarted(true); const mn = document.getElementById('menu'); if (mn) mn.classList.remove('show'); });
  await mp.waitForTimeout(300);
  await mp.tap('#audioBtn', { timeout: 5000 }); const mo1 = await mp.evaluate(() => !document.getElementById('audioPanel').hidden); await mp.tap('button.aud-m[data-m=music]', { timeout: 5000 });
  const mo2 = await mp.evaluate(() => ({ bm: FondalAudio.busMuted, state: FondalAudio.state })); await mp.tap('#audioMute', { timeout: 5000 }); const mo3 = await mp.evaluate(() => FondalAudio.muted);
  const geo = await mp.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b2 = e.getBoundingClientRect(); return { x: Math.round(b2.x), y: Math.round(b2.y), w: Math.round(b2.width), h: Math.round(b2.height), r: Math.round(b2.right), b: Math.round(b2.bottom) }; };
    const btn = r('#audioBtn'), panel = r('#audioPanel'), ov = []; const A = document.getElementById('audioBtn').getBoundingClientRect();
    for (const e of document.querySelectorAll('body *')) { if (e.closest('#audioUI')) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (cs.position !== 'fixed' && cs.position !== 'absolute' && cs.position !== 'sticky')) continue; const b2 = e.getBoundingClientRect(); if (b2.width < 8 || b2.height < 8 || b2.width > 300) continue; if (b2.left < A.right && b2.right > A.left && b2.top < A.bottom && b2.bottom > A.top) ov.push((e.id || e.className || e.tagName) + ''); }
    return { btn, panel, overlapsBtn: ov.slice(0, 6), vw: innerWidth }; });
  console.log('MÓVIL 390: panel abre', mo1, '· silencio música', JSON.stringify(mo2), '· silencio general', mo3, '· geometría', JSON.stringify(geo));
  assert.ok(mo1 && mo2.bm.music === true && mo2.state === 'running' && mo3 === true, 'en móvil (tap) el botón abre el panel, silencia un bus y activa el audio'); assert.ok(geo.panel && geo.panel.r <= geo.vw && geo.panel.x >= 0 && geo.btn.w >= 44 && geo.btn.h >= 44, 'el panel cabe en 390 px y el botón mide ≥44 px');
  await mctx.close();

  assert.strictEqual(errs.length, 0, 'errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('AUDIO ERA 2 OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
