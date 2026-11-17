/* =====================================================================================================
   audio-lofi.js — Motor de audio generativo lo-fi para Fondal Age Spore (window.FondalAudio)
   Todo se sintetiza con WebAudio: sin archivos, sin samples, sin música de terceros.
   Genérico y compartible: no sabe nada de ninguna era. La era le dice el ÁNIMO, el AMBIENTE y los EFECTOS.

     const A = FondalAudio;                 // instancia lista (otra: FondalAudio.create({storageKey}))
     A.wire();                              // primer gesto (pointerdown/touchend/keydown) crea y reanuda el AudioContext
     A.setMood('explorar'|'supervivencia'|'combate'|'evolucion')
     A.setBiome('pradera'|'selva'|'desierto'|'tundra'|'oceano')
     A.sfx('eat', { pan:-1..1, vol:0..1, own:true })
     A.setVolume('master'|'music'|'sfx'|'amb', 0..1);  A.setMuted(bool)
     A.attach(ctx)  + A.schedule(hasta)     // pruebas offline con OfflineAudioContext (sin sonar)

   Reglas: NUNCA usa ni consume la simulación del juego. El azar es Math.random (cosmético).
   ===================================================================================================== */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, rnd = Math.random;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = a => a[Math.floor(rnd() * a.length)];

  /* ---------- Ánimos: valores objetivo; el motor los mezcla con transiciones suaves ---------- */
  const MOODS = {
    //                  tempo swing  lp   minor drums hat  bass rhodes mel  drone pulse hum  crackle
    explorar:      { bpm: 72,  swing: .22, lp: 2300, minor: .08, drums: .38, hat: .5, bass: .38, rhodes: 1,    mel: .5,  drone: 0,  pulse: 0, hum: 0,  crackle: 1 },
    supervivencia: { bpm: 58,  swing: .12, lp: 1300, minor: 1,   drums: .12, hat: 0,  bass: .1,  rhodes: .75,  mel: .12, drone: 1,  pulse: 1, hum: .9, crackle: .8 },
    combate:       { bpm: 100, swing: .04, lp: 5200, minor: .9,  drums: 1,   hat: 1,  bass: 1,   rhodes: .6,   mel: .25, drone: .35, pulse: 0, hum: .4, crackle: .35 },
    evolucion:     { bpm: 84,  swing: .2,  lp: 6000, minor: 0,   drums: .45, hat: .6, bass: .55, rhodes: 1.15, mel: .95, drone: 0,  pulse: 0, hum: 0,  crackle: .6 }
  };
  // Ánimos extra (Era 3: estrategia tribal). No figuran en `moods` (lista de la Era 2) sino en `moodsAll`.
  const MOODS_X = {
    amenaza:      { bpm: 64,  swing: .1,  lp: 1500, minor: 1,   drums: .2,  hat: 0,  bass: .3,  rhodes: .7,  mel: .08, drone: 1,  pulse: .85, hum: 1,  crackle: .6 },
    construccion: { bpm: 84,  swing: .16, lp: 2900, minor: 0,   drums: .72, hat: .72, bass: .62, rhodes: .95, mel: .3, drone: 0,  pulse: 0, hum: 0,  crackle: .8 }
  };
  const ALLM = Object.assign({}, MOODS, MOODS_X);
  const NUMS = ['bpm', 'swing', 'lp', 'minor', 'drums', 'hat', 'bass', 'rhodes', 'mel', 'drone', 'pulse', 'hum', 'crackle'];
  const MOOD_PROG = { explorar: 'calm', supervivencia: 'minor', combate: 'drive', evolucion: 'bright', amenaza: 'minor', construccion: 'work' };
  const QUAL = { maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dom: [0, 4, 7, 10], sus: [0, 5, 7, 10], dim: [0, 3, 6, 9] };
  const PROGS = {
    calm:   [[[0, 'maj9'], [9, 'm9'], [5, 'maj9'], [7, 'sus']], [[2, 'm9'], [7, 'sus'], [0, 'maj9'], [9, 'm7']], [[0, 'maj9'], [4, 'm7'], [5, 'maj9'], [7, 'sus']]],
    minor:  [[[0, 'm9'], [8, 'maj7'], [5, 'm7'], [7, 'dom']], [[0, 'm7'], [10, 'maj7'], [8, 'maj7'], [7, 'dom']], [[0, 'm9'], [3, 'maj7'], [5, 'm7'], [0, 'dim']]],
    drive:  [[[0, 'm7'], [0, 'm7'], [8, 'maj7'], [10, 'dom']], [[0, 'm7'], [5, 'm7'], [8, 'maj7'], [7, 'dom']]],
    work:   [[[0, 'maj7'], [5, 'maj9'], [9, 'm7'], [7, 'sus']], [[0, 'maj9'], [7, 'sus'], [9, 'm7'], [5, 'maj7']]],
    bright: [[[0, 'maj9'], [5, 'maj9'], [7, 'sus'], [0, 'maj9']], [[0, 'maj7'], [9, 'm7'], [5, 'maj9'], [7, 'dom']]]
  };
  const PENT_MAJ = [0, 2, 4, 7, 9], PENT_MIN = [0, 3, 5, 7, 10];
  // umbral de cada paso del compás de 16: el patrón se gradúa con la intensidad (no hay patrones por ánimo)
  const KICK_T = { 0: .2, 10: .3, 6: .6, 8: .8, 14: .9 }, RIM_T = { 12: .1, 4: .5, 15: .95 }, BASS_T = { 0: .05, 10: .3, 6: .55, 14: .7, 8: .8, 3: .85 }, STAB_T = { 10: .3, 6: .6, 14: .8, 3: .95 };
  const TAU_MOOD = 2.4; // s: constante de tiempo de la mezcla entre ánimos

  /* ---------- Ambientes por ecosistema: capas continuas + eventos al azar (por segundo) ---------- */
  const BIOMES = {
    pradera:  { wind: [.12, 650, .8, .11],  water: [0, 400],  rain: [0, 4800],   low: [0, 52],  ev: { cricket: .45, bird: .14 }, trim: 1 },
    selva:    { wind: [.05, 480, .7, .09], water: [0, 400],  rain: [.11, 4800], low: [0, 52],  ev: { insect: 1.1, bird: .35, drip: .5 }, trim: .5 },
    desierto: { wind: [.12, 1000, 3.2, .05], water: [0, 400], rain: [0, 4800],  low: [0, 52],  ev: { gust: .07, buzz: .05 }, trim: 1.5 },
    tundra:   { wind: [.17, 520, 1.6, .08], water: [0, 400],  rain: [0, 4800],   low: [0, 52],  ev: { chime: .16 }, trim: 1 },
    oceano:   { wind: [0, 600, .7, .1],     water: [.11, 380], rain: [0, 4800],  low: [.1, 52],  ev: { bubble: .9, whale: .035 }, trim: .3 }
  };
  // Ambientes extra (Era 3): el campamento tiene fuego continuo (fire) además del viento y los pájaros
  const BIOMES_X = {
    campamento:      { wind: [.09, 560, .8, .1], water: [0, 400], rain: [0, 4800], low: [0, 52], fire: .1, ev: { bird: .16, cricket: .22 }, trim: 1.3 },
    campamento_frio: { wind: [.2, 480, 1.4, .08], water: [0, 400], rain: [0, 4800], low: [0, 52], fire: .13, ev: { chime: .08, gust: .05 }, trim: .85 }
  };
  const ALLB = Object.assign({}, BIOMES, BIOMES_X);
  // Ruido de trabajo suave (Era 3): cada oficio activo suma eventos al azar al ambiente; la intensidad la fija la era (0..1) según cuánta gente trabaja
  const WORK_RATE = { chop: 1.3, mine: 1, build: 1.5, farm: .6, gather: .9 };   // eventos por segundo con intensidad 1
  // trim: nivela el ambiente (medido con tests/era2-audio.js: rms de pradera .019, selva .041, desierto .012, océano .069 sin trim; con trim queda en ~.02 ±3 dB)

  function create(opts) {
    opts = opts || {};
    const KEY = opts.storageKey === undefined ? 'evo_audio_v1' : opts.storageKey;
    const vol = { master: .8, music: .7, sfx: .85, amb: .7, mute: false }, bm = { music: false, sfx: false, amb: false };   // bm: silencio por bus (independiente del volumen: al reactivar vuelve al nivel anterior)
    try { if (KEY) { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) { for (const k of ['master', 'music', 'sfx', 'amb']) if (typeof d[k] === 'number') vol[k] = clamp(d[k], 0, 1); vol.mute = !!d.mute; if (d.bm) for (const k in bm) bm[k] = !!d.bm[k]; } } } catch (e) {}
    const save = () => { try { if (KEY) localStorage.setItem(KEY, JSON.stringify(Object.assign({}, vol, { bm }))); } catch (e) {} };

    let ctx = null, offline = false, N = {}, timer = null, wired = false, unlocked = false, duck = false, hidden = false;
    let nextT = 0, ambT = 0, step = 0, bar = 0, progBar = 99, prog = null, progMood = '', keySemi = 0, keyTarget = 0;
    let mel = 4, moodName = 'explorar', pendingMood = 'explorar', holdUntil = 0, biome = 'pradera', lastBiome = null;
    const cur = Object.assign({}, MOODS.explorar);
    let T = MOODS.explorar, chordNow = null;
    let duckEnd = 0, duckDepth = 1, duckOn = false; const work = {}, lastFx = {}, ends = [], stats = { schedMs: 0, schedCalls: 0, dropped: 0, played: 0 };

    const now = () => (ctx ? ctx.currentTime : 0);
    function ramp(p, v, tc, t) { // transición suave: la misma en vivo que en offline (antes en offline era instantánea y los tests no medían el crossfade real). Para saltar al valor, quien llama pasa tc = .001
      if (!ctx || !isFinite(v)) return; const at = t === undefined ? ctx.currentTime : t;
      try { p.setTargetAtTime(v, at, tc || .5); } catch (e) { try { p.value = v; } catch (e2) {} }
    }

    /* ---------- buffers ---------- */
    function noiseBuf(len) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; }
    function crackleBuf(len) {
      const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const r = rnd(); if (r < .00045) d[i] = (rnd() * 2 - 1) * .5; else if (r < .00047) d[i] = (rnd() * 2 - 1) * 1; if (i && d[i] === 0) d[i] = d[i - 1] * .35; }
      return b;
    }

    function fireBuf(len) { // chisporroteo de fogata: estallidos cortos con caída rápida y amplitud al azar
      const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0), sr = ctx.sampleRate;
      for (let i = 0; i < d.length; i++) if (rnd() < 9 / sr * 3) { const a = (.25 + rnd() * .75) * (rnd() < .15 ? 1 : .5), L = Math.floor(sr * (.002 + rnd() * .012)); for (let k = 0; k < L && i + k < d.length; k++) d[i + k] += (rnd() * 2 - 1) * a * Math.exp(-k / (L * .35)); }
      return b;
    }
    /* ---------- grafo ---------- */
    function g(v, to) { const n = ctx.createGain(); n.gain.value = v; if (to) n.connect(to); return n; }
    function filt(type, f, q, to) { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q !== undefined) n.Q.value = q; if (to) n.connect(to); return n; }
    function loopSrc(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; }
    function osc(type, f, to) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (to) o.connect(to); return o; }

    function attach(c) {
      ctx = c; offline = typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext;
      N = {}; nextT = .05; ambT = .05; step = 0; bar = 0; progBar = 99; lastBiome = null; ends.length = 0;
      // salida: maestro -> saturador tanh (acota el pico por debajo de 0,84: nunca recorta; sin compresor porque costaba ~4 ms de CPU por segundo)
      const curve = new Float32Array(2049); for (let i = 0; i < 2049; i++) { const x = (i - 1024) / 1024; curve[i] = Math.tanh(1.2 * x) / 1.2; }
      const clip = ctx.createWaveShaper(); clip.curve = curve; clip.connect(ctx.destination);
      N.master = g(0, clip);
      N.noise = noiseBuf(2);
      // música
      N.musicVol = g(0, N.master); N.musicLP = filt('lowpass', cur.lp, .6, N.musicVol); N.musicIn = g(1, N.musicLP);
      N.rhodes = g(.5, N.musicIn); N.drums = g(.8, N.musicIn); N.bass = filt('lowpass', 320, .5, N.musicIn); N.mel = g(.5, N.musicIn);
      // eco (delay) para Rhodes y melodía, con realimentación oscurecida
      N.delay = ctx.createDelay(1); N.delay.delayTime.value = .38; N.fb = g(.34, null); const dlp = filt('lowpass', 1900, .3, null); N.delay.connect(dlp); dlp.connect(N.fb); N.fb.connect(N.delay); dlp.connect(N.musicIn);
      N.delaySend = g(.22, N.delay); N.rhodes.connect(N.delaySend); N.mel.connect(N.delaySend);
      // reverb barato: 3 filtros de peine realimentados + pasa bajos (la convolución de 1,3 s costaba ~17 ms/s; esto ~5). Compartido: cada bus envía ya con su volumen
      N.revIn = g(1, null); N.revOut = g(.5, N.master); const rlp = filt('lowpass', 2300, .5, N.revOut);
      for (const [dl, fbk] of [[.047, .6], [.061, .58], [.083, .56]]) { const d = ctx.createDelay(.2), f = g(fbk, d); d.delayTime.value = dl; N.revIn.connect(d); d.connect(f); d.connect(rlp); }
      const rhp = filt('highpass', 260, .5, N.revIn); N.revSendM = g(.3, rhp); N.musicVol.connect(N.revSendM);
      // ruido cálido de cinta + crepitar de vinilo + oscilación lenta (wow)
      N.warm = g(0, N.musicVol); const wl = filt('lowpass', 520, .5, N.warm); const ws = loopSrc(N.noise); ws.connect(wl); ws.start(0);
      N.crack = g(0, N.musicVol); const ch = filt('highpass', 1500, .5, N.crack); const cs = loopSrc(crackleBuf(4)); cs.connect(ch); cs.start(0);
      N.wob = osc('sine', .37, null); N.wobG = g(7, null); N.wob.connect(N.wobG); N.wob.start(0);                       // cents de wow
      N.wob2 = osc('sine', .09, null); N.wob2G = g(3, null); N.wob2.connect(N.wob2G); N.wob2.start(0);
      // zumbido grave (supervivencia), bordón y tensión
      N.droneG = g(0, N.musicIn); N.drone = osc('sine', 55, N.droneG); N.drone.start(0);
      N.humG = g(0, null); const hlp = filt('lowpass', 210, .7, N.musicIn); N.humG.connect(hlp);
      N.hum1 = osc('triangle', 110, N.humG); N.hum2 = osc('triangle', 116.5, N.humG); N.hum1.start(0); N.hum2.start(0);
      // efectos
      N.sfxVol = g(0, N.master); N.revSendF = g(.2, N.revIn); N.sfxVol.connect(N.revSendF);
      // ambiente (capas continuas que comparten una fuente de ruido)
      N.ambVol = g(0, N.master); const as = loopSrc(N.noise); as.start(0);
      N.windBP = filt('bandpass', 650, .8, null); N.windG = g(0, N.ambVol); as.connect(N.windBP); N.windBP.connect(N.windG);
      N.lfoW = osc('sine', .11, null); N.lfoWf = g(150, N.windBP.frequency); N.lfoWa = g(0, N.windG.gain); N.lfoW.connect(N.lfoWf); N.lfoW.connect(N.lfoWa); N.lfoW.start(0);
      N.waterLP = filt('lowpass', 380, .5, null); N.waterG = g(0, N.ambVol); as.connect(N.waterLP); N.waterLP.connect(N.waterG);
      N.lfoS = osc('sine', .23, null); N.lfoSw = g(0, N.waterG.gain); N.lfoS.connect(N.lfoSw); N.lfoS.start(0);
      N.rainBP = filt('bandpass', 4800, .4, null); N.rainG = g(0, N.ambVol); as.connect(N.rainBP); N.rainBP.connect(N.rainG);
      N.lowG = g(0, N.ambVol); N.low = osc('sine', 52, N.lowG); N.low.start(0); N.lfoSl = g(0, N.lowG.gain); N.lfoS.connect(N.lfoSl);
      applyVolumes(true); applyKey(true); applyBiome(true);
      moodApply(true);
      // wow en todas las voces tonales: se conectan por nota a N.wobG / N.wob2G
      return api;
    }

    function ambGain() { const B = ALLB[biome]; return bm.amb ? 0 : vol.amb * 1.6 * (duck ? .6 : 1) * (duckOn ? Math.sqrt(duckDepth) : 1) * (B && B.trim || 1); }
    function applyVolumes(inst, slow) {
      if (!ctx) return; const m = vol.mute ? 0 : 1, tc = inst ? .001 : slow ? .7 : .08;
      ramp(N.master.gain, vol.master * m, tc); ramp(N.musicVol.gain, bm.music ? 0 : vol.music * .9 * (duck ? .5 : 1) * (duckOn ? duckDepth : 1), tc); ramp(N.sfxVol.gain, bm.sfx ? 0 : vol.sfx * 1.9, tc); ramp(N.ambVol.gain, ambGain(), tc);
    }
    function applyKey(inst) {
      if (!ctx) return; const r = 55 * Math.pow(2, keySemi / 12), tc = inst ? .001 : 1.4;
      ramp(N.drone.frequency, r, tc); ramp(N.hum1.frequency, r * 2, tc); ramp(N.hum2.frequency, r * 2 * 1.0595, tc);
    }
    function ensureFire() { // fogata continua: se crea la primera vez que un ambiente la pide (no cuesta nada en las demás eras)
      if (N.fireG || !ctx) return;
      N.fireG = g(0, N.ambVol); const fs = loopSrc(fireBuf(3)); const fh = filt('highpass', 1400, .6, N.fireG); fs.connect(fh); fs.start(0);
      N.roarG = g(0, N.ambVol); const rl = filt('lowpass', 230, .6, N.roarG); const rs = loopSrc(N.noise); rs.connect(rl); rs.start(0);
      N.fireLfo = osc('sine', .31, null); N.fireLfoG = g(0, N.roarG.gain); N.fireLfo.connect(N.fireLfoG); N.fireLfo.start(0);
    }
    function applyBiome(inst) {
      if (!ctx) return; const B = ALLB[biome] || BIOMES.pradera, tc = inst ? .001 : 2.2;
      if (B.fire) ensureFire(); if (N.fireG) { ramp(N.fireG.gain, (B.fire || 0) * 1.5, tc); ramp(N.roarG.gain, (B.fire || 0) * .9, tc); ramp(N.fireLfoG.gain, (B.fire || 0) * .3, tc); }
      ramp(N.windG.gain, B.wind[0], tc); ramp(N.windBP.frequency, B.wind[1], tc); N.windBP.Q.value = B.wind[2]; ramp(N.lfoW.frequency, B.wind[3], tc);
      ramp(N.lfoWf.gain, B.wind[1] * .3, tc); ramp(N.lfoWa.gain, B.wind[0] * .55, tc);
      ramp(N.waterG.gain, B.water[0], tc); ramp(N.waterLP.frequency, B.water[1], tc); ramp(N.lfoSw.gain, B.water[0] * .5, tc);
      ramp(N.rainG.gain, B.rain[0], tc); ramp(N.rainBP.frequency, B.rain[1], tc);
      ramp(N.lowG.gain, B.low[0], tc); ramp(N.low.frequency, B.low[1], tc); ramp(N.lfoSl.gain, B.low[0] * .6, tc); ramp(N.ambVol.gain, ambGain(), tc);
    }
    function moodApply(inst) { // ajusta lo que no pasa por el paso del scheduler
      if (!ctx) return; if (inst) for (const k of NUMS) cur[k] = T[k];
      N.musicLP.frequency.value = cur.lp; N.warm.gain.value = .5 * (.5 + cur.crackle * .1); N.crack.gain.value = .2 * cur.crackle; N.droneG.gain.value = .085 * cur.drone; N.humG.gain.value = .03 * cur.hum;
    }

    /* ---------- voces básicas ---------- */
    function wow(o) { try { const a = N.wobG, b = N.wob2G; a.connect(o.detune); b.connect(o.detune); o.onended = () => { try { a.disconnect(o.detune); b.disconnect(o.detune); } catch (e) {} }; } catch (e) {} }
    function rhodesNote(t, f, v, dur) {
      const e = ctx.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(v, t + .012); e.gain.setTargetAtTime(0, t + .02, dur / 3.6); e.connect(N.rhodes);
      const c = osc('sine', f), m = osc('sine', f), tri = osc('triangle', f * 1.003), mg = ctx.createGain(); wow(c); wow(tri); tri.detune.value = 7;
      mg.gain.setValueAtTime(f * 1.5, t); mg.gain.exponentialRampToValueAtTime(f * .05, t + .45); m.connect(mg); mg.connect(c.frequency);   // diente eléctrico: FM que decae
      const tg = g(.35, e); tri.connect(tg); c.connect(e);
      c.start(t); m.start(t); tri.start(t); const te = t + dur + .4; c.stop(te); m.stop(te); tri.stop(te);
    }
    function pluck(t, f, v, dur) { // melodía tipo kalimba/marimba suave
      const e = ctx.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(v, t + .006); e.gain.exponentialRampToValueAtTime(.0001, t + dur); e.connect(N.mel);
      const o = osc('triangle', f, e), o2 = osc('sine', f * 3, g(.12, e)); wow(o); o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
    }
    function bassNote(t, f, v, dur) {
      const e = ctx.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(v, t + .015); e.gain.setTargetAtTime(0, t + .05, dur / 3); e.connect(N.bass);
      const o = osc('sine', f, e), o2 = osc('triangle', f * 2, g(.18, e)); o.start(t); o2.start(t); o.stop(t + dur + .3); o2.stop(t + dur + .3);
    }
    function nsrc(t, dur) { const s = ctx.createBufferSource(); s.buffer = N.noise; s.start(t, rnd() * (N.noise.duration - dur - .05), dur + .02); return s; }
    function kick(t, v) {
      const o = osc('sine', 118), e = ctx.createGain(); o.frequency.setValueAtTime(118, t); o.frequency.exponentialRampToValueAtTime(44, t + .16);
      e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .26); o.connect(e); e.connect(N.drums); o.start(t); o.stop(t + .3);
    }
    function hat(t, v) { const s = nsrc(t, .05), f = filt('highpass', 7200, .5), e = ctx.createGain(); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .045); s.connect(f); f.connect(e); e.connect(N.drums); }
    function rim(t, v) {
      const s = nsrc(t, .08), f = filt('bandpass', 1700, 1.2), e = ctx.createGain(); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .07); s.connect(f); f.connect(e); e.connect(N.drums);
      const o = osc('triangle', 480), e2 = ctx.createGain(); e2.gain.setValueAtTime(v * .5, t); e2.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(e2); e2.connect(N.drums); o.start(t); o.stop(t + .08);
    }
    function heart(t, v) { kick2(t, v, 62); kick2(t + .22, v * .6, 54); }
    function kick2(t, v, f) { const o = osc('sine', f), e = ctx.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(v, t + .012); e.gain.exponentialRampToValueAtTime(.001, t + .28); o.connect(e); e.connect(N.drums); o.start(t); o.stop(t + .32); }

    /* ---------- scheduler musical ---------- */
    function chordRoot(semi) { return 110 * Math.pow(2, (keySemi + semi) / 12); }
    function barStart(t, dt) {
      bar++;
      if (keySemi !== keyTarget) { keySemi = keyTarget; applyKey(false); }
      const pm = MOOD_PROG[moodName] || 'calm';
      if (progBar >= 4 || pm !== progMood) { prog = pick(PROGS[pm]); progMood = pm; progBar = 0; }
      const ch = prog[progBar % 4]; progBar++; const rf = chordRoot(ch[0]), iv = QUAL[ch[1]], barDur = dt * 16;
      // Rhodes: acorde abierto con arpegio levísimo (humaniza), voz grave en 220 Hz
      const vr = .17 * cur.rhodes;
      iv.forEach((s, i) => { const f = rf * 2 * Math.pow(2, s / 12) * (s >= 12 ? .5 : 1); rhodesNote(t + i * .028 + rnd() * .012, f, vr * (1 - i * .08), barDur * .95); });
      chordNow = { root: rf, iv };
      // mezcla continua que cambia por compás
      const tc = 1.2;
      ramp(N.musicLP.frequency, cur.lp, tc, t); ramp(N.warm.gain, .5 * (.5 + cur.crackle * .1), tc, t); ramp(N.crack.gain, .2 * cur.crackle, tc, t);
      ramp(N.droneG.gain, .085 * cur.drone, tc, t); ramp(N.humG.gain, .03 * cur.hum, tc, t);
      ramp(N.delaySend.gain, .2 + .06 * cur.mel, tc, t);
    }
    function stepAt(t0) {
      const dt = 60 / cur.bpm / 4, k = 1 - Math.exp(-dt / TAU_MOOD);
      if (holdUntil && t0 >= holdUntil) { holdUntil = 0; setMoodNow(pendingMood, false); }
      for (let i = 0; i < NUMS.length; i++) { const n = NUMS[i]; cur[n] += (T[n] - cur[n]) * k; }
      const s16 = step % 16, sw = (step % 4 === 2) ? cur.swing * 2 * dt : 0, t = t0 + sw + (rnd() - .5) * .012;
      if (s16 === 0) barStart(t0, dt);
      const ch = chordNow; if (!ch) return;
      // percusión apagada, graduada por intensidad
      const dr = cur.drums, hv = cur.hat;
      if (KICK_T[s16] !== undefined && dr > KICK_T[s16]) kick(t, .42 * (.55 + .45 * dr) * (s16 === 0 ? 1 : .72));
      if (RIM_T[s16] !== undefined && dr > RIM_T[s16]) rim(t, (s16 === 12 ? .17 : .1) * (.5 + dr * .7));
      if (hv > .08) { const th = s16 % 4 === 2 ? .15 : s16 % 4 === 0 ? .4 : .75; if (hv > th && (hv > .9 || rnd() < .92)) hat(t, .075 * (.55 + hv * .5) * (s16 % 4 === 2 ? 1 : .7) * (.85 + rnd() * .3)); }
      // pulso lento (supervivencia)
      if (cur.pulse > .05 && (s16 === 0 || s16 === 8)) heart(t, .34 * cur.pulse);
      // bajo redondo
      const bd = cur.bass;
      if (BASS_T[s16] !== undefined && bd > BASS_T[s16] && (s16 === 0 || rnd() < .85)) bassNote(t, ch.root / 2, .34 * (.7 + bd * .3), s16 === 0 ? dt * (bd < .3 ? 10 : 5) : dt * 2.2);
      // acordes cortos a contratiempo (comping)
      if (STAB_T[s16] !== undefined && dr > STAB_T[s16] && rnd() < .8) { const iv = ch.iv.slice(1, 4); iv.forEach((s, i) => rhodesNote(t + i * .012, ch.root * 2 * Math.pow(2, s / 12), .1 * cur.rhodes, dt * 2.4)); }
      // melodía pentatónica con swing
      if (s16 % 2 === 0) {
        const pr = cur.mel * (s16 % 8 === 0 ? .78 : .4) * ((bar % 4 === 3) ? .45 : 1);
        if (rnd() < pr) {
          mel = clamp(mel + pick([-2, -1, -1, 0, 1, 1, 2, 3]), 0, 9);
          const sc = rnd() < cur.minor ? PENT_MIN : PENT_MAJ, f = 220 * Math.pow(2, keySemi / 12) * 2 * Math.pow(2, (Math.floor(mel / 5) * 12 + sc[mel % 5]) / 12);
          pluck(t, f, .12 + .06 * rnd(), dt * pick([2, 3, 4, 6]));
        }
      }
    }
    function ambAt(t0) {
      const B = ALLB[biome]; if (!B) return;
      for (const kind in B.ev) if (rnd() < B.ev[kind] * .2) AMBFX[kind](t0 + rnd() * .2);
      for (const kind in work) if (work[kind] > .01 && rnd() < WORK_RATE[kind] * work[kind] * .2) AMBWORK[kind](t0 + rnd() * .2);
    }
    function schedule(until) {
      if (!ctx) return; const p0 = (typeof performance !== 'undefined' ? performance.now() : 0);
      if (!offline && nextT < ctx.currentTime) { nextT = ctx.currentTime + .03; ambT = Math.max(ambT, nextT); }
      if (lastBiome !== biome) { lastBiome = biome; }
      if (duckOn && ctx.currentTime >= duckEnd) { duckOn = false; applyVolumes(false, true); }
      let guard = 0;
      while (nextT < until && guard++ < 400) { stepAt(nextT); nextT += 60 / cur.bpm / 4; step++; }
      guard = 0; while (ambT < until && guard++ < 400) { ambAt(ambT); ambT += .2; }
      stats.schedMs += (typeof performance !== 'undefined' ? performance.now() : 0) - p0; stats.schedCalls++;
    }

    /* ---------- efectos de ambiente (eventos) ---------- */
    function tone(out, t, f, f2, dur, type, v, a) {
      const o = osc(type || 'sine', f), e = ctx.createGain();
      o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(v, t + (a || .005)); e.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(e); e.connect(out); o.start(t); o.stop(t + dur + .05); return o;
    }
    function noise(out, t, dur, type, f, f2, q, v, a) {
      const s = nsrc(t, dur), fl = filt(type, f, q), e = ctx.createGain(); if (f2) { fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur); }
      e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(v, t + (a || .005)); e.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(fl); fl.connect(e); e.connect(out); return s;
    }
    const pn = () => rnd() * 1.4 - .7;
    function ambOut() { let o = N.ambVol; if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pn(); p.connect(N.ambVol); o = p; } return o; }
    const AMBFX = {
      cricket(t) { const o = ambOut(), f = 4100 + rnd() * 500, n = 3 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) tone(o, t + i * .055, f, 0, .03, 'sine', .028, .004); },
      bird(t) { const o = ambOut(), f = 2000 + rnd() * 1400, n = 2 + Math.floor(rnd() * 2); for (let i = 0; i < n; i++) tone(o, t + i * .13, f, f * (1.3 + rnd() * .3), .09, 'sine', .035, .01); },
      insect(t) { const o = ambOut(), f = 3200 + rnd() * 2400, n = 6 + Math.floor(rnd() * 6); for (let i = 0; i < n; i++) tone(o, t + i * .03, f, 0, .02, 'square', .008, .003); },
      drip(t) { const o = ambOut(); tone(o, t, 1500 + rnd() * 1200, 700, .06, 'sine', .035, .003); },
      gust(t) { const o = ambOut(); noise(o, t, 1.7, 'bandpass', 500, 1500, 2.5, .09, .7); },
      buzz(t) { const o = ambOut(); tone(o, t, 3800, 0, .5, 'sawtooth', .006, .15); },
      chime(t) { const o = ambOut(), f = pick([1568, 1760, 2093, 2349, 2637]); tone(o, t, f, 0, 2.2, 'sine', .035, .004); tone(o, t, f * 2.76, 0, .9, 'sine', .01, .003); },
      bubble(t) { const o = ambOut(), f = 280 + rnd() * 350, n = 1 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) tone(o, t + i * .07, f * (1 + i * .25), f * 2.4, .07, 'sine', .05, .004); },
      whale(t) {
        const o = ambOut(), f = 78 + rnd() * 30, d = 4.2, os = osc('sine', f), e = ctx.createGain(), lf = osc('sine', 4.5), lg = g(f * .035, os.frequency), l2 = filt('lowpass', 420, .5);
        os.frequency.setValueAtTime(f, t); os.frequency.linearRampToValueAtTime(f * 1.7, t + d * .45); os.frequency.linearRampToValueAtTime(f * 1.15, t + d);
        e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(.12, t + d * .4); e.gain.linearRampToValueAtTime(.0001, t + d); lf.connect(lg);
        os.connect(l2); l2.connect(e); e.connect(o); os.start(t); lf.start(t); os.stop(t + d + .1); lf.stop(t + d + .1);
        const o2 = osc('sine', f * 2, g(.35, e)); o2.frequency.setValueAtTime(f * 2, t); o2.frequency.linearRampToValueAtTime(f * 3.4, t + d * .45); o2.frequency.linearRampToValueAtTime(f * 2.3, t + d); o2.start(t); o2.stop(t + d + .1);
      }
    };


    /* ---------- ruido de trabajo (ambiente de la tribu, Era 3): suave, siempre por debajo de los efectos ---------- */
    const AMBWORK = {
      chop(t) { const o = ambOut(); tone(o, t, 190 + rnd() * 40, 110, .08, 'triangle', .15, .002); noise(o, t, .04, 'bandpass', 1300, 0, 1.3, .1, .001); },
      mine(t) { const o = ambOut(), f = 1700 + rnd() * 500; tone(o, t, f, f * .93, .1, 'triangle', .15, .001); noise(o, t, .03, 'highpass', 3500, 0, .6, .1, .001); tone(o, t, 150, 90, .08, 'sine', .08, .001); },
      build(t) { const o = ambOut(); tone(o, t, 240 + rnd() * 30, 120, .07, 'triangle', .15, .002); noise(o, t, .035, 'bandpass', 1700, 0, 1.4, .1, .001); if (rnd() < .5) { tone(o, t + .16, 250, 125, .07, 'triangle', .1, .002); } },
      farm(t) { const o = ambOut(); noise(o, t, .3, 'lowpass', 1000, 600, .5, .08, .08); },
      gather(t) { const o = ambOut(); noise(o, t, .16, 'bandpass', 2600, 1700, .8, .09, .03); }
    };
    /* ---------- efectos de juego ---------- */
    const FX = {
      eat:   { p: 1, cd: .12, max: 2, fn(o, t, v) { noise(o, t, .05, 'lowpass', 2200, 0, .6, .5 * v); noise(o, t + .075, .05, 'lowpass', 1800, 0, .6, .4 * v); tone(o, t, 320, 210, .09, 'sine', .22 * v); } },
      select:{ p: 2, cd: .05, max: 2, fn(o, t, v) { tone(o, t, 880, 1175, .09, 'triangle', .3 * v, .004); tone(o, t + .05, 1175, 0, .12, 'triangle', .22 * v, .004); } },
      order: { p: 2, cd: .08, max: 2, fn(o, t, v) { tone(o, t, 523, 0, .13, 'triangle', .3 * v); tone(o, t + .075, 784, 0, .16, 'triangle', .28 * v); } },
      hit:   { p: 1, cd: .08, max: 3, fn(o, t, v) { tone(o, t, 170, 60, .13, 'sine', .65 * v, .002); noise(o, t, .07, 'bandpass', 900, 0, .9, .5 * v, .002); } },
      kill:  { p: 2, cd: .2, max: 2, fn(o, t, v, x) {
        if (x === 1) { tone(o, t, 440, 880, .12, 'triangle', .3 * v); tone(o, t + .08, 660, 1320, .16, 'triangle', .25 * v); noise(o, t, .12, 'bandpass', 1200, 0, 1, .3 * v); }
        else { tone(o, t, 240, 70, .55, 'triangle', .5 * v); noise(o, t, .3, 'lowpass', 700, 200, .6, .4 * v); tone(o, t + .12, 330, 0, .6, 'sine', .18 * v); tone(o, t + .3, 262, 0, .7, 'sine', .18 * v); } } },
      flee:  { p: 1, cd: .6, max: 1, fn(o, t, v) { noise(o, t, .35, 'bandpass', 500, 2200, 1.2, .3 * v, .05); tone(o, t, 600, 950, .12, 'triangle', .2 * v); } },
      lay:   { p: 2, cd: .2, max: 2, fn(o, t, v) { tone(o, t, 300, 720, .2, 'sine', .35 * v, .01); tone(o, t + .14, 1000, 1500, .18, 'sine', .2 * v, .01); } },
      born:  { p: 2, cd: .2, max: 2, fn(o, t, v) { [1047, 1319, 1568, 2093].forEach((f, i) => { tone(o, t + i * .07, f, 0, .55, 'sine', .22 * v, .006); tone(o, t + i * .07, f * 2.76, 0, .2, 'sine', .04 * v, .003); }); } },
      rug:   { p: 3, cd: .3, max: 1, fn(o, t, v) {
        const os = osc('sawtooth', 88), lp = filt('lowpass', 420, 1), e = ctx.createGain(), am = osc('sine', 27), amg = g(.45, e.gain);
        os.frequency.setValueAtTime(88, t); os.frequency.exponentialRampToValueAtTime(48, t + .9); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(.5 * v, t + .08); e.gain.exponentialRampToValueAtTime(.0001, t + .95);
        os.connect(lp); lp.connect(e); e.connect(o); am.connect(amg); os.start(t); am.start(t); os.stop(t + 1); am.stop(t + 1); noise(o, t, .8, 'lowpass', 500, 250, .7, .35 * v, .06); } },
      cam:   { p: 3, cd: .3, max: 1, fn(o, t, v) { noise(o, t, 1.2, 'bandpass', 3000, 400, 3, .3 * v, .15); tone(o, t, 880, 0, .9, 'sine', .14 * v, .05); tone(o, t, 887, 0, .9, 'sine', .14 * v, .05); tone(o, t + .05, 1760, 0, .7, 'sine', .07 * v, .05); } },
      exc:   { p: 3, cd: .3, max: 1, fn(o, t, v) { tone(o, t, 85, 45, .6, 'sine', .5 * v, .01); for (let i = 0; i < 6; i++) noise(o, t + i * .11, .09, 'lowpass', 520 + rnd() * 200, 0, .6, .5 * v, .004); noise(o, t, .7, 'bandpass', 230, 0, 1.5, .18 * v, .1); } },
      ala:   { p: 3, cd: .3, max: 1, fn(o, t, v) { for (let i = 0; i < 3; i++) { tone(o, t + i * .24, 880, 0, .11, 'triangle', .3 * v, .005); tone(o, t + i * .24 + .12, 660, 0, .11, 'triangle', .3 * v, .005); } } },
      mig:   { p: 3, cd: .3, max: 1, fn(o, t, v) { noise(o, t, 1, 'bandpass', 300, 2500, 1.1, .26 * v, .25); for (let i = 0; i < 8; i++) tone(o, t + i * .125 + (i % 2) * .02, 100, 60, .1, 'sine', (i % 2 ? .28 : .42) * v, .004); } },
      evolve:{ p: 4, cd: 1, max: 1, fn(o, t, v) {
        const r = 220 * Math.pow(2, keySemi / 12) * 2;
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => { const f = r * Math.pow(2, s / 12); tone(o, t + i * .09, f, 0, 1.1, 'sine', .22 * v, .006); tone(o, t + i * .09, f * 2.01, 0, .5, 'sine', .06 * v, .004); });
        noise(o, t, .85, 'bandpass', 200, 4000, 1.4, .2 * v, .5); tone(o, t, 55 * Math.pow(2, keySemi / 12), 110 * Math.pow(2, keySemi / 12), 1.4, 'sine', .4 * v, .3); } },
      ui:    { p: 2, cd: .03, max: 2, fn(o, t, v) { tone(o, t, 1200, 850, .045, 'triangle', .16 * v, .002); noise(o, t, .02, 'highpass', 5000, 0, .5, .05 * v, .001); } },
      season:{ p: 2, cd: 2, max: 1, fn(o, t, v, x) {
        const S = [[659, 784, 988], [523, 659, 784, 1047], [440, 392, 330], [880, 1175, 1760]][x | 0] || [523, 659, 784];
        S.forEach((f, i) => { tone(o, t + i * .16, f, 0, x === 3 ? 1.6 : 1.0, x === 2 ? 'triangle' : 'sine', .2 * v, .006); if (x === 3) tone(o, t + i * .16, f * 2.76, 0, .6, 'sine', .05 * v, .003); }); } },
      fire:  { p: 3, cd: 1, max: 1, fn(o, t, v) { noise(o, t, 1.8, 'lowpass', 300, 200, .6, .3 * v, .4); for (let i = 0; i < 38; i++) noise(o, t + rnd() * 2, .02, 'highpass', 2500 + rnd() * 2000, 0, .6, .22 * v, .002); } },
      drought:{ p: 3, cd: 1, max: 1, fn(o, t, v) { noise(o, t, 1.9, 'bandpass', 700, 300, 2, .26 * v, .6); tone(o, t, 110, 70, 1.6, 'sine', .3 * v, .3); } },
      travel:{ p: 3, cd: 1, max: 1, fn(o, t, v) { noise(o, t, 1.2, 'bandpass', 200, 3000, 1.2, .28 * v, .4); [660, 880, 1320].forEach((f, i) => tone(o, t + .3 + i * .15, f, 0, .8, 'sine', .2 * v, .005)); } },
      phase: { p: 3, cd: 1, max: 1, fn(o, t, v) { [392, 523, 659, 784].forEach((f, i) => { tone(o, t + i * .15, f, 0, .9, 'triangle', .26 * v, .01); tone(o, t + i * .15, f * 2, 0, .6, 'sine', .08 * v, .01); }); } },
      rest:  { p: 1, cd: 6, max: 1, fn(o, t, v) { tone(o, t, 330, 260, .6, 'sine', .14 * v, .08); } },
      scarcity:{ p: 2, cd: 4, max: 1, fn(o, t, v) { tone(o, t, 196, 185, .9, 'triangle', .28 * v, .05); tone(o, t, 208, 196, .9, 'triangle', .22 * v, .05); } },
      migration:{ p: 2, cd: 4, max: 1, fn(o, t, v) { tone(o, t, 220, 330, .8, 'triangle', .26 * v, .08); noise(o, t, .8, 'bandpass', 300, 1400, 1, .12 * v, .3); } },
      disobey:{ p: 1, cd: .6, max: 1, fn(o, t, v) { tone(o, t, 300, 150, .35, 'triangle', .3 * v, .005); tone(o, t, 280, 130, .35, 'triangle', .22 * v, .005); } }
    };

    /* ---------- efectos extra (Era 3: tribus). No figuran en `effects` (lista de la Era 2) sino en `effectsAll` ---------- */
    const FXX = {
      gather:{ p: 1, cd: .14, max: 2, fn(o, t, v) { noise(o, t, .18, 'bandpass', 2800, 1600, .8, .3 * v, .03); tone(o, t + .02, 520, 380, .07, 'sine', .08 * v, .005); } },
      carry: { p: 1, cd: .25, max: 1, fn(o, t, v) { tone(o, t, 420, 640, .07, 'triangle', .12 * v, .004); } },
      drop:  { p: 1, cd: .2, max: 2, fn(o, t, v, x) {
        if (x === 1) { tone(o, t, 150, 90, .1, 'sine', .38 * v, .002); noise(o, t, .05, 'bandpass', 900, 0, 1.2, .24 * v, .002); }
        else if (x === 2) { tone(o, t, 1100, 900, .08, 'triangle', .16 * v, .001); tone(o, t, 180, 100, .09, 'sine', .3 * v, .002); }
        else { noise(o, t, .07, 'lowpass', 1200, 0, .6, .26 * v, .004); tone(o, t, 260, 200, .08, 'sine', .2 * v, .003); } } },
      chop:  { p: 1, cd: .16, max: 2, fn(o, t, v) { tone(o, t, 210, 120, .09, 'triangle', .5 * v, .002); noise(o, t, .05, 'bandpass', 1400, 0, 1.4, .45 * v, .001); tone(o, t, 430, 300, .05, 'sine', .12 * v, .001); } },
      mine:  { p: 1, cd: .16, max: 2, fn(o, t, v) { noise(o, t, .03, 'highpass', 3500, 0, .6, .35 * v, .001); tone(o, t, 1850, 1700, .14, 'triangle', .2 * v, .001); tone(o, t, 2760, 0, .09, 'sine', .07 * v, .001); tone(o, t, 140, 80, .08, 'sine', .25 * v, .001); } },
      hammer:{ p: 2, cd: .22, max: 2, fn(o, t, v) { [0, .17].forEach(d => { tone(o, t + d, 260, 130, .07, 'triangle', .45 * v, .002); noise(o, t + d, .04, 'bandpass', 1800, 0, 1.5, .35 * v, .001); }); } },
      farm:  { p: 1, cd: .3, max: 1, fn(o, t, v) { noise(o, t, .4, 'lowpass', 900, 500, .6, .2 * v, .1); tone(o, t + .05, 300, 220, .12, 'sine', .1 * v, .02); } },
      hunt:  { p: 2, cd: .4, max: 1, fn(o, t, v) { noise(o, t, .22, 'bandpass', 900, 3200, 1.4, .3 * v, .04); tone(o, t + .2, 110, 60, .15, 'sine', .42 * v, .003); } },
      pray:  { p: 1, cd: 5, max: 1, fn(o, t, v) { tone(o, t, 330, 0, 1.4, 'sine', .08 * v, .3); tone(o, t, 495, 0, 1.4, 'sine', .055 * v, .3); } },
      death: { p: 2, cd: 1.2, max: 1, fn(o, t, v, x) { tone(o, t, x === 1 ? 392 : 330, x === 1 ? 220 : 150, .9, 'sine', .3 * v, .02); tone(o, t + .02, x === 1 ? 370 : 311, 140, .9, 'triangle', .16 * v, .02); noise(o, t, .5, 'lowpass', 400, 200, .6, .16 * v, .05); } },
      wolf:  { p: 2, cd: 8, max: 1, fn(o, t, v) {
        const d = 2.4, f = 320 + rnd() * 40, os = osc('sine', f), e = ctx.createGain(), lf = osc('sine', 5.5), lg = g(f * .02, os.frequency), l2 = filt('lowpass', 900, .5);
        os.frequency.setValueAtTime(f, t); os.frequency.linearRampToValueAtTime(f * 1.6, t + d * .35); os.frequency.linearRampToValueAtTime(f * .85, t + d);
        e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(.2 * v, t + d * .3); e.gain.linearRampToValueAtTime(.0001, t + d); lf.connect(lg);
        os.connect(l2); l2.connect(e); e.connect(o); os.start(t); lf.start(t); os.stop(t + d + .1); lf.stop(t + d + .1);
        const o2 = osc('triangle', f * 2.01, g(.05 * v, e)); o2.frequency.setValueAtTime(f * 2.01, t); o2.frequency.linearRampToValueAtTime(f * 3.2, t + d * .35); o2.frequency.linearRampToValueAtTime(f * 1.7, t + d); o2.start(t); o2.stop(t + d + .1); } },
      horn:  { p: 3, cd: 4, max: 1, fn(o, t, v) { [[147, 0, .6], [196, .75, .9]].forEach(([f, d, du]) => { const os = osc('sawtooth', f), lp = filt('lowpass', 650, 1.2), e = ctx.createGain(); e.gain.setValueAtTime(.0001, t + d); e.gain.linearRampToValueAtTime(.32 * v, t + d + .08); e.gain.setTargetAtTime(0, t + d + du * .6, du * .25); os.connect(lp); lp.connect(e); e.connect(o); os.start(t + d); os.stop(t + d + du + .4); }); } },
      raid:  { p: 4, cd: 6, max: 1, fn(o, t, v) { FXX.horn.fn(o, t, v); for (let i = 0; i < 6; i++) tone(o, t + .2 + i * .19, 95, 50, .16, 'sine', (i % 2 ? .4 : .55) * v, .003); } },
      alarm: { p: 4, cd: 2.5, max: 1, fn(o, t, v) { for (let i = 0; i < 3; i++) { tone(o, t + i * .2, 1047, 0, .12, 'triangle', .26 * v, .004); tone(o, t + i * .2 + .1, 784, 0, .1, 'triangle', .22 * v, .004); } tone(o, t, 90, 60, .3, 'sine', .35 * v, .005); } },
      alert: { p: 2, cd: 2.5, max: 1, fn(o, t, v) { tone(o, t, 659, 0, .18, 'triangle', .22 * v, .005); tone(o, t + .12, 523, 0, .22, 'triangle', .2 * v, .005); } },
      okay:  { p: 1, cd: 3, max: 1, fn(o, t, v) { tone(o, t, 523, 0, .15, 'sine', .14 * v, .005); tone(o, t + .1, 784, 0, .3, 'sine', .13 * v, .005); } },
      cold:  { p: 2, cd: 6, max: 1, fn(o, t, v) { noise(o, t, 1.4, 'bandpass', 3200, 2400, 3, .13 * v, .4); tone(o, t, 1760, 0, 1.4, 'sine', .05 * v, .4); tone(o, t, 1768, 0, 1.4, 'sine', .05 * v, .4); } },
      built: { p: 3, cd: 1, max: 1, fn(o, t, v) { tone(o, t, 180, 100, .1, 'sine', .4 * v, .002); [392, 494, 587].forEach((f, i) => tone(o, t + .06 + i * .1, f, 0, .6, 'triangle', .22 * v, .006)); } },
      upgrade:{ p: 3, cd: 1, max: 1, fn(o, t, v) { [392, 523, 659, 784].forEach((f, i) => { tone(o, t + i * .09, f, 0, .7, 'triangle', .2 * v, .006); tone(o, t + i * .09, f * 2, 0, .35, 'sine', .06 * v, .004); }); } },
      tech:  { p: 3, cd: 1, max: 1, fn(o, t, v) { [784, 988, 1175, 1568].forEach((f, i) => { tone(o, t + i * .1, f, 0, 1.1, 'sine', .2 * v, .006); tone(o, t + i * .1, f * 2.76, 0, .4, 'sine', .04 * v, .003); }); } },
      discover:{ p: 3, cd: 1, max: 1, fn(o, t, v) { noise(o, t, .55, 'bandpass', 400, 3000, 1.2, .2 * v, .25); [880, 1320].forEach((f, i) => tone(o, t + .3 + i * .12, f, 0, .8, 'sine', .18 * v, .005)); } },
      path:  { p: 3, cd: 1, max: 1, fn(o, t, v) { tone(o, t, 440, 0, .3, 'triangle', .24 * v, .006); tone(o, t + .15, 659, 0, .6, 'triangle', .24 * v, .006); tone(o, t + .15, 1318, 0, .4, 'sine', .06 * v, .004); } },
      trade: { p: 2, cd: .5, max: 1, fn(o, t, v) { [0, .07, .15].forEach((d, i) => { tone(o, t + d, 2400 + i * 330, 0, .15, 'sine', .15 * v, .002); tone(o, t + d, 4100, 0, .06, 'sine', .04 * v, .001); }); tone(o, t, 170, 100, .1, 'sine', .22 * v, .003); } },
      gift:  { p: 2, cd: 1, max: 1, fn(o, t, v) { tone(o, t, 659, 0, .5, 'sine', .2 * v, .01); tone(o, t + .12, 880, 0, .7, 'sine', .2 * v, .01); tone(o, t + .12, 1760, 0, .3, 'sine', .05 * v, .005); } },
      ally:  { p: 3, cd: 2, max: 1, fn(o, t, v) { [392, 494, 587, 784].forEach((f, i) => { tone(o, t + i * .16, f, 0, 1.3, 'sine', .2 * v, .01); tone(o, t + i * .16, f * 1.5, 0, .9, 'triangle', .08 * v, .01); }); } },
      ambush:{ p: 2, cd: 2, max: 1, fn(o, t, v) { tone(o, t, 220, 110, .45, 'triangle', .3 * v, .005); noise(o, t, .3, 'bandpass', 700, 300, 1.3, .22 * v, .01); tone(o, t + .22, 160, 80, .4, 'triangle', .22 * v, .005); } },
      win:   { p: 4, cd: 5, max: 1, fn(o, t, v) { [0, 4, 7, 12, 16, 19, 24, 28].forEach((s, i) => { const f = 262 * Math.pow(2, s / 12); tone(o, t + i * .12, f, 0, 1.6, 'sine', .2 * v, .006); tone(o, t + i * .12, f * 2.01, 0, .7, 'sine', .06 * v, .004); }); noise(o, t, 1, 'bandpass', 300, 5000, 1.2, .18 * v, .6); } },
      lose:  { p: 4, cd: 5, max: 1, fn(o, t, v) { [392, 349, 311, 262].forEach((f, i) => tone(o, t + i * .35, f, f * .97, 1.4, 'triangle', .26 * v, .02)); tone(o, t, 65, 55, 2.2, 'sine', .35 * v, .2); } },
      disease:{ p: 2, cd: 4, max: 1, fn(o, t, v) { tone(o, t, 156, 147, .9, 'sine', .3 * v, .05); tone(o, t, 165, 150, .9, 'triangle', .2 * v, .05); noise(o, t, .8, 'lowpass', 300, 200, .6, .16 * v, .1); } },
      fission:{ p: 2, cd: 4, max: 1, fn(o, t, v) { noise(o, t, .8, 'bandpass', 600, 200, 1.1, .2 * v, .05); tone(o, t, 330, 220, .8, 'triangle', .22 * v, .02); } },
      prio:  { p: 2, cd: .08, max: 1, fn(o, t, v) { tone(o, t, 700, 990, .07, 'triangle', .18 * v, .003); } }
    };
    const FXA = Object.assign({}, FX, FXX);
    const FX_ALIAS = { ability_rug: 'rug', ability_cam: 'cam', ability_exc: 'exc', ability_ala: 'ala', ability_mig: 'mig', fire: 'fire', incendio: 'fire', sequia: 'drought' };

    function sfx(name, o) {
      if (!ctx || (ctx.state !== 'running' && !offline)) return false; o = o || {};
      name = FX_ALIAS[name] || name; const d = FXA[name]; if (!d || vol.mute || bm.sfx) return false;
      const t = o.at !== undefined && isFinite(+o.at) ? +o.at : ctx.currentTime + .005, tn = ctx.currentTime;
      for (let i = ends.length - 1; i >= 0; i--) if (ends[i].e < tn) ends.splice(i, 1);
      const prio = d.p + (o.own ? 1 : 0), act = ends.length;
      if (act >= 18 ? prio < 4 : act >= 10 ? prio < 3 : false) { stats.dropped++; return false; }
      if (lastFx[name] !== undefined && tn - lastFx[name] < d.cd && !o.force) { stats.dropped++; return false; }
      let same = 0; for (const x of ends) if (x.n === name) same++; if (same >= d.max && !o.force) { stats.dropped++; return false; }
      lastFx[name] = tn;
      const pv = +o.pan, vv = o.vol === undefined ? 1 : +o.vol;   // entradas no finitas (NaN/Infinity) se ignoran: nunca llegan a un AudioParam
      let out = N.sfxVol; if (ctx.createStereoPanner && isFinite(pv) && pv) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pv, -1, 1); p.connect(N.sfxVol); out = p; }
      d.fn(out, t, isFinite(vv) ? clamp(vv, 0, 1.4) : 1, o.v);
      ends.push({ n: name, e: t + 1.2 }); stats.played++; return true;
    }

    /* ---------- control ---------- */
    function setMoodNow(name, inst) { if (!ALLM[name]) return; moodName = name; T = ALLM[name]; if (inst) moodApply(true); }
    function setMood(name, o) {
      if (!ALLM[name]) return; o = o || {};
      if (o.hold) { if (name !== 'evolucion') pendingMood = name; holdUntil = Math.max(nextT, now()) + o.hold; setMoodNow(name, !!o.instant); return; }
      pendingMood = name; if (holdUntil) return; setMoodNow(name, !!o.instant);
    }
    function modulate(semi) { keyTarget = (semi === undefined ? keyTarget + pick([5, 7, 2, 4]) : semi) % 12; }
    function stinger(hold) { sfx('evolve', { force: true, own: true }); modulate(); setMood('evolucion', { hold: hold || 10 }); }
    function setBiome(k, inst) { if (!ALLB[k] || k === biome && !inst) return; biome = k; applyBiome(!!inst); }
    function setVolume(k, v) { if (!(k in vol) || k === 'mute') return; vol[k] = clamp(+v || 0, 0, 1); save(); applyVolumes(offline); }
    function setBusMuted(k, m) { if (!(k in bm)) return; bm[k] = !!m; save(); applyVolumes(offline); }
    function setMuted(m) { vol.mute = !!m; save(); applyVolumes(offline); }
    function setWork(k, v) { if (!(k in WORK_RATE)) return; v = +v; work[k] = isFinite(v) ? clamp(v, 0, 1) : 0; }
    function duckFor(sec, depth) { // ducking breve de la música (y algo del ambiente) ante una alerta crítica; vuelve solo
      if (!ctx) return; const s = isFinite(+sec) ? clamp(+sec, .1, 6) : 1.2; duckDepth = clamp(isFinite(+depth) ? +depth : .4, .15, 1);
      duckEnd = Math.max(duckEnd, ctx.currentTime + s); duckOn = true; applyVolumes(false);
    }
    function setDuck(d) { d = !!d; if (d !== duck) { duck = d; applyVolumes(false); } }

    /* ---------- ciclo de vida (móvil) ---------- */
    function tick() { if (ctx && ctx.state === 'running') schedule(ctx.currentTime + .45); }
    function startTimer() { if (!timer && !offline) timer = setInterval(tick, 100); }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function unlock() {
      try {
        if (!ctx) {
          const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
          let c; try { c = new AC({ latencyHint: 'playback' }); } catch (e) { c = new AC(); }
          attach(c); nextT = c.currentTime + .1; ambT = nextT;
          try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}   // desbloqueo clásico de iOS
          c.onstatechange = () => { if (c.state === 'running') { unlocked = true; startTimer(); } };
        }
        if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.then) p.then(() => { unlocked = true; startTimer(); }, () => {}); }
        else { unlocked = true; startTimer(); }
        return true;
      } catch (e) { return false; }
    }
    function wire() {
      if (wired || typeof document === 'undefined') return; wired = true;
      const onG = () => { if (!ctx || ctx.state !== 'running') unlock(); };
      for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) root.addEventListener(ev, onG, { capture: true, passive: true });
      document.addEventListener('visibilitychange', () => {
        hidden = document.hidden; if (!ctx || offline) return;
        if (hidden) { stopTimer(); try { ctx.suspend(); } catch (e) {} }
        else if (unlocked) { try { ctx.resume().then(startTimer, () => {}); } catch (e) {} startTimer(); }
      });
      root.addEventListener('pagehide', () => { stopTimer(); try { ctx && ctx.suspend(); } catch (e) {} });
    }

    /* ---------- controles compartidos (Era 2, 3 y 4): botón de parlante + panel con 4 volúmenes, silencio por capa y total, tecla M ----------
       Posición: esquina fija (corner: 'tr' | 'br' | 'tl' | 'bl'); se afina con las variables CSS --audio-top/-right/-bottom/-left. No toca ni lee la simulación. */
    function mountUI(o) {
      o = o || {}; if (typeof document === 'undefined') return null; const old = document.getElementById('audioUI'); if (old) return old._api || null;
      const corner = /^(tr|br|tl|bl)$/.test(o.corner) ? o.corner : 'tr';
      const css = document.createElement('style');
      css.textContent = '#audioUI{position:fixed;z-index:' + (o.z || 8) + ';display:flex;gap:6px;font:13px/1.35 "IBM Plex Sans",system-ui,sans-serif}' +
        '#audioUI[data-corner=tr],#audioUI[data-corner=tl]{top:calc(var(--audio-top,8px) + env(safe-area-inset-top,0px));flex-direction:column}#audioUI[data-corner=br],#audioUI[data-corner=bl]{bottom:calc(var(--audio-bottom,8px) + env(safe-area-inset-bottom,0px));flex-direction:column-reverse}' +
        '#audioUI[data-corner=tr],#audioUI[data-corner=br]{right:var(--audio-right,8px);align-items:flex-end}#audioUI[data-corner=tl],#audioUI[data-corner=bl]{left:var(--audio-left,8px);align-items:flex-start}' +
        '#audioBtn{width:44px;height:44px;border-radius:12px;border:1px solid var(--line,rgba(0,0,0,.2));background:var(--panel,#fff);color:var(--ink,#123);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:manipulation}' +
        '#audioBtn[aria-pressed="true"]{border-color:var(--warn,#c9406f)}#audioBtn svg{width:24px;height:24px}' +
        '#audioPanel{width:min(78vw,240px);background:linear-gradient(var(--panel,#fff),var(--panel,#fff)),var(--bg,#fff);color:var(--ink,#123);border:1px solid var(--line,rgba(0,0,0,.2));border-radius:12px;padding:10px 12px;box-shadow:0 6px 24px rgba(0,0,0,.25);max-height:calc(100vh - 76px);max-height:calc(100dvh - 76px);overflow:auto}' +
        '#audioPanel[hidden]{display:none}#audioPanel h3{font-size:14px;margin:0 0 6px}#audioPanel label{display:flex;justify-content:space-between;gap:8px;color:var(--ink2,#456);margin-top:6px}' +
        '#audioPanel input[type=range]{width:100%;min-height:44px;margin:0;accent-color:var(--accent,#0d7a74);touch-action:manipulation}#audioPanel button{margin-top:8px;width:100%;min-height:44px;border-radius:10px;border:1px solid var(--line,rgba(0,0,0,.2));background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}' +
        '#audioPanel small{display:block;margin-top:6px;color:var(--ink2,#456)}' +
        '#audioPanel .aud-ctl{display:flex;align-items:center;gap:6px}#audioPanel .aud-ctl input{flex:1;min-width:0}' +
        '#audioPanel button.aud-m{width:44px;min-width:44px;height:44px;min-height:44px;margin:0;padding:0;display:flex;align-items:center;justify-content:center}#audioPanel button.aud-m svg{width:20px;height:20px}' +
        '#audioPanel button.aud-m[aria-pressed="true"]{border-color:var(--warn,#c9406f);color:var(--warn,#c9406f)}' +
        '#audioPanel input:focus-visible,#audioPanel button:focus-visible,#audioBtn:focus-visible{outline:2px solid var(--accent,#0d7a74);outline-offset:2px}' + (o.css || '');
      document.head.appendChild(css);
      const ui = document.createElement('div'); ui.id = 'audioUI'; ui.setAttribute('data-corner', corner);
      const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
      const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
      ui.innerHTML = '<button id="audioBtn" type="button" aria-label="Sonido y volúmenes" aria-expanded="false" aria-controls="audioPanel" aria-keyshortcuts="M" title="Sonido y volúmenes (M silencia)"></button>' +
        '<div id="audioPanel" hidden role="group" aria-label="Sonido"><h3>Sonido</h3>' +
        ['master:Maestro', 'music:Música', 'sfx:Efectos', 'amb:Ambiente'].map(x => { const [k, n] = x.split(':'); return '<label for="aud_' + k + '"><span>Volumen: ' + n + '</span><output id="aud_' + k + '_o" aria-hidden="true"></output></label><div class="aud-ctl"><input id="aud_' + k + '" type="range" min="0" max="100" step="1" data-k="' + k + '" aria-label="Volumen ' + n.toLowerCase() + '">' + (k === 'master' ? '' : '<button class="aud-m" type="button" data-m="' + k + '" aria-pressed="false" aria-label="Silenciar ' + n.toLowerCase() + '" title="Silenciar ' + n.toLowerCase() + '"></button>') + '</div>'; }).join('') +
        '<button id="audioMute" type="button" aria-keyshortcuts="M"></button><small id="audioNote" role="status" aria-live="polite"></small></div>';
      document.body.appendChild(ui);
      if (o.reserve) document.documentElement.style.setProperty('--audio-reserve', o.reserve);
      const btn = ui.querySelector('#audioBtn'), panel = ui.querySelector('#audioPanel'), muteB = ui.querySelector('#audioMute'), note = ui.querySelector('#audioNote');
      function sync() {
        const v = api.volumes, bmu = api.busMuted;
        ui.querySelectorAll('input[type=range]').forEach(i => { i.value = Math.round(v[i.dataset.k] * 100); ui.querySelector('#aud_' + i.dataset.k + '_o').textContent = i.value + '%'; i.setAttribute('aria-valuetext', i.value + ' por ciento' + (bmu[i.dataset.k] ? ', silenciado' : '')); });
        ui.querySelectorAll('button.aud-m').forEach(m => { const on = !!bmu[m.dataset.m]; m.innerHTML = on ? ICON_OFF : ICON_ON; m.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        btn.innerHTML = v.mute ? ICON_OFF : ICON_ON; btn.setAttribute('aria-pressed', v.mute ? 'true' : 'false'); muteB.textContent = v.mute ? 'Activar sonido' : 'Silenciar todo';
        note.textContent = api.state === 'running' ? '' : 'El sonido se activa con tu primer toque o tecla.';
      }
      btn.onclick = () => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { api.unlock(); sync(); } };
      ui.querySelectorAll('input[type=range]').forEach(i => { i.oninput = () => { api.setVolume(i.dataset.k, i.value / 100); if (api.volumes.mute && i.value > 0) api.setMuted(false); sync(); }; });
      muteB.onclick = () => { api.setMuted(!api.volumes.mute); sync(); };
      ui.querySelectorAll('button.aud-m').forEach(m => { m.onclick = () => { api.setBusMuted(m.dataset.m, !api.busMuted[m.dataset.m]); sync(); }; });
      const closePanel = () => { if (!panel.hidden) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } };
      root.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey) return; const k = (e.key || '').toLowerCase(), tg = e.target && e.target.tagName;
        if (k === 'm' && tg !== 'INPUT' && tg !== 'TEXTAREA' && tg !== 'SELECT' && !e.repeat) { api.unlock(); api.setMuted(!api.volumes.mute); sync(); }
        else if (k === 'escape' && !panel.hidden) { closePanel(); btn.focus(); } });
      document.addEventListener('pointerdown', e => { if (!panel.hidden && !ui.contains(e.target)) closePanel(); }, true);
      setInterval(() => { if (!panel.hidden) sync(); }, 1000); sync();
      const r = { el: ui, sync, closePanel, corner }; ui._api = r; return r;
    }

    const api = {
      create, attach, schedule, wire, unlock, setMood, setBiome, setVolume, setMuted, setBusMuted, setDuck, duckFor, setWork, sfx, stinger, modulate, mountUI,
      moods: Object.keys(MOODS), biomes: Object.keys(BIOMES), effects: Object.keys(FX),
      moodsAll: Object.keys(ALLM), biomesAll: Object.keys(ALLB), effectsAll: Object.keys(FXA), workKinds: Object.keys(WORK_RATE),
      pan(x, w) { return clamp((x / (w || 960)) * 2 - 1, -1, 1) * .8; },
      resetVoices() { ends.length = 0; for (const k in lastFx) delete lastFx[k]; },
      get ctx() { return ctx; }, get state() { return ctx ? ctx.state : 'none'; }, get mood() { return moodName; }, get biome() { return biome; },
      get volumes() { return Object.assign({}, vol); }, get muted() { return vol.mute; }, get busMuted() { return Object.assign({}, bm); }, get key() { return keySemi; }, get targetKey() { return keyTarget; }, get stats() { return Object.assign({}, stats, { active: ends.length }); },
      get params() { return Object.assign({}, cur); }, get ducking() { return duckOn || duck; }, get work() { return Object.assign({}, work); }
    };
    return api;
  }

  const def = create();
  root.FondalAudio = def;
})(typeof window !== 'undefined' ? window : globalThis);
