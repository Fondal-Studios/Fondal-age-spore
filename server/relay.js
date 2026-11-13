// Relay de salas para el modo online de Fondal Age Spore (lockstep).
// No simula el juego: solo reparte la sala, la semilla y los comandos de cada turno en un orden único.
// Cada cliente corre la misma simulación determinista (ver MULTIJUGADOR.md).
import { WebSocketServer } from 'ws';

export const MAX_SLOTS = 8, TURN_MS = 100, MAX_CMD_BYTES = 2048, MAX_CMDS_PER_TURN = 12, IDLE_MS = 30 * 60 * 1000;
const COLORS = ['#12958f', '#c9406f', '#5b57c9', '#8c5a2b', '#3d8a3a', '#c47fd1', '#c7a21a', '#6b7a8f'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRelay({ port = 8787, host = '0.0.0.0', turnMs = TURN_MS } = {}) {
  const wss = new WebSocketServer({ port, host, maxPayload: 8 * 1024 });
  const rooms = new Map();
  const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const code = () => { let c; do { c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); } while (rooms.has(c)); return c; };
  const cleanName = n => String(n ?? '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 18) || 'Jugador';
  const lobbyView = r => ({ t: 'lobby', code: r.code, started: r.started, players: r.players.map((p, i) => ({ slot: i, name: p.name, host: i === r.host })) });
  const broadcast = (r, o) => r.players.forEach(p => p.ws && send(p.ws, o));

  function closeRoom(r) { clearInterval(r.timer); rooms.delete(r.code); }
  function startTimer(r) {
    r.timer = setInterval(() => {
      const cmds = r.pending; r.pending = [];
      broadcast(r, { t: 'turn', n: r.turn++, cmds });
      if (Date.now() - r.last > IDLE_MS) closeRoom(r);
    }, turnMs);
  }
  function leave(ws) {
    const r = ws.room; if (!r) return; ws.room = null;
    const i = r.players.findIndex(p => p.ws === ws); if (i < 0) return;
    if (!r.started) {
      r.players.splice(i, 1);
      if (!r.players.length) return closeRoom(r);
      if (r.host === i) r.host = 0; else if (r.host > i) r.host--;
      broadcast(r, lobbyView(r));
    } else {
      r.players[i].ws = null; // el bot toma el lugar desde el turno indicado (cada cliente aplica lo mismo)
      r.pending.push({ slot: i, c: { type: 'bot' } });
      if (!r.players.some(p => p.ws)) closeRoom(r);
    }
  }

  wss.on('connection', ws => {
    ws.room = null; ws.cmdTurn = { n: -1, k: 0 };
    ws.on('message', raw => {
      let m; try { m = JSON.parse(raw.toString()); } catch { return send(ws, { t: 'error', msg: 'json inválido' }); }
      if (!m || typeof m.t !== 'string') return send(ws, { t: 'error', msg: 'mensaje inválido' });
      const r = ws.room;
      if (r) r.last = Date.now();
      switch (m.t) {
        case 'create': {
          if (r) return send(ws, { t: 'error', msg: 'ya estás en una sala' });
          const room = { code: code(), players: [{ ws, name: cleanName(m.name) }], host: 0, started: false, turn: 0, pending: [], hashes: new Map(), last: Date.now(), timer: null };
          rooms.set(room.code, room); ws.room = room; send(ws, { ...lobbyView(room), you: 0 }); break;
        }
        case 'join': {
          if (r) return send(ws, { t: 'error', msg: 'ya estás en una sala' });
          const room = rooms.get(String(m.code || '').toUpperCase());
          if (!room) return send(ws, { t: 'error', msg: 'sala inexistente' });
          if (room.started) return send(ws, { t: 'error', msg: 'la partida ya empezó' });
          if (room.players.length >= MAX_SLOTS) return send(ws, { t: 'error', msg: 'sala llena (8)' });
          room.players.push({ ws, name: cleanName(m.name) }); ws.room = room;
          room.players.forEach((p, i) => send(p.ws, { ...lobbyView(room), you: i })); break;
        }
        case 'start': {
          if (!r || r.started) return send(ws, { t: 'error', msg: 'no se puede iniciar' });
          if (r.players[r.host].ws !== ws) return send(ws, { t: 'error', msg: 'solo el anfitrión inicia' });
          const humans = r.players.length, bots = Math.max(0, Math.min(MAX_SLOTS - humans, m.bots | 0)), total = humans + bots;
          if (total < 2) return send(ws, { t: 'error', msg: 'hace falta al menos un rival (otra persona o un bot)' });
          const slots = Array.from({ length: total }, (_, i) => i < humans ? { slot: i, kind: 'human', name: r.players[i].name, color: COLORS[i] } : { slot: i, kind: 'bot', name: 'Bot ' + (i - humans + 1), color: COLORS[i] });
          r.started = true; r.cfg = { seed: String(m.seed || code()).toUpperCase().slice(0, 16), diff: [0, 1, 2].includes(m.diff) ? m.diff : 1, turnMs, slots };
          broadcast(r, { t: 'start', ...r.cfg }); startTimer(r); break;
        }
        case 'cmd': {
          if (!r || !r.started) return;
          const i = r.players.findIndex(p => p.ws === ws); if (i < 0) return;
          if (raw.length > MAX_CMD_BYTES || typeof m.c !== 'object' || m.c === null) return send(ws, { t: 'error', msg: 'comando inválido' });
          if (ws.cmdTurn.n !== r.turn) ws.cmdTurn = { n: r.turn, k: 0 };
          if (++ws.cmdTurn.k > MAX_CMDS_PER_TURN) return; // anti-spam: se descarta el exceso
          r.pending.push({ slot: i, c: m.c }); break;
        }
        case 'hash': { // cada cliente informa el hash de su estado cada N turnos; si difieren hay desincronización
          if (!r || !r.started) return;
          const i = r.players.findIndex(p => p.ws === ws), n = m.turn | 0; if (i < 0) return;
          const e = r.hashes.get(n) || new Map(); e.set(i, String(m.h)); r.hashes.set(n, e);
          const alive = r.players.filter(p => p.ws).length;
          if (e.size >= alive) { if (new Set(e.values()).size > 1) broadcast(r, { t: 'desync', turn: n, hashes: Object.fromEntries(e) }); r.hashes.delete(n); }
          if (r.hashes.size > 50) r.hashes.delete(r.hashes.keys().next().value); break;
        }
        case 'leave': leave(ws); break;
        default: send(ws, { t: 'error', msg: 'tipo desconocido' });
      }
    });
    ws.on('close', () => leave(ws));
    ws.on('error', () => {});
  });
  return { wss, rooms, close: () => new Promise(res => { rooms.forEach(closeRoom); wss.clients.forEach(c => c.terminate()); wss.close(res); }) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = +process.env.PORT || 8787; createRelay({ port });
  console.log('Relay de Fondal Age Spore escuchando en ws://0.0.0.0:' + port);
}
