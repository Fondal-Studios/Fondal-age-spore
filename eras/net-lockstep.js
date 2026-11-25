/* =====================================================================================================
   net-lockstep.js — cliente en línea compartido (Eras 5 y 6) para el relay de server/relay.js
   Lockstep: el relay no simula; reparte la semilla, los lugares y, cada turnMs, las órdenes de todos en un orden único.
   Cada navegador corre la misma simulación determinista y compara un hash cada 50 turnos.

     FondalNet.mountLobby(elemento, { era, max, title, opt: () => ({...}), onStart(cfg, miLugar, net) })
     net.send(orden) · net.queue (turnos recibidos: {n, cmds:[{slot, c}]}) · net.hash(n, h) · net.onDesync(fn) · net.status()
     Reconexión: al empezar, el relay da a cada persona una ficha (se guarda en este navegador); «Volver a mi partida» la usa y
     el relay manda toda la historia de órdenes: la era la re-simula rápido (net.queue largo) y la orden {type:'human'} devuelve el mando.

   Dirección del relay: ?relay=wss://… en la URL, o la que se escribió antes (localStorage fondal_relay), o ws://localhost:8787.
   ===================================================================================================== */
(function (root) {
  'use strict';
  /* Relay público: cuando Fondal Studios lo publique (render.yaml o server/fly.toml), poner acá su dirección wss://… */
  const DEFAULT_RELAY = '';
  const KEY = 'fondal_relay', NAMEK = 'fondal_nombre', REJ = 'fondal_volver';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function relayUrl() {
    try { const q = new URLSearchParams(location.search).get('relay'); if (q) return q; } catch (e) {}
    try { const s = localStorage.getItem(KEY); if (s) return s; } catch (e) {}
    return DEFAULT_RELAY || 'ws://localhost:8787';
  }
  function connect(url, era) {
    const ws = new WebSocket(url), H = { lobby: [], start: [], error: [], desync: [], close: [] };
    const net = { ws, era, queue: [], me: -1, cfg: null, last: 0, turns: 0, code: '', open: false,
      on(t, f) { (H[t] = H[t] || []).push(f); return net; },
      raw(o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); },
      send(c) { net.raw({ t: 'cmd', c }); },
      hash(n, h) { net.raw({ t: 'hash', turn: n, h: String(h) }); },
      onDesync(f) { net.on('desync', f); },
      status() { const lag = Date.now() - net.last; return net.open ? (lag > 1500 ? 'esperando turnos (' + Math.round(lag / 1000) + ' s)' : 'sala ' + net.code) : 'desconectado'; },
      close() { try { net.raw({ t: 'leave' }); ws.close(); } catch (e) {} } };
    const fire = (t, m) => (H[t] || []).forEach(f => { try { f(m); } catch (e) { console.error(e); } });
    ws.onopen = () => { net.open = true; fire('open'); };
    ws.onclose = () => { net.open = false; fire('close'); };
    ws.onerror = () => fire('error', { msg: 'no se pudo conectar con ' + url });
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'turn') { net.queue.push(m); net.last = Date.now(); net.turns++; return; }
      if (m.t === 'lobby') { if (typeof m.you === 'number') net.me = m.you; net.code = m.code; fire('lobby', m); return; }
      if (m.t === 'start') {
        if (m.rejoin) { const by = new Map((m.hist || []).map(h => [h.n, h.cmds])); for (let n = 0; n <= m.upto; n++) net.queue.push({ n, cmds: by.get(n) || [] }); net.catchUp = m.upto; delete m.hist; }
        net.cfg = m; net.last = Date.now(); fire('start', m); return; }
      if (m.t === 'token') { try { localStorage.setItem(REJ, JSON.stringify({ era, url, code: m.code, token: m.token, at: Date.now() })); } catch (e) {} return; }
      fire(m.t, m);
    };
    return net;
  }
  /* Sala: dirección, nombre, crear / unirse con código, lista de personas; el anfitrión elige bots y dificultad */
  function mountLobby(el, o) {
    const max = o.max || 4;
    let name = ''; try { name = localStorage.getItem(NAMEK) || ''; } catch (e) {}
    el.innerHTML = '<h3>' + esc(o.title || 'En línea') + '</h3><p class="sm" style="margin:4px 0">Todos juegan la misma partida a la vez. Hace falta un relay (el servidor chico de <code>server/</code>); quien lo levanta comparte la dirección. Sin relay, jugá contra la IA.</p>' +
      '<div class="netrow"><input data-k="url" aria-label="Dirección del relay" value="' + esc(relayUrl()) + '"><input data-k="name" aria-label="Tu nombre" placeholder="Tu nombre" maxlength="18" value="' + esc(name) + '"></div>' +
      '<div class="netrow"><button data-a="create" class="go">Crear sala</button><input data-k="code" aria-label="Código de sala" placeholder="Código (4 letras)" maxlength="4" style="text-transform:uppercase;max-width:150px"><button data-a="join">Unirme</button></div>' +
      '<div data-k="back"></div><div data-k="room" style="margin-top:6px"></div><div data-k="msg" class="sm" role="status" style="margin-top:4px;color:var(--ink2)"></div>';
    const q = k => el.querySelector('[data-k="' + k + '"]'), msg = t => { q('msg').textContent = t; };
    let net = null, lobby = null, bots = Math.min(1, max - 1), diff = 1;
    const css = document.createElement('style'); css.textContent = '.netrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.netrow input{flex:1;min-width:120px;min-height:44px;padding:8px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--ink);font:inherit}.netrow button{min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:transparent;font-weight:600;color:var(--ink)}.netrow button.go{background:var(--accent);color:var(--accent-ink);border-color:transparent}.netrow button.on{background:var(--ink);color:var(--bg)}.netp{padding:3px 0;font-size:13px}';
    el.appendChild(css);
    function open(then) {
      const url = q('url').value.trim(); if (!/^wss?:\/\//.test(url)) { msg('La dirección tiene que empezar con ws:// o wss://'); return; }
      try { localStorage.setItem(KEY, url); localStorage.setItem(NAMEK, q('name').value.trim()); } catch (e) {}
      if (net && net.open) { then(); return; }
      msg('Conectando…'); net = connect(url, o.era);
      net.on('open', then).on('error', m => msg(m.msg)).on('close', () => { if (!net.cfg) msg('Se cerró la conexión.'); });
      net.on('lobby', m => { lobby = m; draw(); }).on('start', m => { msg(''); o.onStart(m, net.me, net); });
    }
    // volver a una partida de la que te desconectaste (mismo navegador, menos de 3 horas)
    let back = null; try { back = JSON.parse(localStorage.getItem(REJ)); } catch (e) {}
    if (back && back.era === o.era && Date.now() - back.at < 3 * 3600e3) q('back').innerHTML = '<div class="netrow"><button data-a="back" class="go" style="flex:1">Volver a mi partida (sala ' + esc(back.code) + ')</button></div>';
    function draw() {
      if (!lobby) return; const host = lobby.players.find(p => p.host), iAmHost = host && host.slot === net.me, n = lobby.players.length;
      bots = Math.max(n < 2 ? 1 : 0, Math.min(bots, max - n));
      q('room').innerHTML = '<div class="box" style="margin:0"><b>Sala ' + esc(lobby.code) + '</b> · pasale el código a quien quieras sumar (' + n + '/' + max + ')' +
        lobby.players.map(p => '<div class="netp">● ' + esc(p.name) + (p.host ? ' (anfitrión)' : '') + (p.slot === net.me ? ' — vos' : '') + '</div>').join('') +
        (iAmHost ? '<div class="netrow"><span style="align-self:center">Bots:</span>' + Array.from({ length: max - n + 1 }, (_, i) => '<button data-b="' + i + '" class="' + (i === bots ? 'on' : '') + '"' + (n + i < 2 ? ' disabled' : '') + '>' + i + '</button>').join('') + '</div>' +
          '<div class="netrow"><span style="align-self:center">Dificultad:</span>' + ['Fácil', 'Normal', 'Difícil'].map((d, i) => '<button data-d="' + i + '" class="' + (i === diff ? 'on' : '') + '">' + d + '</button>').join('') + '</div>' +
          '<div class="netrow"><button data-a="start" class="go" style="flex:1">Empezar en línea (' + (n + bots) + ' civilizaciones)</button></div>' : '<p class="sm">Esperando a que el anfitrión empiece…</p>') + '</div>';
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.b !== undefined) { bots = +b.dataset.b; draw(); return; }
      if (b.dataset.d !== undefined) { diff = +b.dataset.d; draw(); return; }
      const a = b.dataset.a, nm = q('name').value.trim() || 'Jugador';
      if (a === 'create') open(() => net.raw({ t: 'create', name: nm, era: o.era }));
      else if (a === 'join') { const code = q('code').value.trim().toUpperCase(); if (code.length !== 4) { msg('El código tiene 4 letras.'); return; } open(() => net.raw({ t: 'join', code, name: nm, era: o.era })); }
      else if (a === 'back' && back) { q('url').value = back.url; open(() => net.raw({ t: 'rejoin', code: back.code, token: back.token })); }
      else if (a === 'start') net.raw({ t: 'start', bots, diff, seed: Math.random().toString(36).slice(2, 10).toUpperCase(), opt: o.opt ? o.opt() : {} });
    });
    return { get net() { return net; } };
  }
  root.FondalNet = { relayUrl, connect, mountLobby };
})(typeof window !== 'undefined' ? window : globalThis);
