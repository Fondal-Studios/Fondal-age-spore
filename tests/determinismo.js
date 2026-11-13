// Prueba: misma semilla => mismo estado; guardar/cargar no cambia el futuro; 8 colonias.
// Uso: NODE_PATH=$(npm root -g) node tests/determinismo.js
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
(async()=>{
 const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1280,height:800}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('file://'+path.resolve(__dirname,'../eras/era1-celula.html')+''); await p.waitForTimeout(500);
 const r = await p.evaluate(()=>{
   const E=window.__e1; const H=()=>{const d=JSON.parse(E.snapshot()); delete d.cam; delete d.at; d.S.modal=0; d.S.paused=0; d.S.abBtns=0; return E.hashStr(JSON.stringify(d.S)).toString(16)+'/'+d.S.cells.length+'/'+Math.round(d.S.t);};
   const run=(n)=>{ for(let i=0;i<n;i++){ if(E.S.teams[0].pending>0){E.S.teams[0].pending=0;E.S.modal=false;} E.step(1/60);} };
   const out={};
   E.newGame(1,3,'TEST1',[0,1,2,3]); run(1800); out.a=H();
   E.newGame(1,3,'TEST1',[0,1,2,3]); run(1800); out.b=H();
   E.newGame(1,3,'OTRA',[0,1,2,3]); run(1800); out.c=H();
   E.newGame(1,3,'TEST1',[0,1,2,3]); run(900); E.saveGame(); const d=E.readSave(); out.saved=!!d; E.restoreGame(d); run(900); out.d=H();
   E.newGame(1,7,'OCHO',[0,1,2,3,4,5,6,7]); run(1200); out.eight=E.S.teams.length+' teams, cells '+E.S.cells.length;
   return out; });
 console.log(r, 'errs', errs.slice(0,5));
 assert.strictEqual(r.a, r.b, 'misma semilla debe dar el mismo estado');
 assert.notStrictEqual(r.a, r.c, 'otra semilla debe dar otro estado');
 assert.strictEqual(r.a, r.d, 'guardar/cargar no debe cambiar el futuro');
 assert.ok(/^8 teams/.test(r.eight)); assert.strictEqual(errs.length, 0); console.log('DETERMINISMO OK');
 await b.close();
})();
