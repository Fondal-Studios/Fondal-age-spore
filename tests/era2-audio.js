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

  assert.strictEqual(errs.length, 0, 'errores de consola: ' + errs.slice(0, 3).join(' | '));
  console.log('AUDIO ERA 2 OK'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
