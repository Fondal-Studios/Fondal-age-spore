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

async function open(browser, opt, tutDone) {
  const ctx = await browser.newContext(opt); if (tutDone) await ctx.addInitScript(() => { try { localStorage.setItem('evo_tut2', 'done'); } catch (_) {} });
  const p = await ctx.newPage(); hook(p); await p.goto(URL); await wait(250); await p.click('#startBtn'); await wait(600);
  await p.evaluate(() => { window.__e2.G.paused = true; });
  return { ctx, p };
}
/* Posición en pantalla de un animal propio (visible dentro del mapa y sin otro animal encima). */
const pickMine = (p, n) => p.evaluate(n => {
  const E = window.__e2, U = E.ui, r = document.getElementById('cv').getBoundingClientRect(), out = [];
  for (const a of E.G.A) { if (a.dead || a.sp.team !== 'player') continue; const s = U.scr(a.x, a.y); if (s.x > r.left + 20 && s.x < r.right - 20 && s.y > r.top + 20 && s.y < r.bottom - 70) out.push({ id: a.id, x: s.x, y: s.y }); }
  return out.slice(0, n || 99);
}, n);
const emptySpot = p => p.evaluate(() => {
  const E = window.__e2, U = E.ui, r = document.getElementById('cv').getBoundingClientRect();
  for (let k = 0; k < 400; k++) { const x = r.left + 40 + (k * 97) % (r.width - 80), y = r.top + 40 + (k * 61) % (r.height - 130); const w = { x: (x - r.left - U.scr(0, 0).x + r.left) / 1, y: 0 };
    const sx = x, sy = y; let free = true; for (const a of E.G.A) { const s = U.scr(a.x, a.y); if (Math.hypot(s.x - sx, s.y - sy) < 45) { free = false; break; } } if (free) return { x: sx, y: sy }; }
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
  await p.click('#tStop'); ok(await p.evaluate(id => { const a = window.__e2.G.A.find(q => q.id === id); return a.ord && a.ord.k === 'forage'; }, mine[0].id), '«Detener» devuelve a lo automático (forage)');
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
    const bad = [], small = [], vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('.ov:not(.show)'); };
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
  await p.tap('#tStop'); ok(await p.evaluate(() => window.__e2.ui.mySel().every(a => a.ord && a.ord.k === 'forage')), '«Detener» vuelve a lo automático');
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

async function tutorial(browser) {
  console.log('Tutorial interactivo');
  const { ctx, p } = await open(browser, { viewport: { width: 1280, height: 800 } }, false);
  const st = () => p.evaluate(() => ({ i: window.__e2.ui.tut.i, shown: document.getElementById('tut').classList.contains('show'), t: document.getElementById('tutT').textContent, ls: localStorage.getItem('evo_tut2') }));
  let s = await st(); ok(s.shown && s.i === 0, 'arranca solo, sin bloquear (paso 1: ' + s.t + ')'); ok(await p.evaluate(() => !document.querySelector('.ov.show')), 'no hay diálogo modal por encima');
  await p.evaluate(() => { window.__e2.G.paused = false; });
  const mine = await pickMine(p); await p.mouse.click(mine[0].x, mine[0].y); await wait(1300); s = await st(); ok(s.i === 1, 'paso 1 → 2 al seleccionar un animal');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/ui-d-tutorial.png' });
  const e1 = await emptySpot(p); await p.mouse.click(e1.x, e1.y, { button: 'right' }); await wait(1300); s = await st(); ok(s.i === 2, 'paso 2 → 3 al ordenar mover');
  await p.evaluate(() => { const E = window.__e2, a = E.G.A.find(q => q.sp.team === 'player'); E.Bus.emit('eat', a, null, 'plant'); }); await wait(1300); s = await st(); ok(s.i === 3, 'paso 3 → 4 al ver comer (evento eat)');
  await p.evaluate(() => { window.__e2.G.inst = 60; window.__e2.G.ab = {}; }); await p.keyboard.press('2'); await wait(1300); s = await st(); ok(s.i === 4, 'paso 4 → 5 al usar una habilidad (tecla 2)');
  await p.click('#bNest'); const sp = await emptySpot(p); await p.mouse.click(sp.x, sp.y); await wait(1500); s = await st(); ok(s.i === 5, 'paso 5 → 6 al empezar un nido');
  ok(s.ls === 'done', 'queda recordado en localStorage (evo_tut2=done)');
  await p.click('#tutSkip'); s = await st(); ok(!s.shown, 'se puede cerrar al final');
  await p.reload(); await wait(250); await p.click('#startBtn'); await wait(500); s = await st(); ok(!s.shown, 'tras recargar no vuelve a aparecer'); await ctx.close();
  const b = await open(browser, { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true }, false);
  ok(await b.p.evaluate(() => document.getElementById('tut').classList.contains('show')), 'el tutorial también aparece en el móvil');
  await b.p.tap('#tutSkipStep'); await wait(100); ok(await b.p.evaluate(() => window.__e2.ui.tut.i === 1), '«Saltar paso» funciona con toque');
  if (SHOTS) await b.p.screenshot({ path: SHOTS + '/ui-m-tutorial.png' });
  await b.p.tap('#tutSkip'); ok(await b.p.evaluate(() => localStorage.getItem('evo_tut2') === 'skip' && !document.getElementById('tut').classList.contains('show')), '«Saltar tutorial» lo cierra y lo recuerda (skip)'); await b.ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try { await desktop(browser); await touch(browser); await tutorial(browser); } finally { await browser.close(); }
  console.log('errores de consola:', errs.slice(0, 5)); assert.strictEqual(errs.length, 0, '0 errores de consola');
  console.log('UI ERA 2 OK');
})().catch(e => { console.error(e); process.exit(1); });
