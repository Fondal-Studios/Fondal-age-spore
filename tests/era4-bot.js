// Bot de 5 min de juego (x4) en el bucle real, con interfaz real en escritorio y móvil; sin errores de consola.
// Revisa además: accesibilidad básica (aria del canvas, role=dialog), botones >= 44 px, texto >= 12 px, mapa >= 50% del alto en móvil.
// Luego fuerza la victoria y comprueba la pantalla final, el linaje (from:4) y el botón «Volver a la portada».
// Uso: NODE_PATH=$(npm root -g) node tests/era4-bot.js [captura-escritorio.png] [captura-movil.png]
const { chromium } = require('playwright'); const assert = require('assert'); const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../eras/era4-civilizaciones.html');
const BOT = () => {
  const E = window.__e4, K = ['lan', 'arq', 'jin'];
  window.__act = () => { const G = E.G; if (!G || G.over) return; if (G.dlg) { E.resolveDlg(0); if (G.dlg) E.resolveDlg(1); return; }
    const c = G.civs[0]; if (!c.alive) return; E.recruit(0, 'obrero');
    for (const k of ['granja', 'granja', 'cuartel', 'mina', 'aserr', 'espias', 'muralla', 'templo']) if (E.build(0, k) === null) break;
    for (const k of ['bronce', 'logi', 'coraza', 'engano']) if (E.research(0, k) === null) break;
    const g = E.garr(c), en = { lan: 0, arq: 0, jin: 0 }; for (const a of G.armies) if (a.team) K.forEach(k => en[k] += a.n[k]);
    const top = K.reduce((m, k) => en[k] > en[m] ? k : m, 'lan'), counter = { lan: 'arq', arq: 'jin', jin: 'lan' }[top];
    for (let i = 0; i < 2; i++) if (E.recruit(0, counter)) E.recruit(0, 'lan');
    for (const r of G.civs) if (r.id && r.alive && c.bld.espias > 0 && !(c.intel[r.id] > G.t)) E.spy(0, r.id);
    const field = G.armies.filter(a => a.team === 0 && !a.home), tg = G.civs.filter(x => x.id && x.alive)[0];
    const weakest = Math.min(...G.civs.filter(x => x.id && x.alive).map(x => E.units(x)));
    if (!field.length && g && E.tot(g.n) >= 22 && E.tot(g.n) * .75 >= 1.35 * weakest) { const a = E.formArmy(0, .75); if (a && tg) E.orderMove(a, tg.x, tg.y); }
    for (const a of field) { if (a.bt) continue; if (a.morale < 28 || (a.prov <= 0 && E.tot(a.n) > 0)) E.retreat(a); else if (!a.path.length && a.stance === 'idle' && tg) E.orderMove(a, tg.x, tg.y); } };
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, mob, shot] of [[1280, 800, false, process.argv[2]], [390, 800, true, process.argv[3]]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mob, isMobile: mob }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_/i.test(m.text())) errs.push(m.text()); });
    await p.goto(url); await p.evaluate(BOT);
    // menú: role=dialog y enlace a la portada
    const m0 = await p.evaluate(() => ({ dlgs: [...document.querySelectorAll('.card')].map(c => c.getAttribute('role') + ':' + c.getAttribute('aria-modal')), home: document.getElementById('menuHome').getAttribute('href'), honest: /Era 5: La Industria/.test(document.getElementById('menu').textContent) }));
    assert.ok(m0.dlgs.length >= 3 && m0.dlgs.every(x => x === 'dialog:true'), 'modales con role=dialog: ' + m0.dlgs); assert.strictEqual(m0.home, '../index.html'); assert.ok(m0.honest);
    await p.click('#startBtn'); await p.waitForTimeout(300);
    // interfaz real: reclutar, elegir la guarnición, formar un ejército y ordenarle moverse tocando el mapa
    const before = await p.evaluate(() => { const G = window.__e4.G; return G.civs[0].food; });
    await p.click('#bRec'); await p.click('#tray button[data-k="lan"]');
    const pos = await p.evaluate(() => { const E = window.__e4, c = E.G.civs[0], k = E.cam, r = document.getElementById('cv').getBoundingClientRect(); return { cx: r.left + c.x * k.s + k.ox, cy: r.top + c.y * k.s + k.oy, tx: r.left + (c.x + 90) * k.s + k.ox, ty: r.top + (c.y - 10) * k.s + k.oy, lan: E.garr(c).n.lan, food: c.food }; });
    assert.ok(pos.lan === 7 && pos.food < before, 'reclutar por la interfaz: ' + JSON.stringify(pos));
    await p.mouse.click(pos.cx + 20, pos.cy + 14); await p.waitForTimeout(150);
    await p.click('#tray button[data-a="form"][data-k="0.5"]'); await p.waitForTimeout(100);
    await p.mouse.click(pos.tx, pos.ty); await p.waitForTimeout(150);
    const ui = await p.evaluate(() => { const G = window.__e4.G; const f = G.armies.filter(a => a.team === 0 && !a.home); return { field: f.length, path: f[0] ? f[0].path.length : 0, sel: document.getElementById('selInfo').textContent }; });
    console.log('ui', ui); assert.ok(ui.field === 1 && ui.path > 0, 'formar y mover por la interfaz');
    // accesibilidad / tamaños
    const a11y = await p.evaluate(() => { const cvEl = document.getElementById('cv'); const small = [], tiny = [];
      document.querySelectorAll('button,a.btn').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.height && el.offsetParent !== null && (r.height < 43.5 || r.width < 43.5)) small.push(el.textContent.trim().slice(0, 20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
      document.querySelectorAll('body *').forEach(el => { if (!el.offsetParent && el.tagName !== 'BODY') return; const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (own && parseFloat(getComputedStyle(el).fontSize) < 11.99) tiny.push(el.tagName + '.' + el.className + ' ' + getComputedStyle(el).fontSize); });
      return { aria: cvEl.getAttribute('aria-label'), role: cvEl.getAttribute('role'), ch: cvEl.getBoundingClientRect().height, vh: innerHeight, small, tiny, sx: document.documentElement.scrollWidth > innerWidth + 1 }; });
    console.log(mob ? 'movil' : 'escritorio', a11y); assert.ok(a11y.aria && a11y.aria.length > 30 && a11y.role === 'img'); assert.ok(a11y.ch >= a11y.vh * .5 - 1, 'mapa >= 50% del alto'); assert.deepStrictEqual(a11y.small, [], 'botones >= 44 px'); assert.deepStrictEqual(a11y.tiny, [], 'texto >= 12 px'); assert.ok(!a11y.sx, 'sin scroll horizontal');
    await p.click('#bSpd'); await p.click('#bSpd'); await p.evaluate(() => { window.__iv = setInterval(window.__act, 400); });
    await p.waitForFunction(() => window.__e4.G.t >= 300 || window.__e4.G.over, null, { timeout: 240000, polling: 1000 });
    const st = await p.evaluate(() => { const E = window.__e4, G = E.G; return { t: Math.round(G.t), over: G.over, win: G.win, battles: G.rep.length, wins: G.stats.wins, units: E.units(G.civs[0]), alive: G.civs.map(c => c.alive), nan: /NaN|null,"/.test(E.snapshot()) && /NaN/.test(E.snapshot()) }; });
    console.log(mob ? 'movil' : 'escritorio', st); assert.ok(!st.nan, 'sin NaN en el estado'); assert.ok(st.t >= 300 || st.over);
    if (shot) await p.screenshot({ path: shot });
    // pantalla final (victoria forzada), linaje y portada
    const fin = await p.evaluate(() => { clearInterval(window.__iv); const E = window.__e4; E.G.over = false; E.G.civs.forEach(c => { if (!c.human) c.alive = false; }); E.G.paused = false; E.step(.05); return { dlg: document.getElementById('dlg').classList.contains('show'), btns: [...document.querySelectorAll('#dBtns button')].map(x => x.textContent + ':' + Math.round(x.getBoundingClientRect().height)), lin: localStorage.getItem('evo_lineage'), save: localStorage.getItem('evo_save4_v1'), txt: document.getElementById('dB').textContent }; });
    console.log(fin.btns, fin.lin); assert.ok(fin.dlg && fin.btns.some(x => /Volver a la portada/.test(x)) && /Sigue la Era 5/.test(fin.txt) && fin.btns.some(x => /Seguir a la Era 5/.test(x))); assert.strictEqual(JSON.parse(fin.lin).from, 4); assert.strictEqual(fin.save, null);
    await Promise.all([p.waitForNavigation(), p.click('#dBtns button:last-child')]); assert.ok(/index\.html$/.test(p.url()), p.url());
    await ctx.close();
  }
  assert.strictEqual(errs.length, 0, errs.join(' | ')); console.log('BOT ERA 4 OK'); await b.close();
})();
