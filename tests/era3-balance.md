# Equilibrio de la Era 3

## Ciclo 4 (economía y rivales con causa): medición con bots por perfil

Método: Chromium real (Playwright), partida simulada con `__e3.step` (paso fijo 0,05 s), semilla distinta por partida (`C<dificultad><perfil><n>`), tope de 2400 s; lo que no gana ni se extingue es «estancada». Bots en `tests/era3-bots.js` (solo usan la API pública: `setPrio`, `placeBuilding`, `upgradeBuilding`, `research`, `deal`, `choosePath`); runner `tests/era3-ciclo-run.js` (`node tests/era3-ciclo-run.js 0,1,2 todos,auto,ingenuo 32 2400 etiqueta`, opcional `a,b` para forzar las personalidades de los clanes). Intervalos de Wilson al 95 %. Las personalidades de los dos clanes salen de la semilla (mezcla natural de las 6 parejas posibles).

Perfiles: **economico** (comida y construcción altas, mejora todo lo que puede, regala con comida de sobra, sube Defensa y levanta empalizada si le saquean), **defensivo** (defensa alta desde el inicio, empalizada, camino Jefatura, sin regalos), **comerciante** (exploración y saber altos, comercia y regala, camino Mercado), **agresivo** (defensa y exploración altas, construye en territorio rival, no regala, camino Jefatura), **auto** (equivalente al bot de referencia de la Era 3 original: todo en «normal», sin adaptarse), **ingenuo** (auto con Defensa en «bajo», no reacciona a los saqueos).

N = 32 por celda. Columnas: victorias (IC), derrotas por extinción (IC), estancadas, tiempo medio de victoria (s), muertes por partida y saqueos recibidos por partida.

| Perfil | Dificultad | Victorias (IC 95 %) | Extinciones (IC) | Estancadas | t victoria | Muertes por partida | Saqueos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| economico | Fácil | 31 (97 %, 84-99) | 1 (3 %, 1-16) | 0 | 1024 | lobo 7,3 · hambre 8,9 · saqueo 1,8 | 3,9 |
| economico | Normal | 22 (69 %, 51-82) | 8 (25 %, 13-42) | 2 | 1586 | lobo 9,3 · hambre 8,1 · saqueo 6,3 | 9,8 |
| economico | Difícil | 16 (50 %, 34-66) | 11 (34 %, 20-52) | 5 | 1635 | hambre 9 · saqueo 8 · lobo 8,8 | 11,4 |
| defensivo | Fácil | 32 (100 %, 89-100) | 0 (0 %, 0-11) | 0 | 1075 | hambre 9,4 · saqueo 3,9 · lobo 2,3 | 4,7 |
| defensivo | Normal | 25 (78 %, 61-89) | 5 (16 %, 7-32) | 2 | 1761 | saqueo 12,9 · hambre 10,8 · lobo 5,1 | 12,9 |
| defensivo | Difícil | 6 (19 %, 9-35) | 7 (22 %, 11-39) | 19 | 2270 | saqueo 23,3 · hambre 11,8 · lobo 7,1 | 21,8 |
| comerciante | Fácil | 32 (100 %, 89-100) | 0 (0 %, 0-11) | 0 | 1087 | hambre 10 · lobo 7,9 · saqueo 0,8 | 1,8 |
| comerciante | Normal | 26 (81 %, 65-91) | 2 (6 %, 2-20) | 4 | 1833 | hambre 12,7 · lobo 7,4 · saqueo 8,6 | 11,3 |
| comerciante | Difícil | 15 (47 %, 31-64) | 6 (19 %, 9-35) | 11 | 1963 | lobo 8,1 · saqueo 11,4 · hambre 11,4 | 16,0 |
| agresivo | Fácil | 32 (100 %, 89-100) | 0 (0 %, 0-11) | 0 | 1271 | hambre 12,2 · saqueo 4,8 · lobo 2,6 | 6,8 |
| agresivo | Normal | 8 (25 %, 13-42) | 17 (53 %, 36-69) | 7 | 2004 | saqueo 10,8 · hambre 8,4 · lobo 7,1 | 12,4 |
| agresivo | Difícil | 1 (3 %, 1-16) | 27 (84 %, 68-93) | 4 | 2089 | saqueo 8,7 · lobo 5,9 · hambre 4,9 | 10,3 |
| auto | Fácil | 32 (100 %, 89-100) | 0 (0 %, 0-11) | 0 | 908 | lobo 7,7 · hambre 7 · saqueo 1,5 | 3,0 |
| auto | Normal | 20 (63 %, 45-77) | 8 (25 %, 13-42) | 4 | 1651 | lobo 11,3 · hambre 10,3 · saqueo 7,9 | 11,6 |
| auto | Difícil | 11 (34 %, 20-52) | 11 (34 %, 20-52) | 10 | 1521 | hambre 11,4 · lobo 11 · saqueo 9,3 | 13,6 |
| ingenuo | Fácil | 32 (100 %, 89-100) | 0 (0 %, 0-11) | 0 | 1089 | lobo 12,2 · hambre 10,7 · saqueo 2,5 | 7,0 |
| ingenuo | Normal | 15 (47 %, 31-64) | 0 (0 %, 0-11) | 17 | 1856 | lobo 18,4 · hambre 17,8 · saqueo 16,7 | 19,4 |
| ingenuo | Difícil | 3 (9 %, 3-24) | 9 (28 %, 16-45) | 20 | 2266 | lobo 16,1 · hambre 14,5 · saqueo 18 | 21,6 |

Personalidad del vecino (economico, Normal, N = 24, las dos personalidades forzadas iguales): **comerciante/comerciante** 22 victorias (92 %, IC 74-98), 5,8 saqueos por partida; **orgulloso/orgulloso** 18 (75 %, 55-88), 2,0 saqueos (se calma con regalos; los regalos le sirven); **belicoso/belicoso** 14 (58 %, 39-76), 12,6 saqueos (los regalos no sirven mientras te ve débil: hay que defenderse). Las tres difieren en el número de saqueos, que es lo que cada personalidad tiene que cambiar.

Lectura honesta:
- **Fácil**: 97-100 % con cualquier perfil, incluso el que no se defiende (la meta del Ciclo 3 era ≥ 60 %). Es más fácil que antes (94 %) y probablemente demasiado: no se retocó.
- **Normal**: 63-81 % con perfiles razonables (la meta anterior era 35-55 % con el bot «auto»: ahora **auto = 63 %**, fuera de la meta por arriba). El perfil que se expande contra los vecinos y no regala (agresivo) queda en 25 %.
- **Difícil**: 34-50 % con perfiles razonables (meta anterior 15-35 %; **auto = 34 %**, en el borde alto de la meta). El defensivo puro (sin diplomacia) y el que no reacciona (ingenuo) quedan en 19 % y 9 %, con la mayoría estancada.
- Con N = 32 cada porcentaje tiene ±15 puntos de intervalo: las diferencias entre perfiles vecinos (economico vs. auto en Normal) **no** son significativas; sí lo son las de agresivo contra el resto y las de Fácil contra Difícil.
- No se midió a un jugador humano. Los bots no usan eventos de decisión (no existen todavía en la Era 3) ni el panel de vista previa.

### Qué se encontró y por qué cambió la dificultad (causas, no perillas)
1. **El balance anterior era casi sin saqueos.** Con el bot «auto» original, en Normal (N = 24, 1500 s) hubo **0,9 saqueos por partida**: tres regalos aliaban al clan y la alianza anulaba todos los saqueos. Las perillas `raid0/raidMul/raidAdd/rg/rdmg` estaban calibradas en un mundo donde casi no pasaban. Ahora los saqueos tienen causa (relación, debilidad, territorio) y hay dos clanes; con el primer cableado de los clanes el Normal con «auto» daba 13 % de victorias y 53 % de extinciones (N = 32). La aliada de un belicoso exige que lo respetes, así que ya no es un escudo gratis.
2. **Sin saqueos la economía gana sola:** con una bandera temporal que apagaba los saqueos (ya retirada del código), economico en Normal ganó 31 de 32. El desafío de Normal/Difícil es la amenaza, no la comida.
3. **Pérdidas por saqueo compuestas.** Cada saqueador que llegaba se llevaba el 20 % de la comida, de modo que 6 saqueadores dejaban a la tribu sin el 74 %. Era invisible cuando había ~1 saqueo por partida y letal con saqueos periódicos: ahora cada uno se lleva el 7 % (máx. 4 raciones). Efecto medido: economico en Normal pasó de 38 % a 69 % de victorias (N = 32).
4. **Dos clanes preparaban el saqueo a la vez** (error): ahora solo uno por vez y un mínimo de `110 · raidMul` s entre saqueos.
5. **Defensores solos mueren.** Duelo medido (Normal, 5 repeticiones, sin Lanza): 1 defensor contra 4 saqueadores pierde (quedan 3,8); 2 ganan a 4 y pierden contra 6; 3 ganan a 10 (pierden 2); con 4 o 6 casi no hay bajas. Por eso `tribeStr = 1,8·def^1,5 + 1,2·caz` (en vez de lineal), los defensores solo se forman en escuadra de ≥ 2 y, si los superan, se apartan (no se inmolan). Efecto, junto con la corrección 4: muertes por saqueo de 9,8 a 4,9 por partida y 19 % → 38 % de victorias (Normal, economico, N = 32).
6. Causas más chicas encontradas con la misma comparación contra el juego original (a 150 s la población, los nacimientos y las muertes coinciden): regalos a dos clanes que dejaban la comida bajo el umbral de natalidad (comida > 1,2·población + 2): nacimientos a 300 s de 4,3 a 6,0 por partida (el original: 6,05) al regalar solo con comida de sobra o cuando el motivo del saqueo es la relación, y un chamán fijo desde 6 adultos; constructores que esperaban parados en una obra detenida en vez de juntar el material que faltaba (13,5 % del tiempo en `build` contra 2 % en el original, donde cortaban madera el 7 %); reasignaciones de oficios por fracciones (zona muerta de 0,75 persona); la regla de «60 % de comida» impedía formar cualquier guardia (ahora 45 % si la economía está sana).
7. **Tope de saqueo**: un clan no manda más guerreros que el 45 % de la población que pide la dificultad (× tamaño del carácter): sin tope, a los 1000 s de juego llegaban 15 saqueadores contra una tribu de 12.

### Lo que no está resuelto
- Los **lobos** siguen siendo la primera o segunda causa de muerte (8-18 por partida): no se tocó su comportamiento (los defensores ahora salen a espantarlos a ≤ 260 px del campamento; los exploradores los evitan).
- El **hambre** mata 7-12 personas por partida en todos los perfiles (nacimientos que superan la producción en invierno): sin ajustar.
- El jefatura de «defensivo» en Difícil (19 estancadas de 32) pide 2 saqueos rechazados y una empalizada; sin diplomacia los dos clanes te odian y los saqueos no paran. Es una consecuencia de la estrategia, no un objetivo imposible, pero no se verificó con un jugador.
- La Era 4 todavía no usa `path` ni los clanes del linaje.

## Duelo de saqueo (referencia para `tribeStr`)
Normal, t = 200, una tribu de k defensores (hambre fija en 100) contra n saqueadores, 5 repeticiones: bajas de defensores / saqueadores que sobreviven (sin Lanza).

| saqueadores | 1 def | 2 def | 3 def | 4 def | 6 def |
| --- | --- | --- | --- | --- | --- |
| 4 | 1,0 / 3,8 | 1,0 / 0 | 0,2 / 0 | 0 / 0 | 0 / 0 |
| 6 | 1,0 / 6,0 | 1,4 / 2,4 | 1,6 / 0 | 0,8 / 0 | 0,8 / 0 |
| 8 | 1,0 / 8,0 | 2,0 / 7,4 | 2,0 / 0 | 0,8 / 0 | 0,6 / 0 |
| 10 | 1,0 / 10 | 2,0 / 9,6 | 2,0 / 0 | 0,8 / 0 | 1,0 / 0 |

## Histórico: Ciclo 3 (Era 3 original, 1 clan, alianza como escudo)

Cómo se midió: Chromium real (Playwright), partida simulada llamando `__e3.step` directo (paso fijo 0,05 s, sin dibujar), semilla distinta en cada corrida (`S<dificultad>x<n>`, posible desde que la Era 3 tiene PRNG con semilla). Tope de 2400 s (40 min) de juego: lo que no ganó ni se extinguió en ese tiempo cuenta como «estancada». Los scripts de medición están en `tests/era3-balance-bot.js` y `tests/era3-balance-run.js` (uso: `node tests/era3-balance-run.js 0,1,2 auto 32 2400 etiqueta`); además hay `tests/era3-guardado.js` y `tests/era3-bot.js`.

Bots (todos con la misma lógica de construcción, tecnología y diplomacia; solo cambia lo que hacen con los oficios):
- **auto** (referencia «razonable»): investiga por orden fijo, construye 3 refugios + almacén + tótem + huerto, regala comida al clan para aliarse, deja que «asignar libres» reparta oficios. No pone chamanes a mano.
- **smart**: igual, pero además pone un chamán al inicio y uno más por cada 8 adultos.
- **con6**: sube constructores con `setRole('con', +1)` seis veces al principio (el caso del hallazgo 3 de AUDITORIA.md).
- **idle**: no toca nada.

## Antes (solo con PRNG agregado, reglas originales; 16 corridas por celda)

| Bot | Fácil | Normal |
| --- | --- | --- |
| auto | 16/16 victorias, ganó en 924 s de media | 16/16 victorias, 1256 s |
| con (2 constructores extra) | 16/16 | 15/16 (+1 estancada) |
| **con6** | **0/16 victorias, 16/16 extinciones a los ~160 s** | **0/16, 16/16 extinciones** |
| idle | 0 victorias, 0 extinciones (todas vivas a los 40 min) | igual |

No existía la dificultad Difícil. El Conocimiento del bot **idle** llegaba a ~195-210 a los 40 min (fórmula original `0,004 por adulto por segundo`, sin chamanes) cuando las 9 tecnologías costaban 62 en total: todo se podía comprar sin decidir nada. El hallazgo de extinción se **reprodujo** (con6: 100 %), pero no con el bot moderado (2 constructores: 0 extinciones en 32 corridas); la tasa de «2 de 3» del agente anterior depende de cuántos constructores suba el bot.

## Después (cambios de este trabajo)

| Bot | Fácil | Normal | Difícil |
| --- | --- | --- | --- |
| **auto** (N=32) | **30 victorias (94 %)**, 2 extinciones (6 %), 0 estancadas; 923 s de media | **16 (50 %)**, 11 extinciones (34 %), 5 estancadas (16 %); 1306 s | **6 (19 %)**, 13 extinciones (41 %), 13 estancadas (41 %); 1438 s |
| smart (N=32) | 32 (100 %), 0 extinciones; 771 s | 16 (50 %), 6 extinciones, 10 estancadas | 9 (28 %), 9 extinciones, 14 estancadas |
| con6 (N=24, con cota 60 %) | 20 (83 %), 4 extinciones (17 %) | 3 (12 %), 17 extinciones | n/m |
| idle (N=8) | 0 victorias, 3 extinciones, 5 estancadas | 0 victorias, 8 extinciones | 0 victorias, 8 extinciones |

Metas pedidas: Fácil ≥ 60 % de victorias y < 15 % de extinciones → **cumplida** con auto y smart (con6, un bot deliberadamente malo, queda en 17 %). Normal 35-55 % → **cumplida** (50 % con ambos bots). Difícil 15-35 % → **cumplida** (19 % y 28 %). Con N=32 el error estadístico de cada porcentaje ronda ±9 puntos: Normal con auto está pegado al borde alto de la meta.

Límites honestos de la medición:
- Todo depende del bot. Un jugador humano con mejor lectura (refugios antes, comida almacenada) debería ganar más; no se midió.
- Las partidas «estancadas» en Normal/Difícil son tribus que no llegan a la población pedida por falta de comida y siguen vivas a los 40 min. El juego no las termina solo; se dejó así.
- Los lobos siguen siendo la primera causa de muerte (≈10-15 muertes por partida, sobre todo niños y gente fuera del fuego); no se tocó su comportamiento. Después viene el hambre.
- Los cambios se calibraron con auto; smart y con6 son chequeos cruzados, no objetivos.

## Qué se cambió y por qué
1. **Reasignar oficios (`setRole`)**: ya no se puede sacar gente de recolectores/cazadores si quedan menos que `max(3, 60 % de los adultos)`; si no hay de dónde sacar, aviso rojo («la tribu necesita al menos N recolectores o cazadores…»); cuando se saca de otro oficio, aviso informativo («Un recolector pasó a ser constructor»). El `−` de recolectores/cazadores también respeta el mínimo (los «libres» no trabajan). Con6 pasó de 100 % de extinciones a 17 % (Fácil).
2. **Conocimiento con costo real**: tasa `(0,0015·adultos + 0,006·artesanos + 0,05·chamanes) · (1 + 0,05·tecnologías) · (×1,25 si hay alianza) · multiplicador de dificultad` (antes `0,004·adultos + 0,05·chamanes`): la gente sola ya casi no alcanza; los chamanes pesan. El costo de cada tecnología sube **15 % por cada tecnología ya aprendida** (las 6 claves para ganar cuestan ≈ 58 en vez de 39). Con auto la última clave (Marcas de cuenta) llega a los ~14 min en Fácil, ~18 en Normal, ~21 en Difícil.
3. **Exclusión entre tecnologías**: Arco y Domesticación se excluyen (o cazás mejor o criás animales); ninguna es necesaria para ganar. Lanza tampoco es requisito de victoria: cuesta Conocimiento que compite con las claves.
4. **Presión por dificultad** (tabla `DIFFS`): hambre (`hd`), frío creciente con los inviernos vividos, regeneración de arbustos, tamaño/daño de saqueos (crecen con el tiempo), meta de población y de inviernos, desgaste de la alianza (ahora hay que mantenerla con regalos, si la relación baja de 15 se rompe). El hambre base subió de 1,83 a 2,6 y el hambre de invierno ×1,4.
5. **Bug del camino militar**: `raidsOk` nunca se incrementaba, así que «Jefatura» era inalcanzable. Ahora cuenta un saqueo repelido sin pérdida de raciones.
6. Se agregó **Difícil** (Fácil y Normal ya existían).

Parámetros finales (`DIFFS` en `eras/era3-tribus.html`):

| | pop | inviernos | hambre | frío | arbustos | saqueo (inicio / ritmo / +n / crece cada s / daño) | Conocimiento | desgaste alianza |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fácil | 18 | 1 | ×1,1 | 0,3 | ×1 | 190 s / ×1,2 / +0 / 150 / 5 | ×1 | 0,05/s |
| Normal | 24 | 2 | ×1,36 | 0,45 | ×0,85 | 130 s / ×0,9 / +1 / 110 / 6 | ×0,9 | 0,09/s |
| Difícil | 26 | 2 | ×1,3 | 0,6 | ×0,8 | 100 s / ×0,7 / +2 / 80 / 8 | ×0,8 | 0,14/s |

El equilibrio es sensible: al probar, pasar el hambre de Normal de ×1,25 a ×1,45 llevaba las victorias de 94 % a 6 %. Si se toca algo, volver a medir.
