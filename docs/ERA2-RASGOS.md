# Era 2: rasgos con consecuencia mecánica (Ciclo 4, módulo balance/simulación)

Auditoría de los 36 rasgos (`TRAITS`) y de los 20 atributos que modifican (`defP()`): para cada atributo, dónde lo lee la simulación. Un rasgo es **decorativo** si todos sus atributos son decorativos.

## Atributos: efecto real

| Atributo | Dónde actúa | Estado |
| --- | --- | --- |
| `r` ritmo de puesta | espera entre huevos (`think`, `doLay`) | real |
| `m` daño recibido | `dmg` | real |
| `cF` hambre | `think` (hambre por segundo) | real |
| `hunt` ataque | `matchup` (daño) y velocidad de persecución | real |
| `d` velocidad | `spdOf` | real (un +50 % de `d` es +17,5 % de velocidad: `FXD` lo traduce) |
| `def` defensa | `dmg` (tope 80 %) | real |
| `stealth` sigilo | `threatOf` (a qué distancia te ven los depredadores) y emboscada | real |
| `cold` · `drought` · `fire` | frío, sequía/calor, incendio | real |
| `nest` | curación y eclosión en el nido | real |
| `inst` | Instinto ganado | real |
| `search` | vista (`think`) | real |
| `eff` | comida que aprovecha cada bocado | real |
| `coop` | fuerza en grupo (`matchup`); **solo ofensiva** | real, limitado |
| `scav` carroña | busca restos | **antes decorativo para herbívoros** (la rama de carroña solo existía para carnívoros y omnívoros). **Corregido**: un herbívoro con `scav` ≥ 0,3 (olfato B, digestión B, pirofila A, simbionte digestivo) aprovecha carroña |
| `water` | **antes no se leía en ningún lado** (aletas, eco, metamorfosis, ingeniería A). **Corregido**: velocidad × (1 + 0,5·`water`) dentro del agua (`spdOf`); solo rinde si la especie se mueve en el agua (acuáticos, anfibios, voladores) |
| `plague` | **antes no se leía** (camadas, colmena, defensa química B, imitación B). **Corregido**: nuevo evento **Brote de enfermedad** (selva y pradera, 25 s, solo con ≥ 12 animales): los animales con 5 o más aliados a menos de 90 pierden 1 % de su vida máxima por segundo × `plague` × min(1,6; aliados / 6). Premia dispersarse (Expansión alta) y rasgos de defensa química; castiga lo amontonado (colmena, camadas). Se avisa por `Bus 'brote'` y por toast (no usa `G.ev`: la interfaz solo conoce sequía e incendio) |
| `fert` | **antes no se leía** (ingeniería). **Corregido**: las plantas a menos de 90 de un nido, refugio o fogata rebrotan (1 + 4·`fert`) veces más rápido (+60 % con ingeniería) |
| `mind` | solo decide el camino hacia la Era 3 al ganar (`win`) | **marcado**: no cambia la partida, sí la Era 3 |

Ningún rasgo quedó **totalmente** decorativo: los que dependían solo de `water`/`plague`/`fert` tenían además otros atributos reales; los atributos huérfanos eran la parte «prometida» de su descripción.

## Oportunidad y limitación por rasgo (`traitInfo(id, variante)`)

La interfaz y el evento `evolve` reciben, **calculados de la misma tabla `fx` que usa la simulación** (no escritos a mano):

- `efectos`: `[{ k, etiqueta, pct, bueno, texto }]`, por ejemplo Alas: «velocidad +28 %», «daño evitado +5 %», «hambre +15 %» (el costo «Alto gasto de energía» es el `cF`).
- `abre`: las prioridades a las que ayuda (por atributo: `r` → Reproducción, `search` y `stealth` → Exploración, `d` → Expansión, `def`/`coop`/`hunt`/`nest` → Defensa, `eff`/`cF` → Comida), las habilidades a las que suma un punto de nivel (`ABL[...].tr`) y los biomas en los que ayuda (`BIOMES[...].help`).
- `limita`: los efectos que empeoran (`bueno: false`).
- `costo`, `efecto`: el texto original; `hibrido`, `maestria`: si esta elección cerró un híbrido o una maestría; `habilidades`: nivel actual de las 5 habilidades.

## Evento `evolve`

`Bus.emit('evolve', opcion, info)`: `opcion = { id, v? }` (v = 'A' o 'B' si es una variante) e `info = traitInfo(...)` más `hibrido`, `maestria` y `habilidades`. Se emite **después** de aplicar el rasgo. El arte y el audio que ya escuchan `evolve` (ráfaga y stinger) siguen funcionando: solo reciben un argumento más.

## Efecto visual (lo hace el módulo de arte)

Los 36 rasgos aparecen en `eras/era2-arte.js` (tabla `TV`: un trazo por rasgo) y la variante A/B se le pasa al trazo. **No tienen dibujo propio** las 12 maestrías, los 12 híbridos ni los efectos de las prioridades. Esos datos están en `me.mast`, `me.hyb` y el evento `evolve`.

## Ciclo 4 · módulo Evolución y claridad: capacidades
Además de su tabla `fx` (porcentajes), **cada rasgo da una capacidad** (`CAPS` en `eras/era2-animales.html`; nivel 1 con el rasgo, 2 con su variante, 3 con la maestría del hilo; los híbridos dan o suben una, `HYBCAP`) que cambia cómo se juega: terreno (vuelo, nado, orilla), presas (cazar más grande, un herbívoro que caza, embestida, parálisis), defensas (coraza, cripsis, colores de advertencia, señuelo, repelente), cría (camada, crianza, larvas, castas) y clima (abrigo, sangre caliente, letargo, reserva, pirófila). Ramas que se excluyen (`EXCL`), transición a tierra de los acuáticos (`lobuladas` → `pulmones` → `amniota`, o `radiadas`) y el dibujo de cada cambio: ver `docs/ERA2-EVOLUCION.md`. `traitInfo` suma `capacidad`, `cierra`, `terreno`, `nuevas` y `transicion`.
