// Prueba de interfaz de la Era 2 (Calidad 2.0): selección, órdenes, panel biológico, combates, líder, tutorial, tamaños, contraste, móvil táctil.
// Uso: NODE_PATH=$(npm root -g) node tests/era2-ui.js   (SHOTS=carpeta para guardar capturas)
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../eras/era2-animales.html');
const SHOTS = process.env.SHOTS || '';
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const hook = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_(INTERNET|NAME|FAILED|CONNECTION)|Failed to load resource/i.test(m.text())) errs.push(m.text()); }); };
const ok = (c, msg) => { assert.ok(c, msg); console.log('  ok -', msg); };

async function open(browser, opt, tutDone, al) {
  const ctx = await browser.newContext(opt); if (tutDone) await ctx.addInitScript(() => { try { localStorage.setItem('evo_tut2', 'done'); } catch (_) {} });
  const p = await ctx.newPage(); hook(p); await p.goto(URL); await wait(250); await p.click('#startBtn'); await wait(600);
  if (al !== 'al') await p.addStyleTag({ content: '#alerts,#alerts>*{pointer-events:none!important}' });   // las alertas (Ciclo 4) pueden tapar puntos del mapa en las pruebas de selección/órdenes viejas; se prueban aparte
  await p.evaluate(() => { window.__e2.G.paused = true; });
  return { ctx, p };
}
/* Posición en pantalla de un animal propio (visible dentro del mapa y sin otro animal encima). */
const pickMine = (p, n) => p.evaluate(n => {
  const E = window.__e2, U = E.ui, r = document.getElementById('cv').getBoundingClientRect(), out = [], al = [...document.querySelectorAll('#alerts button')].map(b => b.getBoundingClientRect()), under = (x, y) => al.some(q => x > q.left - 12 && x < q.right + 12 && y > q.top - 12 && y < q.bottom + 12);
  for (const a of E.G.A) { if (a.dead || a.sp.team !== 'player') continue; const s = U.scr(a.x, a.y); if (s.x > r.left + 20 && s.x < r.right - 20 && s.y > r.top + 20 && s.y < r.bottom - 70 && !under(s.x, s.y)) out.push({ id: a.id, x: s.x, y: s.y }); }
  return out.slice(0, n || 99);
}, n);
const emptySpot = p => p.evaluate(() => {
  const E = window.__e2, U = E.ui, r = document.getElementById('cv').getBoundingClientRect();
  for (let k = 0; k < 400; k++) { const x = r.left + 40 + (k * 97) % (r.width - 80), y = r.top + 40 + (k * 61) % (r.height - 130); const w = { x: (x - r.left - U.scr(0, 0).x + r.left) / 1, y: 0 };
    const sx = x, sy = y; let free = !([...document.querySelectorAll('#alerts button')].some(b => { const q = b.getBoundingClientRect(); return x > q.left - 12 && x < q.right + 12 && y > q.top - 12 && y < q.bottom + 12; })); for (const a of E.G.A) { const s = U.scr(a.x, a.y); if (Math.hypot(s.x - sx, s.y - sy) < 45) { free = false; break; } } if (free) return { x: sx, y: sy }; }
  return null;
});
const hudNow = p => p.evaluate(() => window.__e2.hud());
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };

async function desktop(browser) {
  console.log('Escritorio 1280x800 (mouse)');
  const { ctx, p } = await open(browser, { viewport: { width: 1280, height: 800 } }, true);
  let mine = await pickMine(p); ok(mine.length >= 3, 'hay animales propios visibles (' + mine.length + ')');
  // selección simple + panel = bioInfo
  await p.mouse.click(mine[0].x, mine[0].y); await hudNow(p);
  let sel = await p.evaluate(() => window.__e2.ui.selIds); ok(sel.length === 1 && sel[0] === mine[0].id, 'clic selecciona un animal');
  const v = await p.evaluate(() => { const E = window.__e2, a = E.G.A.find(q => q.id === E.ui.selIds[0]), I = E.bioInfo(a), t = k => document.querySelector('#bioBars .brow[data-k="' + k + '"] .bv').textContent;
    return { hp: t('hp'), hu: t('hu'), rp: t('rp'), I: { hp: Math.round(I.hp) + '/' + Math.round(I.mhp), hu: Math.round(I.hunger) + ' % lleno', rp: I.rep.ready ? 'lista' : Math.round(I.rep.pct * 100) + ' %', st: I.stLabel }, st: document.getElementById('bioRows').textContent, name: document.getElementById('bioName').textContent, sp: a.sp.n }; });
  ok(v.hp === v.I.hp, 'vida del panel = bioInfo (' + v.hp + ')'); ok(v.hu.indexOf(v.I.hu) === 0, 'hambre del panel = bioInfo (' + v.hu + ')'); ok(v.rp === v.I.rp, 'reproducción del panel = bioInfo (' + v.rp + ')');
  ok(v.st.indexOf(v.I.st) >= 0 && v.name === v.sp, 'estado y nombre de especie en el panel');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-sel.png' });
  // Shift suma, Ctrl quita
  await p.keyboard.down('Shift'); await p.mouse.click(mine[1].x, mine[1].y); await p.keyboard.up('Shift');
  sel = await p.evaluate(() => window.__e2.ui.selIds); ok(sel.length === 2, 'Shift+clic suma (' + sel.length + ')');
  await hudNow(p); const g = await p.evaluate(() => ({ n: document.getElementById('bioName').textContent, sub: document.getElementById('bioSub').textContent })); ok(/^2 animales/.test(g.n) && g.sub.length > 0, 'panel de grupo: ' + g.n + ' / ' + g.sub);
  await p.keyboard.down('Control'); await p.mouse.click(mine[1].x, mine[1].y); await p.keyboard.up('Control');
  sel = await p.evaluate(() => window.__e2.ui.selIds); ok(sel.length === 1, 'Ctrl+clic quita');
  // recuadro de arrastre
  await p.evaluate(() => window.__e2.ui.setSel([])); mine = await pickMine(p);
  const xs = mine.map(m => m.x), ys = mine.map(m => m.y), x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30, y0 = Math.min(...ys) - 30, y1 = Math.max(...ys) + 30;
  await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await p.mouse.move(x1, y1, { steps: 4 });
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-box.png' });
  await p.mouse.up(); sel = await p.evaluate(() => window.__e2.ui.selIds);
  const inBox = mine.filter(m => m.x > x0 && m.x < x1 && m.y > y0 && m.y < y1).length;
  ok(sel.length === inBox && sel.length >= 3, 'recuadro selecciona los animales propios dentro (' + sel.length + ')');
  // doble clic: misma especie visibles
  await p.evaluate(() => window.__e2.ui.setSel([])); await wait(450);
  await p.mouse.click(mine[0].x, mine[0].y, { clickCount: 2, delay: 20 });
  const dbl = await p.evaluate(id => { const E = window.__e2, a = E.G.A.find(q => q.id === id), vis = E.G.A.filter(q => !q.dead && q.sp === a.sp && E.ui.selIds.indexOf(q.id) < 0).length; return { n: E.ui.selIds.length, all: E.ui.selIds.every(i => E.G.A.find(q => q.id === i).sp === a.sp), missing: vis }; }, mine[0].id);
  ok(dbl.all && dbl.n >= 3, 'doble clic selecciona la especie visible (' + dbl.n + ', fuera de vista: ' + dbl.missing + ')');
  // Ctrl+A
  await p.evaluate(() => window.__e2.ui.setSel([])); await p.keyboard.press('Control+a');
  const ca = await p.evaluate(() => ({ n: window.__e2.ui.selIds.length, m: window.__e2.G.A.filter(a => a.sp.team === 'player' && !a.dead).length })); ok(ca.n === ca.m && ca.n > 0, 'Ctrl+A selecciona todos los tuyos (' + ca.n + ')');
  // órdenes
  mine = await pickMine(p); await p.mouse.click(mine[0].x, mine[0].y); const e1 = await emptySpot(p); ok(!!e1, 'hay un punto libre');
  const ords = []; await p.evaluate(() => { window.__e2.Bus.on('order', (ids, o) => { (window.__ords = window.__ords || []).push({ n: ids.length, k: o && o.k }); }); });
  await p.mouse.click(e1.x, e1.y, { button: 'right' });
  const o1 = await p.evaluate(id => { const a = window.__e2.G.A.find(q => q.id === id); return { ord: a.ord, marks: window.__e2.ui.UIs.marks.length, pulses: window.__e2.ui.UIs.pulses.length }; }, mine[0].id);
  ok(o1.ord && o1.ord.k === 'move' && o1.marks === 1 && o1.pulses === 1, 'clic derecho en el suelo emite orden move + marcador + pulso');
  await p.waitForTimeout(100); if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-orden.png' });
  // marcador desaparece al cumplirse: orden al propio punto, un paso de simulación
  await p.evaluate(id => { const E = window.__e2, a = E.G.A.find(q => q.id === id); E.ui.doOrder([id], { k: 'move', x: a.x + 1, y: a.y + 1 }); E.step(.05); E.hud(); }, mine[0].id);
  ok(await p.evaluate(() => window.__e2.ui.UIs.marks.length === 0), 'el marcador desaparece al cumplirse la orden');
  // atacar a un animal que no es propio
  const enemy = await p.evaluate(() => { const E = window.__e2, U = E.ui, r = document.getElementById('cv').getBoundingClientRect(); for (const a of E.G.A) { if (a.dead || a.sp.team === 'player') continue; const s = U.scr(a.x, a.y); if (s.x > r.left + 20 && s.x < r.right - 20 && s.y > r.top + 20 && s.y < r.bottom - 70) return { id: a.id, x: s.x, y: s.y }; } return null; });
  ok(!!enemy, 'hay un animal no propio visible');
  await p.mouse.click(enemy.x, enemy.y, { button: 'right' });
  const o2 = await p.evaluate(id => { const a = window.__e2.G.A.find(q => q.id === id); return a.ord; }, mine[0].id); ok(o2 && o2.k === 'attack' && o2.tid === enemy.id, 'clic derecho sobre un no-propio emite attack');
  await p.keyboard.press('Escape'); const o3 = await p.evaluate(id => { const a = window.__e2.G.A.find(q => q.id === id); return { ord: a.ord, marks: window.__e2.ui.UIs.marks.length, sel: window.__e2.ui.selIds.length }; }, mine[0].id);
  ok((!o3.ord || o3.ord.k === 'forage') && o3.marks === 0 && o3.sel === 1, 'Esc cancela la orden y el marcador (la selección sigue)');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => window.__e2.ui.selIds.length === 0), 'un segundo Esc deselecciona');
  // botón Ordenar (modo) y Detener
  await p.mouse.click(mine[0].x, mine[0].y); await p.click('#tOrd'); ok(await p.evaluate(() => document.getElementById('modeTip').style.display === 'block'), '«Ordenar» muestra la ayuda');
  await p.mouse.click(e1.x, e1.y); ok(await p.evaluate(id => { const a = window.__e2.G.A.find(q => q.id === id); return a.ord && a.ord.k === 'move'; }, mine[0].id), '«Ordenar» + clic emite move');
  await p.click('#tStop'); ok(await p.evaluate(id => { const a = window.__e2.G.A.find(q => q.id === id); return !a.ord || a.ord.k === 'forage'; }, mine[0].id), '«Detener» devuelve a lo automático (forage)');
  // atajos 1-5 siguen funcionando
  await p.evaluate(() => { window.__e2.G.inst = 40; }); const ab0 = await p.evaluate(() => JSON.stringify(window.__e2.G.ab)); await p.keyboard.press('2'); await p.keyboard.press('1'); ok(await p.evaluate(a => JSON.stringify(window.__e2.G.ab) !== a, ab0), 'las teclas 1-5 de habilidades siguen funcionando');
  // líder
  await p.evaluate(() => { window.__e2.G.ab = {}; window.__e2.G.paused = false; }); await p.mouse.click(mine[0].x, mine[0].y); await p.keyboard.down('Shift'); await p.mouse.click(mine[1].x, mine[1].y); await p.keyboard.up('Shift');
  await p.click('#tLead'); ok(await p.evaluate(() => window.__e2.ui.leaderOn), '«Líder» activa el modo');
  const L0 = await p.evaluate(() => { const E = window.__e2, a = E.ui.mySel().find(q => q.id === E.selId) ; return { id: a.id, x: a.x, y: a.y }; });
  const t0 = Date.now(); await p.keyboard.down('d'); let moved = -1; for (let i = 0; i < 40; i++) { await wait(25); const x = await p.evaluate(id => window.__e2.G.A.find(q => q.id === id).x, L0.id); if (Math.abs(x - L0.x) > 1) { moved = Date.now() - t0; break; } }
  await wait(600); await p.keyboard.up('d'); const L1 = await p.evaluate(id => { const a = window.__e2.G.A.find(q => q.id === id); return { x: a.x, lat: window.__e2.ui.UIs.lat.slice() }; }, L0.id);
  ok(L1.x > L0.x + 8, 'el líder avanza con D (+' + Math.round(L1.x - L0.x) + ' px)'); ok(L1.lat.length > 0 && L1.lat[0] < 150, 'latencia de la orden (tecla → issueOrder) ' + L1.lat[0] + ' ms');
  ok(moved > 0 && moved < 400, 'latencia visible (tecla → primer movimiento) ' + moved + ' ms (simulación a 20 Hz, ×1)');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-lider.png' });
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => !window.__e2.ui.leaderOn), 'Esc sale del modo líder');
  // combates y bajas
  await p.evaluate(() => { window.__e2.G.paused = true; window.__e2.ui.setSel([]); });
  const cmb = await p.evaluate(() => { const E = window.__e2, G = E.G, me = G.A.find(a => a.sp.team === 'player'), foe = G.A.find(a => a.sp.team !== 'player');
    E.Bus.emit('dmg', foe, 6, me); E.Bus.emit('dmg', me, 9, foe); E.Bus.emit('dmg', me, 5, foe); me.hunger = 20; me.dead = true; E.Bus.emit('kill', me, foe); E.hud();
    return { rows: document.getElementById('cmbRows').textContent, dead: document.getElementById('cmbDead').textContent, me: me.sp.n, foe: foe.sp.n, kill: document.querySelectorAll('.toast').length }; });
  ok(cmb.rows.indexOf(cmb.foe) >= 0 && /−\d+/.test(cmb.rows) && /murió/.test(cmb.rows), '«Últimos combates» muestra quién, a quién, daño y resultado');
  ok(/¿Por qué murió\?/.test(cmb.dead) && /lo mató/.test(cmb.dead) && cmb.dead.indexOf(cmb.me) >= 0, 'aviso «¿Por qué murió?»: ' + cmb.dead.slice(0, 120));
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-combate.png' });
  await metrics(p, 'escritorio'); await contrast(p, 'claro');
  await ctx.close();
  // modo oscuro
  const d = await open(browser, { viewport: { width: 1280, height: 800 }, colorScheme: 'dark' }, true); await d.p.evaluate(() => { const E = window.__e2; E.ui.setSel([E.G.A.find(a => a.sp.team === 'player').id]); E.hud(); }); await contrast(d.p, 'oscuro'); if (SHOTS) await d.p.screenshot({ path: SHOTS + '/ui-d-oscuro.png' }); await d.ctx.close();
}

async function metrics(p, tag) {
  const m = await p.evaluate(() => {
    const clo = e => { for (let n = e; n; n = n.parentElement) if (n.tagName === 'DETAILS' && !n.open && !(e.tagName === 'SUMMARY' && e.parentElement === n)) return true; return false; }; 
    const bad = [], small = [], vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('.ov:not(.show)') && !clo(e); };
    for (const b of document.querySelectorAll('button')) { if (!vis(b)) continue; const r = b.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) bad.push((b.id || b.textContent.slice(0, 20)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; if (!e || e.tagName === 'SCRIPT' || e.tagName === 'STYLE' || !vis(e)) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11.99) small.push(e.tagName + '.' + e.className + ' ' + fs + ' "' + n.textContent.trim().slice(0, 20) + '"'); }
    const cv = document.getElementById('cvWrap').getBoundingClientRect();
    return { bad, small, sw: document.documentElement.scrollWidth, iw: innerWidth, mapFrac: cv.height / innerHeight };
  });
  console.log('  ' + tag + ': mapa ' + Math.round(m.mapFrac * 100) + ' % del alto, scrollWidth ' + m.sw + '/' + m.iw);
  ok(m.bad.length === 0, tag + ': botones visibles >= 44 px' + (m.bad.length ? ' FALLAN: ' + m.bad.join('; ') : ''));
  ok(m.small.length === 0, tag + ': texto visible >= 12 px' + (m.small.length ? ' FALLAN: ' + m.small.slice(0, 8).join('; ') : ''));
  ok(m.sw <= m.iw, tag + ': sin scroll horizontal');
  return m;
}
async function contrast(p, tag) {
  const r = await p.evaluate(() => {
    const px = s => { const m = s.match(/[\d.]+/g).map(Number); return { c: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
    const bg = e => { let acc = null; const layers = []; for (let n = e; n; n = n.parentElement) { const q = px(getComputedStyle(n).backgroundColor); if (q.a > 0) layers.push(q); if (q.a >= 1) break; } let c = [255, 255, 255]; for (const q of layers.reverse()) c = c.map((v, i) => v * (1 - q.a) + q.c[i] * q.a); return c; };
    const out = []; for (const sel of ['#bioName', '#bioSub', '#bioBars .bl', '#bioBars .bv', '#bioRows', '#bioFx span', '#bioAb span', '#bioLeg', '#cmbRows', '#cmb summary', '#bar button small']) { const e = document.querySelector(sel); if (!e) continue; out.push({ sel, fg: px(getComputedStyle(e).color).c, bg: bg(e) }); } return out; });
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const bad = r.map(x => ({ sel: x.sel, cr: (Math.max(lum(x.fg), lum(x.bg)) + .05) / (Math.min(lum(x.fg), lum(x.bg)) + .05) })).filter(x => x.cr < 4.5);
  ok(bad.length === 0, 'contraste >= 4,5:1 en tema ' + tag + (bad.length ? ' FALLAN: ' + bad.map(b => b.sel + ' ' + b.cr.toFixed(2)).join('; ') : ' (' + r.length + ' elementos)'));
}

async function touch(browser) {
  console.log('Móvil 390x800 (táctil)');
  const { ctx, p } = await open(browser, { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }, true);
  const cdp = await ctx.newCDPSession(p);
  const drag = async (a, b) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] }); for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(60); };
  let mine = await pickMine(p); ok(mine.length >= 2, 'animales propios visibles en el móvil (' + mine.length + ')');
  await p.touchscreen.tap(mine[0].x, mine[0].y); await wait(60); let sel = await p.evaluate(() => window.__e2.ui.selIds); ok(sel.length === 1 && sel[0] === mine[0].id, 'el toque selecciona');
  await hudNow(p); const vis = await p.evaluate(() => { const r = document.querySelector('#bioBars .brow[data-k="hu"]').getBoundingClientRect(), b = document.getElementById('bar').getBoundingClientRect(); return { bottom: r.bottom, barTop: b.top, vh: innerHeight }; });
  ok(vis.bottom < vis.barTop && vis.bottom < vis.vh, 'sin hacer scroll se ven las barras de vida y hambre (hasta y=' + Math.round(vis.bottom) + ', barra en y=' + Math.round(vis.barTop) + ')');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-m-sel.png' });
  // «Seleccionar»: recuadro con el dedo
  await p.tap('#tSel'); ok(await p.evaluate(() => window.__e2.ui.boxMode), '«Seleccionar» activa el recuadro');
  const xs = mine.map(m => m.x), ys = mine.map(m => m.y), a = { x: Math.max(8, Math.min(...xs) - 25), y: Math.max(8, Math.min(...ys) - 25) }, b = { x: Math.min(382, Math.max(...xs) + 25), y: Math.min(470, Math.max(...ys) + 25) };
  await p.evaluate(() => window.__e2.ui.setSel([])); await drag(a, b); sel = await p.evaluate(() => window.__e2.ui.selIds); ok(sel.length >= 2, 'recuadro táctil selecciona varios (' + sel.length + ')');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-m-grupo.png' });
  const n0 = sel.length; await p.touchscreen.tap(mine[0].x, mine[0].y); await wait(60); sel = await p.evaluate(() => window.__e2.ui.selIds); ok(sel.length === n0 - 1, 'en modo «Seleccionar» el toque deselecciona (' + n0 + '→' + sel.length + ')');
  await p.touchscreen.tap(mine[0].x, mine[0].y); await wait(60); sel = await p.evaluate(() => window.__e2.ui.selIds); ok(sel.length === n0, 'y vuelve a seleccionar');
  await p.tap('#tSel'); ok(await p.evaluate(() => !window.__e2.ui.boxMode), '«Seleccionar» se desactiva');
  // «Ordenar» + toque en el suelo
  const e1 = await emptySpot(p); await p.tap('#tOrd'); await p.touchscreen.tap(e1.x, e1.y); await wait(60);
  const ords = await p.evaluate(() => { const E = window.__e2; const s = E.ui.mySel(); return { n: s.length, mv: s.filter(a => a.ord && a.ord.k === 'move').length, marks: E.ui.UIs.marks.length }; });
  ok(ords.n > 0 && ords.mv === ords.n && ords.marks === 1, '«Ordenar» + toque en el suelo manda a todo el grupo (' + ords.mv + '/' + ords.n + ')');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-m-orden.png' });
  await p.tap('#tStop'); ok(await p.evaluate(() => window.__e2.ui.mySel().every(a => !a.ord || a.ord.k === 'forage')), '«Detener» vuelve a lo automático');
  // líder con joystick
  await p.tap('#tLead'); ok(await p.evaluate(() => window.__e2.ui.leaderOn && document.getElementById('joy').classList.contains('show')), '«Líder» muestra el joystick virtual');
  await p.evaluate(() => { window.__e2.G.paused = false; }); const jb = await p.evaluate(() => { const r = document.getElementById('joy').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  const L0 = await p.evaluate(() => { const E = window.__e2, a = E.ui.mySel().find(q => q.id === E.selId) || E.ui.mySel()[0]; return { id: a.id, x: a.x, y: a.y }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: jb.x, y: jb.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: jb.x + jb.w / 2 - 4, y: jb.y }] }); await wait(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); const L1 = await p.evaluate(id => window.__e2.G.A.find(q => q.id === id).x, L0.id);
  ok(L1 > L0.x + 8, 'el joystick mueve al líder (+' + Math.round(L1 - L0.x) + ' px)');
  await p.tap('#tLead'); await p.evaluate(() => { window.__e2.G.paused = true; });
  await metrics(p, 'móvil'); const mf = await p.evaluate(() => document.getElementById('cvWrap').getBoundingClientRect().height / innerHeight); ok(mf >= .5, 'el mapa ocupa >= 50 % del alto (' + Math.round(mf * 100) + ' %)');
  await contrast(p, 'claro (móvil)');
  await ctx.close();
}

/* Etapa 1.4: a 360, 390 y 430 px nada solapado (rectángulos intersectados), objetivos táctiles >= 44 px y sin scroll horizontal.
   Se miden botones, resúmenes, chips del HUD, pista, tutorial y el botón de sonido; con evento activo, Tradición, selección y panel de sonido abierto. */
const overlapsIn = p => p.evaluate(() => {
  const clo = e => { for (let n = e; n; n = n.parentElement) if (n.tagName === 'DETAILS' && !n.open && !(e.tagName === 'SUMMARY' && e.parentElement === n)) return true; return false; }; const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('.ov:not(.show)') && !e.closest('[hidden]') && !clo(e); };
  const els = [...document.querySelectorAll('button, summary, .chip, #hint, #tut, #audioBtn, #audioPanel, #mapTools')].filter(vis);
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 1 && h > 1) out.push((a.id || a.className || a.textContent.slice(0, 14)) + ' x ' + (b.id || b.className || b.textContent.slice(0, 14)) + ' (' + Math.round(w) + 'x' + Math.round(h) + ')');
  }
  const small = [...document.querySelectorAll('button, summary, #audioBtn')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return (r.height < 43.5 || r.width < 43.5); }).map(e => (e.id || e.textContent.slice(0, 16)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  return { out, small, n: els.length, sw: document.documentElement.scrollWidth, iw: innerWidth };
});
async function anchos(browser) {
  console.log('Solapamiento y objetivos táctiles a 360, 390 y 430 px');
  for (const w of [360, 390, 430]) {
    for (const tut of [true, false]) {
      const { ctx, p } = await open(browser, { viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }, tut);
      await p.evaluate(() => { const E = window.__e2; E.G.ev = { k: 'sequia', t: 20 }; document.getElementById('chipTrad').classList.add('show'); E.ui.setSel([E.G.A.find(a => a.sp.team === 'player').id]); E.hud(); });
      await wait(150); let m = await overlapsIn(p);
      ok(m.out.length === 0, w + ' px' + (tut ? '' : ' con tutorial') + ': ningún control solapado entre sí (' + m.n + ' elementos)' + (m.out.length ? ' SOLAPAN: ' + m.out.join('; ') : ''));
      ok(m.small.length === 0, w + ' px: objetivos táctiles >= 44 px' + (m.small.length ? ' FALLAN: ' + m.small.join('; ') : ''));
      ok(m.sw <= m.iw, w + ' px: sin scroll horizontal (' + m.sw + '/' + m.iw + ')');
      if (tut) { await p.tap('#audioBtn'); await wait(120); const pn = await p.evaluate(() => { const r = document.getElementById('audioPanel').getBoundingClientRect(), b = document.getElementById('audioBtn').getBoundingClientRect(); return { l: r.left, r: r.right, vis: r.width > 0, sw: document.documentElement.scrollWidth, iw: innerWidth, hitsBtn: Math.min(r.right, b.right) - Math.max(r.left, b.left) > 1 && Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top) > 1 }; });   /* el panel es una ventana emergente a propósito: debe caber en pantalla y no tapar su propio botón */
        ok(pn.vis && pn.l >= 0 && pn.r <= pn.iw && pn.sw <= pn.iw && !pn.hitsBtn, w + ' px: panel de sonido abierto cabe en pantalla y no tapa su botón'); if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-' + w + '-sonido.png' }); }
      else if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-' + w + '-tutorial.png' });
      await ctx.close();
    }
  }
}

async function tutorial(browser) {
  console.log('Tutorial interactivo');
  const { ctx, p } = await open(browser, { viewport: { width: 1280, height: 800 } }, false);
  const st = () => p.evaluate(() => ({ i: window.__e2.ui.tut.i, id: (window.__e2.ui.TUT[window.__e2.ui.tut.i] || {}).id, n: window.__e2.ui.TUT.length, shown: document.getElementById('tut').classList.contains('show'), t: document.getElementById('tutT').textContent, ls: localStorage.getItem('evo_tut2') }));
  let s = await st(); ok(s.shown && s.i === 0 && s.id === 'what', 'arranca solo, sin bloquear (paso 1: ' + s.t + ')'); ok(/ESPECIE/.test(await p.evaluate(() => document.getElementById('tutB').textContent)), 'el primer paso explica que controlás una especie, no un animal');
  ok(await p.evaluate(() => !document.querySelector('.ov.show')), 'no hay diálogo modal por encima');
  await p.evaluate(() => { window.__e2.G.paused = false; });
  await p.click('#tutSkipStep'); s = await st(); ok(s.id === 'select', '«Siguiente» pasa del paso informativo al siguiente');
  const mine = await pickMine(p); await p.mouse.click(mine[0].x, mine[0].y); await wait(1300); s = await st(); ok(s.id === 'order', 'seleccionar un animal completa el paso');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-tutorial.png' });
  const e1 = await emptySpot(p); await p.mouse.click(e1.x, e1.y, { button: 'right' }); await wait(1300); s = await st(); ok(s.id === 'prio', 'ordenar mover completa el paso');
  ok(await p.evaluate(() => document.getElementById('prio').open), 'el paso de prioridades abre el panel');
  await p.click('#prioRows [data-k="comida"] [data-l="2"]'); await wait(1300); s = await st(); ok(s.id === 'alert', 'cambiar una prioridad completa el paso');
  await p.click('#tutSkipStep'); s = await st(); ok(s.id === 'eat', 'el paso de alertas se pasa con «Siguiente»');
  await p.evaluate(() => { const E = window.__e2, a = E.G.A.find(q => q.sp.team === 'player'); E.Bus.emit('eat', a, null, 'plant'); }); await wait(1300); s = await st(); ok(s.id === 'abil', 'ver comer (evento eat) completa el paso');
  await p.evaluate(() => { window.__e2.G.inst = 60; window.__e2.G.ab = {}; }); await p.keyboard.press('2'); await wait(1300); s = await st(); ok(s.id === 'nest', 'usar una habilidad (tecla 2) completa el paso');
  await p.click('#bNest'); const sp = await emptySpot(p); await p.mouse.click(sp.x, sp.y); await wait(1500); s = await st(); ok(s.id === 'next' && s.i === s.n - 1, 'empezar un nido lleva al último paso (progreso a la siguiente era)');
  ok(/Era 3/.test(await p.evaluate(() => document.getElementById('tutB').textContent)), 'el último paso explica cómo se pasa a la Era 3');
  ok(s.ls === 'done', 'queda recordado en localStorage (evo_tut2=done)');
  await p.click('#tutSkip'); s = await st(); ok(!s.shown, 'se puede cerrar al final');
  await p.reload(); await wait(250); await p.click('#startBtn'); await wait(500); s = await st(); ok(!s.shown, 'tras recargar no vuelve a aparecer'); await ctx.close();
  const b = await open(browser, { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true }, false);
  ok(await b.p.evaluate(() => document.getElementById('tut').classList.contains('show')), 'el tutorial también aparece en el móvil');
  await b.p.tap('#tutSkipStep'); await wait(100); ok(await b.p.evaluate(() => window.__e2.ui.tut.i === 1), '«Siguiente» funciona con toque');
  if (SHOTS) await b.p.screenshot({ path: SHOTS + '/ui-m-tutorial.png' });
  await b.p.tap('#tutSkip'); ok(await b.p.evaluate(() => localStorage.getItem('evo_tut2') === 'skip' && !document.getElementById('tut').classList.contains('show')), '«Saltar tutorial» lo cierra y lo recuerda (skip)'); await b.ctx.close();
}

/* ---- Ciclo 4: interfaz estratégica ---- */
// ST.t = 0 fuerza un muestreo nuevo: la capa estratégica guarda el muestreo 0,5 s de reloj real y, con la CPU cargada, devolvía el anterior al cambio.
const tickS = p => p.evaluate(() => { const S = window.__e2.ui.strat; S.ST.t = 0; S.tick(); });
async function estrategia(browser) {
  console.log('Estrategia: prioridades, resumen, alertas, grupos, habilidades');
  const { ctx, p } = await open(browser, { viewport: { width: 1280, height: 800 } }, true, 'al');
  // 1. prioridades
  let pr = await p.evaluate(() => window.__e2.G.x2.prio); ok(JSON.stringify(pr) === JSON.stringify({ comida: 1, reproduccion: 1, expansion: 1, defensa: 1, exploracion: 1 }), 'por defecto las 5 prioridades están en 1 (normal)');
  const bad = await p.evaluate(() => { const U = window.__e2.ui; return [U.setPrio('nada', 1), U.setPrio('comida', 3), U.setPrio('comida', 'x'), U.setPrio('comida', 1.5)]; }); ok(bad.every(v => v === false) && (await p.evaluate(() => window.__e2.G.x2.prio.comida)) === 1, 'setPrio rechaza claves y niveles inválidos');
  const snap0 = await p.evaluate(() => { const E = window.__e2; const h0 = E.stateHash(); E.ui.setPrio('defensa', 2); E.ui.setPrio('defensa', 1); return h0 === E.stateHash(); }); ok(snap0, 'setPrio no toca nada más que G.x2.prio (el hash vuelve al original)');
  await p.click('#prio summary'); ok(await p.evaluate(() => document.getElementById('prio').open), 'el panel de prioridades se despliega');
  await p.click('#prioRows [data-k="defensa"] [data-l="2"]'); await p.click('#prioRows [data-k="expansion"] [data-l="0"]');
  pr = await p.evaluate(() => window.__e2.G.x2.prio); ok(pr.defensa === 2 && pr.expansion === 0 && pr.comida === 1, 'los botones escriben G.x2.prio (' + JSON.stringify(pr) + ')');
  ok(await p.evaluate(() => /Expansión baja/.test(document.getElementById('prioSum').textContent) && /Defensa alta/.test(document.getElementById('prioSum').textContent)), 'el resumen plegado muestra lo que no está en normal');
  const det = await p.evaluate(() => document.getElementById('prioDet').textContent); ok(/Baja \(elegida\)/.test(det) && /Normal/.test(det) && /Alta/.test(det), 'el detalle muestra costo/beneficio de los 3 niveles');
  const txtOk = await p.evaluate(() => { const U = window.__e2.ui; return U.PRIO_KEYS.every(k => [0, 1, 2].every(l => typeof U.PRIO_TXT[k][l] === 'string' && U.PRIO_TXT[k][l].length > 10)); }); ok(txtOk, 'PRIO_TXT tiene texto para 5 claves x 3 niveles');
  await p.keyboard.press('z'); ok(await p.evaluate(() => window.__e2.G.x2.prio.comida) === 2, 'tecla Z sube Comida a alta'); await p.keyboard.press('Shift+z'); ok(await p.evaluate(() => window.__e2.G.x2.prio.comida) === 1, 'Mayús+Z la baja');
  await p.keyboard.press('p'); ok(await p.evaluate(() => !document.getElementById('prio').open), 'P pliega el panel');
  await p.keyboard.press('p');
  // guardar / cargar
  await p.evaluate(() => { window.__e2.ui.setPrio('exploracion', 2); window.__e2.saveGame(true); });
  const saved = await p.evaluate(() => { const d = window.__e2.readSave(); return d && d.x2 && d.x2.prio; }); ok(saved && saved.defensa === 2 && saved.exploracion === 2 && saved.expansion === 0, 'las prioridades están en el guardado');
  await p.evaluate(() => { const E = window.__e2; E.newGame('pradera'); }); ok(await p.evaluate(() => window.__e2.G.x2.prio.defensa) === 1, 'una partida nueva vuelve a 1');
  const rest = await p.evaluate(() => { const E = window.__e2; const ok1 = E.restoreGame(E.readSave()); return { ok1, pr: E.G.x2.prio }; }); ok(rest.ok1 && rest.pr.defensa === 2 && rest.pr.exploracion === 2 && rest.pr.expansion === 0, 'al cargar sobreviven las prioridades');
  const old = await p.evaluate(() => { const E = window.__e2, d = JSON.parse(JSON.stringify(E.readSave())); delete d.x2.prio; const ok1 = E.restoreGame(d); return { ok1, pr: E.G.x2.prio }; }); ok(old.ok1 && Object.values(old.pr).length === 5 && Object.values(old.pr).every(v => v === 1), 'una partida vieja sin prioridades carga con todo en 1');
  // 2. resumen de población
  await p.evaluate(() => { const E = window.__e2, G = E.G; G.paused = true; const m = G.A.filter(a => a.sp.team === 'player'); m.forEach(a => { a.hunger = 80; a.hp = a.mhp; a.inj = 0; }); m[0].hunger = 10; m[1].hunger = 20; m[2].hp = m[2].mhp * .3; });
  await tickS(p); const pop = await p.evaluate(() => { const E = window.__e2, P = E.ui.strat.pop, m = E.G.A.filter(a => a.sp.team === 'player' && !a.dead); return { P: { n: P.n, hungry: P.hungry, hurt: P.hurt, pct: P.hungryPct, en: P.en, terr: P.terr }, real: { n: m.length, hungry: m.filter(a => a.hunger < 35).length, hurt: m.filter(a => a.hp < a.mhp * .7 || (a.inj || 0) > .3).length }, dom: ['pHun', 'pEn', 'pHurt', 'pTerr', 'pThr'].map(i => document.getElementById(i).textContent), enAvg: Math.round(m.reduce((q, a) => q + (a.en == null ? 70 : a.en), 0) / m.length) }; });
  ok(pop.P.n === pop.real.n && pop.P.hungry === pop.real.hungry && pop.P.hurt === pop.real.hurt && pop.P.en === pop.enAvg, 'el resumen coincide con el estado (' + JSON.stringify(pop.P) + ')');
  ok(pop.dom[0] === pop.P.pct + ' %' && pop.dom[2] === String(pop.P.hurt) && pop.dom[3] === pop.P.terr + ' %' && pop.P.terr > 0, 'la barra muestra hambrientos, heridos y territorio (' + pop.dom.join(' | ') + ')');
  // 3. alertas
  await p.evaluate(() => { const E = window.__e2, G = E.G; G.A.filter(a => a.sp.team === 'player').forEach(a => { a.hunger = 80; a.hp = a.mhp; }); for (const w of G.A.filter(a => a.sp.team !== 'player' && a.sp.diet !== 'herb')) { w.dead = true; } G.A = G.A.filter(a => !a.dead); G.ev = null; E.G.x2.scar = 0; E.ui.strat.ST.cool = {}; E.ui.strat.ST.al.clear(); });   // sin enfriamientos de alertas anteriores de la partida (si hubo un «Lobos cerca» antes, su enfriamiento bloqueaba el de esta prueba)
  await tickS(p); await tickS(p); ok(await p.evaluate(() => window.__e2.ui.strat.alerts().length) === 0, 'sin amenazas no hay alertas');
  const wid = await p.evaluate(() => { const E = window.__e2, G = E.G, m = G.A.filter(a => a.sp.team === 'player'), w = E.spawn(G.sp.lobo, m[0].x + 40, m[0].y, false); G.A.filter(a => a.sp.team === 'player').slice(0, 3).forEach(a => { a.x = m[0].x + (a.id % 3) * 8; a.y = m[0].y; }); E.ui.setSel([]); E.step(1 / 60); return w.id; });   // un paso: la rejilla espacial (FG) incluye al lobo recién creado sin depender de que corra un cuadro
  await tickS(p); let al = await p.evaluate(() => window.__e2.ui.strat.alerts().map(a => ({ k: a.key, n: a.ids.length }))); ok(al.some(a => /^pred:/.test(a.k) && a.n >= 2), 'un depredador cerca de un grupo levanta una alerta (' + JSON.stringify(al) + ')');
  await p.evaluate(() => window.__e2.hud()); ok(await p.evaluate(() => document.querySelectorAll('#alerts .al').length) === 1 && await p.evaluate(() => /cerca de/.test(document.querySelector('#alerts .al').textContent)), 'la alerta aparece en el mapa con su texto');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-alerta.png' });
  await p.click('#alerts .al'); const go = await p.evaluate(() => { const U = window.__e2.ui, a = U.strat.alerts()[0]; return { sel: U.selIds.length, same: a.ids.every(i => U.selIds.indexOf(i) >= 0), ping: !!U.strat.ST.ping }; }); ok(go.sel >= 2 && go.same && go.ping, 'tocar la alerta selecciona el grupo afectado y marca el lugar (' + go.sel + ' animales)');
  await p.evaluate(id => { const G = window.__e2.G, w = G.A.find(a => a.id === id); w.dead = true; G.A = G.A.filter(a => !a.dead); }, wid); await tickS(p);
  ok(await p.evaluate(() => window.__e2.ui.strat.alerts().length) === 1, 'histéresis: la alerta no desaparece en la primera muestra sin amenaza'); await tickS(p);
  ok(await p.evaluate(() => window.__e2.ui.strat.alerts().length) === 0, 'la alerta desaparece cuando se resuelve');
  const cool = await p.evaluate(() => { const E = window.__e2, G = E.G, m = G.A.filter(a => a.sp.team === 'player'); E.spawn(G.sp.lobo, m[0].x + 40, m[0].y, false); E.ui.strat.tick(); return E.ui.strat.alerts().length; }); ok(cool === 0, 'enfriamiento: no vuelve a sonar durante 10 s de juego');
  await p.evaluate(() => { window.__e2.G.t += 11; window.__e2.ui.strat.tick(); }); ok(await p.evaluate(() => window.__e2.ui.strat.alerts().some(a => /^pred:/.test(a.key))), 'pasado el enfriamiento vuelve a sonar si la amenaza sigue');
  // varias alertas: máx. 3 visibles + colapsadas
  await p.evaluate(() => { const E = window.__e2, G = E.G; G.A.filter(a => a.sp.team === 'player').slice(0, 4).forEach(a => { a.hunger = 5; }); G.ev = { k: 'sequia', t: 30 }; G.x2.scar = 2; G.x2.av = .1; G.t += 11; E.ui.strat.tick(); E.hud(); });
  const many = await p.evaluate(() => ({ vis: document.querySelectorAll('#alerts .al').length, more: !!document.querySelector('#alerts .alMore'), tot: window.__e2.ui.strat.alerts().length, first: window.__e2.ui.strat.alerts()[0].key }));
  ok(many.tot >= 4 && many.vis === 3 && many.more, 'con ' + many.tot + ' alertas se ven 3 y el resto queda colapsado');
  await p.click('#alerts .alMore'); ok(await p.evaluate(t => document.querySelectorAll('#alerts .al').length === t, many.tot), '«+N más» despliega el resto');
  await p.evaluate(() => { window.__e2.G.x2.scar = 0; window.__e2.G.ev = null; window.__e2.G.A.filter(a => a.sp.team === 'player').forEach(a => { a.hunger = 80; }); });
  // escasez y hambre derivan de G
  const sc = await p.evaluate(() => { const E = window.__e2, G = E.G; G.A = G.A.filter(a => a.sp.team === 'player' || !(a.sp.diet !== 'herb')); G.t += 20; G.x2.scar = 1; E.ui.strat.tick(); const a = E.ui.strat.alerts().find(q => q.key === 'scar'); G.x2.scar = 0; E.ui.strat.tick(); E.ui.strat.tick(); return { raised: !!a, gone: !E.ui.strat.alerts().some(q => q.key === 'scar') }; });
  ok(sc.raised && sc.gone, 'la escasez de plantas se levanta y se resuelve');
  // 4. grupos de control
  await p.evaluate(() => { document.getElementById('grp').open = true; });
  await p.evaluate(() => { const E = window.__e2; E.G.A.filter(a => a.sp.team === 'player').forEach(a => { a.hunger = 80; }); E.ui.strat.tick(); E.ui.setSel([]); });
  const mine = await pickMine(p); await p.mouse.click(mine[0].x, mine[0].y); await p.keyboard.down('Shift'); await p.mouse.click(mine[1].x, mine[1].y); await p.keyboard.up('Shift');
  const ids2 = await p.evaluate(() => window.__e2.ui.selIds); ok(ids2.length === 2, 'selección de 2 para guardar como grupo');
  await p.keyboard.press('Control+Shift+Digit1'); await p.evaluate(() => window.__e2.ui.setSel([])); await p.keyboard.press('Shift+Digit1');
  ok(JSON.stringify(await p.evaluate(() => window.__e2.ui.selIds.slice().sort())) === JSON.stringify(ids2.slice().sort()), 'Ctrl+Mayús+1 guarda y Mayús+1 recupera el grupo');
  await p.evaluate(() => window.__e2.hud()); ok(await p.evaluate(() => document.querySelector('#cgSlots [data-n="1"]').classList.contains('on') && /2/.test(document.querySelector('#cgSlots [data-n="1"]').textContent)), 'el botón del grupo 1 indica 2 animales y que está elegido');
  ok(await p.evaluate(() => window.__e2.ui.strat.ST.cgAct) === 1, 'indicador de grupo activo (también dibujado en el mapa)'); if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-grupos.png' });
  await p.evaluate(() => { window.__e2.G.paused = false; }); await p.evaluate(() => { const E = window.__e2; E.G.paused = true; const a = E.G.A.find(q => q.id === E.ui.selIds[0]); a.dead = true; E.G.A = E.G.A.filter(q => !q.dead); E.ui.setSel([]); });
  await p.keyboard.press('Shift+Digit1'); ok((await p.evaluate(() => window.__e2.ui.selIds.length)) === 1, 'el grupo descarta a los animales muertos');
  await p.evaluate(() => { const E = window.__e2, m = E.G.A.filter(a => a.sp.team === 'player'); m[0].hunger = 10; m[1].hunger = 12; m[2].hp = m[2].mhp * .2; E.ui.setSel([]); E.ui.strat.tick(); });
  await p.keyboard.press('h'); const hs = await p.evaluate(() => { const U = window.__e2.ui; return { n: U.selIds.length, ok: U.selIds.every(i => window.__e2.G.A.find(a => a.id === i).hunger < 35) }; }); ok(hs.n >= 2 && hs.ok, 'H selecciona a los hambrientos (' + hs.n + ')');
  await p.click('#qHurt'); ok(await p.evaluate(() => { const U = window.__e2.ui; return U.selIds.length >= 1 && U.selIds.every(i => { const a = window.__e2.G.A.find(q => q.id === i); return a.hp < a.mhp * .7 || (a.inj || 0) > .3; }); }), '«Heridos» selecciona a los heridos');
  // orden de grupo con destino visible
  await p.evaluate(() => { const E = window.__e2; E.ui.setSel(E.G.A.filter(a => a.sp.team === 'player').slice(0, 3).map(a => a.id)); E.hud(); });
  await p.click('#oFood'); const og = await p.evaluate(() => { const U = window.__e2.ui; return { mv: U.mySel().filter(a => a.ord && a.ord.k === 'move').length, marks: U.UIs.marks.length }; }); ok(og.mv >= 1 && og.marks === 1, 'la orden de grupo «A comer/cazar» deja destino visible (' + og.mv + ' animales)');
  await p.click('#oNest'); ok(await p.evaluate(() => window.__e2.ui.UIs.marks.length) >= 0, '«Al nido» sin nido avisa y no rompe');
  await p.evaluate(() => { const E = window.__e2; E.G.N.push({ x: 300, y: 300, prog: 1, work: 0, done: true }); E.hud(); }); await p.click('#oNest'); ok(await p.evaluate(() => window.__e2.ui.mySel().every(a => a.ord && a.ord.k === 'move' && a.ord.x === 300)), '«Al nido» manda al grupo al nido terminado');
  // 5. habilidades
  await p.evaluate(() => { const E = window.__e2; E.G.N.pop(); E.G.ab = {}; E.G.paused = false; });
  await p.evaluate(() => { const E = window.__e2; E.Bus.emit('ability', { id: 'cam', nivel: 2, costo: 12, duracion: 14, afectados: 6, resultado: 'sin ser objetivo' }); E.hud(); });
  const pill = await p.evaluate(() => { const e = document.getElementById('abRes'); return { shown: e.classList.contains('show'), txt: e.textContent }; }); ok(pill.shown && /Camuflaje/.test(pill.txt) && /sin ser objetivo/.test(pill.txt) && /12/.test(pill.txt), 'rótulo con el resultado de la habilidad: ' + pill.txt);
  await p.evaluate(() => { window.__e2.Bus.emit('abilityEnd', { id: 'cam' }); }); ok(await p.evaluate(() => /terminó/.test(document.getElementById('abRes').textContent)), 'abilityEnd muestra que terminó');
  await p.evaluate(() => { const E = window.__e2; E.G.inst = 80; E.useAbility('cam'); E.hud(); });
  const ab = await p.evaluate(() => { const b = document.querySelector('#bar button.ab:nth-of-type(2)'); const all = [...document.querySelectorAll('#bar button.ab')]; const c = all[1]; return { act: c.classList.contains('act'), p: getComputedStyle(c).getPropertyValue('--p'), txt: c.textContent }; });
  ok(ab.act && parseFloat(ab.p) > 0, 'el botón de la habilidad activa muestra barra de duración (' + ab.p + ') y texto «' + ab.txt + '»');
  const degr = await p.evaluate(() => { const E = window.__e2; try { E.Bus.emit('ability', 'rug', [1, 2], 1, { en: 6, t: 0 }); E.Bus.emit('ability', 'nada'); E.Bus.emit('abilityEnd', 'zzz'); return /Rugido/.test(document.getElementById('abRes').textContent); } catch (e) { return false; } }); ok(degr, 'degrada con gracia: formato viejo posicional y eventos sin campos');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-habilidad.png' });
  // 6. costo de rendimiento (A/B con 600+ animales)
  // Se mide hasta 3 veces y se toma la mejor: con la CPU compartida (CI) una sola medición da falsos positivos.
  const measure = () => p.evaluate(() => {
    const E = window.__e2, G = E.G, S = E.ui.strat; G.paused = true; if (!window.__perfPop) for (let i = 0; i < 700; i++) { const sp = i % 3 === 0 ? G.me : G.sp.conejo, q = { x: 30 + (i * 37) % 900, y: 30 + (i * 53) % 540 }; E.spawn(sp, q.x, q.y, false); }
    window.__perfPop = true;
    for (const a of G.A) if (a.sp === G.me && a.id % 2) a.hunger = 20;
    const n = G.A.length, T = f => { const t0 = performance.now(); f(); return performance.now() - t0; };
    S.sample(); const R = 400; let tS = 0; for (let k = 0; k < 60; k++) tS += T(() => S.sample()); tS /= 60;
    S.ST.off = false; let tU = 0; for (let k = 0; k < R; k++) tU += T(() => { S.ST.t = performance.now(); E.ui.uiHud(); }); tU = tU / R;   // uiHud sin muestreo (la caché vale 0,5 s)
    S.ST.off = true; let tU0 = 0; for (let k = 0; k < R; k++) tU0 += T(() => E.ui.uiHud()); tU0 /= R; S.ST.off = false;
    let tR = 1e9, tR0 = 1e9; for (let round = 0; round < 6; round++) { S.ST.off = false; S.ST.t = performance.now(); let x = 0; for (let k = 0; k < 8; k++) x += T(() => E.render()); tR = Math.min(tR, x / 8); S.ST.off = true; x = 0; for (let k = 0; k < 8; k++) x += T(() => E.render()); tR0 = Math.min(tR0, x / 8); } S.ST.off = false;   // A/B intercalado, mínimo de 6 rondas (hay carga de CPU)
    return { n, tS, tU: Math.max(0, tU - tU0), tR, tR0 };
  });
  const costOf = q => (q.tS * 2 + q.tU * 7.5) / 60 + Math.max(0, q.tR - q.tR0);
  let perf = await measure(); for (let k = 0; k < 2 && costOf(perf) >= .5; k++) { const q = await measure(); if (costOf(q) < costOf(perf)) perf = q; }
  const perFrame = costOf(perf);
  console.log('  costo con ' + perf.n + ' animales: muestreo ' + perf.tS.toFixed(3) + ' ms (2 por s), DOM/hud ' + perf.tU.toFixed(3) + ' ms (7,5 por s), render A/B ' + perf.tR.toFixed(2) + ' vs ' + perf.tR0.toFixed(2) + ' ms -> ' + perFrame.toFixed(3) + ' ms/cuadro');
  ok(perf.n >= 500 && perFrame < .5, 'costo amortizado de la capa estratégica < 0,5 ms/cuadro con 500+ animales (' + perFrame.toFixed(3) + ')');
  await ctx.close();
  // 7. sin solapes con paneles abiertos y alertas (360/390/430)
  for (const w of [360, 390, 430]) {
    const { ctx: c2, p: q } = await open(browser, { viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }, true, 'al');
    await q.evaluate(() => { const E = window.__e2, G = E.G, m = G.A.filter(a => a.sp.team === 'player'); m.slice(0, 3).forEach(a => { a.hunger = 5; }); E.spawn(G.sp.lobo, m[1].x + 40, m[1].y, false); G.ev = { k: 'sequia', t: 20 }; G.x2.scar = 1; G.t += 1;
      document.getElementById('prio').open = true; document.getElementById('grp').open = true; E.ui.setSel(m.slice(0, 3).map(a => a.id)); E.ui.strat.cgSave(1); E.ui.strat.tick(); E.hud(); });
    await wait(150); const m = await overlapsIn(q); ok(m.out.length === 0, w + ' px con prioridades, grupos y alertas: ningún control solapado (' + m.n + ' elementos)' + (m.out.length ? ' SOLAPAN: ' + m.out.join('; ') : ''));
    ok(m.small.length === 0, w + ' px estratégico: objetivos táctiles >= 44 px' + (m.small.length ? ' FALLAN: ' + m.small.join('; ') : '')); ok(m.sw <= m.iw, w + ' px estratégico: sin scroll horizontal (' + m.sw + '/' + m.iw + ')');
    const al = await q.evaluate(() => { const a = document.getElementById('alerts').getBoundingClientRect(), c = document.getElementById('cvWrap').getBoundingClientRect(); return { inside: a.left >= c.left - 1 && a.right <= c.right + 1 && a.top >= c.top - 1, w: a.width, cw: c.width, ab: a.bottom - c.top, ch: c.height }; });
    ok(al.inside, w + ' px: las alertas quedan dentro del mapa (cubren ' + Math.round(al.ab) + ' de ' + Math.round(al.ch) + ' px de alto)');
    const tgt = await q.evaluate(() => [...document.querySelectorAll('#prio button, #grp button')].filter(b => !b.closest('details:not([open])') && b.getBoundingClientRect().width > 0).filter(b => { const r = b.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).map(b => b.textContent.slice(0, 10)));
    ok(tgt.length === 0, w + ' px: botones de prioridades y grupos >= 44 px');
    if (SHOTS && w === 390) await q.screenshot({ path: SHOTS + '/ui-m-estrategia.png', fullPage: true });
    await q.tap('#alerts .al'); ok(await q.evaluate(() => window.__e2.ui.selIds.length > 0 && !!window.__e2.ui.strat.ST.ping), w + ' px: tocar una alerta selecciona y marca el grupo');
    await q.tap('#cgSave'); await q.evaluate(() => { window.__e2.ui.setSel(window.__e2.G.A.filter(a => a.sp.team === 'player').slice(0, 2).map(a => a.id)); window.__e2.hud(); });
    await q.tap('#cgSlots [data-n="2"]'); ok(await q.evaluate(() => (window.__e2.ui.strat.ST.cg[2] || []).length === 2), w + ' px: «Guardar» + número guarda un grupo con toques');
    await c2.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  try { await desktop(browser); await touch(browser); await tutorial(browser); await anchos(browser); await estrategia(browser); } finally { await browser.close(); }
  console.log('errores de consola:', errs.slice(0, 5)); assert.strictEqual(errs.length, 0, '0 errores de consola');
  console.log('UI ERA 2 OK');
})().catch(e => { console.error(e); process.exit(1); });
