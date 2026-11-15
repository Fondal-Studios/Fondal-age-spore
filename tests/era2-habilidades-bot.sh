#!/bin/bash
# Utilidad de cada habilidad en PARTIDAS COMPLETAS (perfil «habil»: habilidades con criterio de situación y nivel), Normal y Difícil, las 12 especies, N partidas por celda.
# Condiciones: todas, ninguna, y quitando una por vez. Resultado: tests/.balance-out/hab-<condición>.json y una tabla con victorias e IC95 de Wilson.
# Uso: tests/era2-habilidades-bot.sh [n=3]   (n=3 → 72 partidas por condición, ≈ 2,5 min cada una con 4 workers)
cd "$(dirname "$0")/.."; export NODE_PATH=$(npm root -g); N=${1:-3}
declare -A C=( [todas]="" [ninguna]="rug,cam,exc,ala,mig" [sinrug]="rug" [sincam]="cam" [sinexc]="exc" [sinala]="ala" [sinmig]="mig" )
for k in todas ninguna sinrug sincam sinexc sinala sinmig; do
  if [ -n "${C[$k]}" ]; then node tests/era2-perfiles.js "hab-$k" --n "$N" --diffs 1,2 --profiles habil --maxT 700 --abOff "${C[$k]}" > "tests/.balance-out/hab-$k.log" 2>&1
  else node tests/era2-perfiles.js "hab-$k" --n "$N" --diffs 1,2 --profiles habil --maxT 700 > "tests/.balance-out/hab-$k.log" 2>&1; fi
done
node -e '
const fs=require("fs"),p=require("path");const z=1.96;const wil=(k,n)=>{const q=k/n,d=1+z*z/n,c=(q+z*z/2/n)/d,h=z*Math.sqrt(q*(1-q)/n+z*z/4/n/n)/d;return "["+Math.round(100*(c-h))+"-"+Math.round(100*(c+h))+"]"};
const dir="tests/.balance-out";const rows=[];
for(const k of ["todas","ninguna","sinrug","sincam","sinexc","sinala","sinmig"]){const rs=JSON.parse(fs.readFileSync(p.join(dir,"hab-"+k+".json"))).filter(r=>!r.error);const line=[k];for(const d of [1,2]){const q=rs.filter(r=>r.diff===d),w=q.filter(r=>r.end==="win").length;line.push(w+"/"+q.length+" = "+Math.round(100*w/q.length)+" % "+wil(w,q.length))}rows.push(line.join(" | "))}
console.log("condición | Normal | Difícil\n"+rows.join("\n"));'
