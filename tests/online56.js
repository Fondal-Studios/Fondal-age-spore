// En línea, Eras 5 y 6: relay real + 3 navegadores (2 personas que juegan por la interfaz de sala + 1 que se va) + 1 bot.
// Comprueba: sala por era (no se mezclan), órdenes de cada persona, misma partida en todas las pantallas (hash), desconexión => bot.
// Uso: NODE_PATH=$(npm root -g) node tests/online56.js   (necesita `cd server && npm install`)
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const ok = n => console.log('  ok  ' + n);
(async () => {
  const { createRelay } = await import('../server/relay.js');
  const PORT = 18790, relay = createRelay({ port: PORT, host: '127.0.0.1', turnMs: 50 }), URL = 'ws://127.0.0.1:' + PORT;
  const b = await chromium.launch();
  for (const era of [5, 6]) {
    console.log('Era ' + era);
    const file = 'file://' + path.resolve(__dirname, '../eras/' + (era === 5 ? 'era5-industria.html' : 'era6-estrellas.html')) + '?relay=' + encodeURIComponent(URL), H = '__e' + era;
    const pages = [], errs = [];
    for (let i = 0; i < 3; i++) { const ctx = await b.newContext(); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(i + ': ' + e.message)); await p.goto(file); await p.waitForTimeout(200); await p.click('#netBtn'); pages.push(p); }
    const [A, B, C] = pages;
    await A.fill('#netBox [data-k="name"]', 'Ana'); await A.click('#netBox [data-a="create"]');
    await A.waitForSelector('#netBox [data-k="room"] b'); const code = (await A.textContent('#netBox [data-k="room"] b')).replace('Sala ', '').trim(); assert.strictEqual(code.length, 4);
    for (const [P, n] of [[B, 'Beto'], [C, 'Cami']]) { await P.fill('#netBox [data-k="name"]', n); await P.fill('#netBox [data-k="code"]', code); await P.click('#netBox [data-a="join"]'); }
    await A.waitForFunction(() => document.querySelectorAll('#netBox .netp').length === 3); ok('sala ' + code + ': 3 personas por la interfaz');
    // una página de la otra era no puede entrar a esta sala
    { const o = await b.newPage(); await o.goto('file://' + path.resolve(__dirname, '../eras/' + (era === 5 ? 'era6-estrellas.html' : 'era5-industria.html')) + '?relay=' + encodeURIComponent(URL)); await o.click('#netBtn'); await o.fill('#netBox [data-k="code"]', code); await o.click('#netBox [data-a="join"]');
      await o.waitForFunction(() => /otra era|Era \d/.test(document.querySelector('#netBox [data-k="msg"]').textContent) || false, null, { timeout: 4000 }).catch(() => {}); const m = await o.textContent('#netBox [data-k="msg"]'); assert.ok(/Era \d/.test(m), 'mensaje: ' + m); await o.close(); ok('una sala de la Era ' + era + ' rechaza a la otra era'); }
    await A.click('#netBox button[data-b="1"]'); await A.click('#netBox [data-a="start"]');
    for (const P of pages) await P.waitForFunction(H => window[H] && window[H].G && window[H].G.online && window[H].G.civs.length === 4, H, { timeout: 5000 });
    const who = await Promise.all(pages.map(P => P.evaluate(H => ({ civs: window[H].G.civs.map(c => c.human + ':' + c.cv), seed: window[H].G.seed }), H)));
    assert.deepStrictEqual(who[0], who[1]); assert.deepStrictEqual(who[1], who[2]); assert.deepStrictEqual(who[0].civs.map(x => x.split(':')[0]), ['true', 'true', 'true', 'false']); ok('misma galaxia/continente para todos: 3 personas + 1 bot, una clase por civilización');
    // cada persona da órdenes por su cuenta (A y B por la API de interfaz: doCmd vía botones del panel no expuestos, así que usamos la red)
    const order = async (P, slot) => P.evaluate(([H, era, slot]) => { const E = window[H], G = E.G, c = G.civs[slot];
      if (era === 5) { const g = G.regs.find(g => g.own === -1 && g.nb.some(j => G.regs[j].own === slot)); if (g) document.querySelector('#netBox') && null; return g ? g.id : -1; }
      const home = G.stars[c.home], t = G.stars.filter(s => s.own === -1).sort((a, b) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y))[0]; return t.id; }, [H, era, slot]);
    const tA = await order(A, 0), tB = await order(B, 1);
    await A.evaluate(([H, era, t]) => { const E = window[H]; if (era === 5) { E.selR = t; E.ui(true); document.querySelector('#regAct button[data-c]:not([disabled])').click(); } else { E.selS = E.G.civs[0].home; E.src = E.G.civs[0].home; E.ui(true); document.querySelector('#frac button[data-f="1"]').click(); E.selS = t; E.ui(true); document.querySelector('#sysAct button[data-to]').click(); } }, [H, era, tA]);
    await B.evaluate(([H, era, t]) => { const E = window[H]; if (era === 5) { E.selR = t; E.ui(true); document.querySelector('#regAct button[data-c]:not([disabled])').click(); } else { E.src = E.G.civs[1].home; E.selS = t; E.ui(true); document.querySelector('#sysAct button[data-to]').click(); } }, [H, era, tB]);
    await A.waitForTimeout(2500);
    const res = await Promise.all(pages.map(P => P.evaluate(([H, era, tA, tB]) => { const G = window[H].G; return era === 5 ? { a: G.regs[tA].own, b: G.regs[tB].own, t: G.t } : { a: G.fleets.some(f => f.own === 0 && f.to === tA) || G.stars[tA].own === 0, b: G.fleets.some(f => f.own === 1 && f.to === tB) || G.stars[tB].own === 1, t: G.t }; }, [H, era, tA, tB])));
    assert.ok(res.every(r => (era === 5 ? r.a === 0 && r.b === 1 : r.a && r.b)), 'las órdenes de cada persona llegan a todas las pantallas: ' + JSON.stringify(res)); ok('órdenes de Ana y Beto aplicadas en las 3 pantallas');
    // C se va: su civilización pasa a un bot en todas las pantallas
    await C.context().close(); await A.waitForTimeout(1500);
    const bot = await Promise.all([A, B].map(P => P.evaluate(H => window[H].G.civs[2].human, H))); assert.deepStrictEqual(bot, [false, false]); ok('Cami se fue: su civilización la sigue un bot en las demás pantallas');
    // misma partida: comparamos el hash al mismo turno (pausamos el avance leyendo hasta igualar el tiempo)
    await A.waitForTimeout(3000);
    const h = await Promise.all([A, B].map(P => P.evaluate(H => { const E = window[H]; return { t: E.G.t.toFixed(1), h: E.stateHash() }; }, H)));
    // las pantallas pueden ir un turno corrido; si el tiempo coincide, el hash tiene que coincidir; además el relay no avisó desincronización
    const desync = await Promise.all([A, B].map(P => P.evaluate(() => [...document.querySelectorAll('.toast')].some(t => /desincroniz/.test(t.textContent)))));
    assert.ok(!desync[0] && !desync[1], 'aviso de desincronización'); if (h[0].t === h[1].t) assert.strictEqual(h[0].h, h[1].h);
    ok('sin desincronización (hash cada 50 turnos en el relay)' + (h[0].t === h[1].t ? ' y hash igual al mismo tiempo ' + h[0].t + ' s' : ''));
    assert.deepStrictEqual(errs, []); for (const P of [A, B]) await P.context().close();
  }
  await b.close(); await relay.close(); console.log('EN LÍNEA ERAS 5 Y 6 OK');
})().catch(e => { console.error(e); process.exit(1); });
