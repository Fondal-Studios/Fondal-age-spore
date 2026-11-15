# Plan de renovación de la Era 3 (Tribus)

Alcance de este documento: **auditoría y plan, nada de esto está implementado.** Se basa en lo que `eras/era3-tribus.html` (685 líneas, una IIFE, canvas 2D) hace hoy, comprobado en navegador real (Chromium, Playwright) y leyendo el código.

Evidencia: capturas en `docs/ciclo3/era3-auditoria/` (`1280x800-*.png` y `390x800-*.png`: menú, inicio, edificios, invierno, saqueo, tecnología, diplomacia; script usado: partida de 60 s simulados con 6 tecnologías, 5 edificios, rol de chamán y constructor, nevada y un saqueo forzado). Mediciones de esa corrida: 0 errores de consola; 59 fps a 1280×800 y 55 fps a 390×800 con ~11 personas; 17 botones visibles, todos ≥ 44 px; sin scroll horizontal; el mapa ocupa 994×589 en escritorio y 372×446 en móvil (el panel «Oficios» queda debajo y se corta, hay que desplazarse).

## 1. Estado actual (lo que realmente hace)

**Simulación** (paso fijo 0,05 s, `R()` con semilla, guardado `evo_save3_v1`, linaje `evo_lineage` v1): personas con `role` (`rec`, `caz`, `art`, `con`, `cha`, `libre`), `st` (estado actual: idle/eat/carry/gather/hunt/build/chop/mine/pray/flee/farm), `hunger`, `hp`, `age`, `carry`. 9 tecnologías con exclusión Arco/Domesticación, 6 edificios (+ fogata), estaciones de 40 s, hambre, frío, lobos, límite de cohesión (Dunbar), clan vecino (comercio, regalos, alianza, saqueos), 5 metas hacia la fundación de la ciudad (Jefatura/Mercado/Templo). Balance medido (`tests/era3-balance.md`): Fácil 94 %, Normal 50 %, Difícil 19 % con el bot «auto».

**Dibujo** (`drawPerson`, `drawBuilding`, `render`): todo con trazos de canvas en cada cuadro, sin caché de sprites, sin capa de eventos.
- Personas: óvalo de color por oficio + cabeza + 2 patas que oscilan (solo si camina) + **un objeto de 3 a 4 px** por oficio (lanza, cesta, martillo, bastón con esfera). Tamaño en pantalla ≈ 13 px de alto en escritorio y ≈ 9 px en móvil. Niños = escala .68. Cinta del color de la rama del linaje en la cabeza.
- Edificios: un dibujo fijo por tipo; solo la fogata cambia con la tecnología (halo con Fuego). **Ningún edificio evoluciona** con las tecnologías ni con el tiempo; el avance se ve como un arco amarillo mientras se construye.
- Animación: balanceo de patas y destello blanco de 0,15 s al recibir daño. No hay animación de trabajo (cortar, picar, recolectar, cazar, construir, rezar) ni de combate (golpe, lanzada, huida con polvo).
- Saqueadores y lobos: formas básicas, casi iguales a las personas; sin dirección de ataque ni aviso de dónde vienen.
- Sin audio de ninguna clase en la Era 3 (en la Era 2 ya hay un módulo `FondalAudio` que no se usa acá).

**HUD**: 7 «chips» arriba (estación/año, personas, raciones/tope, madera, piedra, Conocimiento, cohesión) solo con números; panel «Oficios» con +/− por oficio; «Persona seleccionada» como una línea de texto; «Qué está pasando» (6 últimas líneas del registro); «Camino a la ciudad» (5 metas); una línea de pista contextual (`hintText`). Barras de hambre/vida de 16×3 px sobre cada persona solo si baja de 35 % / se hirió. Los toasts (3 a la vez) tapan el mapa y el panel (se ve en `*-02-edificios.png`).

**Decisiones**: pestañas modales «Tecnología» (tarjetas con costo y requisitos, que sube 15 % por tecnología aprendida), «Diplomacia» (comerciar / regalo / alianza) y «Construir» (bandeja de 6 edificios, se coloca tocando el mapa). La exclusión Arco/Domesticación está en el texto. Falta ver qué cambia una decisión antes de tomarla.

**Lo que NO existe**: eventos con decisión de dos opciones, personalidad del clan vecino, necesidades por persona en un panel, rates de producción, límites visibles de refugio/almacén, previsualización de efectos, tutorial, sonido, bus de eventos, ganchos de prueba para dibujo.

## 2. Principios del plan
1. **La simulación no se toca por dibujo.** Igual que la Era 2: la simulación EMITE por un `Bus` y arte/audio/UI SE SUSCRIBEN; un suscriptor no modifica `G` ni usa `R()` (azar cosmético solo con `Math.random`).
2. **Compatibilidad total**: `snapshotObj/restoreGame` (REFS por índice), `evo_save3_v1`, `evo_lineage` y el hash de estado no cambian por el arte. Todo estado nuevo de simulación va en `G.x3.<modulo>` (se guarda solo con el resto de `G`) y con valor por defecto al leer, para que las partidas viejas carguen. Estado visual transitorio (partículas, animaciones, números flotantes) vive en `UI3`, fuera de `G`, y no entra al hash.
3. **Arte procedural** (canvas/SVG), sin créditos externos ni imágenes con licencia: sprites generados una vez en un `OffscreenCanvas` por (tipo, oficio, tecnología, estación, dirección) y cacheados; el dibujo por cuadro solo hace `drawImage`.
4. **Medible**: cada pilar tiene criterios de aceptación con números y una prueba automática.

## 3. Módulos y contrato de Bus
Un archivo nuevo por módulo, cargado por `<script src>` desde `eras/` (la Era 3 sigue siendo abrible por `file://`); las pruebas automáticas siguen usando `window.__e3`.

| Módulo | Archivo | Dueño de | Lee de `G` | Emite / escucha |
| --- | --- | --- | --- | --- |
| Simulación | `era3-tribus.html` (IIFE actual) | `tickPerson`, combate, `update`, balance, eventos de decisión, `G.x3` | todo | **emite** |
| Arte de personas y animación | `eras/era3-arte.js` | sprites de persona/animales/enemigos, animaciones de trabajo y combate, partículas, números flotantes | `p.role,p.st,p.age,p.hp,p.hunger,p.carry,p.a,p.mv`, `G.techs` | **escucha** |
| Arte de construcciones | `eras/era3-edificios.js` | evolución visual de edificios y del campamento, obras en construcción | `G.B`, `G.techs`, `G.season`, `G.t` | **escucha** |
| HUD y panel | HTML/CSS de la Era 3 + `eras/era3-hud.js` | chips con tendencia, panel de persona, necesidades, avisos, tutorial | `G` (solo lectura) | **escucha** |
| Audio | bloque `/* === AUDIO === */` + `eras/audio-lofi.js` (ya existe) | ánimos, ambiente, efectos | `G` (solo lectura) | **escucha** |

Eventos del `Bus` (la simulación hoy no emite ninguno; agregarlos es la **única** parte tocando simulación de la Fase 0: una llamada `Bus.emit` por sitio, sin cambiar ninguna línea de lógica):

`work(p, kind, target)` (empieza/termina un ciclo: `gather`, `chop`, `mine`, `build`, `hunt`, `farm`, `pray`) · `hit(a, b, dmg, why)` (`why`: `lobo|saqueo|cacería|hambre|frío|enfermedad`) · `kill(victim, src)` · `born(p)` · `death(p, why)` · `carry(p, item)` / `drop(p, item)` · `eat(p)` · `build(site, pct)` · `built(b)` · `tech(k)` · `season(n)` · `raid(n)` / `raidEnd(ok)` · `trade(item)` / `gift` / `ally` · `fission(n)` · `disease(n)` · `phase`/`win`. Los argumentos son objetos de `G` (solo lectura). `state`/`tick` no se emiten por persona (hay que evitar ~150 llamadas/s como en la Era 2): el arte lee `p.st` en su propio ciclo de dibujo.

Gancho de prueba nuevo: `__e3.Bus`, `__e3.UI3` (contadores de partículas/animaciones, sin referencias a `G`).

## 4. Pilares: qué hay, qué falta, cómo se hace

### Pilar 1. Personajes y oficios reconocibles
- **Hay**: color por oficio + un objeto de 3-4 px; niños más chicos; cinta de rama.
- **Falta**: a 9-13 px de alto es difícil distinguir cazador de artesano o constructor (los tres llevan un palo con algo en la punta); no se distingue edad adulta/anciana; sexo/variedad nula; sin pose de «trabajando».
- **Cómo**: sprites procedurales de 24×32 px lógicos (dibujados al doble de resolución y cacheados): silueta distinta por oficio (cazador: lanza larga o arco y taparrabos de piel; recolector: cesta grande a la espalda; artesano: delantal y hacha de piedra; constructor: casco de corteza y mazo; chamán: manto largo, máscara y bastón con luz), 3 variantes de tez/pelo por `p.id`, niño y anciano (`age > 140`) con silueta propia. Los objetos pasan a 8-10 px. El oficio se refuerza con un **icono flotante** de 10 px sobre la cabeza solo al acercar el zoom o al seleccionar (no con 60 personas en pantalla). Zoom del mapa (rueda/pinch de 1× a 2,5×) para que sea legible en móvil (hoy no hay zoom).
- **Aceptación**: (a) en una hoja de sprites generada automáticamente, los 5 oficios × 3 edades son distinguibles entre sí (prueba: distancia entre siluetas binarizadas ≥ 25 % de píxeles distintos para todo par de oficios, y revisión visual por una persona); (b) ≥ 14 px de alto en pantalla a 390 px con zoom 1,5×; (c) la prueba de arte sigue sin argumentos no finitos ni `NaN` (como `tests/era2-arte.js`).

### Pilar 2. Animaciones de trabajo y de combate
- **Hay**: balanceo de patas al caminar, destello al ser golpeado.
- **Falta**: cortar, picar, recolectar, construir, cazar, rezar, comer, cargar, nacer, morir; lanzada, golpe de lobo, huida; polvo; feedback de daño (números flotantes, sangre/marca); estela de saqueadores.
- **Cómo**: máquina de animación en `era3-arte.js` por persona (`UI3.anim.get(p.id)`: fase, estado, t), alimentada por `p.st` y por eventos `work/hit/kill/death`. Ciclos de 4 a 6 cuadros por `st`: `chop` (hacha sube-baja con astillas), `mine` (martillazos con chispas), `gather` (agacharse y levantar con baya), `build` (golpe de mazo y subida de polvo), `hunt` (carrera con lanza al frente; lanzada con trazo y animal que cae), `pray` (brazos arriba y partículas violeta), `flee`, `eat`. Combate: lobos y saqueadores con silueta propia (lobo con 4 patas y mandíbula; saqueador con tocado y garrote), animación de ataque (embestida de 0,25 s), número de daño flotante (blanco para propios, rojo para enemigos), fantasma de caída al morir, aviso direccional en el borde del mapa cuando empieza un saqueo. Todo sale del `Bus`, no de cambios en `tickPerson`.
- **Aceptación**: cada uno de los 11 estados de `p.st` + `hit` + `death` tiene una animación con ≥ 3 cuadros distintos (prueba: se fuerza cada estado y se mide el cambio de píxeles entre `t` y `t+0,2 s` > umbral); los números de daño aparecen en el 100 % de los eventos `hit` de la prueba; 0 efectos que queden colgados (la lista de efectos vuelve a 0 a los 5 s sin eventos); ≥ 50 fps con 60 personas y 20 fx (medido con la misma metodología que `era2-arte`, en máquina sin carga).

### Pilar 3. Construcciones con evolución visual
- **Hay**: 6 dibujos fijos, arco de progreso.
- **Falta**: que lo construido cuente la historia tecnológica; obras en construcción visibles (andamio por etapas); estados (almacén lleno, huerto con cultivo creciendo por estación, corral con animales); campamento que crece.
- **Cómo**: función `look(b, G)` pura que devuelve una *clave de aspecto* (`refugio:n1|piel`, `refugio:n2|tronco+techo` …) a partir de `G.techs`, `G.season` y del lleno/vacío; cada clave se dibuja una vez y se cachea. Reglas: **refugio** de ramas (sin tecnología) → piel y troncos (Piedra) → barro y paja (Cerámica); **almacén** de hoyo → pilotes con cestas (Cestería) → ánforas (Cerámica); **taller** con piedra tallada (Piedra) y banco (Lanza); **huerto** con surcos y plantas que crecen con la estación (Agricultura); **corral** (Domesticación) con animales dibujados; **tótem** que gana tallas con la Tradición (`G.trad`); **fogata** → hogar de piedras (Fuego) → horno de arcilla (Cerámica). Obras: 4 etapas de andamio según `prog`, con constructores en posición. Nieve en techos en invierno.
- **Aceptación**: para cada edificio, ≥ 3 aspectos distintos alcanzables con tecnologías reales (prueba: se fuerzan las tecnologías y se verifica que la clave de aspecto cambia y que la imagen difiere en > 5 % de píxeles); 4 etapas de obra distinguibles; ningún cambio en `stateHash()` entre una partida con arte nuevo y una con arte viejo a igual semilla (el arte no toca `G`).

### Pilar 4. HUD de recursos y necesidades
- **Hay**: chips numéricos, panel de oficios con +/−, línea de pista, registro, metas.
- **Falta**: tendencia (+/− por minuto) de comida, madera, piedra y Conocimiento; capacidades visibles (refugio 4 por refugio; almacén 20+30n); lista de «quién tiene hambre/frío»; panel de persona con barras (hambre, vida, edad, oficio, tarea y *por qué* hace eso); estación y cuenta atrás hacia el invierno; avisos priorizados (hambruna en N s, frío, lobos, saqueo, hacinamiento) en lugar de toasts que tapan el mapa; iconos; en móvil el panel «Oficios» queda fuera de vista; sin tutorial.
- **Cómo**: `era3-hud.js` lee `G` en un ciclo de 4 Hz (no por cuadro). Chips con icono SVG, valor, flecha de tendencia (media móvil de 20 s) y barra de capacidad. Tira de **alertas** persistente (máx. 3, ordenadas por urgencia, tocables: centran el mapa). Panel de persona con barras y la frase «porque…» derivada de `p.st` y las condiciones (`hunger<40 ⇒ va a comer`, etc.). En móvil, panel inferior plegable (tres pestañas: Oficios / Persona / Registro) para no robar alto al mapa; toasts apilados arriba y no sobre el mapa. Tutorial de 5 pasos (asignar oficios, construir refugio antes del invierno, investigar Fuego, mirar la cohesión, la diplomacia) con detección de la acción real, saltable.
- **Aceptación**: ningún dato vital solo con color (hambruna/frío/lobos con icono + texto); tamaños táctiles ≥ 44 px; texto ≥ 12 px; a 390×800 el mapa conserva ≥ 50 % del alto y el panel se alcanza sin desplazar la página; prueba de UI como `tests/era2-ui.js` (escritorio + móvil, tutorial completable por script); la tendencia coincide con la medición directa de `G` ±10 % en un tramo de 60 s simulados.

### Pilar 5. Decisiones estratégicas comprensibles
- **Hay**: 9 tecnologías con una exclusión; oficios; qué construir; diplomacia; límite de cohesión; 5 metas; tres caminos de ciudad según lo hecho (saqueos repelidos ≥ 2 → Jefatura; ≥ 3 intercambios → Mercado; resto → Templo).
- **Falta**: ver las consecuencias *antes* de decidir (qué cambia Arco vs Domesticación en números); decisiones con dilema real y a tiempo (no solo un árbol de costos); rival con personalidad visible; que el camino de la ciudad se entienda y se elija (hoy sale solo por el comportamiento); un resumen de *por qué* se ganó o perdió.
- **Cómo**: (1) vista previa en cada tarjeta: «+X % comida estimada», «−Y % heridos», «cierra: Domesticación»; (2) **eventos de dos opciones** (el mismo patrón que `EVT` en la Era 1): «llega un clan hambriento: compartir raciones (relación +, comida −) o rechazar (riesgo de saqueo)», «sequía: migrar el campamento o racionar», «enfermedad: aislar a los enfermos (−trabajo) o seguir», «un chamán propone un ritual: Tradición + a cambio de comida»; cada opción con efecto real y sin azar oculto: decisión determinista con `R()` solo para *cuándo* ocurre (`G.x3.ev`); (3) rival con carácter (`G.x3.clan = {pers: 'orgulloso'|'comerciante'|'belicoso'}` fijado por semilla, que cambia umbrales de relación, frecuencia de saqueo y lo que acepta en comercio) y un indicador de su actitud; (4) panel «Camino a la ciudad» con los tres caminos y su avance (saqueos repelidos, intercambios, Tradición) y poder elegirlo; (5) pantalla final «Por qué ganaste/perdiste» con las 3 causas principales calculadas del registro de eventos (muertes por tipo, raciones perdidas, tecnologías).
- **Aceptación**: cada decisión muestra su efecto estimado y el efecto real medido después queda a ±15 % (prueba de bot que toma cada opción y mide); los eventos aparecen ≥ 2 veces en una partida de 20 min (Normal) y nunca más de 1 por minuto; el balance **no se degrada**: Fácil ≥ 90 %, Normal 40-60 %, Difícil 15-35 % con el bot «auto» N ≥ 32 (`tests/era3-balance-run.js`); con rival «belicoso», «comerciante» y «orgulloso» distintos en los números medidos.

## 5. Orden de trabajo
| Fase | Qué | Depende de | Esfuerzo (1 persona, partidas de prueba incluidas) |
| --- | --- | --- | --- |
| 0 | `Bus` + `Bus.emit` en los sitios de `tickPerson`, `hurtP`, `startRaid`, `update` (sin cambiar lógica), `__e3.Bus`, `UI3`, prueba de que el hash no cambia | — | 1 día |
| 1 | Sprites de personas por oficio/edad + caché + zoom (pilar 1) | 0 | 3-4 días |
| 2 | Animaciones de trabajo, combate y números de daño (pilar 2) | 0, 1 | 4-5 días |
| 3 | Edificios con evolución visual y obras (pilar 3) | 0 | 3-4 días |
| 4 | HUD: chips con tendencia, alertas, panel de persona, móvil plegable, tutorial (pilar 4) | 0 | 4-5 días |
| 5 | Audio de la Era 3 (reutiliza `audio-lofi.js`; ánimos y ambiente de pradera/estaciones; efectos por evento) | 0 | 2 días |
| 6 | Decisiones: vista previa, eventos de dos opciones, personalidad del clan, camino de ciudad, pantalla final (pilar 5) | 0, 4 | 6-8 días |
| 7 | Pruebas de regresión, balance y rendimiento, pasada de pulido | todas | 3 días |

Las fases 1-2, 3 y 4 son independientes entre sí tras la fase 0 y pueden hacerlas agentes distintos en worktrees separados (arte de personas / arte de edificios / HUD), con la misma regla de la Calidad 2.0: cada uno es dueño de su archivo y no toca simulación.

## 6. Pruebas necesarias
- **Se mantienen y deben seguir verdes**: `tests/era3-guardado.js` (misma semilla ⇒ mismo estado; guardar/cargar no cambia el futuro), `tests/era3-bot.js` (10 min de juego ×4, 0 errores), balance (`tests/era3-balance.md`).
- **Nuevas**: `tests/era3-arte.js` (cada estado × oficio × edad × estación se dibuja sin `NaN`; hoja de sprites; capturas 1280×800 y 390×800; fps con 60 personas); `tests/era3-bus.js` (cada evento se emite en su escenario forzado; un suscriptor que lanza una excepción no rompe la partida; el hash de estado es idéntico con y sin suscriptores); `tests/era3-ui.js` (selección, panel de persona, alertas, tutorial, móvil táctil, tamaños, contraste); `tests/era3-eventos.js` (cada opción de cada evento: efecto real vs estimado; determinismo con semilla); `tests/era3-audio.js` si se hace la fase 5 (mismo método que `era2-audio.js`).
- **Compatibilidad**: una partida guardada con el commit actual debe cargar con el código nuevo (campos nuevos con valor por defecto) — prueba con un guardado de referencia versionado en `tests/`.

## 7. Compatibilidad con guardado, linaje y determinismo
- Guardado: `evo_save3_v1` sigue en `v:1`; `G.x3` aparece solo desde la fase 6 y `restoreGame` lo inicializa si falta. Las referencias de `p.tgt` por índice (`REFS`) no se tocan; si una fase agrega objetos referenciados, usar ids.
- Linaje: la lectura (`from` 2 o 3) y la escritura (`from: 3`) no cambian; la fase 6 puede *agregar* campos (`clan`, `path`) sin romper a la Era 4, que ya lee `evo_lineage`.
- Determinismo: ninguna fase usa `Math.random`/`Date`/`performance.now` dentro de `update`/`tickPerson`; los eventos de decisión usan `R()` y entran al hash; el arte y el HUD usan reloj de dibujo y no entran al hash. La prueba `era3-guardado.js` se amplía con cada fase.

## 8. Riesgos
| Riesgo | Efecto | Mitigación |
| --- | --- | --- |
| Rendimiento del dibujo con sprites de ~60-120 personas en móvil | < 30 fps | caché en `OffscreenCanvas`, `drawImage` por cuadro, LOD (sin animación de brazos ni sombras bajo 0,8× de zoom), medición con `era2-arte` como modelo |
| Agregar `Bus.emit` cambia el orden de la simulación | desincroniza el hash | solo emisiones al final de cada bloque ya existente; prueba de hash idéntico antes/después |
| Eventos de decisión rompen el balance medido | Normal/Difícil fuera de rango | los eventos nacen con efectos pequeños y se miden con el bot (N ≥ 32) antes de aceptar |
| El HUD móvil roba alto al mapa | mapa < 50 % | panel plegable, medición automática del alto del mapa |
| Alcance: el arte «bonito» no tiene fin | el ciclo se alarga | Art Gate con criterios del punto 4 (distinguibilidad medible) y congelar al cumplirlos |
| Audio sin escucha humana | se declara «aprobado» sin oír | seguir el protocolo de `docs/ESCUCHA.md` (hoy solo hay verificación técnica) |
| Cifras científicas del texto (tamaños de banda, rendimientos) | afirmaciones sin respaldo | verificar en fuentes primarias antes de afirmarlas dentro del juego (regla de `AGENTS.md`) |

## 9. Las cinco mejoras prioritarias
Ordenadas por (impacto en lo que el jugador entiende y siente) / esfuerzo.

| # | Mejora | Por qué primero | Esfuerzo |
| --- | --- | --- | --- |
| 1 | **Fase 0 + HUD de alertas y panel de persona con «porque…» (pilar 4, núcleo)**: `Bus`, tira de alertas priorizadas, tendencias de recursos, capacidades visibles, panel inferior plegable en móvil | Hoy el jugador no sabe *por qué* se muere gente ni qué hacer: es la mayor pérdida de comprensión y el móvil queda con el panel fuera de vista. Abre el resto (sin Bus no hay arte ni audio desacoplados) | 4-5 días (1 + 4 parcial) |
| 2 | **Sprites por oficio/edad con caché y zoom (pilar 1)** | Hoy las personas son manchas de 9-13 px casi iguales: es lo que más baja la nota visual y de «reconocibilidad» | 3-4 días |
| 3 | **Animaciones de trabajo y de combate con números de daño (pilar 2)** | Convierte la simulación (que ya existe: `p.st`, `hurtP`) en algo que se *ve*; el combate y los saqueos hoy son invisibles | 4-5 días |
| 4 | **Edificios que evolucionan con la tecnología + obras por etapas (pilar 3)** | Hace visible el progreso de la civilización, que es el hilo de toda la Era 3 → Era 4 | 3-4 días |
| 5 | **Eventos de dos opciones + vista previa de efectos + rival con carácter (pilar 5)** | Hace estratégicas las decisiones (hoy son un árbol de costos), sin tocar lo ya medido del balance si se mide antes de aceptar | 6-8 días |

Total estimado de las cinco: **20 a 26 días de una persona**; con tres agentes en paralelo tras la fase 0 (arte de personas, arte de edificios, HUD), el camino crítico es ≈ 10 a 12 días más la fase 6.

## 10. Lo que no se probó para este plan
No se midió fps en un dispositivo real (solo Chromium sin GPU); no se probó táctil real (solo emulación de Playwright); no se corrió un bot largo sobre el código actual para este documento (se usan las cifras de `tests/era3-balance.md`); las estimaciones de esfuerzo son orientativas.
