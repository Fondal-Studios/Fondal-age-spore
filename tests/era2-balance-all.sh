#!/bin/bash
# Uso: tests/era2-balance-all.sh <etiqueta> <bot> <dificultades> <N> [habilidades] [html]
# Corre 4 procesos en paralelo (reparto por semilla) y deja tests/.balance-out/<etiqueta>-<bot>-<i>.json
cd "$(dirname "$0")/.."; export NODE_PATH=$(npm root -g)
L=$1; B=$2; D=$3; N=$4; AB=${5:-}; H=${6:-}; OV=${7:-}
for i in 0 1 2 3; do node tests/era2-balance-run.js "$D" "$B" "$N" 2400 "$L-$B" "$AB" "$H" $i/4 "$OV" & done; wait
