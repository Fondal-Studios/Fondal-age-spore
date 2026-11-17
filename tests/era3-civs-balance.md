# Era 3 por civilización: balance medido con bots (Ciclo 4)

Comando: `NODE_PATH=$(npm root -g) node tests/era3-civs-run.js 0,1,2 todos todas 12 3000 final 4` (4 perfiles × 4 civilizaciones × 3 dificultades × 12 partidas = 576; tope de 50 min de juego; la especie rota entre las 3 de cada clase y la mitad de las acuáticas son anfibias). Bots en `tests/era3-bots.js`: juegan solo por la API pública. «Fundaron» = levantaron la Maravilla y fundaron la civilización; el resto son partidas que no terminaron en 50 min (casi no hubo derrotas). IC de Wilson al 95 %. Tiempos: mediana en minutos de juego.

Perfiles: **económico** (producción, almacenes, caravanas), **defensivo** (3 torres, 8 tramos de muro, guerreros y tirador), **militar** (4 guerreros, 2 tiradores y campeón; toma nodos y ataca campamentos), **clash** (construye y mejora todo, hasta 3 obras a la vez).

| Civilización | Dificultad | N | Fundaron (IC 95 %) | Derrotas | Edad II (min) | Edad III (min) | Fundación (min) | Muertes | Saqueos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ter | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 5.9 | 15.2 | 22 | 20 | 4.9 |
| ter | Normal | 48 | 48 (100 %, IC 93–100) | 0 | 6.8 | 20 | 29.2 | 32 | 11.6 |
| ter | Difícil | 48 | 33 (69 %, IC 55–80) | 0 | 7.4 | 26.2 | 30.4 | 52 | 21.0 |
| ins | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 6.2 | 13.6 | 19 | 18 | 3.7 |
| ins | Normal | 48 | 48 (100 %, IC 93–100) | 0 | 7.1 | 19.9 | 26.8 | 31 | 9.2 |
| ins | Difícil | 48 | 39 (81 %, IC 68–90) | 1 | 8.4 | 22.8 | 30.4 | 62 | 17.5 |
| acu | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 5.8 | 14.1 | 20 | 17 | 4.3 |
| acu | Normal | 48 | 46 (96 %, IC 86–99) | 0 | 6.7 | 18 | 24.1 | 29 | 10.1 |
| acu | Difícil | 48 | 34 (71 %, IC 57–82) | 3 | 7.2 | 22.5 | 29.5 | 49 | 18.3 |
| ave | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 6.4 | 15.7 | 22.3 | 22 | 5.0 |
| ave | Normal | 48 | 39 (81 %, IC 68–90) | 0 | 7.6 | 22.5 | 30.2 | 39 | 13.1 |
| ave | Difícil | 48 | 29 (60 %, IC 46–73) | 0 | 9 | 29.2 | 37.5 | 51 | 22.9 |

| Perfil | Dificultad | N | Fundaron (IC 95 %) | Derrotas | Edad II (min) | Edad III (min) | Fundación (min) | Muertes | Saqueos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| económico | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 6.4 | 13.8 | 17.9 | 15 | 3.3 |
| económico | Normal | 48 | 47 (98 %, IC 89–100) | 0 | 6.8 | 17.5 | 23.8 | 20 | 8.6 |
| económico | Difícil | 48 | 45 (94 %, IC 83–98) | 0 | 7.1 | 22.5 | 28.6 | 35 | 16.2 |
| defensivo | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 6 | 15.2 | 21.8 | 13 | 5.3 |
| defensivo | Normal | 48 | 48 (100 %, IC 93–100) | 0 | 8.1 | 21.8 | 29.3 | 26 | 12.8 |
| defensivo | Difícil | 48 | 42 (88 %, IC 75–94) | 0 | 9.3 | 29.2 | 39.3 | 49 | 21.8 |
| militar | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 6.7 | 14.5 | 21.7 | 30 | 6.7 |
| militar | Normal | 48 | 38 (79 %, IC 66–88) | 0 | 7.3 | 19.7 | 28.9 | 59 | 15.4 |
| militar | Difícil | 48 | 6 (13 %, IC 6–25) | 2 | 8.5 | 26.4 | 37.5 | 96 | 29.3 |
| clash | Fácil | 48 | 48 (100 %, IC 93–100) | 0 | 5.1 | 14.6 | 20.8 | 19 | 2.5 |
| clash | Normal | 48 | 48 (100 %, IC 93–100) | 0 | 6.5 | 19.9 | 26.4 | 26 | 7.3 |
| clash | Difícil | 48 | 42 (88 %, IC 75–94) | 2 | 6.6 | 21.5 | 28.5 | 34 | 12.4 |

Acuáticos, todas las dificultades: submarina 64/72 (89 %, IC 80–94), anfibia 64/72 (89 %, IC 80–94); mismos tiempos (Edad III ≈ 17-18 min, fundación 23 min).

Civilización × perfil (todas las dificultades, % que fundaron, IC 95 %): ter económico 94 [82–98] · defensivo 94 [82–98] · militar 69 [53–82] · clash 100 [90–100]; ins 100 · 100 · 75 [59–86] · 100; acu 100 · 100 · 61 [45–75] · 94 [82–98]; ave 94 [82–98] · 89 [75–96] · 50 [34–66] · 89 [75–96].

## Lectura
- Ninguna civilización es inviable: todas fundan el 100 % en Fácil, ≥ 81 % en Normal y entre 60 % (Aves) y 81 % (Insectos) en Difícil. Ninguna domina: los IC se solapan salvo Aves, la más lenta (≈ 30 min en Normal contra 24-29 del resto), porque su bono es más de exploración y comercio que de economía. Se le quitó la penalidad de +10 % de pérdidas por saqueo y se le dio +5 % de forrajeo; quedó viable pero detrás: candidata a un ajuste chico si la prueba humana lo confirma.
- Ritmo: Edad II ≈ 6-7 min en todas las dificultades; Edad III ≈ 14-16 min (Fácil), 18-23 (Normal), 22-29 (Difícil); fundación ≈ 19-22 / 24-30 / 29-37 min.
- El perfil militar es el más débil en Difícil (13 %): gasta adultos en unidades que mueren en expediciones y en la disputa de nodos (≈ 96 muertes por partida). Es la estrategia del bot, no un bloqueo del juego (100 % en Fácil, 79 % en Normal).
- `busErr` 0 en las 576 partidas; 0 errores de consola.


## Ajuste de Normal (2026-11-17, a pedido del dueño)
Normal estaba casi imposible de perder (94 % fundaron, 181/192). `DIFFS[1]`: raid0 130→115, raidMul .9→.8, raidAdd 1→2, rg 110→95, rdmg 6→7, hd 1.36→1.42.
Comando: `node tests/era3-civs-run.js 1 todos todas 12 3000 normal-v2 4` (N=192, 12 por perfil × civilización).
Resultado: **166/192 fundaron (86 %, IC 81–90)**; por perfil: económico 47/48, defensivo 46/48, militar 26/48, clash 47/48; derrotas 3. Aves sigue siendo la más floja (36/48; militar 3/12). Fundación más lenta (económico ≈ 26–33 min). Queda entre Fácil (100 %) y Difícil (≈ 70 %); endurecer más la acercaría a Difícil. Los bots juegan mejor que un jugador nuevo: confirmar con la prueba humana.
