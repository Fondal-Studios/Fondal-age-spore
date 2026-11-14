# Audio lo-fi (Calidad 2.0, módulo Audio)

Archivos: `eras/audio-lofi.js` (motor, `window.FondalAudio`), bloque `/* === AUDIO === */` al final de la IIFE de `eras/era2-animales.html`, `tests/era2-audio.js`.
**Nadie escuchó este audio todavía**: solo se midió (ver «Qué falta escuchar»).

## Evaluación previa del `Snd` de la Era 1
| Idea del `Snd` | Decisión | Por qué |
| --- | --- | --- |
| Capas que se encienden por nivel (`tier`: océano, colchón, arpegio, melodía) | **Se reutiliza la idea** como «intensidad graduada»: cada paso del compás tiene un umbral y suena si la intensidad lo supera (patrones de percusión, bajo, acordes cortos) | Evita tabla de patrones por ánimo; las mezclas intermedias salen solas |
| Escala por rama (frigio, disminuida, pentatónica, lidia) | **Se reutiliza**: progresiones y pentatónica mayor/menor por ánimo; la «menoridad» (0..1) se mezcla | Da identidad a cada ánimo |
| Ruido marrón de fondo con filtro y LFO | **Se reutiliza**: ruido cálido + crepitar + «wow» de cinta | Es la base del timbre lo-fi |
| Scheduler con adelanto (`schedule(hasta)` + `setInterval`) y `attach(ctx)` separado de `init()` | **Se reutiliza tal cual**: permite renderizar con `OfflineAudioContext` | Único modo de probar sin oír |
| Prueba offline (`tests/sonido.js`: energía por nivel) | **Se reutiliza el método**; ahora agenda por tramos de 1 s (si no, el grafo offline tiene miles de nodos a la vez y la medición de CPU no vale) | |
| Todo en un objeto de ~80 líneas dentro de `era1-celula.html`, atado a `cellTier`, `BR`, `S` | **Se descarta** | No es compartible; el motor nuevo no sabe nada de ninguna era |
| Un solo `Snd.sfx(k)` con 5 sonidos y `tens` acoplado a `hit()` | **Se descarta** | Faltan prioridad, límite de voces, paneo, volúmenes por bus |
| `Math.random` y `performance.now()` mezclados con el estado musical | Se acota: solo cosmético, nunca la simulación | Regla del repo |
| `muted` único en `evo_snd` | Se reemplaza por 4 volúmenes + silencio en `evo_audio_v1` | |

## API (`FondalAudio`)
`wire()` (primer gesto + pestaña oculta) · `setMood('explorar'|'supervivencia'|'combate'|'evolucion')` · `setBiome('pradera'|'selva'|'desierto'|'tundra'|'oceano')` · `sfx(nombre, {pan, vol, own, v})` · `stinger(seg)` (evolución: arpegio + cambio de tonalidad + ánimo `evolucion` por `seg` y vuelve al previo) · `setVolume('master'|'music'|'sfx'|'amb', 0..1)` · `setMuted` · `setDuck` · `attach(ctx)` + `schedule(hasta)` (offline) · `create({storageKey})` para otra instancia · `pan(x, ancho)` · `stats` (`schedMs`, `played`, `dropped`).
Efectos: eat, select, order, hit, kill (v:0 propia baja, v:1 enemigo), flee, lay, born, rug, cam, exc, ala, mig, evolve, ui, season (v: 0-3), fire, drought, travel, phase, rest, scarcity, migration, disobey.

## Diseño
- Grafo: música (Rhodes FM+triángulo con detune y «wow» de cinta, bajo redondo, bombo/hi-hat/rim apagados, melodía pentatónica con swing, eco con realimentación oscura) → pasa bajos de ánimo → volumen; ambiente (ruido compartido filtrado + LFO + eventos al azar por bioma); efectos con `StereoPanner`; reverb barata de 3 peines; salida por saturador `tanh` (el pico nunca supera ~0,84).
- Ánimos = vector de parámetros (tempo, swing, corte, menoridad, percusión, hi-hat, bajo, Rhodes, melodía, bordón, pulso, zumbido, crepitar) que se acerca al objetivo con τ = 2,4 s.
- Voces: sobre 10 activas se descartan las de prioridad < 3; sobre 18 solo pasa lo del jugador de prioridad alta. Enfriamiento y máximo por efecto. Lo del jugador (`own`) suma prioridad.
- Móvil: el `AudioContext` se crea y reanuda en el primer `pointerdown`/`touchend`/`keydown`/`click` (más un buffer silencioso, truco de iOS); hasta entonces no existe y todo es no-op; `visibilitychange`/`pagehide` lo suspenden y paran el timer. Con el interruptor de silencio de un iPhone, WebAudio sigue mudo: es del sistema.
- Era 2: el director (cada 0,5 s) lee `G`: golpes propios en 5 s o ≥2 amenazas (carnívoros/rivales a <70 px) ⇒ combate (se sostiene 7 s); hambre media <35, población ≤4, invierno (en tundra solo con hambre <55) o `G.ev` ⇒ supervivencia; si no, explorar. Ambiente por `G.biomeKey`. Pausa/modal bajan el volumen.

## CPU medida (entorno de pruebas: VM de 4 núcleos sin GPU, lento)
- Hilo de audio (render offline por tramos a 44,1 kHz, ms de CPU por segundo de audio): ~50 (explorar), ~49 (supervivencia), ~66-70 (combate/evolución), ~58-70 por ambiente solo. Equivale a un 5-7 % de un núcleo de esta VM. El grueso es el grafo fijo (osciladores, filtros, ruido, 4 retardos); se quitaron la convolución (17 ms/s) y el compresor (4 ms/s) por eso.
- Hilo principal: el scheduler cuesta ~0,5-1,3 ms por segundo de audio; el director ~0,01-0,1 ms por llamada con 200 animales.
- fps con ~200 animales y audio suspendido vs activo: sin diferencia medible (el entorno oscila entre 8 y 20 fps por ruido de la VM; mediana de 4 rondas alternadas).

## Qué falta escuchar (el dueño)
Equilibrio de volúmenes entre música/efectos/ambiente; si el Rhodes FM suena a Rhodes o a campanita; si el swing y el pulso de supervivencia generan tensión sin molestar; si el crepitar y el «wow» fatigan; que el reverb de peines no suene metálico; que ballena y burbujas del océano no distraigan; que los 5 sonidos de habilidad se entiendan solos; si el stinger de evolución y el cambio de tonalidad son un buen premio; y si la transición a combate se siente a tiempo (hoy ~3-6 s).
