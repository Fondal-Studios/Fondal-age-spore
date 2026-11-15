# Era 2: acciones, consecuencias y datos para la interfaz (Calidad 2.0, módulo simulación)

Todo está en `eras/era2-animales.html`. Las cifras son las del código; las pruebas que las miden están en `tests/era2-calidad-sim.js`.

## 1. Energía y heridas
Cada animal tiene `a.en` (0-100, **70 si falta**, así cargan las partidas viejas) y `a.inj` (0-1). Se guardan solos con el animal.

| Acción | Costo | Beneficio | Riesgo | Condición |
| --- | --- | --- | --- | --- |
| **Moverse** | `1,0 × (vel/60)^1,5 × (r/8)^0,35 × bioma` energía por s (caminar a ritmo normal ≈ 1,3/s; correr/huir ×1,3 ≈ 2/s; vagar ≈ 0,3/s). Al moverse solo recupera 0,35/s | Llega a la comida, huye, caza | Con energía < 30 va hasta 30 % más lento; con 0 **colapsa** (aturdido 2,5 s, evento `exhausted`) | siempre |
| **Descansar** (`a.rs`, estado `rest`) | Nada (quieto) | +5 energía/s, +1 vida/s, las heridas curan ×2 | Quieto: lo alcanza un depredador (si aparece uno, deja de descansar y huye) | Empieza con energía < 40, **sin amenaza** y hambre ≥ 55 (o si desistió de una caza); termina con energía ≥ 75 o hambre < 40. En postura Atacar solo si energía < 20. Evento `rest` |
| **Comer** | 1,1 s por bocado | Planta: hambre +24, energía +5. Carroña: hambre +22, energía +8. Huevo: +15 (+26 los insectos), energía +4. La comida de la aldea: hambre +35 | Quedarse parado en el pasto | hambre < 62 (propios) / 68 (salvajes). Un bocado de planta gasta `0,25 × (r/9)` (0,7 a 1,25) de la planta: los chicos pastan menos |
| **Cazar** | Perseguir cuesta como correr; cada golpe −1,2 energía; **golpe fallado −3 y +0,2 s** | La presa muerta deja carroña con comida `30 + 4·r` (proporcional al tamaño) y +1 Instinto | La presa **contragolpea** (prob. 8-55 % según su fuerza×tamaño vs. la tuya; 40 % de eso si huye) y deja **herida**; los golpes fallan según `matchup().miss` | Con energía < 20 el depredador **desiste** 8 s (`a.giv`) y descansa |
| **Herida** (`a.inj`) | Un golpe que quita ≥ 5 % de la vida máxima suma `daño/vidaMáx × 1,5` | — | −45 % de velocidad a herida 1, −35 % de fuerza, no puede reproducirse con herida > 0,5, no hace caso a órdenes con herida > 0,7 (evento `injured` al pasar 0,3) | Cura 0,004/s (×4 en nido, ×2 con fogata/refugio y descansando; ×0,3 sin comer; ×0,7 en la selva) |
| **Huir** | Velocidad ×1,3 (≈ 2 energía/s) | Escapa si es más rápido; **el rebaño huye junto** (avisa a los vecinos a 80, que huyen 2,5 s aunque no vean al depredador) | La presa más lenta o cansada es alcanzada; esquiva un golpe con prob. `0,08 + (vel presa − vel atacante)/160` | Depredador a < 105 (alarma: hasta 105 × vis) y especie huidiza / animal no valiente. **Tus animales no huyen contra la pared**: a menos de 90 px del borde la dirección de huida se desvía hacia el centro (medido: la mitad de las bajas por huida eran animales acorralados en el borde) |
| **Reproducir** | Hambre −32 (−25 con el botón), **energía −18**, **vulnerable 8 s** (recibe +35 % de daño y va 15 % más lento, `a.vul`) | Un huevo (nace en 14 s, 7 s en nido) | El padre queda expuesto | **Hambre ≥ 60 (`REPRO_H`) y energía ≥ 40 (`REPRO_E`)**, adulto, herida ≤ 0,5, tope de población. Antes era 75: medido, a los 60 s la población de los terrestres bajaba de 9,8 a 7,5 y no llegaban a colonizar a tiempo (ver `tests/era2-balance.md`). En escasez de comida los salvajes y rivales tardan hasta ×2,2 más |
| **Migrar** (habilidad) | 6 energía por animal | Corre ×1,6/1,9/2,2 durante 5/6/8 s **sin gastar energía al moverse**; al llegar a un lugar con plantas (≥ 6 plantas > 0,5 en 80 px = riqueza 1) cada animal recupera hasta 12/20/28 de energía y de hambre (proporcional a la riqueza, mín. 40 %) | Gasta el turno de comer; en nivel 1 es poco si el destino es pobre | Evento `arrive` al llegar |

Colapso: un animal con energía 0 queda aturdido y vuelve con 6 de energía (descansa). Se avisa por `exhausted`.

## 2. Órdenes por animal (`issueOrder(ids, ord)`)
`a.ord = {k, x, y, tid, t}` (se guarda). Se consume en `think`:
- `{k:'move', x, y}`: va al punto (14 s de plazo) **sin distraerse**: no come en el camino y **no huye de un depredador normal**; solo el pánico (vida < 30 % o energía < 10 con el depredador a < 105) la cancela. Llega y se libera (frase «Llegó al punto: vuelve a lo automático»).
- `{k:'attack', tid}`: persigue y ataca a ese animal (30 s). Se cancela si muere, o si se aleja a > 300 (evento `orderEnd`). Rechazada (devuelve 0) si el objetivo no existe o es tuyo.
- `{k:'forage'}` o `null`: vuelve a lo automático.
- **Desobediencia**: con pánico (depredador cerca y vida < 30 % o energía < 10), energía < 15, herida > 0,7 o **hambre < 8**, el animal cancela la orden (siempre por pánico; 60 % cada 1,5 s por agotamiento/herida) y emite `disobey(a, 'pánico'|'agotado'|'muy herido'|'hambriento'); además pasa a descansar si tiene poca energía.
- Un animal con orden `attack` ignora el rally, las migraciones y la construcción; huye solo por pánico.

## 3. Combate legible
`matchup(a, b)` → `{mult, why, parts, miss}`. `mult` es el multiplicador **real** del daño de `hit`:
dieta (+10 % cazador nato carnívoro vs no carnívoro; −15 % herbívoro), tamaño (hasta +35 % más grande / −30 % más chico), rasgos de ataque, aliados cerca (con rasgos sociales), blanco en grupo (hasta −20 %, ×1,6 en el océano), emboscada entre árboles (+10 %; ×1,3 en la selva), presa anfibia en el agua (−20 %), calor del desierto y frío de la tundra (−10 % sin resistencia), cansado (< 30 energía), herido, asustado, emboscada camuflada (Camuflaje 2-3: +25/+40 %), Grito de alarma, presa vulnerable (+30 %) o aturdida (+25 %). `miss` (prob. de fallar): blanco chico (`(r_atq/r_blanco − 1,3) × 0,25`), presa voladora vs. terrestre (+20 %), presa que huye. `why` es una frase en español con los 3 factores más fuertes.
- `Bus.emit('hit', a, b, dmg, {mult, why})`, `Bus.emit('miss', a, b)`.
- `G.x2.combat`: anillo de los últimos 30 combates **en los que participa tu especie o domésticos**: `{t, att, def, ai, di, dmg, mult, why, kill, mine}`.
- `G.x2.casualties` (últimas 40 bajas propias): `{t, id, sp, cause, kind}`; `G.x2.casN`: conteo por `kind` (`hambre`, `frio`, `fuego`, `depredador`, `rival`, `otro`).
- `speciesInfo(sp|clave)` → `{adv:[...], dis:[...]}` para las 12 especies y las 7 salvajes. `biomeInfo(clave)` → `{adv, dis, mech}`.
- `bioInfo(a)` ahora trae `en`, `inj`, `ordLabel`, `threats[].mult/why`, `effects` (cansado, herido, vulnerable, descansando…), `species`, `biome`, `lin` y `abilities[]` con `nivel`, `costo`, `cdMax`, `efecto`, `proximo`.

## 4. Habilidades con niveles 1-3 (`abilityInfo(id)`)
Nivel = 1 + (puntos ≥ 1) + (puntos ≥ 3). Puntos: +1 si la especie es afín, +1 por rasgo afín (máx. 2), +1 si tu linaje es de la rama afín (+2 con nivel 3 de linaje). Cuestan **energía de cada animal** (antes Instinto o hambre: Alarma gastaba Instinto y frenaba las evoluciones; Migrar y Rugido gastaban hambre).

| Habilidad | Afín (especies / rasgos / rama) | Nivel 1 | Nivel 2 | Nivel 3 |
| --- | --- | --- | --- | --- |
| Rugido | carnívoros / Colmillos, Cuernos, Aguijón, Veneno / Depredador | aturde 3 s, alcance 120, empuja 26; costo 10, cd 25 | 4 s, 150, 34; 12, cd 24 | 5 s, 180, 42, asusta 5 s (pegan −30 %); 14, cd 22 |
| Camuflaje | parasitoides, carroñeras, arrecife / Camuflaje, Imitación, Señuelo, Nido / Parásito | 10 s; 12, cd 40 | 14 s y ataques camuflados +25 %; 12, cd 38 | 18 s y +40 %; 14, cd 35 |
| Excavar | ingenieros, colmena, anfibios / Madriguera, Hibernación, Reserva, Piel / Fotosintético | 6 s bajo tierra: sin daño, cura 12 %/s, +3 energía/s, cura heridas; 8, cd 35 | 8 s, 15 %/s; 8, cd 32 | 10 s, 18 %/s; 10, cd 30 |
| Alarma | colmena, manada, migratoria / Manada, Colmena, Feromonas, Lenguaje / Colonial | alerta 8 s a los aliados a < 210. **Ante un depredador que está cazando** reaccionan a 147 (en vez de 105), huyen ×1,15 **sin gastar más energía** y lo que ve uno lo saben todos los alertados (red de aviso, también los que no lo ven huyen hasta 1,15 × el alcance); −15 % de daño; el enemigo pierde el bono de emboscada contra ellos; sin peligro a la vista se reúnen 3 s. Costo 4 de energía por animal, cd 35 | 10 s, radio 260, reacción 158, ×1,25, −20 %, pegan +10 %; 4, cd 32 | 12 s, radio 320, reacción 168, ×1,35, −25 %, pegan +20 %, +15 energía; 5, cd 28 |
| Migrar | aves, enjambre / Alas, Migración, Patas, Aletas / — | ×1,6 durante 5 s, llegada +12; 6, cd 30 | ×1,9, 6 s, +20; cd 28 | ×2,2, 8 s, +28 y −20 % de daño al migrar; cd 26 |

`Bus.emit('ability', id, mine, nivel, params)`; los anillos (`G.rings[].lv`, `max`, `c`) cambian de tamaño y color por nivel. Alarma ya no reúne a todos: solo a los del radio (`G.rally.r`, `a.ala` = segundos de alerta, `a.alv` = nivel). Rediseño (Ciclo 3): antes solo daba −25/35/45 % de daño y una reunión forzada, y su efecto medido era +3 ± 4,7; ahora es información + huida (ver `tests/era2-alarma.js`). Costo recalibrado con partidas completas: a 8-10 de energía por animal y uso frecuente la energía media de la manada bajaba 9 puntos y los colapsos subían 46 %.

## 5. Ecosistema y biomas
- **Escasez**: cada 3 s se mide la fracción de plantas > 0,5 del hábitat de tu especie. `Bus 'scarcity'(nivel, disponible)`: nivel 1 < 40 %, nivel 2 < 20 % (con histéresis). `G.x2.scar`, `G.x2.av`. Efecto: salvajes y rivales tardan hasta ×2,2 más en reproducirse.
- **Migraciones** (`Bus 'migration'(sp, dir, {x,y})`, `G.x2.mg`): en pradera y tundra, en cada cambio de estación los ciervos y conejos se mueven 32 s hacia el **bosque** (invierno: abriga 30 % del frío) o hacia el cuadrante de 120 px con más pasto (resto del año), si queda a > 90.
- **Rebaño que huye junto**: ver «Huir».
- **Mecánica propia de los biomas** (`BMECH`, multiplicadores sobre la pradera):

| Bioma | Mecánica |
| --- | --- |
| Pradera | vista ×1,05; los rebaños migran (bosque/pasto); el bosque abriga |
| Selva | vista ×0,8; heridas curan ×0,7; emboscada ×1,3 en el bosque; más plantas |
| Desierto | energía por movimiento ×1,3; recuperación ×0,85; −10 % de ataque sin resistencia a la sequía; hambre por calor |
| Tundra | velocidad ×0,93; energía por movimiento ×1,1; hambre ×1,12; rebaños migran; frío constante |
| Océano | energía por movimiento ×0,75; velocidad ×1,05; vista ×1,1; protección de grupo ×1,6 |

Medido en `tests/era2-calidad-sim.js` (mismo animal, misma marcha): energía tras 5 s desierto < pradera < océano; distancia tundra < pradera < océano; curación de heridas selva < pradera.

- **Comida por bioma** (Ciclo 3, medido con partidas completas): `BIOMES[x].plants × grow × promedio estacional` = oferta relativa a la pradera (1): selva ≈ 4, océano (algas) ≈ 2, desierto ≈ 0,45, tundra ≈ 0,6 (con `gmin: .6`, piso de crecimiento invernal: hay liquen bajo la nieve). Antes desierto 0,19 y tundra 0,15 (la razón real de `npp`, 90 y 140 contra 600) con las mismas metas y el mismo hambre: 3-4 % de victorias como segundo ecosistema. `kw` = capacidad de los herbívoros salvajes (desierto 0,4, tundra 0,5): con 26 conejos y 26 escarabajos en 26 plantas se las comían en 60 s. Los salvajes y rivales se reproducen con hambre ≥ 75 (`REPRO_H_WILD`); el umbral de 60 es de tu especie.
- **Océano**: sin herbívoros terrestres ni tierra. Voladores y anfibios pueden construir en cualquier lugar y, en el océano, el corral cría peces para todas las especies (antes un volador que llegaba a la fase 2 en el océano no podía construir ni domesticar: 0/24 victorias).
- **Meta de población por nivel trófico** (`popGoal()`): los carnívoros necesitan el 70 % de la meta de población (un depredador vive de presas, que son pocas; los abisales del lago, con ≈ 22 peces, no pasaban de 15-28).
- **Corral acuícola**: si tu especie construye en el agua (`hab: 'water'`), el corral domestica **peces** (herbívoros acuáticos, r ≥ 4) en vez de herbívoros terrestres; los domésticos acuáticos comen algas. Antes un acuático que llegaba a la fase 2 en el océano (sin herbívoros terrestres) no podía completar la meta.

## 6. Herencia (`evo_lineage`)
Con rama y nivel ≥ 1 de la Era 1: **rasgo inicial** (Depredador: Colmillos y garras; Parásito: Veneno; Fotosintético: Digestión eficiente; Colonial: Manada), nivel 3: segundo rasgo (Visión nocturna, Feromonas, Reserva de agua, Migración); +5 % de vida y +3 % de velocidad por nivel; +1 (nivel 1-2) o +2 (nivel 3) puntos a la habilidad de la rama (Rugido, Camuflaje, Excavar, Alarma); Instinto inicial +2 por nivel (ya existía). `G.me.lin = {branch, tier, mutCount, col, tags:['rama-pred','nivel-3','garra','veterano']}` (accesorio por rama: garra / aguijon / hoja / corona; `col` es el color de la rama). Al terminar la Era 2 se escribe `evo_lineage` con el mismo formato y `era2.abil` (nivel de cada habilidad) y `era2.tags`.

## 7. Eventos nuevos del Bus
`hit(a,b,dmg,{mult,why})`, `miss(a,b)`, `rest(a)`, `exhausted(a)`, `injured(a,inj)`, `disobey(a,motivo)`, `orderEnd(a,motivo)`, `scarcity(nivel,disp)`, `migration(sp,dir,{x,y})`, `arrive(animales,riqueza)`, `ability(id,mine,nivel,params)`.
`cause(animal, texto, tipo)`: ver la sección 8.

## 8. Causa y consecuencia: evento `cause` (contrato para arte, UI y audio)
La simulación explica por qué un animal propio hace algo y qué le pasó con una frase corta y real (con los números del motor). Se emite por el Bus y **no modifica la simulación** (mismo hash con y sin animal seleccionado; `tests/era2-ordenes.js`).

```js
Bus.on('cause', (animal, texto, tipo) => { ... });   // animal: el objeto animal (propio, nunca doméstico); texto: string en español rioplatense (≤ 140 caracteres); tipo: ver abajo
```

| tipo | cuándo se emite | ejemplo real |
| --- | --- | --- |
| `descanso` | empieza a descansar (energía < 40, sin amenaza, hambre ≥ 55 o desistió de una caza) | «Descansa: energía 12, sin amenazas y con hambre 61» |
| `huida` | empieza a huir de un depredador visible | «Huye de Lobos: ×0,7 de ventaja» (con Alarma: «… (alarma: reacciona a 147 y corre ×1,2 sin gastar más energía)») |
| `caza` | empieza a perseguir una presa (o ataca por orden), desiste de una caza o cobra una presa | «Persigue a conejos: ×1,2 de ventaja» · «Desiste de cazar: energía 18 < 20, va a descansar» · «Cazó ciervos: dejó carroña de 66 (+Instinto)» |
| `comida` | un bocado | «Come carroña: hambre 40 → +22, energía +8» |
| `reproduccion` | pone un huevo; o **solo para el animal seleccionado**, por qué no se reproduce | «Pone un huevo: hambre −32, energía −18, vulnerable 8 s» · «No se reproduce: hambre 40 < 60» |
| `orden` | recibe, cumple o pierde una orden | «Obedece: va al punto (no se distrae salvo pánico)» · «Obedece: ataca a lobos (persigue 30 s)» · «Orden cumplida: el objetivo cayó, vuelve a lo automático» · «Llegó al punto: vuelve a lo automático» |
| `desobediencia` | cancela la orden | «Desobedece: pánico (vida 22 %, energía 40)» · «Desobedece: agotado (energía 10 < 15)» · «Desobedece: muy herido (herida 80 % > 70 %)» |
| `herida` | un golpe que deja herida | «Herida de lobos: vida −10,4, herida 71 % (velocidad −32 %, fuerza −25 %)» |
| `fatiga` | colapsa por energía 0 | «Colapsa: energía 0, aturdido 2,5 s y luego descansa» |
| `clima` | **solo seleccionado**: pasa frío | «Pasa frío: 0,3 de vida por s sin nido ni fogata» |
| `hambre` | **solo seleccionado**: hambre 0 | «Muere de hambre: −2,2 de vida por s» |

Frecuencia (para no saturar con cientos de animales): el animal **seleccionado** (`selId`/`selIds`) como mucho una frase por tipo-clave cada 1,2 s; los demás animales propios, una por clave cada 4-12 s y **como máximo 3 frases por segundo de juego en total**. Las frases «solo seleccionado» no se emiten para los demás. Con 300 animales el tope medido es 3 por segundo (`tests/era2-ordenes.js`). Recomendación para la interfaz: mostrar la frase sobre el animal o en «Qué está pasando» con vida de 2-3 s, color por `tipo`, y priorizar las del animal seleccionado.
