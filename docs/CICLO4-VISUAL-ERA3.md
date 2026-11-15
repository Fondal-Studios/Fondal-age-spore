# Ciclo 4 · Era 3: arte, animación, HUD y tutorial

Alcance: solo dibujo, animación, interfaz y tutorial de `eras/era3-tribus.html`. La simulación (`G`, `Bus`, `tribeInfo`, `rivalInfo`) no se tocó: la diferencia contra el commit base `83fc584` en todo el código anterior a «Dibujo» es una sola línea (`toast()` ahora escribe en una línea fija bajo el mapa). Sin Runway, sin servicios externos y sin librerías nuevas (no hay nada que registrar en `docs/LICENCIAS-ARTE.md`): todo es Canvas procedural.

## Qué se hizo

**Personas** (`paintPerson`, caché de sprites): rol × edad (niño / adulto / anciano, desde 480 s) × pose (parado, 4 cuadros de paso, agachado, golpe) × vista (lado, frente, espalda) × 4 variantes de piel y pelo. Se pintan una vez en canvas pequeños y se estampan; en vivo solo van la herramienta, el objeto cargado y los avisos. Tamaño de dibujo ×1,12 (la lógica no cambia). Oficios: recolector (sombrero de paja + canasto), cazador (pluma roja + manto + lanza), agricultor (sombrero cónico + azada), artesano (cinta + delantal + hacha/pico), constructor (casco + cinturón + martillo), defensor (casco con cresta + escudo/hombreras + lanza), chamán (cornamenta + túnica larga + bastón con gema), explorador (capucha + capa + morral). Lobos (gris oscuro, ojos rojos, mordida), saqueadores (cuernos, pintura, maza, estandarte del color del clan) y presas tienen sprites propios; los enemigos llevan aro rojo punteado.

**Animaciones** suscriptas al Bus (`artHooks`): caminar con ciclo, agacharse a recolectar, golpes de herramienta con chispas, cultivar, cargar (leña al hombro, piedra en las manos, res sobre los hombros), embestida del atacante, retroceso y destello blanco del herido, número de daño, caída y desvanecimiento al morir («murió: causa» + †), nacimiento, polvo por etapa de obra, estrellas al terminar o mejorar (con pop del edificio), «+n» al depositar, migas al comer, aviso en el mapa (pulso) por cada alerta, saqueo y descubrimiento. Todo el estado cosmético vive en `AN`/`PA`/`SPR` (nunca en `G`, azar con `Math.random`).

**Edificios**: un dibujo por nivel (fogata → hogar de piedra → horno de arcilla; choza → casa → casa de barro; almacén → de cestas → granero; taller ×2; huerto ×2 con acequia y espantapájaros; corral ×2; tótem ×2 con alas pintadas; empalizada → muralla con torre) y 4 etapas de obra (plano fantasma con materiales; el edificio asoma por franjas con andamio y escalera), barra con muescas y ícono del material faltante. Fondo cacheado (pasto, flores, bosque, lago con orilla y juncos, estaciones), aldeas de los clanes con estandarte y color de relación, orden por profundidad.

**HUD**: arriba, siempre visible: estación, población con barra por oficio, comida (stock/capacidad, neto por segundo, entra/sale y autonomía), madera, piedra, saber, cohesión, y lista corta de alertas accionables (máx. 2 + «n más»; tocar centra la cámara, selecciona lo afectado y abre el panel correspondiente). Los avisos (toasts) van a una línea fija bajo el mapa. Paneles plegables con resumen en el título y estado recordado (`evo_ui3`): Prioridades, Oficios (cantidad/objetivo, producción, fijados, − y +), Selección, Construcciones y obras (ícono, nivel, etapa, progreso, causa de detención), Rivales (relación con causas, saqueo, Tratos / Ver en el mapa), Camino a la ciudad (avance por objetivo y camino), Balance, Registro. Cámara con zoom 1×–2,8× (botones, rueda, pellizco, arrastre). En móvil: resumen fijo arriba (comida + alerta principal), chips en una fila, objetivos ≥ 44 px.

**Tutorial** (`evo_tut3`): 8 pasos que aparecen por el estado real (no por tiempo), se saltan y se recuerdan; el progreso se guarda (`i:n`).

## Evidencia

Capturas en `docs/ciclo4/era3/` (`antes-*` = commit base, `despues-*`; escenas: explorar, trabajo, oficios, obra, edificios, mejora, combate, muerte, diplomacia, hud-alertas, paneles). Hojas comparativas: `hoja-d.png` (escritorio) y `hoja-m.png` (móvil). Se regeneran con `tools/era3-capturas.js <html> <salida> <antes|despues>` y `tools/era3-hoja.js`.

## Notas (0-10) y por qué

| Criterio | Antes | Después | Evidencia y límites |
| --- | --- | --- | --- |
| Siluetas | 3 | 7 | `antes-explorar-d`: óvalo + círculo para todos. `despues-oficios-d`: 9 siluetas distintas (test por máscara alfa). Límite: agricultor y recolector comparten verde y sombrero; a escala móvil (~22 px) cuesta más. |
| Diferenciación de oficios | 4 | 8 | Color + tocado + herramienta + gesto; edades por altura, barba y bastón. Es arte procedural, no pintado a mano. |
| Animación | 3 | 7 | `despues-combate-d`, `despues-muerte-d`, `despues-mejora-d`. Ciclo de 4 cuadros y gestos por actividad; no hay animación esquelética ni transiciones entre poses. |
| Información visible | 4 | 8 | `antes-hud-alertas-m`: toasts sobre el mapa y panel cortado. `despues-hud-alertas-m/d`: crítico fijo, paneles plegables, sin solapes a 360/390/430 (test). Límite: en escritorio con 2 alertas el mapa pierde ~60 px de alto. |
| Coherencia entre eras | 5 | 7 | Mismo contorno #2b2233, degradados, lago con orilla de arena y flores como la Era 2. Límite: la Era 2 usa otra paleta de íconos y la Era 1 es pintada con Runway; no hay ícono común para recursos. |
| Edificios | 4 | 8 | `despues-edificios-d`, `despues-obra-d`: cada nivel y etapa distinto (test). |

## Rendimiento medido (Chromium sin GPU, máquina con carga; A/B contra el commit base, mediana de 3 corridas, 90 personas + 7 edificios + 4 saqueadores + 3 lobos, con rasterizado forzado)

- `render()`: nuevo ≈ 0,8 ms/cuadro vs base ≈ 0,5 ms (≈ 1,65×); presupuesto de 60 fps = 16,7 ms.
- `hud()`: ≈ 0,34 ms por llamada a ~5 Hz (base ≈ 0,12 ms a ~7,5 Hz).
- Caché de sprites estable: 0 sprites nuevos en 400 cuadros posteriores al calentamiento (~410 sprites en total).
- Son números relativos en software; no sustituyen un dispositivo real.

## Pruebas

`tests/era3-ui.js` (HUD, alertas con histéresis, paneles plegables, 360/390/430 sin solapes ni scroll horizontal, objetivos ≥ 44 px, tutorial por estado, hash idéntico con/sin interfaz) y `tests/era3-arte.js` (rol × edad por hash de píxeles, siluetas, poses/vistas, edificios por nivel y etapa, animaciones por eventos del Bus, animación por actividad, 0 argumentos no finitos, caché, costo A/B, 0 errores de consola).

## No verificado

Dispositivo táctil real (solo emulación), fps reales en GPU, pellizco con dos dedos reales, lectores de pantalla, tutorial con jugadores nuevos (no hubo prueba humana), contraste en modo oscuro (se heredan las variables, sin medir).
