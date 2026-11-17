// Prueba del audio de la Era 3 (motor eras/audio-lofi.js + bloque AUDIO de era3-tribus.html). NO se puede escuchar: se MIDE con OfflineAudioContext.
// Mide: ánimos, ambientes, efectos, transiciones sin clics (con referencias robustas), ducking, peor caso, partida larga (fugas), escalado con la población,
// determinismo con audio activo vs mudo, director con estado real, controles (táctil, teclado, persistencia, aria) y no-solapamiento del botón con el HUD a 360/390/430/1100.
// Uso: NODE_PATH=$(npm root -g) node tests/era3-audio.js     (varios minutos: la VM de pruebas renderiza más lento que el tiempo real)
// NADA de esto reemplaza una escucha humana (docs/ESCUCHA.md).
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../eras/era3-tribus.html');
const until = async (pg, want, ms) => { const t0 = Date.now(); let s; while (Date.now() - t0 < (ms || 6000)) { s = await pg.evaluate(() => FondalAudio.state); if (s === want) return s; await pg.waitForTimeout(100); } return s; };   // el cambio de estado del AudioContext tarda más con la máquina cargada: se espera hasta 6 s en vez de un tiempo fijo

const LIB = () => {
  window.__T = {};
  const T = window.__T, SR = 32000;
  T.mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // agenda por tramos de 1 s, como en vivo (si no, el grafo offline tiene miles de nodos a la vez)
  T.render = async (setup, dur, hooks, seed, sr) => {
    sr = sr || SR;
    const orig = Math.random; Math.random = T.mulberry(seed || 7);
    try {
      const oc = new OfflineAudioContext(2, sr * dur, sr), A = FondalAudio.create({ storageKey: null }); A.attach(oc); setup && setup(A);
      for (let t = 1; t < dur; t++) oc.suspend(t).then(() => { for (const h of hooks || []) if (h.t === t) h.fn(A); A.schedule(t + 1.5); oc.resume(); });
      A.schedule(1.5); const buf = await oc.startRendering();
      return { l: buf.getChannelData(0), r: buf.getChannelData(1), A };
    } finally { Math.random = orig; }
  };
  const rms = (d, a, b) => { a = a || 0; b = b || d.length; let e = 0; for (let i = a; i < b; i++) e += d[i] * d[i]; return Math.sqrt(e / (b - a)); };
  const peak = d => { let p = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > p) p = v; } return p; };
  const mono = r => { const m = new Float32Array(r.l.length); for (let i = 0; i < m.length; i++) m[i] = (r.l[i] + r.r[i]) / 2; return m; };
  T.activity = (d, sr) => { sr = sr || SR; const w = 512; let prev = 0, s = 0; for (let i = 0; i + w <= d.length; i += w) { const e = rms(d, i, i + w); if (e > prev) s += e - prev; prev = e; } return s / (d.length / sr); };
  function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } }
  T.spectrum = d => {
    const N = 2048, ed = [0, 150, 500, 1500, 4000, SR / 2], pw = new Float64Array(N / 2); let nf = 0;
    for (let s = 0; s + N <= d.length; s += N) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = d[s + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / N)); fft(re, im); for (let k = 0; k < N / 2; k++) pw[k] += re[k] * re[k] + im[k] * im[k]; nf++; }
    const bands = [0, 0, 0, 0, 0]; let num = 0, den = 0;
    for (let k = 1; k < N / 2; k++) { const f = k * SR / N; for (let b = 0; b < 5; b++) if (f >= ed[b] && f < ed[b + 1]) bands[b] += pw[k]; num += f * pw[k]; den += pw[k]; }
    return { bands: bands.map(v => +(10 * Math.log10(v / nf / N + 1e-20)).toFixed(1)), centroid: Math.round(num / den) };
  };
  T.dist = (x, y) => Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));
  T.med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  T.rms = rms; T.peak = peak; T.mono = mono;
};

(async () => {
  const t0 = Date.now(); const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null, RUN = n => !ONLY || ONLY.has(n);   // ONLY=scale,dir,ctl ejecuta solo esas secciones (para iterar); sin ONLY corre todo
  const b = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if ((m.type() === 'error' || (m.type() === 'warning' && /\[audio\]/.test(m.text()))) && !/fonts|ERR_(INTERNET|NAME|FAILED|CONNECTION)|Failed to load resource/i.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(300); await p.evaluate(LIB);
  const T = fn => p.evaluate(fn);
  const log = (...a) => console.log(...a);

  // 0) existe y arranca sin AudioContext hasta el primer gesto
  const st0 = await T(() => ({ has: !!window.FondalAudio, state: FondalAudio.state, ui: !!document.getElementById('audioBtn'), e3: !!(window.__e3 && window.__e3.audio && window.__e3.audioDir), moods: FondalAudio.moodsAll, biomes: FondalAudio.biomesAll, nfx: FondalAudio.effectsAll.length }));
  log('inicio', JSON.stringify(st0));
  assert.ok(st0.has && st0.ui && st0.e3, 'FondalAudio, botón de sonido y ganchos __e3.audio/audioDir deben existir'); assert.strictEqual(st0.state, 'none', 'antes del primer gesto no hay AudioContext');
  for (const m of ['explorar', 'amenaza', 'combate', 'construccion', 'evolucion', 'supervivencia']) assert.ok(st0.moods.includes(m), 'falta el ánimo ' + m);

  // 1) ánimos de la Era 3: nivel, pico, carácter
  if (RUN('moods')) {
  const moods = await T(async () => {
    const T = window.__T, out = {};
    for (const m of FondalAudio.moodsAll) {
      const rr = [];
      for (const seed of [11, 12]) { const r = await T.render(A => { A.setVolume('amb', 0); A.setVolume('sfx', 0); A.setMood(m, { instant: true }); }, 22, null, seed); const dd = T.mono(r).slice(32000 * 4); rr.push({ rms: T.rms(dd), pk: Math.max(T.peak(r.l), T.peak(r.r)), act: T.activity(dd), sp: T.spectrum(dd), nan: [...r.l, ...r.r].some(v => !isFinite(v)) }); }
      out[m] = { rms: (rr[0].rms + rr[1].rms) / 2, pk: Math.max(rr[0].pk, rr[1].pk), act: (rr[0].act + rr[1].act) / 2, hf: (rr[0].sp.bands[4] + rr[1].sp.bands[4]) / 2, lf: (rr[0].sp.bands[0] + rr[1].sp.bands[0]) / 2, cen: Math.round((rr[0].sp.centroid + rr[1].sp.centroid) / 2), nan: rr[0].nan || rr[1].nan };
    }
    return out;
  });
  log('ÁNIMOS (rms, pico, actividad rítmica, banda >4 kHz dB, banda <150 Hz dB, centroide Hz)');
  for (const m in moods) { const v = moods[m]; log(' ', m.padEnd(14), v.rms.toFixed(4), v.pk.toFixed(3), v.act.toFixed(4), v.hf.toFixed(1), v.lf.toFixed(1), v.cen); assert.ok(!v.nan, m + ': NaN'); assert.ok(v.rms > .005, m + ': señal vacía'); assert.ok(v.pk < .9, m + ': pico ' + v.pk); }
  { const rs = Object.values(moods).map(v => v.rms), mx = Math.max(...rs), mn = Math.min(...rs); log('  rango de nivel entre ánimos: ' + (20 * Math.log10(mx / mn)).toFixed(1) + ' dB'); assert.ok(mx / mn < 2, 'los ánimos deben estar nivelados (±6 dB): ' + (mx / mn).toFixed(2) + '×'); }
  assert.ok(moods.combate.rms > moods.explorar.rms * 1.1 && moods.combate.act > moods.explorar.act * 1.25, 'combate: más energía y actividad rítmica que la calma');
  assert.ok(moods.amenaza.lf > moods.explorar.lf && moods.amenaza.cen < moods.explorar.cen, 'amenaza: más grave sostenido y más oscura que la calma');
  assert.ok(moods.amenaza.hf < moods.combate.hf && moods.amenaza.act < moods.combate.act, 'amenaza: sin la percusión del combate');
  assert.ok(moods.construccion.act > moods.explorar.act * 1.05, 'construcción: pulso más marcado que la calma (' + moods.construccion.act.toFixed(3) + ' vs ' + moods.explorar.act.toFixed(3) + ')');
  assert.ok(moods.supervivencia.hf < moods.explorar.hf && moods.explorar.hf < moods.combate.hf, 'percusión: supervivencia < calma < combate');
  }

  // 2) ambientes de la tribu (campamento: fuego, viento, pájaros; frío) y ruido de trabajo por oficio
  if (RUN('amb')) {
  const amb = await T(async () => {
    const T = window.__T, out = {};
    for (const k of FondalAudio.biomesAll) { const r = await T.render(A => { A.setVolume('music', 0); A.setVolume('sfx', 0); A.setBiome(k, true); }, 20, null, 3); const d = T.mono(r).slice(32000 * 2); out[k] = { rms: T.rms(d), pk: Math.max(T.peak(r.l), T.peak(r.r)), sp: T.spectrum(d), nan: [...r.l, ...r.r].some(v => !isFinite(v)) }; }
    return out;
  });
  log('AMBIENTES (rms, pico, bandas dB, centroide)'); const ks = Object.keys(amb);
  for (const k of ks) { const v = amb[k]; log(' ', k.padEnd(16), v.rms.toFixed(4), v.pk.toFixed(3), JSON.stringify(v.sp.bands), v.sp.centroid); assert.ok(!v.nan && v.rms > .003 && v.pk < .9, k + ': ambiente vacío, con NaN o recortado'); }
  { const rs = ks.map(k => amb[k].rms), mx = Math.max(...rs), mn = Math.min(...rs); log('  rango de nivel entre ambientes (todas las eras): ' + (20 * Math.log10(mx / mn)).toFixed(1) + ' dB'); assert.ok(mx / mn < 2, 'ambientes nivelados (±6 dB): ' + (mx / mn).toFixed(2) + '×'); }
  for (const a of ['campamento', 'campamento_frio']) for (const o of ks) { if (o === a) continue; const dd = Math.sqrt(amb[a].sp.bands.reduce((s, v, i) => s + (v - amb[o].sp.bands[i]) ** 2, 0)), dc = Math.abs(amb[a].sp.centroid - amb[o].sp.centroid) / Math.max(amb[a].sp.centroid, amb[o].sp.centroid); assert.ok(dd > 2 || dc > .12, a + ' vs ' + o + ' no difieren (' + dd.toFixed(1) + ' dB, ' + (dc * 100).toFixed(0) + '%)'); }
  const work = await T(async () => {
    const T = window.__T, out = {}, kinds = FondalAudio.workKinds, SRW = 16000;
    const run = async (setup, seed) => { const r = await T.render(A => { A.setVolume('music', 0); A.setVolume('sfx', 0); A.setBiome('campamento', true); setup(A); }, 14, null, seed, SRW); const d = T.mono(r).slice(SRW * 2); return { rms: T.rms(d), act: T.activity(d, SRW), pk: Math.max(T.peak(r.l), T.peak(r.r)) }; };
    const seeds = [3, 4, 5, 6], all = async setup => { const o = []; for (const s of seeds) o.push(await run(setup, s)); return o; };
    out.base = await all(() => {});
    for (const lv of [.35, 1]) out['todos' + lv] = await all(A => kinds.forEach(k => A.setWork(k, lv)));
    for (const k of ['chop', 'mine', 'build']) out[k] = await all(A => A.setWork(k, 1));
    return out;
  });
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length, mact = k => avg(work[k].map(v => v.act)), mr = k => avg(work[k].map(v => v.rms));
  log('TRABAJO (media de 4 semillas; actividad, rms) base', mact('base').toFixed(4), mr('base').toFixed(4), '· 35 %', mact('todos0.35').toFixed(4), mr('todos0.35').toFixed(4), '· 100 %', mact('todos1').toFixed(4), mr('todos1').toFixed(4), '· por oficio', JSON.stringify(Object.fromEntries(['chop', 'mine', 'build'].map(k => [k, +mact(k).toFixed(4)]))));
  assert.ok(mact('todos0.35') > mact('base') * 1.05 && mact('todos1') > mact('todos0.35') * 1.03, 'el ruido de trabajo crece con la intensidad (más gente, más actividad)');
  assert.ok(mr('todos1') < mr('base') * 1.7, 'el trabajo es suave: no más que ~1,7× el rms del ambiente (' + (mr('todos1') / mr('base')).toFixed(2) + '×)');
  for (const k of ['chop', 'mine', 'build']) assert.ok(mact(k) > mact('base') * 1.05, 'el oficio ' + k + ' se oye en el ambiente');
  assert.ok(Math.max(...Object.values(work).flat().map(v => v.pk)) < .9, 'sin recortes en el ambiente de trabajo');
  }

  // 3) efectos
  if (RUN('fx')) {
  const fxr = await T(async () => {
    const T = window.__T, out = {};
    for (const n of FondalAudio.effectsAll) { const r = await T.render(A => { A.setVolume('music', 0); A.setVolume('amb', 0); A.sfx(n, { force: true, own: true }); }, 3, null, 9); const d = T.mono(r), sp = T.spectrum(d); out[n] = { early: T.rms(d, 0, 32000 * 2), pk: Math.max(T.peak(r.l), T.peak(r.r)), nan: [...r.l, ...r.r].some(v => !isFinite(v)), sp: sp.bands.concat([sp.centroid]) }; }
    return out;
  });
  log('EFECTOS (rms primeros 2 s, pico): ' + Object.entries(fxr).map(([n, v]) => n + ' ' + v.early.toFixed(3) + '/' + v.pk.toFixed(2)).join(' · '));
  for (const n in fxr) { const v = fxr[n]; assert.ok(!v.nan, n + ': NaN'); assert.ok(v.early > .0015, n + ': efecto sin señal'); assert.ok(v.pk < .95, n + ': recorta (' + v.pk.toFixed(2) + ')'); }
  { const rs = Object.entries(fxr).filter(([n]) => !['pray'].includes(n)).map(([, v]) => v.early), mx = Math.max(...rs), mn = Math.min(...rs); log('  rango de nivel entre efectos: ' + (20 * Math.log10(mx / mn)).toFixed(1) + ' dB'); assert.ok(mx / mn < 60, 'efectos con niveles absurdamente distintos (' + (mx / mn).toFixed(0) + '×)'); }
  // los sonidos de oficio tienen que distinguirse entre sí; también las alertas
  const dd = (x, y) => Math.sqrt(x.slice(0, 5).reduce((s, v, i) => s + (v - y[i]) ** 2, 0)), grp = (names, label) => { for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) assert.ok(dd(fxr[names[i]].sp, fxr[names[j]].sp) > 1.5 || Math.abs(fxr[names[i]].sp[5] - fxr[names[j]].sp[5]) > 120, label + ': ' + names[i] + ' y ' + names[j] + ' suenan demasiado parecidos'); log('  distinguibles por espectro (' + label + '):', names.join(', ')); };
  grp(['chop', 'mine', 'hammer', 'gather', 'farm'], 'oficios'); grp(['alarm', 'horn', 'cold', 'wolf'], 'amenazas'); grp(['built', 'upgrade', 'tech', 'ally', 'win'], 'logros');
  const L = await T(async () => { const T = window.__T; const a = await T.render(A => { A.setVolume('music', 0); A.setVolume('amb', 0); A.sfx('hammer', { force: true, pan: -.8 }); }, 2, null, 9), c = await T.render(A => { A.setVolume('music', 0); A.setVolume('amb', 0); A.sfx('hammer', { force: true, pan: .8 }); }, 2, null, 9); return { lL: T.rms(a.l), lR: T.rms(a.r), rL: T.rms(c.l), rR: T.rms(c.r) }; });
  assert.ok(L.lL > L.lR * 2 && L.rR > L.rL * 2, 'el paneo mueve el efecto hacia el lado de su posición');
  }

  // 4) transiciones entre ánimos (referencia ROBUSTA: máximo de todos los tramos estables de ese ánimo en todas las corridas y semillas) y ducking
  if (RUN('trans')) {
  const PAIRS = [['explorar', 'amenaza'], ['amenaza', 'combate'], ['combate', 'explorar'], ['explorar', 'construccion'], ['construccion', 'explorar'], ['supervivencia', 'amenaza'], ['amenaza', 'supervivencia'], ['construccion', 'combate'], ['combate', 'supervivencia'], ['evolucion', 'explorar']];
  const trans = await p.evaluate(async (PAIRS) => {
    const T = window.__T, sr = 16000, out = [];
    for (const [a, b2] of PAIRS) for (const seed of [31, 32]) {
      const r = await T.render(A => { A.setVolume('amb', .6); A.setVolume('sfx', 0); A.setBiome('campamento', true); A.setMood(a, { instant: true }); }, 30, [{ t: 12, fn: A => A.setMood(b2) }], seed, sr);
      const d = T.mono(r), W = 800, env = []; for (let i = 0; i + W <= d.length; i += W) env.push(T.rms(d, i, i + W));
      const jump = (i0, i1) => { let m = 0; for (let i = i0 + 1; i < i1; i++) m = Math.max(m, Math.abs(env[i] - env[i - 1]) / (Math.max(env[i], env[i - 1]) + 1e-4)); return m; };
      const click = (t0, t1) => { let m = 0; for (let i = Math.floor(sr * t0) + 2; i < sr * t1; i++) m = Math.max(m, Math.abs(d[i] - 2 * d[i - 1] + d[i - 2])); return m; };
      const e = s => Math.floor(s / .05);
      out.push({ a, b: b2, seed, jumpTrans: jump(e(11.5), e(23)), jumpA: jump(e(2), e(11)), jumpB: jump(e(24), e(29.5)), clickTrans: click(11.5, 23), clickA: click(2, 11), clickB: click(24, 29.5), pk: Math.max(T.peak(r.l), T.peak(r.r)), nan: [...r.l, ...r.r].some(v => !isFinite(v)) ? 1 : 0 });
    }
    return out;
  }, PAIRS);
  // referencia por ánimo: el MÁXIMO de todos sus tramos estables en todas las corridas (no una ventana corta)
  const refJ = {}, refC = {}; for (const v of trans) { for (const [m, j, c] of [[v.a, v.jumpA, v.clickA], [v.b, v.jumpB, v.clickB]]) { refJ[m] = Math.max(refJ[m] || 0, j); refC[m] = Math.max(refC[m] || 0, c); } }
  let worstJ = 0, worstC = 0, worstPk = 0;
  for (const k of PAIRS.map(x => x.join('>'))) {
    const rows = trans.filter(v => v.a + '>' + v.b === k), [a, b2] = k.split('>'), rj = Math.max(refJ[a], refJ[b2]), rc = Math.max(refC[a], refC[b2]);
    const jt = Math.max(...rows.map(v => v.jumpTrans)), ct = Math.max(...rows.map(v => v.clickTrans)), pk = Math.max(...rows.map(v => v.pk));
    worstJ = Math.max(worstJ, jt / rj); worstC = Math.max(worstC, ct / rc); worstPk = Math.max(worstPk, pk);
    log('  ', k.padEnd(26), 'salto env.: trans', jt.toFixed(2), 'ref(máx. de régimen)', rj.toFixed(2), '· clic: trans', ct.toFixed(3), 'ref', rc.toFixed(3), '· pico', pk.toFixed(3));
    assert.ok(rows.every(v => !v.nan), k + ': NaN'); assert.ok(pk < .9, k + ': pico ' + pk);
    assert.ok(jt <= rj * 1.15 + .05, k + ': salto de envolvente mayor que el máximo de régimen (' + jt.toFixed(2) + ' vs ' + rj.toFixed(2) + ')');
    assert.ok(ct <= rc * 1.25 + .02, k + ': clic nuevo en la transición (' + ct.toFixed(3) + ' vs ' + rc.toFixed(3) + ')');
  }
  log('TRANSICIONES (10 pares x 2 semillas): peor salto trans/ref ' + worstJ.toFixed(2) + ' · peor clic trans/ref ' + worstC.toFixed(2) + ' · pico máx ' + worstPk.toFixed(3));
  // ducking: la música baja con una alerta crítica, vuelve sola y no mete clics (mediana de 3 semillas)
  const duck = await T(async () => {
    const T = window.__T, sr = 16000, rows = [];
    for (const seed of [51, 52, 53]) {
      const r = await T.render(A => { A.setVolume('amb', 0); A.setVolume('sfx', 0); A.setMood('explorar', { instant: true }); }, 30, [{ t: 12, fn: A => A.duckFor(3, .35) }], seed, sr);
      const d = T.mono(r), W = 800, env = []; for (let i = 0; i + W <= d.length; i += W) env.push(T.rms(d, i, i + W));
      const m = (t0, t1) => { let s = 0, n = 0; for (let i = Math.floor(t0 / .05); i < t1 / .05; i++) { s += env[i]; n++; } return s / n; };
      const click = (t0, t1) => { let c = 0; for (let i = Math.floor(sr * t0) + 2; i < sr * t1; i++) c = Math.max(c, Math.abs(d[i] - 2 * d[i - 1] + d[i - 2])); return c; };
      rows.push({ before: m(6, 11.5), during: m(13, 15), after: m(21, 28), clickT: click(11.5, 20), clickS: Math.max(click(4, 11), click(22, 29)), flag: r.A.ducking });
    }
    return rows;
  });
  const dmed = k => { const q = duck.map(v => v[k]).sort((x, y) => x - y); return q[1]; };
  log('DUCKING (3 semillas, mediana): antes', dmed('before').toFixed(4), 'durante', dmed('during').toFixed(4), 'después', dmed('after').toFixed(4), '· ratio durante/antes', (dmed('during') / dmed('before')).toFixed(2), 'después/antes', (dmed('after') / dmed('before')).toFixed(2), '· clic trans/régimen', (dmed('clickT') / dmed('clickS')).toFixed(2), '· bandera final', duck.map(v => v.flag));
  assert.ok(dmed('during') < dmed('before') * .75, 'el ducking baja la música al menos 25 %'); assert.ok(dmed('after') > dmed('before') * .8 && dmed('after') < dmed('before') * 1.3, 'la música vuelve al nivel anterior'); assert.ok(dmed('clickT') <= dmed('clickS') * 1.25 + .02, 'el ducking no mete clics'); assert.ok(duck.every(v => v.flag === false), 'la bandera de ducking se apaga sola');
  }

  // 5) peor caso de saturación: todo al 100 %, combate, trabajo al máximo, 36 efectos forzados por segundo, ducking y stinger
  if (RUN('worst')) {
  const worst = await T(async () => {
    const T = window.__T, hooks = [], names = FondalAudio.effectsAll;
    for (let t = 2; t < 26; t++) for (let k = 0; k < 4; k++) hooks.push({ t, fn: A => { for (let j = 0; j < 3; j++) A.sfx(names[(t * 7 + k * 5 + j) % names.length], { force: true, own: true, pan: (j - 1) * .8 }); } });
    hooks.push({ t: 10, fn: A => A.stinger(8) }); hooks.push({ t: 14, fn: A => A.duckFor(2, .4) });
    const r = await T.render(A => { for (const k of ['master', 'music', 'sfx', 'amb']) A.setVolume(k, 1); A.setBiome('campamento_frio', true); FondalAudio.workKinds.forEach(k => A.setWork(k, 1)); A.setMood('combate', { instant: true }); }, 28, hooks, 77);
    const all = new Float32Array(r.l.length * 2); all.set(r.l); all.set(r.r, r.l.length);
    let over = 0, nan = 0, dc = 0; for (let i = 0; i < all.length; i++) { const v = all[i]; if (!isFinite(v)) nan++; else { if (Math.abs(v) > .98) over++; dc += v; } }
    return { pk: T.peak(all), rms: T.rms(all), over, nan, dc: dc / all.length };
  });
  log('PEOR CASO (todo al 100 %, 36 efectos/s forzados, combate, trabajo 100 %, ducking, stinger)', JSON.stringify(worst));
  assert.ok(worst.nan === 0 && worst.over === 0 && worst.pk < .9, 'el peor caso no recorta ni da NaN (pico ' + worst.pk.toFixed(3) + ')'); assert.ok(Math.abs(worst.dc) < .01, 'sin componente continua');
  }

  // 6) partida larga (10 minutos de audio) con cambios de ánimo/ambiente/trabajo/efectos: sin NaN, sin recorte, nodos vivos acotados
  if (RUN('long')) {
  const long = await T(async () => {
    const T = window.__T, SRL = 8000, DUR = 600;
    const OAC = OfflineAudioContext.prototype, orig = { o: OAC.createOscillator, b: OAC.createBufferSource }; let live = 0, made = 0; const samples = [];
    OAC.createOscillator = function () { const n = orig.o.apply(this, arguments); live++; made++; n.addEventListener('ended', () => live--); return n; };
    OAC.createBufferSource = function () { const n = orig.b.apply(this, arguments); live++; made++; n.addEventListener('ended', () => live--); return n; };
    const origRand = Math.random; Math.random = T.mulberry(5);
    try {
      const oc = new OfflineAudioContext(2, SRL * DUR, SRL), A = FondalAudio.create({ storageKey: null }); A.attach(oc);
      A.setBiome('campamento', true); const mo = FondalAudio.moodsAll, fx = FondalAudio.effectsAll, wk = FondalAudio.workKinds; let maxActive = 0;
      for (let t = 1; t < DUR; t++) oc.suspend(t).then(() => {
        if (t % 17 === 0) A.setMood(mo[(t / 17) % mo.length]); if (t % 50 === 0) A.setBiome(t % 100 === 0 ? 'campamento' : 'campamento_frio'); if (t % 90 === 0) A.stinger(6); if (t % 23 === 0) A.duckFor(1.4, .4);
        wk.forEach((k, i) => A.setWork(k, ((t / 11 + i) % 3) / 2));
        for (let j = 0; j < 2; j++) A.sfx(fx[(t * 3 + j * 7) % fx.length], { pan: ((t % 5) - 2) * .3, own: t % 2 === 0 });
        A.schedule(t + 1.5); maxActive = Math.max(maxActive, A.stats.active); if (t % 30 === 0) samples.push(live); oc.resume();
      });
      A.schedule(1.5); const buf = await oc.startRendering(); const l = buf.getChannelData(0), r = buf.getChannelData(1);
      let nan = 0, over = 0, pk = 0; for (let i = 0; i < l.length; i++) for (const v of [l[i], r[i]]) { if (!isFinite(v)) nan++; else { const a = Math.abs(v); if (a > pk) pk = a; if (a > .98) over++; } }
      return { nan, over, pk, made, samples, maxActive, stats: A.stats };
    } finally { Math.random = origRand; OAC.createOscillator = orig.o; OAC.createBufferSource = orig.b; }
  });
  const half = long.samples.length >> 1, avgA = long.samples.slice(2, half).reduce((a, c) => a + c, 0) / Math.max(1, half - 2), avgB = long.samples.slice(half).reduce((a, c) => a + c, 0) / (long.samples.length - half);
  log('PARTIDA LARGA 600 s: nodos fuente creados', long.made, '· vivos (cada 30 s)', JSON.stringify(long.samples), '· media 1ª mitad', avgA.toFixed(0), '2ª', avgB.toFixed(0), '· voces activas máx', long.maxActive, '· pico', long.pk.toFixed(3), '· NaN', long.nan, '· >0,98:', long.over, '· efectos tocados/descartados', long.stats.played, long.stats.dropped);
  assert.strictEqual(long.nan, 0); assert.strictEqual(long.over, 0); assert.ok(long.pk < .9, 'pico en partida larga ' + long.pk);
  assert.ok(avgB < avgA * 1.25 + 10, 'nodos fuente vivos crecen (1ª ' + avgA.toFixed(0) + ', 2ª ' + avgB.toFixed(0) + ')'); assert.ok(long.maxActive < 40, 'voces activas acotadas (' + long.maxActive + ')');
  const junk = await T(async () => { const T = window.__T; const r = await T.render(A => { A.setWork('chop', NaN); A.setWork('nada', 1); A.duckFor(NaN, NaN); A.setMood('inexistente'); A.setBiome('marte'); A.sfx('drop', { pan: NaN, vol: Infinity, at: NaN, force: true, v: 2 }); A.sfx('no-existe'); }, 3, null, 3); return [...r.l, ...r.r].some(v => !isFinite(v)); });
  assert.ok(!junk, 'entradas inválidas no deben producir NaN');
  }

  // 7) el audio no altera la simulación: mismo hash con audio activo, mudo y sin suscriptores del Bus
  if (RUN('det')) {
  const det = await T(async () => {
    const E = window.__e3, FA = FondalAudio, D = E.audioDir; if (document.getElementById('menu')) document.getElementById('menu').classList.remove('show');
    const run = (tick) => { E.newGame('DET3AUDIO'); E.setStarted(true); for (let i = 0; i < 1600; i++) { E.step(.05); if (tick && i % 20 === 0) { D.direct(); D.flush(); } } return E.stateHash(); };
    FA.setMuted(false); const a = run(true); FA.setMuted(true); const b2 = run(true); FA.setMuted(false);
    const saved = E.Bus.h; E.Bus.h = {}; const c = run(false); E.Bus.h = saved; const d = run(true);
    return { a, b2, c, d, same: a === b2 && a === c && a === d };
  });
  log('DETERMINISMO Era 3 (audio activo / mudo / sin suscriptores / otra vez)', JSON.stringify(det)); assert.ok(det.same, 'el audio no debe cambiar la simulación');
  }

  // 8) escala con la población: con 7 veces más gente los sonidos solicitados al motor NO crecen 7 veces (se agrupan)
  if (RUN('scale')) {
  const scale = await T(async () => {
    const E = window.__e3, FA = FondalAudio, D = E.audioDir, res = {}; const real = FA.sfx, calls = {}; let nCalls = 0;
    FA.sfx = function (n, o) { calls[n] = (calls[n] || 0) + 1; nCalls++; return real.apply(this, arguments); };
    const raw = { n: 0 }; const offs = ['work', 'carry', 'drop', 'eat', 'hit', 'kill', 'death', 'born'].map(t => E.Bus.on(t, () => raw.n++));
    try {
      for (const extra of [0, 52]) {
        E.newGame('SCALE'); E.setStarted(true); D.reset(); const G = E.G; for (let i = 0; i < extra; i++) { const q = E.mkPerson(300 + (i % 9) * 14, 330 + Math.floor(i / 9) * 14, 30, ['rec', 'art', 'con', 'caz'][i % 4]); G.P.push(q); } G.food = 200; G.wood = 80; G.stone = 40;
        for (const k in calls) delete calls[k]; nCalls = 0; raw.n = 0; D.direct(); let maxPerFlush = 0;
        for (let i = 0; i < 1200; i++) { E.step(.05); if (i % 5 === 4) { const b0 = nCalls; D.flush(i * 50); maxPerFlush = Math.max(maxPerFlush, nCalls - b0); } }
        res[extra] = { pop: E.G.P.length, rawEvents: raw.n, sfxCalls: nCalls, perSimSec: +(nCalls / 60).toFixed(1), maxPerFlush, kinds: Object.keys(calls).length };
      }
    } finally { FA.sfx = real; offs.forEach(f => f()); }
    return res;
  });
  log('ESCALA (60 s simulados): 8 personas', JSON.stringify(scale[0]), '· +52', JSON.stringify(scale[52]));
  assert.ok(scale[52].pop > scale[0].pop * 4, 'la prueba necesita mucha más población'); assert.ok(scale[52].rawEvents > scale[0].rawEvents * 2, 'con más gente hay muchos más eventos');
  assert.ok(scale[52].sfxCalls < scale[0].sfxCalls * 3 + 20, 'los sonidos pedidos no crecen en proporción a la población (' + scale[0].sfxCalls + ' → ' + scale[52].sfxCalls + ')'); assert.ok(scale[52].perSimSec <= 30, 'tope de sonidos pedidos por segundo simulado: ' + scale[52].perSimSec);
  }

  // 9) director con estado real de la Era 3 (prioridad, histéresis, eventos del Bus)
  if (RUN('dir')) {
  await p.evaluate(() => { document.getElementById('menu').classList.remove('show'); });
  await p.keyboard.press('Shift'); assert.strictEqual(await until(p, 'running'), 'running', 'un gesto de teclado crea y reanuda el AudioContext');
  const dir = await T(async () => {
    const E = window.__e3, D = E.audioDir, FA = FondalAudio, out = {}; let now = 1e6; D.clock(() => now);
    const prep = () => { E.newGame('DIR3'); E.setStarted(true); for (let i = 0; i < 40; i++) E.step(.05); const G = E.G; G.paused = false; G.modal = false; D.reset(); now += 60000; for (const q of G.P) q.st = 'idle'; return G; };
    let G = prep(); G.x3.al = {}; out.calma = D.direct(now).mood;
    G.P[0].st = 'build'; out.obra = D.direct(now).mood; G.P[0].st = 'idle';
    out.obraSigue = D.direct(now).mood; now += 3000; out.noBajaEn3s = D.direct(now).mood; now += 4000; out.bajaTras7s = D.direct(now).mood;
    G = prep(); G.x3.al = { hambruna: { l: 'crit', text: 'x', t: 0 } }; out.hambre = D.direct(now).mood;
    G = prep(); G.season = 3; out.biomaInvierno = (D.direct(now), FA.biome);
    G = prep(); G.Wv.push({ x: G.camp.x + 80, y: G.camp.y, hp: 20, cd: 0, dead: false }); out.lobo = D.direct(now).mood; out.lobos = D.info.wolves;
    G = prep(); G.x3.clans[0].prep = 8; out.preparacion = D.direct(now).mood; G.P[0].st = 'build'; out.amenazaGanaAObra = D.direct(now).mood;
    G.raidActive = true; out.saqueo = D.direct(now).mood; out.porque = D.info.why;
    G = prep(); G.P[0].st = 'build'; G.x3.al = { hambruna: { l: 'warn', text: 'x', t: 0 } }; out.hambreGanaAObra = D.direct(now).mood;
    G = prep(); E.Bus.emit('hit', G.Wv[0] || { x: 300, y: 300 }, G.P[0], 3, 'lobo'); out.golpe = D.direct(now).mood; now += 7000; out.golpeCaduca = D.direct(now).mood;
    G = prep(); E.Bus.emit('tech', 'fuego'); out.tech = FA.mood; G = prep(); E.Bus.emit('discover', { x: 100, y: 100 }, G.P[0]); out.discover = FA.mood;
    G = prep(); E.Bus.emit('alert', { kind: 'hambruna', level: 'crit', text: 'x', x: 300, y: 300 }); out.duckCrit = FA.ducking;
    G = prep(); G.paused = true; D.direct(now); out.pausa = FA.ducking; G.paused = false; D.direct(now);
    D.clock(null); return out;
  });
  log('DIRECTOR', JSON.stringify(dir));
  assert.strictEqual(dir.calma, 'explorar'); assert.strictEqual(dir.obra, 'construccion'); assert.strictEqual(dir.noBajaEn3s, 'construccion', 'histéresis: no baja de ánimo antes de 6 s'); assert.strictEqual(dir.bajaTras7s, 'explorar', 'baja tras 6 s sostenidos');
  assert.strictEqual(dir.hambre, 'supervivencia'); assert.strictEqual(dir.biomaInvierno, 'campamento_frio'); assert.strictEqual(dir.lobo, 'amenaza'); assert.ok(dir.lobos >= 1);
  assert.strictEqual(dir.preparacion, 'amenaza'); assert.strictEqual(dir.amenazaGanaAObra, 'amenaza'); assert.strictEqual(dir.saqueo, 'combate'); assert.strictEqual(dir.hambreGanaAObra, 'supervivencia', 'supervivencia gana a construcción');
  assert.strictEqual(dir.golpe, 'combate'); assert.notStrictEqual(dir.golpeCaduca, 'combate', 'el combate por golpes caduca a los 5 s'); assert.strictEqual(dir.tech, 'evolucion'); assert.strictEqual(dir.discover, 'evolucion'); assert.strictEqual(dir.duckCrit, true, 'alerta crítica => ducking'); assert.strictEqual(dir.pausa, true, 'pausa => volumen bajo');
  }

  // 10) arranque por gesto y suspensión en pestaña oculta (página nueva: el ctx todavía no existe)
  if (RUN('gesto')) {
  const q = await b.newPage({ viewport: { width: 1280, height: 800 } }); q.on('pageerror', e => errs.push(e.message)); await q.goto(URL); await q.waitForTimeout(300);
  await q.evaluate(() => { const E = window.__e3; E.newGame('GEST'); E.setStarted(true); document.getElementById('menu').classList.remove('show'); for (let i = 0; i < 200; i++) E.step(.05); });
  const sNo = await q.evaluate(() => ({ state: FondalAudio.state, ctx: !!FondalAudio.ctx })); assert.strictEqual(sNo.state, 'none'); log('sin gesto: el juego corre y no hay AudioContext', JSON.stringify(sNo));
  await q.mouse.click(300, 300); const sYes = await until(q, 'running'); assert.strictEqual(sYes, 'running'); log('primer gesto →', sYes);
  await q.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await q.waitForTimeout(100); const sHid = await until(q, 'suspended');
  await q.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await q.waitForTimeout(100); const sVis = await until(q, 'running');
  log('pestaña oculta:', sHid, '· visible:', sVis); assert.strictEqual(sHid, 'suspended'); assert.strictEqual(sVis, 'running');
  // ducking en vivo: se apaga solo
  await q.evaluate(() => { __e3.Bus.emit('alert', { kind: 'frio', level: 'crit', text: 'x', x: 300, y: 330 }); }); const dk1 = await q.evaluate(() => FondalAudio.ducking); let dk2 = true; for (let i = 0; i < 80 && dk2; i++) { await q.waitForTimeout(100); dk2 = await q.evaluate(() => FondalAudio.ducking); }   // se libera solo (1,4 s de ducking; con la máquina cargada se espera hasta 8 s) log('ducking en vivo: durante', dk1, '· liberado', !dk2); assert.ok(dk1 === true && dk2 === false, 'el ducking en vivo baja y se libera solo');
  await q.close();
  }

  // 11) CONTROLES (Era 3): volúmenes, silencio por capa, persistencia, teclado, aria
  if (RUN('ctl')) {
  await p.evaluate(() => { localStorage.removeItem('evo_audio_v1'); });
  const ui1 = await p.evaluate(() => { const E = window.__e3; E.newGame('UI3'); E.setStarted(true); document.getElementById('menu').classList.remove('show'); const btn = document.getElementById('audioBtn'); btn.click(); const panel = document.getElementById('audioPanel'), q = s => document.querySelector(s);
    const r = { opened: !panel.hidden, expanded: btn.getAttribute('aria-expanded'), labels: [...panel.querySelectorAll('input[type=range]')].map(i => i.getAttribute('aria-label') + '|' + i.getAttribute('aria-valuetext')), muteBtns: [...panel.querySelectorAll('button.aud-m')].map(b2 => b2.getAttribute('aria-label') + '|' + b2.getAttribute('aria-pressed')), size: [...panel.querySelectorAll('button,input')].map(e => Math.round(e.getBoundingClientRect().height)), btnLabel: btn.getAttribute('aria-label') };
    const m = q('#aud_music'); m.value = 30; m.dispatchEvent(new Event('input')); q('button.aud-m[data-m=sfx]').click(); q('button.aud-m[data-m=amb]').click(); q('#audioMute').click(); r.saved = JSON.parse(localStorage.getItem('evo_audio_v1')); q('#audioMute').click(); return r; });
  log('CONTROLES', JSON.stringify(ui1)); assert.ok(ui1.opened && ui1.expanded === 'true' && /Sonido/.test(ui1.btnLabel)); assert.ok(ui1.labels.length === 4 && ui1.labels.every(l => !/null/.test(l)), 'sliders con etiqueta y valuetext'); assert.strictEqual(ui1.muteBtns.length, 3);
  assert.ok(Math.abs(ui1.saved.music - .3) < .001 && ui1.saved.bm.sfx === true && ui1.saved.bm.amb === true && ui1.saved.mute === true, 'persisten volumen, silencio por capa y silencio general en evo_audio_v1'); assert.ok(ui1.size.every(h => h >= 44), 'todos los controles del panel miden >=44 px de alto: ' + ui1.size.join(','));
  await p.reload(); await p.waitForTimeout(400); await p.evaluate(LIB);
  const ui2 = await p.evaluate(() => ({ vols: FondalAudio.volumes, bm: FondalAudio.busMuted })); log('tras recargar', JSON.stringify(ui2)); assert.ok(Math.abs(ui2.vols.music - .3) < .001 && ui2.bm.sfx && ui2.bm.amb && !ui2.vols.mute, 'los ajustes sobreviven a recargar');
  await p.evaluate(() => { const E = window.__e3; E.newGame('UI4'); E.setStarted(true); document.getElementById('menu').classList.remove('show'); document.getElementById('audioBtn').click(); });
  await p.keyboard.press('m'); const km = await p.evaluate(() => FondalAudio.muted); await p.keyboard.press('m'); const km2 = await p.evaluate(() => FondalAudio.muted); await p.keyboard.press('Escape'); const esc = await p.evaluate(() => document.getElementById('audioPanel').hidden);
  log('teclado: M →', km, 'M →', km2, '· Esc cierra:', esc); assert.ok(km === true && km2 === false && esc === true, 'atajos M y Escape');
  await p.evaluate(() => { localStorage.removeItem('evo_audio_v1'); });
  }

  // 12) móvil y escritorio: botón de audio en esquina fija; no se solapa con el HUD; objetivos >= 44 px; el panel cabe
  if (RUN('geo')) {
  const geoAll = {};
  for (const w of [360, 390, 430, 1100]) {
    const mobile = w < 500, ctx = await b.newContext({ viewport: { width: w, height: mobile ? 800 : 760 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 2 }), mp = await ctx.newPage();
    mp.on('pageerror', e => errs.push(w + ': ' + e.message)); await mp.goto(URL); await mp.waitForTimeout(300);
    await mp.evaluate(() => { const E = window.__e3; E.newGame('GEO'); E.setStarted(true); document.getElementById('menu').classList.remove('show'); for (let i = 0; i < 100; i++) E.step(.05); E.hud(); });
    await mp.waitForTimeout(250);
    const g0 = await mp.evaluate(() => { const A = document.getElementById('audioBtn').getBoundingClientRect(), ov = [];
      for (const e of document.querySelectorAll('#stage *')) { if (e.closest('#audioUI')) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue; if (e.children.length && e.tagName !== 'BUTTON' && !e.classList.contains('chip')) continue; const b2 = e.getBoundingClientRect(); if (b2.width < 4 || b2.height < 4) continue; if (b2.left < A.right && b2.right > A.left && b2.top < A.bottom && b2.bottom > A.top) ov.push(e.id || e.className || e.tagName); }
      return { x: Math.round(A.x), y: Math.round(A.y), w: Math.round(A.width), h: Math.round(A.height), vw: innerWidth, overlaps: ov, sw: document.documentElement.scrollWidth }; });
    if (mobile) await mp.tap('#audioBtn', { timeout: 5000 }); else await mp.click('#audioBtn');
    const g1 = await mp.evaluate(() => { const r = document.getElementById('audioPanel').getBoundingClientRect(); return { open: !document.getElementById('audioPanel').hidden, x: Math.round(r.x), r: Math.round(r.right), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight, small: [...document.querySelectorAll('#audioPanel button, #audioPanel input')].map(e => { const q2 = e.getBoundingClientRect(); return Math.round(q2.height) + (e.tagName === 'BUTTON' ? 'b' : 'i'); }) }; });
    if (mobile) { await mp.tap('button.aud-m[data-m=music]'); await mp.tap('#audioMute'); } else { await mp.click('button.aud-m[data-m=music]'); await mp.click('#audioMute'); }
    await until(mp, 'running'); const g2 = await mp.evaluate(() => ({ bm: FondalAudio.busMuted, mute: FondalAudio.muted, state: FondalAudio.state }));
    geoAll[w] = { g0, g1, g2 }; log('GEOMETRÍA', w, JSON.stringify({ btn: [g0.x, g0.y, g0.w, g0.h], solapa: g0.overlaps, scrollX: g0.sw - g0.vw, panel: [g1.x, g1.r, g1.b], toque: g2 }));
    assert.ok(g0.w >= 44 && g0.h >= 44, w + ': el botón mide ≥44 px'); assert.ok(g0.x + g0.w <= g0.vw && g0.x >= 0 && g0.y >= 0, w + ': el botón está dentro de la pantalla'); assert.deepStrictEqual(g0.overlaps, [], w + ': el botón de audio solapa con ' + g0.overlaps.join(','));
    assert.ok(g0.sw <= g0.vw, w + ': sin scroll horizontal'); assert.ok(g1.open && g1.x >= 0 && g1.r <= g1.vw && g1.b <= g1.vh, w + ': el panel cabe en la pantalla'); assert.ok(g2.bm.music === true && g2.mute === true && g2.state === 'running', w + ': el toque abre, silencia una capa y activa el audio');
    await ctx.close();
  }
  }


  assert.strictEqual(errs.length, 0, 'errores de consola: ' + errs.slice(0, 3).join(' | '));
  log('AUDIO ERA 3 OK (' + Math.round((Date.now() - t0) / 1000) + ' s)'); await b.close();
})().catch(e => { console.error('FALLÓ:', e.message || e); process.exit(1); });
