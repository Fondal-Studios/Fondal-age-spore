#!/bin/bash
# Mide la utilidad real de cada habilidad de la Era 2 con el bot razonable: N partidas por condición (semillas S<dif>x<i>, las 12 especies rotando)
# en Normal y Difícil, con las 5 habilidades, ninguna y quitando una por vez. Resultado: tests/.balance-out/hab-<condición>-razonable-*.json
# Uso: tests/era2-habilidades-bot.sh [N=24]   (tarda ≈ 4 min por condición en 4 procesos)
cd "$(dirname "$0")/.."; export NODE_PATH=$(npm root -g); N=${1:-24}
declare -A C=( [todas]="" [ninguna]="ninguna" [sinrug]="cam,exc,ala,mig" [sincam]="rug,exc,ala,mig" [sinexc]="rug,cam,ala,mig" [sinala]="rug,cam,exc,mig" [sinmig]="rug,cam,exc,ala" )
for k in todas ninguna sinrug sincam sinexc sinala sinmig; do bash tests/era2-balance-all.sh "hab-$k" razonable 1,2 "$N" "${C[$k]}" > /dev/null; done
for k in todas ninguna sinrug sincam sinexc sinala sinmig; do echo "== $k"; node tests/era2-balance-agg.js "hab-$k-razonable" | grep -E '^dif'; done
