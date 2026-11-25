// Prueba de integración ONLINE: relay real + 3 navegadores en la misma partida (más bots), con órdenes de cada uno,
// una desconexión (el bot toma su lugar) y comparación de hashes del estado.
// Robustez (Ciclo 3): el ritmo de la prueba lo marca el TIEMPO DE SIMULACIÓN (turnos del relay ejecutados por el cliente), no el reloj de pared:
// en un runner lento un sleep fijo da menos segundos simulados entre órdenes (menos nutrientes/energía para dividir) y los bots rivales matan colonias
// chicas; por eso «órdenes con efecto» se mide con evidencia directa (órdenes de cada slot que el relay entregó + pico de células propias),
// no con el recuento final, que depende del combate. Todas las esperas son por condición con timeout generoso. Uso: (cd server && npm install) && NODE_PATH=$(npm root -g) node tests/online.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
(async () => {
  const { createRelay } = await import(require('url').pathToFileURL(path.resolve(__dirname, '../server/relay.js')).href);
  const PORT = +process.env.ONLINE_PORT || 18788, relay = createRelay({ port: PORT, host: '127.0.0.1', turnMs: 50 }), url = 'ws://127.0.0.1:' + PORT;
  const b = await chromium.launch(); const errs = [];
  const delivered = { A: 0, B: 0 }; const SLOT = {}; // órdenes 'divide' que el relay entregó por slot (evidencia independiente del cliente)
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 480, height: 320 } }); const p = await ctx.newPage();
    if (name === 'A') p.on('websocket', ws => ws.on('framereceived', f => { const d = f.payload; if (typeof d !== 'string' || d.indexOf('"divide"') < 0) return; try { const m = JSON.parse(d); if (m.t === 'turn') for (const o of m.cmds) if (o.c && o.c.type === 'divide' && o.slot === SLOT.A) delivered.A++; else if (o.c && o.c.type === 'divide' && o.slot === SLOT.B) delivered.B++; } catch (e) {} })); p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ': ' + m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '../eras/era1-celula.html')); await p.waitForFunction(() => window.__e1 && document.getElementById('menu')); await p.evaluate(n => { document.getElementById('menu').classList.remove('show'); }, name); return p; };
  const [A, B, C] = [await mk('A'), await mk('B'), await mk('C')];
  const ev = (p, f, a) => p.evaluate(f, a);
  await ev(A, async u => { await __e1.netCreate(u); }, url);
  await A.waitForFunction(() => __e1.NET.lobby && __e1.NET.lobby.code);
  const code = await ev(A, () => __e1.NET.lobby.code);
  await ev(B, async ([u, c]) => { await __e1.netJoin(u, c); }, [url, code]); await ev(C, async ([u, c]) => { await __e1.netJoin(u, c); }, [url, code]);
  await A.waitForFunction(() => __e1.NET.lobby.players.length === 3);
  await ev(A, () => __e1.netStart(3));
  for (const p of [A, B, C]) await p.waitForFunction(() => __e1.NET.on && __e1.S);
  SLOT.A = await ev(A, () => __e1.NET.you); SLOT.B = await ev(B, () => __e1.NET.you);
  const WAIT = { timeout: 90000 };
  // avanza `n` turnos de simulación en el cliente A (espera por condición, no por tiempo)
  const advance = async n => { const t0 = await ev(A, () => __e1.NET.turns); await A.waitForFunction(t => __e1.NET.turns >= t, t0 + n, WAIT); };
  // «seen»: ids de células propias vistas en algún momento (los nacimientos se cuentan aunque un bot mate a la célula antes del final)
  const seen = { A: new Set(), B: new Set() }, peak = { A: 0, B: 0 }, sample = async () => { const [a, bb] = await Promise.all([A, B].map(p => ev(p, () => __e1.S.cells.filter(c => c.team === __e1.NET.you && !c.dead).map(c => c.id)))); a.forEach(i => seen.A.add(i)); bb.forEach(i => seen.B.add(i)); peak.A = Math.max(peak.A, a.length); peak.B = Math.max(peak.B, bb.length); };
  const info = await Promise.all([A, B, C].map(p => ev(p, () => ({ me: __e1.S.teams.findIndex((T, i) => i === (window.__me = __e1.NET.you)), n: __e1.S.teams.length, ai: __e1.S.teams.map(T => !!T.ai) }))));
  console.log('equipos', info[0].n, 'ia:', JSON.stringify(info[0].ai)); assert.strictEqual(info[0].n, 6); assert.deepStrictEqual(info[0].ai, [false, false, false, true, true, true]);
  // cada persona juega: dividir, impulso, especializar, dividir otra vez, según su propio equipo
  const act = (p, n) => ev(p, n => { const E = __e1, T = E.S.teams[E.NET.you]; T.nut = Math.max(T.nut, 150); }, n);
  await sample(); const init = { A: seen.A.size, B: seen.B.size }; console.log('células iniciales A/B:', init.A, init.B);
  for (let k = 0; k < 8; k++) {
    await ev(A, () => __e1.dispatch('divide')); await ev(B, () => __e1.dispatch('divide')); if (k === 2) await ev(C, () => __e1.dispatch('boost')); if (k === 4) await ev(B, () => __e1.dispatch('spec', { ty: 'recol' }));
    await advance(14); await sample();
  }
  // espera por condición (no por sleep): cada colonia arranca con 40 nutrientes y 10 de energía, o sea que SIEMPRE puede pagar al menos 2 divisiones (18 c/u);
  // si en un runner lento todavía no se vieron esos 2 nacimientos, se sigue ordenando dividir (tope generoso de 40 vueltas)
  for (let extra = 0; extra < 40 && (seen.A.size < init.A + 2 || seen.B.size < init.B + 2); extra++) { await ev(A, () => __e1.dispatch('divide')); await ev(B, () => __e1.dispatch('divide')); await advance(14); await sample(); }
  // C se va: su colonia pasa a un bot en todos los clientes
  await C.context().close();
  await A.waitForFunction(() => __e1.S.teams[2].ai, null, WAIT); await B.waitForFunction(() => __e1.S.teams[2].ai, null, WAIT);
  console.log('desconexión: el equipo 2 pasó a bot en A y B');
  for (let k = 0; k < 24; k++) { await ev(A, () => __e1.dispatch("divide")); if (k === 10) await ev(B, () => __e1.dispatch("sow")); await ev(B, () => __e1.dispatch('divide')); await advance(16); await sample(); }
  // los dos clientes deben haber ejecutado al menos hasta el turno del último punto de comparación
  await Promise.all([A, B].map(p => p.waitForFunction(() => __e1.NET.turns >= 350, null, WAIT)));
  const st = await Promise.all([A, B].map(p => ev(p, () => ({ turns: __e1.NET.turns, hashes: __e1.NET.hashes, desync: __e1.NET.desync, cells: __e1.S.cells.length, mine: __e1.S.cells.filter(c => c.team === __e1.NET.you).length }))));
  const common = Object.keys(st[0].hashes).filter(t => st[1].hashes[t]);
  console.log('turnos A/B:', st[0].turns, st[1].turns, '· hashes comparables:', common.length, '· células A/B:', st[0].cells, st[1].cells, '· propias A/B:', st[0].mine, st[1].mine);
  assert.ok(common.length >= 6, 'debe haber al menos 6 puntos de comparación');
  for (const t of common) assert.strictEqual(st[0].hashes[t], st[1].hashes[t], 'el estado difiere en el turno ' + t);
  assert.ok(!st[0].desync && !st[1].desync, 'el relay avisó desincronización');
  console.log('órdenes divide entregadas por el relay A/B:', delivered.A, delivered.B, '· nacimientos vistos A/B:', seen.A.size - init.A, seen.B.size - init.B, '· pico de células propias A/B:', peak.A, peak.B);
  assert.ok(delivered.A >= 30 && delivered.B >= 30, 'el relay debe entregar las órdenes de cada persona (' + delivered.A + '/' + delivered.B + ')');
  assert.ok(seen.A.size >= init.A + 2 && seen.B.size >= init.B + 2, 'las órdenes de cada persona deben tener efecto: nacimientos vistos ' + (seen.A.size - init.A) + '/' + (seen.B.size - init.B) + ' (mínimo 2 cada una: lo que paga el capital inicial; el recuento final depende del combate contra los bots)');
  assert.deepStrictEqual(errs.filter(e => !/Failed to load resource|favicon/.test(e)), [], 'errores de consola');
  console.log('ONLINE OK'); await b.close(); await relay.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
