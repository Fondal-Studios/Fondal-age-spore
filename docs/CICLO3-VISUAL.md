# Ciclo 3 · Evaluación visual real (Eras 1, 2 y 3)

Método: Chromium headless (Playwright), escritorio 1280x800 y móvil 390x800, escenas forzadas con `__e1/__e2/__e3` por `tools/ciclo3-capturas.js` (reloj congelado, misma semilla antes y después). «Antes» = commit base `1166564` (copia fuera del repo); «después» = esta rama. Capturas: `docs/ciclo3/antes/` y `docs/ciclo3/despues/` (escenas: explorar, seleccion, alimentacion, combate, muerte, evolucion-dialogo/despues, más oficios/construccion/caza en Era 3 y masa en Era 2; sufijo `-d` escritorio, `-m` móvil). Hojas comparativas: `docs/ciclo3/hoja-era{1,2,3}-{d,m}.png` (`node tools/ciclo3-hoja.js`).
Nadie probó en dispositivo táctil físico ni en GPU real: las notas son de capturas y mediciones en headless.

## Notas 0-10 (evidencia entre paréntesis)
| Criterio | Era 1 antes→después | Era 2 antes→después | Era 3 antes→después |
| --- | --- | --- | --- |
| Silueta | 7 → 7 (`era1-explorar-d`) | 7 → 7 (`era2-combate-d`; con 540, `era2-masa-d`, siguen mezclándose) | 4 → 6 (`era3-oficios-d`: ahora sombrero/pluma/astas/casco/herramienta grande) |
| Diferenciación entre especies/oficios | 7 → 7 | 6 → 6 (insectos y terrestres en masa) | 4 → 6 |
| Animación | 5 → 5 | 6 → 7 (marcha en 2 poses también con LOD) | 2 → 5 (golpe de hacha/pico/martillo, embestida de lanza, bastón del chamán, canasto) |
| Información visible sin paneles | 5 → 6 (rótulos ya no se pisan: `era1-combate-d`) | 4 → 8 (iconos de estado y burbujas: `era2-alimentacion-d`, `era2-explorar-m`) | 3 → 6 (hambre/huida/herido sobre la cabeza, rol al seleccionar) |
| Sensación de respuesta | 6 → 6 | 6 → 7 | 3 → 5 (andamio, anillo y «pop» al terminar un edificio) |
| Coherencia entre eras | 7 | 7 | 4 → 6 (mismos iconos de hambre/peligro que la Era 2) |

Debilidades que siguen: Era 2 con cientos de animales sigue siendo una mancha (los sprites LOD son de tamaño real; las señales solo marcan peligro/hambre extrema); en móvil a 390 px los animales miden 6-10 px y los iconos ≈12 px; Era 3 conserva dibujo de «monigotes» y no tiene niveles de edificio (no se inventó la mecánica); la escena de combate de Era 1 no muestra al rival porque la propia célula lo digirió durante la captura.

## Qué se mejoró
- **Era 2, señales de estado** (`eras/era2-arte.js`, `Era2Arte.signals`): peligro (triángulo «!»), hambre (cuenco vacío; rojo y pulsante si 0), caza (mira), descanso («zz»), huevo/corazón, frío, brillo de evolución (evento `evolve`). Derivadas de `bioInfo(a)` (caché 0,3 s, 24 consultas por cuadro). LOD: con >160 animales solo propios en peligro/hambre extrema y seleccionados, máx. 90 animales con icono; salvajes solo si están seleccionados.
- **Burbujas de causa**: `Bus.on('cause', (a, texto, tipo))`; máx. 3 simultáneas, ~2,2 s, solo propios o seleccionados, sin solaparse; los propios además van al registro «Qué está pasando» (escapado, con reloj de simulación y estado en `G.x2.arte`, 1 línea/2 s, sin repetir 6 s). El evento aún no lo emite la jugabilidad: probado emitiéndolo a mano.
- **Era 2, masa**: sprites LOD con poses de marcha (1-0-2-0).
- **1.4 UI**: el botón de sonido ya no solapa el chip del HUD (`#hud` y `#hint` reservan 54 px); resúmenes plegables ≥44 px en móvil. `tests/era2-ui.js` mide rectángulos intersectados, objetivos ≥44 px y scroll horizontal a 360/390/430 (con evento, Tradición, selección, tutorial y panel de sonido abierto). Control negativo: sin la reserva, `chip x audioBtn` solapa a 390 px.
- **Era 3** (solo dibujo + 2 ganchos de prueba `scr/select`): oficios por silueta y herramienta con gesto de trabajo, sombra, señales de estado, etiqueta de oficio al seleccionar, andamio y «pop» de obra terminada.
- **Era 1**: rótulos flotantes de tamaño constante en pantalla y separados verticalmente.

## Rendimiento
`render()` con ~540 animales: 4,0-5,5 ms sin señales vs 5,3-6,0 ms con señales (coste medido de las señales 0,5-0,8 ms/cuadro). El fps real (rAF con simulación) midió 19-22 con ~418 animales, pero la máquina estaba con carga 10-56 (otros agentes) y sin GPU; el mismo test sobre el código base dio 14-16. **No se pudo demostrar ≥40 fps con ~570 animales en esta máquina**; lo que sí se midió es el coste añadido (<1 ms).

## Tests
`tests/era2-ui.js`, `era2-arte.js`, `era2-guardado.js`, `acciones.js`, `determinismo.js`, `era3-guardado.js`: OK, 0 errores de consola. `era3-bot.js`: el tramo de escritorio pasó; el móvil se cayó una vez por cierre del navegador bajo carga (ver informe).
