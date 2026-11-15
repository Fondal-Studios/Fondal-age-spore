# Era 3: economía, rivales, Bus y datos para la interfaz (Ciclo 4, módulo simulación)

Todo está en `eras/era3-tribus.html` (una IIFE). Las cifras son las del código; las pruebas que las miden son `tests/era3-ciclo.js` (circuito, decisiones, rivales, Bus, partida vieja) y `tests/era3-ciclo-run.js` (balance con bots, intervalos de Wilson).

Diseño: Fondal Age Spore es un juego de **estrategia**. El jugador **administra** una tribu (prioridades, oficios fijados, obras, mejoras, diplomacia, tecnología); las personas se organizan y trabajan solas.

## 1. Circuito y qué utilidad tiene cada recurso

| Paso | Qué pasa en la simulación | Dato visible |
| --- | --- | --- |
| Recolectar | Recolectores (bayas), cazadores (presas), artesanos (madera/piedra) y exploradores (puntos del mapa) | `tribeInfo().food.prod.{rec,caz,agr,comercio}`, `wood.in`, `stone.in`, `know.rate` (por segundo, media móvil ≈10 s) |
| Producir | Agricultores en huertos y corrales (comida constante, también en invierno); Taller (+15 % / +25 % a todo); cocinar rinde ×1,3 / 1,45 / 1,6 según el nivel de la fogata | `food.perWorker`, `buildingInfo(b).fx` |
| Almacenar | Almacén de 3 niveles (+30 / +50 / +80 raciones y menos deterioro); la comida que pasa el tope se echa a perder | `food.stock/cap`, `food.cons.deterioro` |
| Construir | Obra por 4 etapas; cada etapa paga ¼ del costo y no avanza sin madera/piedra (la obra se detiene, alerta `obra`); los constructores ayudan a juntar el material que falta | `works[]`, `buildingInfo(b).{stage,prog,stall,eta,crew}` |
| Expandirse | Más refugios y mejoras (camas), tótem (cohesión), exploración (nuevos claros), territorio frente a los clanes | `housing`, `cohesion`, `explore`, `rivalInfo()` |
| Adaptarse | Invierno (frío, comida ×0,12 en bayas), lobos, saqueos con motivo, hacinamiento (enfermedad) | `needs`, `threats`, `alerts` |
| Progresar | Tecnologías (9), niveles de edificio, 5 objetivos + camino de ciudad | `goals`, `paths`, `win` |

Recursos que no eran decorativos y los que se usan: **Conocimiento** (tecnologías, +1,5 por lugar descubierto, comercio de saberes), **Tradición** (`trad`: límite de cohesión; el Templo la pide), **madera** y **piedra** (obras, mejoras, tratos), **raciones** (comer, tratos, regalos, tributo implícito en saqueos). `G.pressure` es presión de caza (regula la reaparición de presas). Nada quedó sin uso.

### Población y necesidades
- **Crecimiento** (`growthCheck(ad, pop)` → `{ok, why[]}`): nace un niño cada 22-34 s si hay ≥ 2 adultos, comida > 1,2×población + 2 y `población < camas + 8`. Sin camas la tribu se estanca y con más de 7 personas sin techo se acumula enfermedad (`G.x3.dis`, 0,75/s por persona de más, ×2 en invierno; a 60 brota y daña 3 personas). Causa visible: `housing.growthBlockers`.
- **Necesidades** (`tribeInfo().needs`): `hambre` (% de gente con hambre), `frio` (personas sin techo ni fuego), `seguridad` (fuerza defensiva), `cohesion` (población − límite), `refugio` (población − camas); cada una con `lvl` = nivel de la alerta correspondiente.
- **Cohesión**: igual que antes (Dunbar): sobre el límite la producción cae 30 % y se separa un grupo cada 70 s.

## 2. Oficios y prioridades

Oficios (`RORDER`): `rec`, `caz`, `agr`, `art`, `con`, `def`, `cha`, `exp` (+ `libre`). Cada uno trae `ROLES[r].d` (qué hace), `ROLE_APT[r]` (aptitud) y un máximo (`roleInfo(r).max`):

| Oficio | Para qué | Límite |
| --- | --- | --- |
| `agr` Agricultor | Trabaja huertos y corrales. Solo existe si hay uno terminado | cupo de los huertos/corrales (2 por nivel 1, 3 por nivel 2) |
| `def` Defensor | Vigila el campamento, pelea contra lobos y saqueadores (14 de daño/s, ×1,3 contra lobos, ×1,5 con Lanza, + empalizada) | 40 % de los adultos |
| `exp` Explorador | Descubre los 6 puntos del mapa (+1,5 Conocimiento, claro de bayas / veta de piedra / caza / bosque) y suma inteligencia sobre los clanes; en invierno se queda | 4 |
| `con` Constructor | Obras y mejoras; si todas están detenidas junta material | 35 % |
| `cha` Chamán | Conocimiento (0,05/s) | 30 % |

**Prioridades** (`G.x3.prio`, `setPrio(area, 0|1|2)`, áreas `comida, construccion, defensa, exploracion, saber`, niveles bajo/normal/alto = ×0,4/×1/×1,8). `targetCounts(adultos)` calcula cuántos adultos quiere cada oficio (reparto por mayor resto): base comida 56 %, construcción 25 %, defensa 7 %, exploración 4 %, saber 9 %; se adapta sola a la **amenaza** (×1,4 si algún clan está dispuesto a atacar, ×1,9 con saqueo en preparación o en curso), a la **hambruna** (comida ×1,5 con estrés > 60), al **invierno** sin camas (construcción ×1,3) y a que haya algo por explorar. Una tribu chica (< 10 adultos) no tiene defensores ni exploradores salvo prioridad alta; los defensores solo se forman en escuadra (0 o ≥ 2, porque solos mueren); con 6 adultos o más hay un chamán si «saber» ≥ normal.

`rebalance()` cada 4 s: asigna los «libres» y, si el déficit real de un oficio es ≥ 0,75 persona, mueve a una persona no fijada (30 s de enfriamiento por persona, nunca baja comida/caza/agricultura de `max(3, 60 % de los adultos)`, o 45 % si la producción cubre 110 % del consumo y hay comida para 2 min). `setRole(r, ±1)` es el control manual: **fija** a la persona (`p.pin`); `releasePins()` la suelta. `G.auto = false` apaga la organización automática.

## 3. Edificios con niveles

`BLD[k].lv[i]` = `{n, w, s, time, req, fx, d}`. El costo se paga **por etapas** (¼ cada una); `req` son las tecnologías para llegar a ese nivel.

| Edificio | Nivel 1 | Nivel 2 | Nivel 3 |
| --- | --- | --- | --- |
| Fogata (`fogata`, la del inicio) | Fogata: abriga/espanta lobos 95 px, cocina ×1,3 | Hogar de piedra (4 madera, 4 piedra; Fuego + Piedra): 130 px, ×1,45 | Horno de arcilla (4, 6; Cerámica): 160 px, ×1,6 |
| Refugio | Choza (6): 4 camas | Casa (8, 2; Piedra): 6 camas | Casa de barro (8, 4; Cerámica): 8 camas |
| Almacén | Almacén (10, 2): +30 raciones | de cestas (8, 2; Cestería): +50, deterioro ×0,8 | Granero (8, 4; Cerámica): +80, ×0,6 |
| Taller (Piedra) | +15 % productividad | de herramientas (6, 6; Lanza): +25 % | |
| Huerto (Agricultura) | 0,12/s base, 2 agricultores, invierno ×0,3 | con surcos (6, 2; Marcas): 0,16/s, 3 agricultores, invierno ×0,5 | |
| Corral (Domesticación) | 0,09/s, 2 agricultores | grande (8, 2; Marcas): 0,12/s, 3 | |
| Tótem | +25 cohesión, Tradición 0,05/s | tallado (6, 6; Marcas): +35, 0,09/s | |
| Empalizada (Lanza) | cerca del campamento (≤ 150 px): pérdidas de saqueo ×0,6, daño ×0,8, defensores +25 % | Muralla de barro (10, 6; Cerámica): ×0,35, ×0,65, +50 % | |

Producción de un huerto: `out × (1 + 0,6 × (equipo − 1)) × prodMul` por segundo, con `equipo` = agricultores cerca (1) + recolectores sin bayas (0,6).

API: `placeBuilding(k, {x,y})` (no a menos de 34 px de otro edificio), `upgradeBuilding(b | índice)`, `upgradeCheck(b)` → `{ok, why}`, `buildingInfo(b | índice)` →

```
{i, k, n, lvl, maxLvl, done, upgrading, x, y, prog, stage (1-4), stages: 4, paid, stall: null|'madera'|'piedra', crew, eta (s) | null,
 target: {n, lvl} | null, fx, effect (texto del nivel actual), workers, crewCap,
 next: null | {n, effect, fx, cost:{wood,stone}, time, req:[claves], reqMissing:[claves], canUpgrade, why}}
```

## 4. Rivales

Dos clanes (`G.x3.clans`, `CLAN_SITES`): Clan del Este (880,150, radio 120) y Clan del Norte (620,48, radio 105; su zona toca el bosque de (560,110)). Personalidad por semilla (distintas entre sí) o `newGame(seed, {pers:[a,b]})`.

| | comerciante | belicoso | orgulloso |
| --- | --- | --- | --- |
| Relación inicial | 15 | −10 | 5 |
| Ataca si | relación < −30, o estás casi indefenso (tamaño > fuerza×2,5) | te ve débil (tamaño > fuerza×1,3) con relación < 55, o relación < −20, o < −5 sin que lo frene tu defensa | relación < −3 (muy baja) o < 12 sin que lo frene tu defensa |
| Tamaño de saqueo / enfriamiento | ×0,7 / 240 s | ×1,15 / 110 s | ×1 / 150 s |
| Comercio | ×1,25 | ×0,8 | ×1 |
| Regalo | ×1,3 | ×1 (×0,5 si te ve débil) | ×0,8 |
| Alianza desde | 45 | 55 y solo si tu defensa ≥ 0,8 de su saqueo | 50 |
| Desgaste de la relación | normal | normal | ×2 |

`tribeStr()` = (1,8·defensores^1,5 + 1,2·cazadores)·(1 + defensa de la empalizada), medida con duelos (`tests/era3-balance.md`: 1 defensor pierde contra 4 saqueadores, 2 ganan a 4 y pierden contra 6, 3 ganan a 10); `raidSize(c)` = `min(round(0,45·DF.pop·size), round((3 + ⌊t/DF.rg⌋ + DF.raidAdd)·size))` (un clan no manda más guerreros que su gente). Solo prepara saqueo un clan a la vez; entre saqueos pasan `110 · DF.raidMul` s (×0,8 si te ve débil); el primero no antes de `DF.raid0`. Cada saqueador que llega al campamento se lleva el 7 % de la comida (máx. 4 raciones, × pérdida de la empalizada); los defensores que quedan en minoría se apartan en vez de inmolarse. Todo saqueo se **prepara 20 s** (`raidPrep`, alerta `saqueo`) con su motivo en texto («te ve débil (tu defensa 3,0 contra sus 7 guerreros)»).

**Relación** (`c.rel`, −100 a 100, `G.relation`/`G.allied` reflejan al Clan del Este para compatibilidad): cada cambio pasa por `relAdd(c, d, causa)` y queda en `c.why[causa]` (se desvanece con τ = 90 s). Causas (`RELWHY`): `tiempo` (−0,01/s hasta −30), `alianza` (desgaste `DF.rel`/s; si baja de 15 se rompe), `territorio` (−0,6/s por edificio u obra en su zona), `recursos` (−0,05/s por persona trabajando en su zona), `exploradores` (−0,02/s), `comercio`, `regalo`, `saber`, `saqueo` (−3 al repeler su saqueo), `debil` (belicoso: −0,03/s mientras te ve débil), `emboscada`. Aliados y quienes tienen **derecho de paso** (`pass`, 120 s) no generan tensión por territorio. Los clanes también recolectan en su zona (bayas y madera) y compiten por ella.

**Tratos** (`dealList(c)` → `[{id, n, give, get, risk, rel, ok, why}]`, `deal(clanId, id)`): `f2w` raciones por madera, `f2s` raciones por piedra, `w2f` madera por raciones, `saber` raciones por Conocimiento (relación ≥ 30), `gift` regalo (5 raciones; rinde menos si ya regalaste: −15 % por regalo, se recupera lento), `paso` derecho de paso (6 raciones, 2 min), `ally` alianza. Los intercambios con relación < −10 corren riesgo de emboscada (`−rel/150`, máx 40 %), mostrado antes. `dip('trade'|'gift'|'ally', clan=0)` sigue existiendo.

**Inteligencia** (`c.intel` 0-100): exploradores dentro de su zona +4/s por explorador, cada trato +3. Con ≥ 40 se ve su fuerza de saqueo y su motivo; con ≥ 70 la cuenta atrás al próximo.

`rivalInfo()` → por clan `{id, n, pers, persN, persD, x, y, r, rel, relLevel ('amistoso'|'cordial'|'neutral'|'tenso'|'hostil'), allied, pass, intel, power|null, view, causes:[{key, d, txt}], summary, raid:{prep, n, eta, motivo, sent, repelled}, hist, deals}`.

## 5. Datos para la interfaz

`tribeInfo()` (solo lectura, barato: ≈ 4 Hz es suficiente):
`{t, season, seasonName, seasonIn, year, diff, pop, adults, children, roles{rec,caz,agr,art,con,def,cha,exp,libre}, pinned, targets{...}, prio{comida,construccion,defensa,exploracion,saber}, auto,`
`food{stock,cap,prod{rec,caz,agr,comercio},cons{comer,deterioro,saqueo,regalos,comercio},net,perPerson,perWorker{rec,caz,agr},runway,farmSlots,hungry}, wood{stock,in,out,trees}, stone{stock,in,out,rocks}, know{stock,rate}, trad{value}, cohesion{pop,lim},`
`housing{cap,pop,unsheltered,exposed,growthOk,growthBlockers[]}, needs{hambre,frio,seguridad,cohesion,refugio}{v,lvl}, defense{str,def,caz,empalizada}, buildings[buildingInfo], works[buildingInfo], threats[{kind: 'lobo'|'saqueo'|'saqueo_inminente'|'invierno'|'hambre'|'enfermedad', ...}], alerts[{kind,l,text,x,y,t}],`
`goals[{id,t,ok,v,max}], paths{jefatura,mercado,templo}{v,max,ok,t}, path, pathAuto, explore{found,total,pois[]}}`.
`roleInfo(r)` → `{r, n, count, pinned, target, max, rate, perWorker, apt, d, available}`. `targetCounts(adultos)`, `foodRunway()`, `growthCheck()`.

**Objetivos de progreso** (`goals` en `G.g`, ahora con `id`, `v`, `max`): población (`DF.pop`), 4 tecnologías clave (Fuego, Cerámica, Agricultura, Marcas), 3 refugios + almacén + tótem, huerto, inviernos vividos (`DF.win`); cuando todos están en `ok` se funda la ciudad. **Camino de ciudad** (`choosePath('jefatura'|'mercado'|'templo'|null)`): sin elegir, sale solo como antes (≥ 2 saqueos repelidos sin pérdidas o rechazados → Jefatura; ≥ 3 intercambios → Mercado; resto Templo). Elegido agrega un 6.º objetivo medible y un bono: Jefatura (rechazar 2 saqueos y tener empalizada), Mercado (tratos ×1,2; 3 intercambios y un clan con relación ≥ 30), Templo (Tradición ×1,3 y Conocimiento ×1,15; 20 de Tradición). `pathProgress()` da el avance de los tres.

## 6. Bus (contrato)

`__e3.Bus.on(tipo, fn)` devuelve la función para darse de baja; `Bus.off`. Los argumentos son objetos vivos de `G`: **solo lectura**. Un suscriptor que lanza no rompe la partida (`Bus.err`, `Bus.last`). La simulación nunca lee nada del Bus. El hash de estado es idéntico con y sin suscriptores (`tests/era3-ciclo.js`, bloque 5).

| Evento | Argumentos | Cuándo |
| --- | --- | --- |
| `work` | `(p, tipo, objetivo, fase)` | `tipo`: `gather chop mine build hunt farm pray`; `fase`: `'start'` (al llegar) o `'end'` (ciclo completo; solo `gather chop mine hunt`) |
| `carry` / `drop` | `(p, {k:'food'|'wood'|'stone', amt, src?})` | recoge / deposita |
| `eat` | `(p)` | una comida |
| `hit` | `(origen, destino, daño, motivo)` | `motivo`: `lobo`, `saqueo`, `cacería`, `defensa` (daño de tu gente a lobos y saqueadores, acumulado cada 0,5 s). Hambre y frío son continuos: no emiten `hit`, sí `death` |
| `kill` | `(víctima, origen)` | muere persona (por enemigo), lobo, saqueador o presa |
| `death` | `(p, motivo)` | `hambre frío lobo saqueo cacería enfermedad` |
| `born` | `(p)` | |
| `build` | `(edificio, avance 0..1)` | al empezar una obra/mejora y al cruzar cada etapa (0, 0,25, 0,5, 0,75) |
| `built` | `(edificio, esMejora)` | obra o mejora terminada |
| `tech` | `(clave)` | |
| `season` | `(0..3)` | cambio de estación |
| `raidPrep` | `(clan, n, motivo)` | empieza la preparación de 20 s |
| `raid` | `(n, clan)` | llegan los guerreros |
| `raidEnd` | `(sinPérdidas, clan, rechazado)` | `rechazado` = nadie llegó al campamento o cayó la mitad de los guerreros (cuenta para el camino de Jefatura: `G.x3.drove`); `sinPérdidas` es el `raidsOk` de siempre |
| `trade` / `gift` / `ally` / `deal` | `(clan, id, trato)` / `(clan, relación)` / `(clan)` / `(clan, id[, false])` | `deal` también para el paso y la caravana emboscada (`false`) |
| `rel` | `(clan, delta, causa)` | cada cambio de relación (frecuente: 1/s por causa activa) |
| `role` | `(p, nuevo, anterior)` | cambio de oficio (manual o automático) |
| `prio` | `(área, nivel)` | |
| `discover` | `(punto, explorador)` | |
| `fission` / `disease` | `(n)` | |
| `path` | `(clave|null)` | |
| `alert` | `{kind, level:'warn'|'crit'|'ok', text, x, y}` | solo al cambiar de nivel |
| `win` / `lose` | `(camino)` / `(causas)` | |

**Alertas con histéresis** (`kind`: `hambruna`, `frio`, `refugio`, `cohesion`, `recurso_madera|piedra|bayas`, `obra`, `saqueo`, `rival0`, `rival1`): umbral de encendido ≠ umbral de apagado (`lvlOf`), un aviso no baja de nivel antes de 10 s y no se reenciende como `warn` antes de 10 s de apagado. Las activas están en `G.x3.al` (`tribeInfo().alerts`).

## 7. Compatibilidad
- `evo_save3_v1` sigue en `v:1`. El estado nuevo es `G.x3` (prioridades, `fl` flujos, clanes, puntos de interés, alertas, `dis`, `gap`, `path`) más campos por persona (`pin`, `rc`, `ex`), por edificio (`lvl`, `paid`, `upg`, `stall`) y por saqueador (`cl`). `ensureX3()` completa una partida vieja con valores por defecto sin tocar `R()` (usa un PRNG local sembrado con `G.seed`): se probó con un guardado del commit base (`tests/fixtures/era3-save-v1-base.json`).
- Determinismo: solo `R()`; el mundo de clanes y puntos usa `mkRng` local. `Math.random`/`Date` no se usan en `update`.
- Linaje: `evo_lineage` sin cambios de forma; se agrega `path` al escribirlo. La Era 4 lo lee igual.
- Ganchos de prueba nuevos en `window.__e3`: `Bus, tribeInfo, rivalInfo, buildingInfo, roleInfo, upgradeBuilding, upgradeCheck, setPrio, releasePins, choosePath, deal, dealList, targetCounts, rebalance, alerts, growthCheck, tribeStr, raidSize, raidGate, spawnRaid, clanOf, relAdd, foodRunway, workItems, farmSlots, shelterCap, foodCap, cohLimit, mkPerson, setRoleOf, ensureX3, discoverPoi, pathProgress, selectB, x3` y `newGame(seed, {pers:[a,b]})`.
