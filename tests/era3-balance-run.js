const { chromium } = require('playwright'); const fs=require('fs');
const [,, diffs, kind, n, maxT, label, ov] = process.argv;
(async()=>{
 const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1280,height:800}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/font|ERR_/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+require('path').resolve(__dirname,'../eras/era3-tribus.html')+''); await p.addScriptTag({content:fs.readFileSync(''+require('path').resolve(__dirname,'era3-balance-bot.js')+'','utf8')});
 const out=[]; if(ov) await p.evaluate(o=>{const D=window.__e3.DIFFS; for(const k in o) Object.assign(D[k],o[k]);}, JSON.parse(ov));
 for (const d of diffs.split(',').map(Number)) { const rs=[];
  for (let i=0;i<+n;i++){ rs.push(await p.evaluate(([s,d,m,k])=>window.runBot(s,d,m,k),['S'+d+'x'+i,d,+maxT,kind])); }
  const w=rs.filter(r=>r.end==='win'), l=rs.filter(r=>r.end==='lose'), t=rs.filter(r=>r.end==='timeout');
  const avg=w.length?Math.round(w.reduce((a,r)=>a+r.t,0)/w.length):null;
  console.log(label||'', 'diff',d,kind,'N',rs.length,'win',w.length,'lose',l.length,'timeout',t.length,'avgWinT',avg,'loseT',l.map(r=>r.t).join(','),'marcasT',Math.round(rs.filter(r=>r.tt.marcas).reduce((a,r)=>a+r.tt.marcas,0)/Math.max(1,rs.filter(r=>r.tt.marcas).length)),'dc',JSON.stringify(rs.reduce((a,r)=>{const d=JSON.parse(r.dc);for(const k in d)a[k]=(a[k]||0)+d[k];return a},{})), 'know@end', rs.map(r=>r.know).join(','));
  out.push(...rs);
 }
 fs.writeFileSync('/tmp/era3-res-'+(label||'x')+'-'+kind+'.json',JSON.stringify(out));
 console.log('errs',errs.slice(0,3)); await b.close();
})();
