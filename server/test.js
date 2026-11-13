// Prueba de integración del relay con clientes WebSocket reales. Uso: node test.js
import WebSocket from 'ws';
import assert from 'node:assert/strict';
import { createRelay } from './relay.js';

const PORT = 18787, relay = createRelay({ port: PORT, host: '127.0.0.1', turnMs: 30 });
const cli = () => new Promise(res => {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT), log = []; let waiters = [];
  ws.on('message', d => { const m = JSON.parse(d); log.push(m); waiters = waiters.filter(w => !w(m)); });
  ws.wait = (pred, ms = 2000) => new Promise((ok, no) => { const f = log.find(pred); if (f) return ok(f); const t = setTimeout(() => no(new Error('timeout')), ms); waiters.push(m => pred(m) ? (clearTimeout(t), ok(m), true) : false); });
  ws.log = log; ws.on('open', () => res(ws));
});
const ok = n => console.log('  ok  ' + n);

const a = await cli(), b = await cli(), c = await cli();
a.send(JSON.stringify({ t: 'create', name: 'Ana' }));
const room = await a.wait(m => m.t === 'lobby'); assert.equal(room.code.length, 4); assert.equal(room.you, 0); ok('crear sala');
b.send(JSON.stringify({ t: 'join', code: room.code.toLowerCase(), name: 'Beto' })); c.send(JSON.stringify({ t: 'join', code: room.code, name: 'Cami <script>' }));
await c.wait(m => m.t === 'lobby' && m.players.length === 3);
assert.equal((await b.wait(m => m.t === 'lobby' && m.players.length === 3)).you, 1);
assert.equal(c.log.at(-1).players[2].name, 'Cami script'); ok('unirse (código sin importar mayúsculas) y nombre saneado');

const x = await cli(); x.send(JSON.stringify({ t: 'join', code: 'ZZZZ' })); assert.equal((await x.wait(m => m.t === 'error')).msg, 'sala inexistente'); ok('sala inexistente');
b.send(JSON.stringify({ t: 'start', seed: 'X', bots: 2 })); assert.equal((await b.wait(m => m.t === 'error')).msg, 'solo el anfitrión inicia'); ok('solo el anfitrión inicia');
x.send('no es json'); assert.equal((await x.wait(m => m.msg === 'json inválido')).t, 'error'); ok('json inválido');

a.send(JSON.stringify({ t: 'start', seed: 'ocho', diff: 1, bots: 99 }));
const [sa, sb, sc] = await Promise.all([a, b, c].map(w => w.wait(m => m.t === 'start')));
assert.equal(sa.slots.length, 8); assert.equal(sa.slots.filter(s => s.kind === 'bot').length, 5); assert.equal(sa.seed, 'OCHO');
assert.deepEqual(sa, sb); assert.deepEqual(sb, sc); ok('inicio: 3 humanos + 5 bots = 8, misma configuración para todos');

const y = await cli(); y.send(JSON.stringify({ t: 'join', code: room.code })); assert.equal((await y.wait(m => m.t === 'error')).msg, 'la partida ya empezó'); ok('no se entra con la partida empezada');

// orden único de comandos: todos reciben exactamente la misma secuencia de turnos
a.send(JSON.stringify({ t: 'cmd', c: { type: 'divide' } })); b.send(JSON.stringify({ t: 'cmd', c: { type: 'boost' } })); c.send(JSON.stringify({ t: 'cmd', c: { type: 'sow', x: 5, y: 6 } }));
await new Promise(r => setTimeout(r, 300));
const seqs = [a, b, c].map(w => JSON.stringify(w.log.filter(m => m.t === 'turn').slice(0, 5).map(m => [m.n, m.cmds])));
assert.equal(seqs[0], seqs[1]); assert.equal(seqs[1], seqs[2]);
const all = a.log.filter(m => m.t === 'turn').flatMap(m => m.cmds); assert.equal(all.length, 3); assert.deepEqual(all.map(q => q.slot).sort(), [0, 1, 2]);
const ns = a.log.filter(m => m.t === 'turn').map(m => m.n); assert.ok(ns.every((v, i) => v === i)); ok('turnos consecutivos y mismo orden de comandos en los 3 clientes');

// anti-spam
for (let i = 0; i < 40; i++) a.send(JSON.stringify({ t: 'cmd', c: { type: 'spam', i } }));
await new Promise(r => setTimeout(r, 200));
const spam = a.log.filter(m => m.t === 'turn').flatMap(m => m.cmds).filter(q => q.c.type === 'spam').length; assert.ok(spam <= 12 * 8 && spam < 40); ok('anti-spam: ' + spam + ' de 40 comandos aceptados');

// hash: coinciden -> silencio; difieren -> desync
for (const w of [a, b, c]) w.send(JSON.stringify({ t: 'hash', turn: 10, h: 'abc' }));
await new Promise(r => setTimeout(r, 100)); assert.ok(!a.log.some(m => m.t === 'desync')); ok('hashes iguales: sin alarma');
a.send(JSON.stringify({ t: 'hash', turn: 20, h: 'abc' })); b.send(JSON.stringify({ t: 'hash', turn: 20, h: 'abc' })); c.send(JSON.stringify({ t: 'hash', turn: 20, h: 'XYZ' }));
const d = await a.wait(m => m.t === 'desync'); assert.equal(d.turn, 20); ok('hash distinto: se avisa la desincronización');

// desconexión en partida: entra un bot en ese slot
b.close(); const bt = await a.wait(m => m.t === 'turn' && m.cmds.some(q => q.slot === 1 && q.c.type === 'bot')); assert.ok(bt); ok('desconexión: el slot 1 pasa a bot para todos');

// sala de 9: el 9.º no entra
const r2 = await cli(); r2.send(JSON.stringify({ t: 'create', name: 'H' })); const L = await r2.wait(m => m.t === 'lobby');
const extra = []; for (let i = 0; i < 7; i++) { const w = await cli(); w.send(JSON.stringify({ t: 'join', code: L.code })); extra.push(w); }
await extra[6].wait(m => m.t === 'lobby' && m.players.length === 8);
const nine = await cli(); nine.send(JSON.stringify({ t: 'join', code: L.code })); assert.equal((await nine.wait(m => m.t === 'error')).msg, 'sala llena (8)'); ok('sala llena a las 8 personas');

await relay.close(); console.log('RELAY OK'); process.exit(0);
