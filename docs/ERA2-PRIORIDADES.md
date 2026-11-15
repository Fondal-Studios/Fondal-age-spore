# Era 2: prioridades estratégicas (Ciclo 4, módulo balance/simulación)

El director decidió que la Era 2 es **estrategia**: el jugador dirige una especie, una población y un territorio con **prioridades**, no un animal. La interfaz escribe las prioridades; la simulación las lee y cambia a **todos los animales propios** (no a los domésticos, rivales ni salvajes).

## Contrato

- Estado: `G.x2.prio = { comida, reproduccion, expansion, defensa, exploracion }`, cada una `0` (baja) | `1` (normal) | `2` (alta). Si `G.x2.prio` no existe, o falta una clave, o el valor no es 0/1/2, vale **1**. Con todo en 1 el estado de la simulación es **idéntico** al de antes (se verifica por hash en `tests/era2-prioridades.js`). Se guarda con la partida (vive en `G.x2`) y las partidas viejas cargan con todo en 1.
- La simulación solo **lee**: `prioRefresh()` copia los niveles al empezar cada tick (también al llamar a `bioInfo` y `doLay`, por si el juego está en pausa). La interfaz escribe con su propia función.
- Datos para la interfaz (`window.__e2`): `prioInfo()` devuelve `[{ id, n, niveles: [texto de baja, de normal, de alta], actual }]` con los números exactos; `prioLevels()` devuelve los niveles **efectivos** (con la actitud Reunir ya integrada); `PRIO` y `PRK` son la tabla y el orden.
- **Actitudes existentes (Comer / Atacar / Reunir)**: no se duplican. `Comer` es el comportamiento por defecto. `Reunir` equivale a **Defensa alta** (formación y respuesta a amenazas) y además lleva al grupo al nido: con la actitud `gather` el nivel efectivo de defensa es 2 aunque `prio.defensa` sea otro. `Atacar` sigue siendo una actitud aparte (persecución del enemigo más cercano) y no tiene prioridad equivalente. Ninguna prueba de interfaz depende de que las prioridades reemplacen a las actitudes; si la interfaz quiere mostrar una sola cosa, puede presentar «Reunir» como el atajo de Defensa alta.

## Efecto exacto (`PRIO` en `eras/era2-animales.html`)

Cada fila es un trato: lo que se gana se paga con otra cosa. Valores `[baja, normal, alta]`.

| Prioridad | Qué cambia | baja | normal | alta | Beneficio | Costo |
| --- | --- | --- | --- | --- | --- | --- |
| **Comida** | hambre por debajo de la cual buscan comida · reacción al depredador mientras pastorean (× distancia) | 52 · ×1,08 | 62 · ×1 | 76 · ×0,85 | alta: comen más seguido (hambre media más alta, menos riesgo de hambruna) | alta: pastorean con la cabeza gacha (reaccionan 15 % más tarde al peligro), se agota más pasto, y mientras buscan comida no ponen huevos |
| **Reproducción** | hambre mínima para poner · hambre que cuesta cada huevo · × espera entre puestas · segundos vulnerable tras poner | 70 · 26 · ×1,35 · 5 s | 60 · 32 · ×1 · 8 s | 50 · 40 · ×0,75 · 12 s | alta: más huevos por animal-segundo | alta: más hambre, y más tiempo vulnerable (+35 % de daño, −15 % de velocidad, ver `dmg` y `spdOf`) |
| **Expansión** | radio de merodeo (px) · velocidad de merodeo | 45 · ×0,35 | 80 · ×0,45 | 150 · ×0,60 | alta: ocupa más territorio, menos plantas agotadas junto al nido, menos amontonamiento (brotes) | alta: más energía (el gasto crece con velocidad^1,5: ≈ +54 % al merodear), lejos del nido y de los aliados (más golpes recibidos) |
| **Defensa** | aliados cerca para quedarse a pelear · daño que evitan en formación · atacan al depredador que se acerca · reacción al peligro · hambre de búsqueda · radio de merodeo | 3 aliados · 0 % · no · ×1 · +4 · ×1,15 | 2 · 0 % · no · ×1 · 0 · ×1 | 1 · 12 % (con ≥ 2 aliados a < 90) · sí (con ≥ 2 aliados, no jefes) · ×0,92 · −10 · ×0,7 | alta: menos daño recibido y respuesta coordinada a lobos/rivales | alta: comen con hambre < 52 (menos comida), merodean pegados al centro (menos territorio), y pelean en vez de huir (más golpes dados Y recibidos) |
| **Exploración** | × vista (comida y presas) · × gasto de energía al moverse · × distancia de reacción al peligro | ×0,9 · ×0,9 · ×0,92 | ×1 · ×1 · ×1 | ×1,25 · ×1,2 · ×1,12 | alta: encuentran más comida (más bocados por animal-segundo) y ven el peligro antes | alta: +20 % de energía al moverse (más descansos y colapsos) |

Las prioridades se **combinan** con la identidad de clase (`docs/ERA2-CLASES.md`): por ejemplo las aves ya merodean ×1,4 más lejos y gastan +20 % de energía, así que Expansión alta en aves suma sobre eso.

## Qué se midió (`tests/era2-prioridades.js`)

Escenarios cerrados, semillas pareadas (las mismas semillas con baja/normal/alta), 40 s de calentamiento y una ventana medida; para Defensa, Exploración, Comida y Expansión la ventana incluye lobos hambrientos puestos a ~110 px de la manada. Tres especies (terrestre omnívoro, ave migratoria, colmena). Resultados con IC95 en `tests/era2-balance.md` §12.

Reproducir: `NODE_PATH=$(npm root -g) node tests/era2-prioridades.js 24 --T 120` (la prueba falla si alguna prioridad en nivel alto no tiene a la vez un beneficio y un costo significativos).

## Lo que no se verificó

- La interfaz que escribe las prioridades es de otro módulo: acá solo se probó la lectura (`G.x2.prio` escrito desde la prueba).
- Son bots y escenarios, no personas: no se sabe si la gente va a entender el trato «alta defensa = comen menos».
- No se midió el efecto de las prioridades en partidas completas (el bot `razonable` no las toca): solo escenarios cerrados.
