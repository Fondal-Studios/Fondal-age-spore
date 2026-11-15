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

## Ciclo 3: verificación técnica y controles (NO es aprobación: falta la escucha humana, ver `docs/ESCUCHA.md`)
Cambios en el motor: `setBusMuted('music'|'sfx'|'amb', bool)` (silencio por capa, independiente del volumen, persistido en `evo_audio_v1` como `bm`); `stats.active` (voces vivas); entradas no finitas (NaN/Infinity en `pan`, `vol`, `at`) ignoradas; **`ramp` ya no es instantánea en offline** (antes los tests no medían el crossfade real de bioma/mezcla); **nivelación del ambiente por bioma** (`trim`): sin ella el océano sonaba 3,3 a 5,6 veces más fuerte que pradera/desierto (rms .069 vs .012); ahora los 5 ambientes quedan a ~1 dB entre sí (rms .018 a .021).
Controles (era2, bloque AUDIO): sliders Maestro/Música/Efectos/Ambiente + botón de silencio por capa (44 px) + «Silenciar todo»; teclado: `M` silencia/activa, `Escape` cierra el panel, tocar fuera lo cierra; etiquetas `aria-label`/`aria-valuetext`; panel de 240 px que cabe a 390 px. No se tocó la posición CSS del botón `#audio*` (la corrige el módulo de arte); solo se agregaron reglas para las filas internas del panel.
Verificado por `tests/era2-audio.js` (mediciones con `OfflineAudioContext`, no a oído): 12 transiciones entre ánimos sin clic nuevo ni salto de envolvente mayor que el del propio régimen (peor 1,03× y 1,10×); cambio de bioma sin corte; peor caso (todo al 100 %, 36 efectos forzados por segundo, combate + stinger) pico 0,69, 0 muestras > 0,98, sin NaN, continua < 0,01; partida de 600 s con cambios de ánimo/bioma/stinger/efectos: sin NaN ni recorte, ~20 000 nodos fuente creados, vivos acotados (45 a 174, sin tendencia creciente clara) y voces activas ≤ 5; volúmenes independientes (50 % ≈ mitad), silencio por capa, persistencia tras recargar, tap en móvil 390 px, arranque solo tras gesto, suspensión en pestaña oculta, determinismo con audio activo vs mudo.
Herramienta de escucha: `eras/escucha.html`.

---

# Ciclo 4: auditoría de las 4 eras, audio adaptativo de la Era 3 y bloque mínimo de la Era 4

**Estado: verificado técnicamente, NO aprobado.** Nada de lo medido reemplaza una escucha humana (protocolo del Ciclo 4 en `docs/ESCUCHA.md`, herramienta `eras/escucha.html` con selector de era). Las cifras salen de `tests/era2-audio.js`, `tests/era3-audio.js`, `tests/era4-audio.js`, `tests/sonido.js` y `tests/escucha.js` (OfflineAudioContext + Playwright en Chromium headless; son mediciones, no oído).

## 1. Auditoría por era (antes de este ciclo → ahora)
| | Era 1 (célula) | Era 2 (animales) | Era 3 (tribus) | Era 4 (civilizaciones) |
| --- | --- | --- | --- | --- |
| Motor | `Snd` propio dentro del HTML (4 capas por `cellTier`, escala por rama, 5 efectos: pop, mut, die, gong, rumble). **No se reescribió** | `FondalAudio` (`eras/audio-lofi.js`) | `FondalAudio` | `FondalAudio` |
| Antes del ciclo | Sí | Sí (Ciclo 3) | **Nada** | **Nada** |
| Ahora | Igual + persistencia unificada y suspensión | Igual (el panel pasó al motor) | Director de 6 ánimos, 2 ambientes + ruido de trabajo, 31 efectos nuevos, ducking, agrupado | Bloque mínimo: 3 ánimos, 10 efectos, mismos controles |
| Controles | 1 botón «Sonido: sí/no» + tecla M. **Sin sliders ni capas** (el HUD de la Era 1 está fuera de alcance) | Maestro/Música/Efectos/Ambiente + silencio por capa + total + M | Ídem (compartido) | Ídem (compartido) |
| Persistencia | Antes `evo_snd`. **Ahora lee y escribe `evo_audio_v1`** (`mute` y `master`, sin pisar los demás campos; mantiene `evo_snd` de respaldo) | `evo_audio_v1` | `evo_audio_v1` | `evo_audio_v1` |
| Arranque por gesto | Sí (`pointerdown`/`keydown`, una vez) | Sí | Sí | Sí |
| Pestaña oculta | **No suspendía.** Ahora `suspend()`/`resume()` en `visibilitychange` (medido: `suspended` y vuelve a `running`) | Sí | Sí | Sí |
| Saturación | Sin limitador. Medido en 8 combinaciones rama × nivel: pico .18 a .57, 0 muestras > 0,98, 0 NaN (22 kHz) | Saturador `tanh`; peor caso pico 0,69 | Peor caso pico 0,695 | Ídem Era 2 (mismo motor) |
| Música, rms | **.081 a .140** (maestro fijo .5) | .045 a .070 | .045 a .071 | Ídem |

**Coherencia lo-fi:** las Eras 2, 3 y 4 comparten timbre (Rhodes FM, cinta con wow, crepitar, eco oscuro, reverb de peines, saturador `tanh`). **La Era 1 suena distinta** (pad de triángulos, líder de dientes de sierra, sin cinta ni crepitar) y, con el maestro por defecto, **su música es ~1,8 a 2 veces más fuerte en rms (+5 a +6 dB) que la de las demás eras en situaciones equivalentes (nivel 0 contra calma, nivel 3 contra combate)**, y hasta ~3 veces (+10 dB) en el extremo: se nota al pasar de una era a otra. No se tocó el nivel de la Era 1 (cambiarlo sin oírlo sería adivinar): queda como pregunta de escucha y como decisión del dueño (opciones: bajar el maestro de `Snd` entre 0,25 y 0,35, o migrar la Era 1 al motor compartido). Bajarlo no rompe `tests/sonido.js`, que compara niveles relativos.

**Qué falta (no hecho):** sliders y silencio por capa en la Era 1 (hay que tocar su HUD); música y ambiente propios de la Era 4 (hoy reutiliza `explorar/amenaza/combate` y `pradera`); sonido en la portada (`index.html`); en la Era 4 no hay Bus, así que el bloque lee `G` cada 250 ms en vez de suscribirse.

## 2. Cambios en el motor (`eras/audio-lofi.js`)
- **Ánimos extra** (no figuran en `moods`, que sigue siendo la lista de la Era 2, sino en `moodsAll`): `amenaza` (pulso de corazón + bordón + tono menor, sin la percusión del combate) y `construccion` (tono mayor, bombo y hi-hat marcados, bajo redondo, 84 bpm).
- **Ambientes extra** (`biomesAll`): `campamento` (fogata continua, viento, grillos y pájaros) y `campamento_frio` (viento fuerte, fogata, campanillas de escarcha). La fogata es una capa continua que se crea la primera vez que un ambiente la pide: costo cero en las demás eras.
- **Ruido de trabajo** `setWork(oficio, 0..1)` (`chop mine build farm gather`): eventos suaves al azar en el bus de ambiente. La era fija la intensidad con `.35 + .25·log2(n)` (1 persona 35 %, 8 o más 100 %): **no hay un sonido por persona**.
- **31 efectos nuevos** (`effectsAll`, 55 en total): `gather carry drop chop mine hammer farm hunt pray death wolf horn raid alarm alert okay cold built upgrade tech discover path trade gift ally ambush win lose disease fission prio`. `effects` sigue listando solo los 24 de la Era 2.
- **Ducking** `duckFor(seg, profundidad)`: baja la música a `profundidad` (y el ambiente a su raíz cuadrada) durante `seg` y vuelve con constante de 0,7 s; lo libera el scheduler. El getter `ducking` es verdadero con ducking de alerta o con pausa/diálogo.
- **`mountUI({corner, reserve, css})`**: panel de volúmenes compartido (Eras 2, 3 y 4), igual al de la Era 2 pero con **todos los objetivos ≥ 44 px** (los deslizadores medían 28 px) y `max-height` con scroll para celulares apaisados. Esquinas `tr|br|tl|bl`, afinable con `--audio-top/-right/-bottom/-left`.

## 3. Era 3: cómo suena (bloque `/* === AUDIO === */` al final de la IIFE de `eras/era3-tribus.html`)
Solo se **suscribe al Bus y lee `G`**: no escribe estado ni usa `R()`; si `audio-lofi.js` no carga, el juego sigue mudo. El hash de estado es idéntico con audio activo, mudo y sin suscriptores (1600 pasos, 4 corridas: `fe46c66` las cuatro).

**Director de ánimo** (cada 0,5 s reales; sube de inmediato y baja tras 6 s sostenidos; prioridad de arriba hacia abajo):
| Ánimo | Condición (lee `G`) |
| --- | --- |
| `combate` | saqueo en curso (`G.raidActive`) o golpe `lobo`/`saqueo`/`defensa` en los últimos 5 s (Bus `hit`) |
| `amenaza` | un clan prepara saqueo (`clan.prep > 0`) o hay lobos a < 260 px del campamento |
| `supervivencia` | alerta de hambruna activa, frío crítico, enfermedad > 40 o población ≤ 4 |
| `construccion` | alguien está en estado `build` |
| `explorar` | el resto |
| `evolucion` (golpe temporal, no por prioridad) | Bus `tech` (9 s, además cambia la tonalidad), `discover` (5 s), `path` (6 s), `ally` (7 s), `raidEnd` rechazado (5 s), `win` (stinger de 14 s) |

Ambiente: `campamento`; en invierno (`G.season === 3`) `campamento_frio`. Pausa o diálogo: música y ambiente más bajos.

**Efectos por Bus.** Los de mucha gente se agrupan cada 250 ms (un sonido por tipo, volumen `.55 + .2·log2(1 + n)`, con una separación mínima por tipo: recolectar y cortar 0,5 s, comer 0,8 s…); los importantes suenan al instante con prioridad de voz alta. `work` (fin de `gather/chop/mine` → recolectar/hacha/picota; inicio de `build/farm/pray` → martillo/huerto/ritual), `carry`/`drop` (variante por recurso), `eat`, `hit`, `kill` (lobo o saqueador = baja enemiga; presa = caza), `death` (adulto/niño), `born`, `build`/`built` (obra o mejora), `tech`, `discover`, `path`, `season`, `raidPrep` (cuerno + ducking), `raid` (cuerno + tambores + ducking), `raidEnd`, `trade`, `gift`, `ally`, `deal` (caravana emboscada), `fission`, `disease`, `alert` (crítica = alarma + ducking de 1,4 s; aviso; «se normalizó»; hambruna y frío con sonido propio), `win`, `lose`, `prio`, y el aullido cuando entra un lobo nuevo a 260 px.

**Anti-saturación:** tope de voces del motor (más de 10 activas descarta lo de prioridad < 3; más de 18, lo de < 4), enfriamiento y máximo por efecto, agrupado por tipo con separación mínima, ducking de la música ante alertas críticas, saturador `tanh`.

## 4. Era 4: bloque mínimo (`/* === AUDIO === */` al final de su IIFE)
La Era 4 **no tiene Bus**: el bloque lee `G` cada 250 ms y suena por *cambios* de estado. Ánimos: `combate` (choque en el que participa tu civilización), `amenaza` (ejército rival a < 170 px de tu ciudad o < 140 de tus ejércitos), `explorar`. Efectos: tecnología (+ golpe de progreso y cambio de tonalidad), edificio nuevo, espía, ciudad tomada, choque ganado, choque perdido, choque que empieza (cuerno + ducking), decisión pendiente, victoria y derrota. Mismos controles y claves de persistencia. ~40 líneas, mismo motor; si el archivo no carga la era sigue sin sonido. No hay ficha de escucha propia: se juega la era con sonido.

## 5. Controles y posición del botón (para el agente de HUD de la Era 3)
Botón de parlante **44×44 px, `position:fixed`, esquina superior derecha**: `top: 8px + safe-area`, `right: 8px` (variables `--audio-top` / `--audio-right`), `z-index: 8` (por debajo de los diálogos, que usan 10). El panel se despliega debajo, de `min(78vw, 240px)`.

**Reserva que el HUD debe respetar:** el bloque agrega `#hud{padding-right:var(--audio-reserve)}` (52 px = 44 + 8) y, en escritorio (≥ 821 px), `#hint{margin-right:var(--audio-reserve)}`: a esa anchura el HUD es una sola fila de 31 px y el botón de 44 px invade la fila siguiente. Si el HUD nuevo se rediseña, o conserva esas reservas o mueve el botón (`FondalAudio.mountUI({corner})` o las variables CSS), y corre `tests/era3-audio.js` (sección «GEOMETRÍA»: a 360, 390, 430 y 1100 px verifica botón ≥ 44 px, dentro de la pantalla, **0 solapamientos** con cualquier elemento visible de `#stage`, panel dentro de la pantalla y sin scroll horizontal; `ONLY=geo` la corre sola en ~10 s).

Teclado: `M` silencia/activa todo, `Esc` cierra el panel, tocar fuera lo cierra. Accesibilidad: `aria-label` en el botón y en cada deslizador, `aria-valuetext` («70 por ciento, silenciado»), `aria-pressed` en los silenciadores, `aria-expanded`/`aria-controls`/`aria-keyshortcuts="M"`, `role="status"` en el aviso de arranque.

## 6. Verificación técnica (cifras de `tests/era3-audio.js`, 331 s con poca carga)
- **Ánimos** (rms, 2 semillas): explorar .045, construcción .051, amenaza .052, evolución .050, supervivencia .055, combate .071; rango 4,0 dB (límite ±6). Combate: +58 % de energía y ×2,1 de actividad rítmica sobre la calma. Amenaza: más grave (banda < 150 Hz −1,1 dB contra −4,5), más oscura (centroide 157 Hz contra 272) y con menos agudos y menos actividad que el combate. Construcción: +22 % de actividad sobre la calma. Picos ≤ .34.
- **Ambientes** (rms): .018 a .021 los 7 (rango 1,3 dB). Campamento .0189 y frío .0199 tras ajustar `trim` (sin ajuste: .0146 y .024). Todos distintos espectralmente.
- **Ruido de trabajo** (actividad, media de 4 semillas): sin trabajo .049, 35 % .064, 100 % .090; el rms del ambiente solo ×1,09 (suave). Hacha .058, picota .066, martillo .056.
- **Efectos:** 55 sin NaN ni recorte (pico ≤ .69). Rango de nivel 30 dB entre el más bajo (`carry`, `ui`) y el más alto (`raid`, `rug`); `carry` es casi inaudible a propósito. Oficios, amenazas y logros se distinguen por espectro (distancia espectral > 1,5 dB o centroide a > 120 Hz).
- **Transiciones** (10 pares × 2 semillas, 16 kHz): salto de envolvente máximo en la transición ÷ máximo de **todos** los tramos estables de los dos ánimos del par = **1,02** (límite 1,15 + 0,05); clic (derivada segunda) **1,02** (límite 1,25 + 0,02). *Referencia robusta:* en el Ciclo 3 se comparaba contra ventanas cortas y falló en CI; ahora la referencia es el máximo de todo lo que está fuera de la transición, de las dos semillas y de los dos ánimos.
- **Ducking:** la música baja a 0,39 del nivel anterior y vuelve a 0,99 (mediana de 3 semillas); sin clics nuevos (1,00); en vivo se libera solo en menos de 2,5 s.
- **Peor caso** (todo al 100 %, 36 efectos forzados por segundo, combate, trabajo al máximo, ducking, stinger): pico **0,695**, 0 muestras > 0,98, 0 NaN, componente continua −0,0004.
- **Partida larga (600 s):** 19 288 nodos fuente creados; vivos entre 55 y 144 sin tendencia (media 1.ª mitad 99, 2.ª 88); voces activas ≤ 5; pico .695; 0 NaN; 1204 efectos tocados, 0 descartados por tope.
- **Escala con la población** (60 s simulados): 8 personas → 149 eventos del Bus y 114 pedidos de sonido (1,9 por s); 42 personas → 618 eventos y 304 pedidos (5,1 por s). Los pedidos crecen ×2,7 con ×5,3 de población y ×4,1 de eventos; máximo 4 por ciclo de 250 ms; tope exigido de 30 por s.
- **Director con estado real:** 17 comprobaciones (prioridades, histéresis de 6 s, hambre gana a obra, amenaza gana a obra, saqueo = combate, los golpes caducan a los 5 s, `tech` y `discover` = evolución, alerta crítica = ducking, pausa = ducking, invierno = ambiente frío).
- **Controles:** a 360/390/430 px con toque y a 1100 px con clic: abre el panel, silencia una capa y activa el audio; objetivos de 44 px; persistencia tras recargar; `M` y `Esc`.

## 7. Lo que NO se verificó
Que algo **suene bien**: timbres (¿el aullido parece lobo?, ¿el cuerno es creíble?, ¿el fuego suena a fuego o a estática?), equilibrio real de volúmenes en parlantes y auriculares, fatiga a los 5 minutos, si el director cambia «demasiado» de ánimo en una partida real, si el ducking se siente como un corte, si el agrupado de 250 ms suena a ritmo, la diferencia de nivel con la Era 1. iOS Safari (solo Chromium; el interruptor de silencio del iPhone seguirá callando WebAudio). Dispositivos reales (solo emulación táctil). El costo de CPU de las Eras 3 y 4 con audio activo en un celular (no medido; se espera parecido a la Era 2: 5 a 7 % de un núcleo de la VM de pruebas). El HUD nuevo de la Era 3 que desarrolla otro agente: se verificó contra el HUD que había al partir de la rama.

## 8. Repetibilidad
Con el código final se corrió cada prueba **3 veces seguidas** en una VM de 4 núcleos con load average ~9 (otros agentes corriendo simulaciones): `era3-audio` 3/3 (426, 318 y 491 s), `era2-audio` 3/3 (604, 428 y 929 s), `sonido` 3/3, `era4-audio` 3/3, `escucha` 3/3, `era4-guardado` 3/3. Antes de eso hubo fallos que se corrigieron y que conviene recordar: (a) esperas fijas de 400/500 ms para que el `AudioContext` cambie a `suspended`/`running` (fallaban con la máquina cargada) → ahora se espera hasta 6 s con sondeo; (b) el cociente de fps de `era2-audio` (audio activo ÷ suspendido) da ruido con la máquina cargada → con load average > 0,6 × núcleos se informa y NO se exige, y se exige en cambio el costo del scheduler (< 30 ms por segundo de audio; medido ~5); (c) un tope de ≥ 40× entre efectos y un contador de sonidos pedidos que no escalaba. `tests/acciones.js` (Era 1) **falla de vez en cuando con la máquina cargada, también sin ningún cambio de este ciclo** (1 de 6 corridas con el HTML base: hash `b67a5693/60/7/49` en vez de `4f01230f/25/7/34`); no es del audio y queda sin tocar. `ONLY=geo,dir,ctl,scale` corre secciones sueltas de `era3-audio`.
