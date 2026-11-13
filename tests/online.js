// Prueba de integración ONLINE: relay real + 3 navegadores en la misma partida (más bots), con órdenes de cada uno,
// una desconexión (el bot toma su lugar) y comparación de hashes del estado. Uso: (cd server && npm install) && NODE_PATH=$(npm root -g) node tests/online.js
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
(async () => {
  const { createRelay } = await import(path.resolve(__dirname, '../server/relay.js'));
  const PORT = 18788, relay = createRelay({ port: PORT, host: '127.0.0.1', turnMs: 50 }), url = 'ws://127.0.0.1:' + PORT;
  const b = await chromium.launch(); const errs = [];
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 480, height: 320 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ': ' + m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '../eras/era1-celula.html')); await p.waitForTimeout(300); await p.evaluate(n => { document.getElementById('menu').classList.remove('show'); }, name); return p; };
  const [A, B, C] = [await mk('A'), await mk('B'), await mk('C')];
  const ev = (p, f, a) => p.evaluate(f, a);
  await ev(A, async u => { await __e1.netCreate(u); }, url);
  await A.waitForFunction(() => __e1.NET.lobby && __e1.NET.lobby.code);
  const code = await ev(A, () => __e1.NET.lobby.code);
  await ev(B, async ([u, c]) => { await __e1.netJoin(u, c); }, [url, code]); await ev(C, async ([u, c]) => { await __e1.netJoin(u, c); }, [url, code]);
  await A.waitForFunction(() => __e1.NET.lobby.players.length === 3);
  await ev(A, () => __e1.netStart(3));
  for (const p of [A, B, C]) await p.waitForFunction(() => __e1.NET.on && __e1.S);
  const info = await Promise.all([A, B, C].map(p => ev(p, () => ({ me: __e1.S.teams.findIndex((T, i) => i === (window.__me = __e1.NET.you)), n: __e1.S.teams.length, ai: __e1.S.teams.map(T => !!T.ai) }))));
  console.log('equipos', info[0].n, 'ia:', JSON.stringify(info[0].ai)); assert.strictEqual(info[0].n, 6); assert.deepStrictEqual(info[0].ai, [false, false, false, true, true, true]);
  // cada persona juega: dividir, impulso, especializar, dividir otra vez, según su propio equipo
  const act = (p, n) => ev(p, n => { const E = __e1, T = E.S.teams[E.NET.you]; T.nut = Math.max(T.nut, 150); }, n);
  for (let k = 0; k < 8; k++) {
    await ev(A, () => __e1.dispatch('divide')); await ev(B, () => __e1.dispatch('divide')); if (k === 2) await ev(C, () => __e1.dispatch('boost')); if (k === 4) await ev(B, () => __e1.dispatch('spec', { ty: 'recol' }));
    await A.waitForTimeout(700);
  }
  // C se va: su colonia pasa a un bot en todos los clientes
  await C.context().close();
  await A.waitForFunction(() => __e1.S.teams[2].ai, null, { timeout: 8000 }); await B.waitForFunction(() => __e1.S.teams[2].ai, null, { timeout: 8000 });
  console.log('desconexión: el equipo 2 pasó a bot en A y B');
  for (let k = 0; k < 24; k++) { await ev(A, () => __e1.dispatch("divide")); if (k === 10) await ev(B, () => __e1.dispatch("sow")); await ev(B, () => __e1.dispatch('divide')); await A.waitForTimeout(800); }
  const st = await Promise.all([A, B].map(p => ev(p, () => ({ turns: __e1.NET.turns, hashes: __e1.NET.hashes, desync: __e1.NET.desync, cells: __e1.S.cells.length, mine: __e1.S.cells.filter(c => c.team === __e1.NET.you).length }))));
  const common = Object.keys(st[0].hashes).filter(t => st[1].hashes[t]);
  console.log('turnos A/B:', st[0].turns, st[1].turns, '· hashes comparables:', common.length, '· células A/B:', st[0].cells, st[1].cells, '· propias A/B:', st[0].mine, st[1].mine);
  assert.ok(common.length >= 6, 'debe haber al menos 6 puntos de comparación');
  for (const t of common) assert.strictEqual(st[0].hashes[t], st[1].hashes[t], 'el estado difiere en el turno ' + t);
  assert.ok(!st[0].desync && !st[1].desync, 'el relay avisó desincronización');
  assert.ok(st[0].mine > 4 && st[1].mine > 4, 'las órdenes de cada persona deben tener efecto');
  assert.deepStrictEqual(errs.filter(e => !/Failed to load resource|favicon/.test(e)), [], 'errores de consola');
  console.log('ONLINE OK'); await b.close(); await relay.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
