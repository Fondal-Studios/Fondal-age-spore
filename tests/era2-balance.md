# Equilibrio de la Era 2 (medido con bots)

> **Ciclo 3 (jugabilidad/simulación)**: esta sección es la vigente. Las secciones de más abajo («Cómo se midió» original, «Calidad 2.0», etc.) son el historial: sus cifras se midieron con código anterior y **ya no valen**. Todo lo de esta sección se midió con el código de la rama `worktree-agent-a10380960df1aac86` (commits `3f6bb05` y `eb51077` y siguientes); las partidas son reproducibles (semilla por celda).

## Cómo reproducir (una sola orden por cosa)
```
export NODE_PATH=$(npm root -g)
npm run test:era2                      # guardado viejo, calidad-sim (energía, órdenes, habilidades, biomas, fps), órdenes + causas, Alarma (N=48)
npm run test:era2:balance              # especie x dificultad x perfil, 8 perfiles, n=2 (≈ 9 min con 4 procesos) + causas de derrota
npm run test:era2:biomas               # partidas completas empezando en los 5 biomas, 4 perfiles
node tests/era2-perfiles.js X --n 2 --diffs 1,2 --profiles razonable,cazador --col2 desierto,tundra   # el camino real: Empezar es en la pradera y el 2.º ecosistema es ese
node tests/era2-ablacion.js --variants sinHeridas,repro60 --specs ter_cazador,ter_gigante,ter_ingeniero   # qué mecánica pesa (copias del HTML con UNA mecánica apagada)
tests/era2-habilidades-bot.sh 3        # utilidad de cada habilidad en partidas completas (todas / ninguna / sin una)
```
Método: Chromium real (Playwright), partidas simuladas llamando `__e2.step(.05)` sin dibujar. Cada celda usa su propia semilla (`P<dif><perfil><bioma><especie>#<i>`); los bots usan su propio azar, nunca `R()`. IC95 de Wilson. «Gana» = completa la fase 2; «sin terminar» = vivas al tope (700 s de juego); «extinción» = la manada llegó a 0. Las causas salen del evento `kill` del Bus (quién mató: hambre, frío, fuego, rival, depredador por especie, jefe). Con N = 2 por celda, **cada celda de especie x perfil tiene ±45 puntos de ruido**: solo las marginales (por especie, por perfil, por dificultad) son interpretables.

Perfiles (`tests/era2-perfiles-bot.js`): `razonable` (referencia: evolución por puntaje, 2 nidos, coloniza el ecosistema con más comida para su hábitat, habilidades sencillas), `cazador` (actitud Atacar contra rivales/lobos mientras está alimentado, fuego concentrado por órdenes de atacar, rasgos de ataque), `defensivo` (3 nidos, Reunir ante amenazas, retirada de heridos por órdenes, rasgos de defensa), `migrador` (rasgos de resistencia, coloniza apenas puede, Migrar), `enjambre` (pone huevos cada 2,5 s, rasgos de reproducción), `habil` (habilidades con criterio de situación y de nivel, sin órdenes), `ordenes` (órdenes por animal: atacar en grupo, retirar heridos, mandar a los hambrientos a las plantas), `tactico` (habilidades con criterio + órdenes).

## 1. Terrestres: qué los hundió (causa medida) y qué se hizo
Antes (commit `1166564`, bot razonable, Normal, 3 terrestres x 8 semillas, ablación): **3/24** victorias. El commit anterior al rework (`1bd2b9d`) con el mismo bot y las mismas semillas: **13/24**. Se apagó UNA mecánica del rework por vez (copias del HTML, `tests/era2-ablacion.js`):

| Variante (Normal, 3 terrestres, N = 24) | Victorias | Extinciones | Pob. media a los 60 s / 120 s | Colonizó a tiempo (≤ 150 s) |
| --- | --- | --- | --- | --- |
| **Rework tal cual (HEAD de entonces)** | **3/24** | 12 | 7,5 / 8,6 | 6/24 |
| sin fallos de golpe (`miss`) | 4/24 | 13 | 8,2 / 8,5 | 5 |
| sin contragolpe de la presa | 3/24 | 11 | 7,6 / 8,1 | 4 |
| sin heridas | 6/24 | 11 | 8,2 / 9,3 | 7 |
| sin costo de energía al moverse | 3/24 | 8 | 7,8 / 8,1 | 7 |
| sin costo de energía al golpear | 3/24 | 14 | 7,5 / 7,6 | 5 |
| sin descanso | 2/24 | 11 | 7,7 / 7,3 | 4 |
| reproducir sin pedir energía ni gastarla | 4/24 | 12 | 7,5 / 8,4 | 7 |
| carroña ×1,5 | 2/24 | 12 | 7,4 / 8,0 | 5 |
| bocado de planta fijo (sin «proporcional al tamaño») | 2/24 | 14 | 7,6 / 7,7 | 5 |
| hambre propia 3,2 → 2,6 | 5/24 | 6 | 8,4 / 11,1 | 7 |
| hambre 2,6 + bocado fijo | 7/24 | 6 | — | — |
| **Umbral de reproducir 75 → 60 (natural y botón)** | **9/24** | **2** | **10,6 / 14,8** | **16/24** |
| *(commit previo al rework, `1bd2b9d`)* | *13/24* | *4* | *9,8 / 13,0* | *16/24* |

(Los tamaños de N son chicos: ±20 puntos de ruido por fila. Lo que separa es el patrón: **ninguna mecánica del rework por sí sola explica el hundimiento; el único cambio que devuelve a los terrestres a su nivel es el umbral de reproducción**.)

**Causa**: el rework subió el hambre mínima del botón Reproducir de 60 a 75 (y pidió energía ≥ 40). Con hambre propia ×3,2 las manadas casi nunca llegan a 75, así que los animales de crianza lenta (terrestres, `repro` 20-26: un huevo por animal cada 44-57 s) no pasaban de 7-8 individuos a los 60 s. La Fase 1 pide 10 animales durante 45 s para colonizar y la pradera se queda sin plantas a los 60-90 s (los herbívoros salvajes se las comen), así que la manada nunca llegaba a la selva y moría de hambre. Micro-experimento (90 s, plantas llenas, sin depredadores ni rivales, 10 semillas), población + huevos:

| Especie | `1bd2b9d` | HEAD de entonces | umbral 60 / 60 |
| --- | --- | --- | --- |
| Gigantes | 16,4 | 13,1 | 15,6 |
| Omnívoros ingenieros | 25,2 | 18,4 | 24,4 |
| Aves migratorias | 35,4 | 30,5 | 37,8 |
| Colmena | 27,8 | 28,7 | 35,1 |

**Qué se cambió**: `REPRO_H = 60` y `REPRO_E = 40` (constantes) para TU especie; salvajes y rivales siguen en 75 (`REPRO_H_WILD`, para no cambiar el ritmo del ecosistema que se afinó). El hambre propia quedó en Normal 3,3 y Difícil 3,4 (antes 3,2 y 3,25) y el daño recibido en 1,5 y 2,3 (antes 1,2 y 1,5): el arreglo hizo el juego más fácil (Normal 67 %, Difícil 48 % con el bot razonable) y se recalibró hasta volver a las metas (ver §3).

Antes / después (**bot razonable**, Normal y Difícil): terrestres 2/12 y 2/12 (N = 12) → 5/12 y 4/12 (`cal1`, N = 12) y, con los 8 perfiles juntos y N = 48 (`F12`): **22/48 (46 %) y 9/48 (19 %)**.

## 2. Insectos y Colmena
- El «Colmena 0/4 en Normal» del informe anterior era ruido de N = 4 (IC95 [0-49]). Con el código de entonces y N = 4 el mismo bot daba Colmena 2/4 en Normal y 1/4 en Difícil (`base1`).
- No encontré una mecánica propia de los insectos que los castigue. Lo medido: mueren por **hambre** (la causa principal: 26 muertes por partida en la Colmena) y por **rivales** (13-22 por partida, contra 0,3-3,6 en los terrestres); con 7-10 de vida un golpe los mata. Es la fragilidad que tienen por diseño. Se benefician del mismo arreglo del umbral de reproducción (Colmena pasó de 28,7 a 35,1 de población en el micro-experimento).
- Resultado final (todos los perfiles, N = 16 por especie): Colmena **6/16** en Normal y 3/16 en Difícil; Enjambre 11/16 y 5/16; Parasitoides 6/16 y 6/16. Clase insectos 23/48 (48 %) y 14/48 (29 %) contra aves 34/48 (71 %) y 20/48 (42 %): **los insectos siguen por debajo de las aves** (no lo corregí: las aves vuelan, ven lejos y viven más).

## 3. Balance final: especie x dificultad x perfil (código final, `tests/era2-perfiles.js`)
**Por dificultad** (8 perfiles x 12 especies; Normal y Difícil N = 192, Fácil N = 96): **Fácil 97 % [91-99]**, **Normal 51 % [44-58]**, **Difícil 27 % [21-33]** (metas ≥ 70 / 40-60 / 15-35: cumple las tres con la mezcla de perfiles). Con el perfil razonable solo (N = 24 por dificultad en esta tanda; N = 48 en `cal1`): Normal 15/24 (63 %) y 65 % [50-77], Difícil 9/24 (38 %) y 33 % [22-47]: **Normal queda en el borde alto de la meta con el bot de referencia**.

**Por perfil** (victorias de 24):

| Perfil | Fácil (de 12) | Normal | Difícil |
| --- | --- | --- | --- |
| razonable (referencia) | 12 | 15 | 9 |
| migrador | 12 | 17 | 11 |
| enjambre | 12 | 14 | 8 |
| habil (habilidades con criterio) | 12 | 14 | 8 |
| tactico (habilidades + órdenes) | 12 | 12 | 8 |
| ordenes (solo órdenes por animal) | 12 | 11 | 2 |
| cazador agresivo | 9 | 9 | 4 |
| defensivo / anidador | 12 | 5 | 1 |

**Por especie** (todos los perfiles, N = 16 por celda; ±25 puntos de ruido por celda): Normal: cazadores de manada 9, gigantes 7, ingenieros 6, colmena 6, enjambre 11, parasitoides 6, abisales 5, arrecife 9, anfibios 4, rapaces 13, carroñeras 8, migratorias 13. Difícil: 4, 2, 3, 3, 5, 6, 3, 4, 1, 7, 4, 9. Fácil (N = 8): 8/8 en 9 especies; Colmena, Enjambre y Parasitoides 7/8.

**Por clase** (N = 48): Normal terrestres 46 %, insectos 48 %, acuáticos 38 %, aves 71 %; Difícil 19 %, 29 %, 17 %, 42 %. **No quedó parejo**: las aves ganan ≈ 25 puntos más que las demás clases y los terrestres y acuáticos siguen bajos en Difícil. Especies más débiles: Anfibios (4/16 en Normal y 1/16 en Difícil) y Gigantes (2/16 en Difícil).

**Lo que las estrategias «no económicas» pierden por diseño de las actitudes** (no se rebalanceó): el cazador agresivo (actitud Atacar contra rivales mientras está alimentado) y el defensivo (Reunir ante amenazas) ganan 38 % y 21 % en Normal contra 63 % del razonable. En actitud Atacar o Reunir el animal no come ni pone huevos mientras tenga un blanco o esté reunido (`!tgt` y `st !== 'rest'` en `think`), así que el bot se queda en 9-11 animales de media (nacidos por partida en Normal: cazador 27, defensivo 30, contra 55 del razonable y 16 de población media). Las **órdenes por animal usadas sin parar por un bot** (ordenes: 11/24 y 2/24; tactico 12/24 y 8/24) tampoco ayudan: un animal con orden de mover o atacar no come ni se reproduce mientras la cumple. En Normal el bot «ordenes» emitió 231 órdenes por partida y hubo 119 desobediencias (por hambre < 8: 57, por heridas: 23, por pánico: 22, por agotamiento: 17); nació 38 contra 55 del razonable. Una persona que las use poco no tiene ese problema; esto mide el costo de intervenir de más (la desobediencia por hambre, nueva, evita al menos que la obediencia mate de hambre).

## 4. Causas de derrota
**Por clase** (partidas no ganadas = extinción o sin terminar; causa = la más frecuente entre las últimas 12 muertes si se extinguió, o la más frecuente de toda la partida si quedó sin terminar):

| Clase | No ganadas | Hambruna | Rival | Depredación (lobo/lucio) | Frío | Fuego |
| --- | --- | --- | --- | --- | --- | --- |
| Terrestres | 65 | 61 | 4 | 0 | 0 | 0 |
| Insectos | 59 | 43 | 10 | 4 | 1 | 1 |
| Acuáticos | 70 | 51 | 18 | 1 | 0 | 0 |
| Aves | 42 | 33 | 8 | 1 | 0 | 0 |

**Por especie, extinciones** (de 32 partidas Normal + Difícil con los 8 perfiles): Cazadores 12 (11 hambre, 1 rival), Gigantes 11 (11 hambre), Ingenieros 21 (20 hambre, 1 rival), Colmena 22 (21 hambre, 1 rival), Enjambre 15 (7 hambre, 4 lobos, 3 rival, 1 frío), Parasitoides 18 (13 hambre, 4 rival, 1 fuego), Abisales 3 (3 hambre), Arrecife 13 (5 hambre, 7 rival, 1 lucio), Anfibios 26 (18 hambre, 8 rival), Rapaces 10, Carroñeras 17, Migratorias 7 (hambre casi siempre).

**Muertes propias por partida, por especie** (media de las 32 partidas): hambruna 11-31, rivales 0,3-22 (Enjambre 22, Colmena 12,7, Parasitoides 15, Arrecife 10, Anfibios 10), depredadores salvajes 0,4-4,8, frío ≤ 0,5, fuego ≤ 2,3, jefe (oso) ≤ 0,2. La columna «hambrientos al morir» (hambre < 25 en el momento de morir, 11-25 por partida) es casi igual a las muertes por hambre; no separé cuántas de las bajas por rival ya eran de animales famélicos.

**Por perfil** (muertes propias por partida; entre paréntesis las partidas no ganadas por causa principal):

| Perfil | Dif. | Gana | Hambruna | Rival | Depredación | Frío | Fuego | Causa principal de derrota |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| razonable | Normal | 15/24 | 17,8 | 7,2 | 1,5 | 0,1 | 0,1 | hambre 7, rival 2 |
| razonable | Difícil | 9/24 | 30,8 | 10,2 | 3,9 | 0,2 | 0,5 | hambre 11, rival 4 |
| cazador | Normal | 9/24 | 10,3 | 2,0 | 1,6 | 0,0 | 0,0 | hambre 9, rival 3, depredador 3 |
| cazador | Difícil | 4/24 | 12,9 | 3,7 | 2,2 | 0,3 | 0,1 | hambre 17, depredador 1, rival 2 |
| defensivo | Normal | 5/24 | 16,0 | 3,5 | 1,8 | 0,2 | 0,1 | hambre 17, rival 2 |
| defensivo | Difícil | 1/24 | 17,5 | 1,5 | 3,2 | 0,6 | 0,2 | hambre 22, depredador 1 |
| migrador | Normal | 17/24 | 20,5 | 11,8 | 2,0 | 0,1 | 0,8 | hambre 5, rival 2 |
| migrador | Difícil | 11/24 | 31,1 | 19,9 | 3,8 | 0,3 | 1,1 | hambre 8, rival 4, frío 1 |
| enjambre | Normal | 14/24 | 22,9 | 6,0 | 2,5 | 0,3 | 2,8 | hambre 8, fuego 1, rival 1 |
| enjambre | Difícil | 8/24 | 26,5 | 9,5 | 3,8 | 0,4 | 0,4 | hambre 12, rival 4 |
| habil | Normal | 14/24 | 23,3 | 10,5 | 2,3 | 0,2 | 0,4 | hambre 7, rival 3 |
| habil | Difícil | 8/24 | 25,8 | 8,8 | 2,8 | 0,6 | 0,4 | hambre 10, rival 6 |
| ordenes | Normal | 11/24 | 11,0 | 7,6 | 1,8 | 0,2 | 1,2 | hambre 12, rival 1 |
| ordenes | Difícil | 2/24 | 13,8 | 3,7 | 2,6 | 0,3 | 0,0 | hambre 18, depredador 1, rival 3 |
| tactico | Normal | 12/24 | 15,5 | 3,1 | 1,2 | 0,1 | 0,4 | hambre 12 |
| tactico | Difícil | 8/24 | 24,5 | 11,2 | 2,0 | 0,3 | 0,7 | rival 3, hambre 13 |

**Conclusión**: el juego se pierde por **hambre** (≈ 80 % de las derrotas), no por depredación, frío ni jefe. Es una consecuencia directa de que Normal y Difícil multipliquen el hambre propia ×3,3 y ×3,4: es el verdadero nivel de dificultad. No lo toqué más allá de lo necesario.

## 5. Alarma: diagnóstico, rediseño y evidencia
**Antes**: +3 ± 4,7 en un escenario cerrado y «sin utilidad demostrada» en partidas completas. Causa: daba −25/35/45 % de daño y una reunión forzada de 3 s, y costaba 8-10 de energía a cada animal; el escenario viejo (8 cazadores contra 3 lobos) lo ganaba la manada igual.
**Rediseño** (sección 4 de `docs/ERA2-ACCIONES.md`): información y huida. Los aliados a < 210/260/320 quedan en alerta 8/10/12 s: ante un depredador que **está cazando** reaccionan a 147/158/168 en vez de 105; lo que ve uno lo saben todos los alertados (red de aviso, `alertWide`); huyen ×1,15/1,25/1,35 **sin gastar más energía**; −15/20/25 % de daño; el enemigo pierde el bono de emboscada contra ellos; sin peligro a la vista se reúnen 3 s. Además: **los animales propios ya no huyen contra la pared** (la mitad de las bajas del escenario eran animales acorralados en el borde; ahora la dirección de huida se desvía hacia el centro a menos de 90 px del borde).
**Primeras mediciones en partidas completas fueron NEGATIVAS** y llevaron a dos correcciones por causa (no por porcentaje): (1) con 8-10 de energía a TODA la manada en cada uso (12 usos por partida) la energía media bajaba de 61 a 52 y los colapsos subían de 10,4 a 15,2 → 40 % de victorias con Alarma contra 60 % sin ella (N = 96, bot `habil`); (2) la alerta hacía huir de depredadores que solo paseaban → ahora solo ante un depredador en estado `hunt`. Costo final 4/4/5 de energía **solo a los animales del radio**, enfriamiento 35/32/28.

**Escenario cerrado, N = 96 semillas pareadas por celda** (`tests/era2-alarma.js 96`; 6 animales vs 5 lobos con Camuflaje que parten a 150 px, 30 s, la Alarma se tira cuando el primer lobo está a < 240; diferencia = con − sin; media ± IC95; mejora/empeora de 96):

| Escenario | Sobrevivientes (de 6) | Vida total (en animales) |
| --- | --- | --- |
| Aves migratorias, selva (emboscada) | **+1,07 ± 0,35** (60/19) | **+0,70 ± 0,34** |
| Aves migratorias, pradera abierta | **+1,28 ± 0,45** (58/20) | **+0,94 ± 0,43** |
| Colmena, selva | **+0,40 ± 0,26** (42/19) | **+0,39 ± 0,26** |
| Colmena, abierto | **+0,58 ± 0,33** (40/14) | **+0,58 ± 0,33** |
| Cazadores de manada, selva | **+0,72 ± 0,37** (51/26) | +0,42 ± 0,35 |
| Cazadores de manada, abierto | **+0,86 ± 0,38** (54/22) | **+0,58 ± 0,34** |
| Ingenieros, selva | +0,35 ± 0,31 | +0,13 ± 0,27 |
| Ingenieros, abierto | **+0,59 ± 0,34** (46/24) | +0,44 ± 0,32 |
| Con un oso en vez de lobos (4 especies) | −0,06 ± 0,10 … −0,01 ± 0,14 | ≈ 0 (el oso mata de un golpe: la Alarma no cambia nada) |

IC95 que excluye el 0 en **8 de 12** escenarios (aves, colmena y cazadores contra lobos, en selva y a cielo abierto; los ingenieros a cielo abierto; y los de vida total salvo cazadores en selva e ingenieros en selva); ninguno perjudica de forma significativa. Por componente (aves, selva): completa +1,07 ± 0,35; **solo el aviso +0,16 ± 0,31** (el aviso solo no alcanza: lo que rinde es reaccionar antes y huir más rápido; en la corrida previa con el mismo diseño, sin reacción lejana +0,64 ± 0,37, sin huida rápida +0,76 ± 0,41, sin defensa +1,07 ± 0,42). **Progresión**: nivel 3 **+1,59 ± 0,33** contra +1,07 ± 0,35 del nivel 1.
**Partidas completas** (código final, perfil `habil`, 12 especies, Normal y Difícil, N = 72 por celda, semillas pareadas): con Alarma **68 % [57-78] y 38 % [27-49]**; sin Alarma 69 % [58-79] y 39 % [28-50]; pareado: gana solo con 17, gana solo sin 19; energía media 66 contra 68, colapsos 3,6 contra 3,8; mediana de la victoria 213 s contra 237 s. **Conclusión honesta**: la Alarma tiene un efecto táctico real y medible (+0,3 a +1,2 sobrevivientes de 6, hasta +1,6 en nivel 3) en una emboscada, pero **en una partida completa es neutra** (±3 puntos, dentro del ruido): los depredadores matan pocos animales (1-5 por partida) frente al hambre (15-30), así que lo que salva la Alarma pesa poco. No la rediseñé para que pese más en el balance global (habría sido ajustar un número hasta que dé).

## 6. Las otras cuatro habilidades (partidas completas, perfil `habil`, 12 especies, N = 36 por celda: ±15 puntos de IC95)
`tests/era2-habilidades-bot.sh 3` (condición «ninguna» = ninguna de las 5):

| Condición | Normal | Difícil |
| --- | --- | --- |
| las 5 | 24/36 = 67 % [50-80] | 13/36 = 36 % [22-52] |
| ninguna | 20/36 = 56 % [40-70] | 5/36 = 14 % [6-29] |
| sin Rugido | 30/36 = 83 % [68-92] | 13/36 = 36 % [22-52] |
| sin Camuflaje | 20/36 = 56 % [40-70] | 9/36 = 25 % [14-41] |
| sin Excavar | 23/36 = 64 % [48-78] | 15/36 = 42 % [27-58] |
| sin Alarma | 24/36 = 67 % [50-80] | 14/36 = 39 % [25-55] |
| sin Migrar | 22/36 = 61 % [45-75] | 15/36 = 42 % [27-58] |

Hallazgos: «las 5» rinde +11 (Normal) y **+22 (Difícil)** puntos sobre «ninguna». Camuflaje es la que más ayuda (quitarla: −11/−11). Excavar, Alarma y Migrar no se distinguen de cero (±6). **Rugido: quitarla mejora el resultado en Normal (+16 puntos, 83 % contra 67 %)**; en Difícil da igual. Con N = 36 es el límite de la significancia y **no lo resolví**: sospecho el costo (10-14 de energía por animal y uso) y el uso frecuente del bot; antes del arreglo «cobrar solo a los que participan» la diferencia era mayor (sin Rugido 83 %/50 % contra las 5 con 58 %/33 %, N = 24). En el escenario cerrado (`tests/era2-calidad-sim.js`, N = 24, 3 lobos contra 8 animales): Rugido +17,8 ± 7,9 de vida, Camuflaje +38,9 ± 7,8, Excavar +14,7 ± 9,4, Migrar +12,3 ± 1,8 de hambre+energía (21 de 24 semillas): todas ayudan en el escenario y **ninguna se demostró neta positiva en partidas completas salvo Camuflaje y el conjunto**.
**Niveles y fuentes**: nuevo test de coherencia (12 especies x 5 habilidades): lo que `speciesInfo` dice («nace con X de nivel 2») coincide con `abilityInfo`, y las `fuentes` explican cada nivel ≥ 2 (ok).

## 7. Biomas: partidas completas
Se miden las dos cosas, con Normal, 4 perfiles (razonable, defensivo, migrador, tactico), las 12 especies, n = 1 (N = 48 por bioma; océano N = 36 porque solo entran acuáticos, anfibios y voladores). **A**: la partida empieza en ese bioma (`tests/era2-biomas.js`). **B** (el camino real: *Empezar* es siempre en la pradera): empieza en la pradera y el segundo ecosistema que coloniza es ese (`--col2`). «Antes» = código al empezar el ciclo, con los arreglos de reproducción pero sin tocar los biomas (commit `3f6bb05`).

| Bioma | A antes | A después | B antes (pradera → X) | B después |
| --- | --- | --- | --- | --- |
| Pradera | 25/48 (52 %) | 24/48 (50 %) | — | — |
| Selva | 9/48 (19 %) | 11/48 (23 %) | 29/48 (60 %) | 27/48 (56 %) |
| Desierto | 8/48 (17 %) | 4/48 (8 %) | 3/48 (6 %) | **10/48 (21 %)** |
| Tundra | 4/48 (8 %) | 4/48 (8 %) | 2/48 (4 %) | 3/48 (6 %) |
| Océano | 27/36 (75 %) | 26/36 (72 %) | 7/36 (19 %: acuáticos 7/12, insectos 0/12, aves 0/12) | **12/36 (33 %)**: insectos 3/12, acuáticos 4/12, aves 5/12 |

Con N = 48 el IC95 de una celda mide ±13-20 puntos: **solo se pueden creer los saltos grandes** (océano B, desierto B). Desierto A bajó de 17 % a 8 % pero cae dentro del ruido (IC [3-19] contra [7-30]).

**Problemas hallados (todos por causa mecánica) y qué se hizo**
1. **Océano injugable para voladores (fase 2 imposible)**: sin tierra (el lago ocupa casi todo el mapa) los voladores no podían construir (`placeBuilding` exigía tierra firme) y sin herbívoros terrestres el corral no podía domesticar nada. 0/24 victorias de insectos y aves que llegaban al océano. Arreglo: los voladores y anfibios construyen donde quieran, y en el océano el corral cría peces para todas las especies (los acuáticos crían peces en cualquier bioma; los domésticos acuáticos comen algas). Resultado: 0/24 → 8/24.
2. **Desierto y tundra: la comida no alcanzaba para las metas**. La oferta de plantas (plantas x crecimiento x promedio estacional) era 0,19 y 0,15 de la pradera —la razón real de `npp` (90 y 140 contra 600)— con las mismas metas y el mismo hambre. Los herbívoros salvajes (tope fijo de 26 conejos y 26 escarabajos) se comían las 26 plantas del desierto en 60 s. Arreglo: oferta comprimida a ≈ 0,4 (desierto) y ≈ 0,6 (tundra, con un piso de crecimiento invernal `gmin`), tope de herbívoros salvajes por bioma (`kw`: 0,4 y 0,5), meta de población del 55 % (`kp`) y salvajes que se reproducen con hambre ≥ 75. Resultado: desierto B 6 % → 21 %; **tundra B 4 % → 6 %: no se arregló**.
3. **Tundra, por qué sigue difícil**: con hambre ×3,3 (×1,12 de la tundra) las plantas rebrotan ≈ 0,16 unidades por segundo contra ≈ 0,39 que comen 9 animales: se sostienen ≈ 4 herbívoros. Las derrotas son 37 por hambre y 5 por frío de 44 no ganadas. Dejarla así es una decisión de diseño («inviernos larguísimos») que no tomé yo; si se la quiere jugable hay que bajar el hambre o la meta en ese bioma.
4. **Selva empezando ahí (A)** gana poco (23 %) aunque tiene 4 veces la comida de la pradera: el bot elige la pradera como segundo ecosistema (menos comida) y la fase 1 se completa allí.


## 8. Órdenes por animal y causa/consecuencia (etapa 3, `tests/era2-ordenes.js`)
Verificado con escenarios cerrados (todos ok): **attack** (el animal golpeó 7 veces al objetivo elegido y 0 al más cercano; sin orden, con hambre, ataca al más cercano), **move** (llega sin comer en el camino aunque tenía hambre 25 y plantas a su paso; con un lobo a la vista no huye y avanza 174 px; sin la orden el mismo lobo lo hace huir 57 ticks; con pánico —vida < 30 %— desobedece), **forage** (borra la orden; el hambriento come solo), **desobediencia** por agotamiento (energía 10 < 15), por herida (80 % > 70 %), por pánico y por hambre (4 < 8, nuevo), un animal sano obedece hasta el final. **Lo que no funcionaba y se arregló**: un `move` ordenado se cancelaba por miedo normal (huía igual de un lobo a 100 px); ahora solo el pánico lo cancela; y obedecer una orden podía matar de hambre (ahora el hambre < 8 la cancela).
**Causa y consecuencia**: `Bus.emit('cause', animal, texto, tipo)`; 11 tipos, ≈ 20 frases con los números reales del motor (por ejemplo «Huye de Lobos: ×0,7 de ventaja», «Descansa: energía 12, sin amenazas y con hambre 61», «No se reproduce: hambre 40 < 60», «Herida de lobos: vida −10,4, herida 71 % (velocidad −32 %, fuerza −25 %)»). Límite medido: con 300 animales propios **no más de 3 frases por segundo** de los no seleccionados; el seleccionado recibe sus frases; todas son de animales propios; no cambian el estado (mismo hash con y sin selección). Contrato en `docs/ERA2-ACCIONES.md` §8.

## 9. Verificaciones y rendimiento
- `tests/era2-guardado.js`: OK (determinismo, guardado/continuar, carga de guardado viejo, 0 errores).
- `tests/era2-calidad-sim.js`: OK, incluye el guardado viejo del commit `1bd2b9d`, la coherencia de niveles y el fps (mejor de tres ventanas de 3 s: 45,6 fps con 558 animales; ventanas 45,6 / 35,3 / 38,5).
- `tests/era2-ordenes.js`: OK. `tests/era2-alarma.js 96`: OK (8 de 12).
- **fps**: la meta (≥ 40 con ~570 animales) la cumple el test en esta máquina (sin GPU) con 44,7-46,7 fps en varias corridas **pero es ruidoso**: una corrida inicial del mismo test dio 29,7 fps, otra 39,9 (falló por 0,1 y por eso el test ahora toma la mejor de tres ventanas) y un perfil aparte dio ≈ 21 fps, y esos valores son **iguales con el código del commit anterior** (A/B de 4 corridas: 22,8 y 21,2 fps antes, 20,1 y 20,7 fps después; simulación ≈ 10 ms por paso con 560 animales, dibujo ≈ 3,5-5,5 ms). No hay regresión, pero **el fps depende de la carga de la máquina** y no lo puedo garantizar.

## 10. Qué NO mejoró / NO está verificado
- **Las clases siguen desparejas**: aves 71 %/42 % contra terrestres 46 %/19 % y acuáticos 38 %/17 % (Normal/Difícil). Anfibios (4/16 y 1/16) y Gigantes (7/16 y 2/16) son los más débiles; no encontré una causa mecánica única para ellos (Gigantes: 62 % del tiempo buscando plantas; probé búsqueda activa por hambre y el bocado proporcional a la ganancia: no mejoraron).
- **Tundra y desierto siguen muy difíciles** aun con comida jugable (ver §7).
- **Rugido** podría estar restando en Normal (§6) sin demostrarlo.
- **Con N = 2 por celda** las tablas por especie x perfil no sirven para afirmar nada fino: solo se leen las marginales.
- Los perfiles son bots: **no se jugó con personas**; no se verificó la interfaz de las frases `cause` (la dibuja el agente de interfaz); el audio no se tocó.
- Normal con el bot de referencia (65 % [50-77] en `cal1`, 63 % en `F12`) queda en el borde alto de la meta 40-60; con los 8 perfiles juntos 51 %.
- Las cifras de hambre propia (3,3/3,4) y daño (1,5/2,3) salen de una calibración posterior al arreglo; no son «naturales».
- `tests/era2-bot.js` (bot con clics) no se corrió.

---
# Historial (Calidad 2.0 y anteriores): cifras de código anterior, ya no vigentes

## Cómo se midió
Chromium real (Playwright), partida simulada llamando `__e2.step(.05)` directo, sin dibujar (≈ 1-3 s por partida de 3 min de juego). Semilla distinta por corrida (`S<dificultad>x<i>`); especie inicial rotando entre las **12** (i mod 12, así cada clase y especie tiene el mismo peso); bioma inicial: Pradera (como hace el botón Empezar). Tope de 2400 s (40 min) de juego: lo que ni ganó ni se extinguió es «estancada». «Gana» = completar la fase 2 (fogata, 3 refugios, corral con 3 domésticos, tótem); «fase 2» = cumplir la fase 1 (población, 4 evoluciones, 2 nidos, 2 ecosistemas).
Scripts: `tests/era2-balance-bot.js` (bots), `tests/era2-balance-run.js` (una tanda), `tests/era2-balance-all.sh` (4 procesos en paralelo), `tests/era2-balance-agg.js` (tabla; IC95 de Wilson). Los resultados crudos quedan en `tests/.balance-out/` (ignorado por git). Las muertes por causa salen de una copia diagnóstica del HTML con un contador en `kill()` (no cambia la simulación).
Los bots usan su propio azar (nunca `R()`), así que no alteran la simulación.

Bots:
- **razonable**: elige el rasgo con mejor puntaje según sus efectos; pone huevos cada 6 s; construye 2 nidos de a uno; cuando el ecosistema ya está colonizado viaja al más productivo compatible; en fase 2 construye fogata, 3 refugios, corral, tótem en cuanto alcanza la Tradición; habilidades con criterio (Rugido con ≥2 enemigos cerca, Alarma con manada ≥5 y amenaza fuerte, Excavar con vida media <50 %, Camuflaje con vida <65 % o jefe, Migrar si hay hambre moderada y pocas plantas cerca; las que gastan energía no se usan si la manada ya tiene hambre media <40).
- **pasivo**: evoluciona (primera oferta) y pone huevos cada 10 s; sin nidos ni Planeta (por diseño no puede ganar: la fase 1 pide 2 nidos y 2 ecosistemas).

## Hallazgos (antes de tocar nada)
- La Era 2 tenía **solo Fácil y Normal** (el encargo hablaba de tres: se agregó Difícil).
- Con el bot razonable **100 % de victorias en Fácil y en Normal** (N=36 c/u, sin extinciones, ganan en ≈ 3 min de juego). Normal solo cambiaba rivales ×2, lobos ×2, meta de población 28 y plantas ×1 en vez de ×1,35: no presionaba.
- Probé palancas sueltas en Normal con el razonable (N=24): hambre ×1,3 → 96 %; ×2 → 83 %; daño ×2,2 + lobos ×4 → 100 %. La manada es muy robusta porque se reproduce rápido (huevo 14 s, 7 s en nido). Solo cuando se combinan hambre alta, meta de población más grande, plantas más lentas y rivales que evolucionan más rápido aparecen fracasos.
- Pasivo (antes): 0 victorias (esperable); Fácil 19 % de extinciones y 81 % estancadas; Normal 39 % de extinciones. Causas de muerte propia por partida: hambre y rivales (≈ 95 cada uno en Fácil) mucho antes que lobos (≈ 5). Cae sobre todo insectos y acuáticos.

## Antes / después (bot razonable)
| Dificultad | Antes (N=36) | Después (N=48) | Meta |
| --- | --- | --- | --- |
| Fácil | gana 100 % [90-100], extinción 0 % | gana **100 %** [93-100], extinción **0 %** [0-7], estancadas 0 % | ≥ 70 % y < 10 % ext → **cumple** |
| Normal | gana 100 % [90-100], extinción 0 % | gana **50 %** [36-64], extinción 38 % [25-52], estancadas 13 % | 40-60 % → **cumple** |
| Difícil | no existía | gana **19 %** [10-32], extinción 60 % [46-73], estancadas 21 % | 15-35 % → **cumple** |

IC95 de Wilson entre corchetes. El «antes» con el bot v1 (habilidades sin gastar criterio de hambre) y el «después» con el bot v2 + constantes finales. Control cruzado: el juego original con el bot v2 dio Fácil 97 % y Normal 94 % (N=36), o sea el «antes» no depende del bot.

Hitos (medianas, s): Fácil: nido 1 a los 14, nido 2 a los 22, 4 evoluciones a los 100, población a los 60, 2.º ecosistema a los 76, fase 2 a los 101, victoria a los **174** (≈ 3 min). Normal: 15 / 21 / 96 / 130 / 92 / 161 / victoria **234**. Difícil: 16 / 21 / 90 / 210 / 104 / 253 / victoria **314**. Hoy una persona hábil tarda poco: no se alargó la partida de Fácil.

Por clase del bot razonable (después): Fácil 12/12 en cada clase. Normal: terrestres 8/12, aves 8/12, acuáticos 5/12, **insectos 3/12** (9 extinciones). Difícil: terrestres 4/12, aves 4/12, acuáticos 1/12, **insectos 0/12** (11 extinciones). Las especies más débiles con este bot: Parasitoides, Enjambre, Depredadores abisales (0/4 en Normal). **No se corrigió el desbalance por clase** (insectos pequeños con 7-10 de vida mueren a manos de los rivales).

## Pasivo (después, N=36)
| Dificultad | Victorias | Extinción | Estancadas vivas a 40 min |
| --- | --- | --- | --- |
| Fácil | 0 (por diseño) | **8 %** (antes 19 %) | 92 % |
| Normal | 0 | 81 % (antes 39 %) | 19 % |
| Difícil | 0 | 83 % | 17 % |
Meta (Fácil sin extinguirse en la mayoría): **cumple** (92 % sobrevive). Efecto colateral aceptado: en Normal/Difícil un jugador que no anida ni coloniza se extingue casi siempre; así conviene que sea. Ojo: el pasivo nunca completa la fase 1, así que el hallazgo de AUDITORIA («no cumple la fase 1») sigue siendo cierto; no es un bug de balance sino que anidar y colonizar son requisitos.

## Qué se cambió y por qué
Todo en `eras/era2-animales.html`, ahora hay una tabla `DIFFS` (también en `window.__e2.DIFFS`, se puede pisar desde las pruebas) y botón **Difícil** en el menú:

| | pop | rivales | lobos×| plantas | hambre propia | daño recibido | rasgos rivales cada | Tradición |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fácil (antes: 20, 1, ×1, ×1,35, 1, 1) | 20 | 1 | ×1 | ×1,35 | ×0,9 | ×0,8 | ×1,5 (más lento) | ×1 |
| Normal (antes: 28, 2, ×2, ×1) | 36 | 2 | ×3 | ×0,8 | ×2,6 | ×1,2 | ×0,55 (más rápido) | ×1 |
| Difícil (nuevo) | 38 | 2 | ×4 | ×0,7 | ×3 | ×1,5 | ×0,5 | ×1 |

Notas: «hambre» multiplica el consumo de tus animales (no el de los salvajes); «lobos» multiplica lobos y peces grandes iniciales; la meta de población máxima posible en fase 1 es 40 (tope de `capOf`), por eso 36 y 38. Los valores salieron de barridos de ≈ 15 combinaciones con N=24-36; los de Normal y Difícil están en el borde de ruido (±14 puntos con N=48), así que **un cambio de ±0,2 en hambre mueve Normal entre ≈ 50 y 70 %**: si se toca, volver a medir.
Fácil: hambre ×0,9, daño ×0,8 y rivales más lentos solo para que el pasivo sobreviva (extinción 19 → 8 %).

Habilidades (costos; `ABD`): Rugido energía 6→4; Excavar 5→3; Migrar 8→4 y duración 8→5 s; Alarma: la reunión forzada dura 3 s (antes 6; el bonus de defensa sigue 6 s) y resiste 25 % (antes 20 %). Motivo: con las dificultades altas gastar energía de una manada con hambre la mataba, y Migrar/Alarma mantenían a los animales lejos de la comida.
Hook nuevo en `__e2`: `placeMig`, `DIFFS`.

## Equilibrio de las 5 habilidades (razonable, N=48, constantes finales)
| Condición | Normal gana | Difícil gana |
| --- | --- | --- |
| con las 5 | 50 % [36-64] | 19 % [10-32] |
| ninguna | 54 % | 29 % |
| sin Rugido | 54 % | 27 % |
| sin Camuflaje | 56 % | 17 % |
| sin Excavar | 52 % | 19 % |
| sin Alarma | 67 % | 29 % |
| sin Migrar | 63 % | 40 % |
Ninguna habilidad es dominante: quitar cualquiera cambia ≤ 4 puntos (Rugido, Camuflaje, Excavar), dentro del ruido. **Pero tampoco ayudan**: Alarma y Migrar parecen restar (+13 a +21 puntos al quitarlas; en el límite de significancia con N=48), y «ninguna» rinde igual o mejor que «las 5». Antes de los cambios era peor (con 5 habilidades 31 % vs ninguna 50 % en Difícil, N=36). Conclusión honesta: las habilidades están en un punto «no rompen el juego», pero no demostré que valgan la pena para este bot; no sé cuánto de eso es del bot (un humano las usa con mejor lectura) y cuánto del diseño.

## Verificaciones
- `tests/era2-guardado.js`: OK (determinismo, guardado/continuar).
- Consola: 0 errores en 4 corridas de 10 min por dificultad con el bot razonable y en las 3 corridas de `tests/era2-bot.js` que terminaron (en las tandas grandes el runner registra `pageerror`/`console.error` pero no mostré esa salida).
- `tests/era2-bot.js` (bot real con clics, 10 min): pasa en las tres dificultades, pero es **intermitente**: a veces falla por una carrera del arnés (un diálogo, p. ej. «Tu especie despertó», tapa un botón y el clic expira). Ocurre igual con el HTML original (≥ 3 de 8 corridas) y con Fácil ahora es más frecuente porque la fase 2 llega en ≈ 100 s. No es un error del juego; no se tocó el arnés (fuera de mi alcance).

## Límites
- Todo depende del bot; no se jugó con personas. Un humano suele ser menos eficiente en el principio y más inteligente al elegir rasgos.
- Solo bioma inicial Pradera; los otros biomas se visitan al colonizar.
- No se midió la fase 2 por separado más allá de los hitos; no hay Difícil guardada en partidas viejas (los guardados con `diffI` 0/1 siguen cargando; el 2 es nuevo).
- Las cifras científicas del juego no se tocaron.

---
# Calidad 2.0 (módulo simulación): re-medición con energía, heridas, órdenes y habilidades con niveles
Mismo método (bot razonable v3: sus habilidades se gatillan con energía media > 35 en vez de hambre; semillas `S<dif>x<i>`, 12 especies rotando). «Antes» = HTML del commit base 1bd2b9d re-medido hoy (N=48, reproduce lo de arriba). Scripts: `tests/era2-balance-run.js` (ahora acepta `SPECS=a,b,c`), `tests/era2-habilidades-bot.sh`.

## Cambios de equilibrio hechos
Hambre propia (`hd`): Normal 2,6 → **3,2**, Difícil 3 → **3,25** (las mecánicas nuevas facilitaron el juego; se recompensó con hambre). Otros cambios mecánicos que mueven el balance: costo de energía al moverse, descanso, heridas y contragolpes, reproducción con hambre ≥ 75 y energía ≥ 40, blanco chico/voladores difíciles de golpear, bocado de planta proporcional al tamaño, **Parasitoides pasan a omnívoros** (néctar + huevos ajenos; sin eso 0/12 en Normal).

## Antes / después (bot razonable, N=48)
| Dificultad | Antes | Después | Meta |
| --- | --- | --- | --- |
| Fácil | 100 %, ext. 0 % | **100 %** [93-100], ext. **0 %** | ≥ 70 % y < 10 % → cumple |
| Normal | 50 % [36-64], ext. 38 % | **46 %** [33-60], ext. 40 % | 40-60 % → cumple |
| Difícil | 19 % [10-32], ext. 60 % | **27 %** [17-41], ext. 54 % | 15-35 % → cumple |

Por clase (ganadas de 12): Normal antes ter 8, ins **3**, acu 5, ave 8 → después ter 4, ins **5**, acu 4, ave 9. Difícil antes ter 4, ins **0**, acu 1, ave 4 → después ter 2, ins **3**, acu 1, ave 7. Los insectos mejoraron pero siguen por debajo de las aves; **los terrestres empeoraron** (Normal 8 → 4, Difícil 4 → 2) y no logré corregirlo sin romper lo demás. Colmena 0/4 en Normal. Con N=48 cada celda por clase es de 12 partidas: ±25 puntos de ruido.

## Utilidad de las habilidades con el bot (N=24 por condición; IC95 de Wilson ±18 puntos)
| Condición | Normal gana | Difícil gana |
| --- | --- | --- |
| las 5 | 46 % | 33 % |
| ninguna | 38 % | 17 % |
| sin Rugido | 42 % | 21 % |
| sin Camuflaje | 54 % | 17 % |
| sin Excavar | 38 % | 33 % |
| sin Alarma | 54 % | 25 % |
| sin Migrar | 38 % | 13 % |
Hoy «las 5» rinde +8 (Normal) y +16 (Difícil) puntos sobre «ninguna» (antes: −19 en Difícil). Migrar y Rugido ayudan en ambas dificultades; Camuflaje y Excavar, solo en Difícil; **Alarma sigue sin demostrar utilidad con este bot** (quitarla no empeora). Todo dentro del ruido de N=24: no es prueba estadística.

Efecto aislado (escenario cerrado, 3 lobos contra 8 animales, 15 s, pareado por semilla, N=24, `tests/era2-calidad-sim.js`): vida del grupo con vs sin la habilidad: Rugido +28 (±5,8; mejora 20/24), Camuflaje +40 (±5,8; 22/24), Excavar +29 (±6,8; 19/24), Alarma +3 (±4,7; 13/24, el más flojo), Migrar +13,5 de hambre+energía (±1,9; 22/24).

## No verificado
Sin jugadores humanos; el bot no aprovecha los niveles ni las órdenes por animal. `tests/era2-bot.js` (bot con clics) no se corrió esta vez. Biomas distintos de Pradera solo se midieron en escenarios cerrados, no en partidas completas.
