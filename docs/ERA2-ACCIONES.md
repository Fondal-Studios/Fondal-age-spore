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
| **Huir** | Velocidad ×1,3 (≈ 2 energía/s) | Escapa si es más rápido; **el rebaño huye junto** (avisa a los vecinos a 80, que huyen 2,5 s aunque no vean al depredador) | La presa más lenta o cansada es alcanzada; esquiva un golpe con prob. `0,08 + (vel presa − vel atacante)/160` | Depredador a < 105 y especie huidiza / animal no valiente |
| **Reproducir** | Hambre −32 (−25 con el botón), **energía −18**, **vulnerable 8 s** (recibe +35 % de daño y va 15 % más lento, `a.vul`) | Un huevo (nace en 14 s, 7 s en nido) | El padre queda expuesto | **Hambre ≥ 75 y energía ≥ 40**, adulto, herida ≤ 0,5, tope de población. En escasez de comida los salvajes y rivales tardan hasta ×2,2 más |
| **Migrar** (habilidad) | 6 energía por animal | Corre ×1,6/1,9/2,2 durante 5/6/8 s **sin gastar energía al moverse**; al llegar a un lugar con plantas (≥ 6 plantas > 0,5 en 80 px = riqueza 1) cada animal recupera hasta 12/20/28 de energía y de hambre (proporcional a la riqueza, mín. 40 %) | Gasta el turno de comer; en nivel 1 es poco si el destino es pobre | Evento `arrive` al llegar |

Colapso: un animal con energía 0 queda aturdido y vuelve con 6 de energía (descansa). Se avisa por `exhausted`.

## 2. Órdenes por animal (`issueOrder(ids, ord)`)
`a.ord = {k, x, y, tid, t}` (se guarda). Se consume en `think`:
- `{k:'move', x, y}`: va al punto (14 s de plazo). Llega y se libera.
- `{k:'attack', tid}`: persigue y ataca a ese animal (30 s). Se cancela si muere, o si se aleja a > 300 (evento `orderEnd`). Rechazada (devuelve 0) si el objetivo no existe o es tuyo.
- `{k:'forage'}` o `null`: vuelve a lo automático.
- **Desobediencia**: con pánico (depredador cerca y vida < 30 % o energía < 10), energía < 15 o herida > 0,7, el animal cancela la orden (siempre por pánico; 60 % cada 1,5 s por agotamiento/herida) y emite `disobey(a, 'pánico'|'agotado'|'muy herido'); además pasa a descansar si tiene poca energía.
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
| Alarma | colmena, manada, migratoria / Manada, Colmena, Feromonas, Lenguaje / Colonial | aliados a < 210: reunión 3 s, −25 % de daño 6 s; 8, cd 30 | radio 260, −35 %, pegan +10 %; 8, cd 28 | radio 320, −45 %, +20 %, +15 energía; 10, cd 25 |
| Migrar | aves, enjambre / Alas, Migración, Patas, Aletas / — | ×1,6 durante 5 s, llegada +12; 6, cd 30 | ×1,9, 6 s, +20; cd 28 | ×2,2, 8 s, +28 y −20 % de daño al migrar; cd 26 |

`Bus.emit('ability', id, mine, nivel, params)`; los anillos (`G.rings[].lv`, `max`, `c`) cambian de tamaño y color por nivel. Alarma ya no reúne a todos: solo a los del radio (`G.rally.r`, `a.ala`, `a.alv`).

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

## 6. Herencia (`evo_lineage`)
Con rama y nivel ≥ 1 de la Era 1: **rasgo inicial** (Depredador: Colmillos y garras; Parásito: Veneno; Fotosintético: Digestión eficiente; Colonial: Manada), nivel 3: segundo rasgo (Visión nocturna, Feromonas, Reserva de agua, Migración); +5 % de vida y +3 % de velocidad por nivel; +1 (nivel 1-2) o +2 (nivel 3) puntos a la habilidad de la rama (Rugido, Camuflaje, Excavar, Alarma); Instinto inicial +2 por nivel (ya existía). `G.me.lin = {branch, tier, mutCount, col, tags:['rama-pred','nivel-3','garra','veterano']}` (accesorio por rama: garra / aguijon / hoja / corona; `col` es el color de la rama). Al terminar la Era 2 se escribe `evo_lineage` con el mismo formato y `era2.abil` (nivel de cada habilidad) y `era2.tags`.

## 7. Eventos nuevos del Bus
`hit(a,b,dmg,{mult,why})`, `miss(a,b)`, `rest(a)`, `exhausted(a)`, `injured(a,inj)`, `disobey(a,motivo)`, `orderEnd(a,motivo)`, `scarcity(nivel,disp)`, `migration(sp,dir,{x,y})`, `arrive(animales,riqueza)`, `ability(id,mine,nivel,params)`.
