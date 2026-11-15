# Calidad 2.0 — Era 2 (documento de coordinación)

Rama de trabajo: `claude/dazzling-davinci-wvedmk` (la rama estable es `main`; el rework se integra por PR al final).
Estado base: commit de la arquitectura (bus de eventos, `G.x2`, `issueOrder`, `bioInfo`).

## Auditoría inicial (2026-11-14, navegador real, Chromium)
Evidencia: capturas de los 5 ecosistemas, hoja de las 12 especies, móvil 390×800, fps, ganchos de prueba y lectura del código. «Existe código» ≠ «funciona»: se puntúa lo comprobado.

| Categoría | Nota 0-10 | Evidencia |
| --- | --- | --- |
| Arte de animales (Era 2) | **5** | Vectores limpios y coherentes (contorno, degradado). Peces y aves se leen bien. Los 3 terrestres y los 3 insectos difieren casi solo por color; los peces también. Animales de 6-10 px en pantalla. |
| Animación | **3** | Solo balanceo de patas y destello al recibir daño. Sin comer, atacar, descansar, morir. |
| HUD biológico / selección | **3** | `Animal seleccionado` es una línea de texto; barras de vida/hambre diminutas sobre los animales propios; sin energía, reproducción, órdenes ni efectos. |
| Acciones con consecuencias | **6** | Hambre→buscar→comer→recuperar, caza con riesgo, huida, frío, hambruna, huevos: conectados al motor. Faltan: costo de moverse, descanso real, heridas. |
| Habilidades | **4** | 5 funcionan y se ven, pero sin progresión; medición previa: Alarma y Migrar parecen restar, ninguna es claramente útil. |
| Control táctico | **4** | Posturas globales (comer/atacar/reunir), «Ir a…», seleccionar 1 animal (solo informativo). Sin grupos ni órdenes por animal. |
| Combate comprensible | **3** | Chispa blanca y barra de vida; sin número de daño, sin ventaja de especie, sin resumen de por qué se ganó/perdió. |
| Audio | **0** (Era 2) | No existe. Era 1: procedural sin escuchar (energía por nivel medida, no oído). |
| Ecosistemas | **6** | 5 biomas con parámetros y fondo propios, pirámide trófica. Misma especie inicial y mismo bucle de juego en todos; terreno plano. |
| Herencia entre eras | **5** | Linaje 1→2→3 funciona y se guarda; efecto pequeño (Instinto +2/nivel), no cambia rasgos/aspecto/habilidades. |
| UX / tutorial | **4** | Pistas de texto; sin tutorial interactivo. Móvil usable (mapa 56 %). |
| Rendimiento | **8** | 58-62 fps con 34-63 animales; 47-54 fps con ~540 (sin GPU). |
| QA / pruebas | **7** | Suite: determinismo, acciones, sonido, online, guardado Eras 2-4. Falta cobertura de UI y táctil. |

## Decisiones sobre las propuestas (evaluadas, no aceptadas en bloque)
1. **Rework artístico**: SE CONSERVA, pero **procedural en canvas**. Se descarta repintar con Runway: quedan 7 créditos (≈3 imágenes) y el saldo bajó dos veces sin uso nuestro. Se mantiene lo que supere el Art Gate (peces, aves); se rediseñan los 3 terrestres y los 3 insectos.
2. **HUD biológico**: SE CONSERVA. Detalle al seleccionar; mínimo con cientos de animales.
3. **Acciones con consecuencias**: SE CONSERVA. Cada barra debe estar conectada al motor.
4. **Habilidades**: SE CONSERVA con cambio: no más botones; progresión y decisiones. Se corrigen efectos negativos medidos.
5. **Control táctico / líder**: SE CONSERVA la selección y órdenes; el líder controlable se **evalúa con prototipo** y se decide con datos.
6. **Combate legible**: SE CONSERVA.
7. **Lo-fi adaptativo**: SE CONSERVA como **motor nuevo y compartible** (`eras/audio-lofi.js`); se aprovechan las ideas de la Era 1 (capas, escala por rama) pero no se copia su código monolítico.
8. **Ecosistemas dinámicos**: SE CONSERVA.
9. **Herencia**: SE CONSERVA; el linaje debe cambiar algo jugable.
10. **UX y tutorial**: SE CONSERVA.

## Contrato de módulos (para trabajar en paralelo sin pisarse)
Archivo: `eras/era2-animales.html` (+ archivos nuevos propios). Cada agente trabaja en su worktree/rama, commitea ahí y reporta rama y hash; el arquitecto integra.

| Módulo | Dueño de | Prohibido tocar |
| --- | --- | --- |
| **Jugabilidad/simulación** | `think`, `hit`, `dmg`, `kill`, habilidades (`useAbility`, `ABD`), `bioInfo` (amplía), `issueOrder`, biomas/especies, balance, herencia | dibujo, HUD, audio |
| **Arte/animación** | `drawAnimal`, `getSprite`, `drawStatic`, partes de `render` que dibujan animales/efectos, fondo por bioma, fantasmas de muerte, números de daño | lógica de `think`/combate |
| **Interfaz/UX** | HTML/CSS, `hud`, selección (`tapAt`, arrastre, teclas, táctil), panel biológico, tutorial, indicadores de destino, panel de combate | simulación, `drawAnimal`, audio |
| **Audio** | `eras/audio-lofi.js` y un bloque `/* === AUDIO === */` al final de la IIFE (suscripciones al `Bus`) | todo lo demás |

Reglas comunes:
- La simulación EMITE por `Bus.emit`; arte, audio e interfaz se SUSCRIBEN con `Bus.on`. Un suscriptor no modifica el estado ni usa `R()` (solo `Math.random` para lo cosmético). `state` se dispara ~150 veces/s: handlers baratos.
- Estado nuevo global → `G.x2.<modulo>` (se guarda solo). Campos nuevos por animal se guardan solos (todo campo propio no `_`). **Las partidas viejas no deben romperse**: toda lectura de un campo nuevo debe tener valor por defecto.
- Determinismo: toda la simulación usa `R()`; nada de `Math.random`/`Date`/`performance.now` en `think`/`update`.
- Pruebas obligatorias antes de commitear: `node tests/era2-guardado.js`, 0 errores de consola, y una prueba propia de lo nuevo en `tests/`.
- No gastar créditos de Runway. No usar música comercial.

## Resultado final (integrado en `claude/dazzling-davinci-wvedmk`)
Notas después = lo comprobado por pruebas automáticas y capturas en Chromium headless. **Nadie escuchó el audio** (solo se midió energía/determinismo) y **no se probó en un dispositivo táctil real** (solo emulación de Playwright).

| Categoría | Antes | Después | Evidencia |
| --- | --- | --- | --- |
| Arte de animales | 5 | 7 | `tests/era2-arte.js`, `docs/ARTGATE-ERA2.md`, `docs/artgate/` (antes/después y por bioma) |
| Animación | 3 | 6 | comer, atacar, descansar, morir (`era2-arte.js`: 0 argumentos no finitos) |
| HUD biológico / selección | 3 | 8 | `tests/era2-ui.js` (escritorio, móvil, tutorial); `docs/artgate/final/era2-hud-integrado.png` |
| Acciones con consecuencias | 6 | 8 | energía, heridas, descanso, caza con riesgo (`tests/era2-calidad-sim.js`, `docs/ERA2-ACCIONES.md`) |
| Habilidades | 4 | 6 | niveles y costo en energía; con bot «las 5» 46 %/33 % vs «ninguna» 38 %/17 % (Normal/Difícil, N=24); Alarma sigue sin utilidad demostrada |
| Control táctico | 4 | 7 | selección por clic/arrastre/especie, órdenes move/attack/forage, indicadores, líder |
| Combate comprensible | 3 | 7 | `matchup` con «por qué», panel «Últimos combates», bajas con causa |
| Audio (Era 2) | 0 | 6 | `era2-audio.js`: determinismo con audio activo vs mudo igual; sin escucha humana |
| Ecosistemas | 6 | 7 | mecánica por bioma solo medida en escenarios cerrados, no en partidas completas |
| Herencia | 5 | 7 | linaje cambia rasgos/vida/velocidad/puntos de habilidad; guardado viejo carga |
| UX / tutorial | 4 | 7 | tutorial interactivo probado; botón de sonido solapa un chip del HUD a 390 px |
| Rendimiento | 8 | 7 | 55 fps con 574 animales (`era2-calidad-sim`); `era2-arte` midió 31-34 fps con 417 en máquina cargada |
| QA | 7 | 8 | + calidad-sim, ui, arte, audio |

**Balance (bot razonable, N=48)**: Fácil 100 %, Normal 46 %, Difícil 27 % (metas 70+/40-60/15-35).
**Límites conocidos**: terrestres empeoraron en Normal (8→4 de 12) y Difícil (4→2); insectos por debajo de aves, Colmena 0/4 en Normal; el bot no usa niveles ni órdenes por animal; `era2-bot.js` (bot con clics) no se volvió a correr tras el merge.

## Ciclo 3 · jugabilidad/simulación (resultado)
Detalle, tablas y evidencia en `tests/era2-balance.md`; contrato del evento `cause` y reglas nuevas en `docs/ERA2-ACCIONES.md` (§5 y §8). Rama `worktree-agent-a10380960df1aac86`.

| Tema | Resultado medido |
| --- | --- |
| Terrestres | **Causa**: el umbral de reproducir subió de 60 a 75 en el rework (con hambre ×3,2 los de crianza lenta no llegaban a 10 animales a tiempo para colonizar antes de que la pradera se quedara sin plantas). Ninguna otra mecánica del rework, apagada por separado, lo explica (ablación). Arreglo: 60 para tu especie (75 para salvajes). Terrestres Normal/Difícil: 2/12 y 2/12 → 22/48 (46 %) y 9/48 (19 %) con 8 perfiles |
| Insectos / Colmena | El «0/4» era ruido (N = 4, IC [0-49]); no hay mecánica propia que los castigue; siguen por debajo de las aves (48 % contra 71 % en Normal) |
| Alarma | Rediseñada (aviso + huida + sin sorpresa, sin costo de energía extra al huir, costo 4-5 solo a los del radio). Escenario cerrado N = 96: +0,3 a +1,2 sobrevivientes de 6 (IC95 excluye 0 en 8 de 12). **Partidas completas: neutra** (68 %/38 % con, 69 %/39 % sin, N = 72) |
| Rugido y Alarma cobraban energía a TODA la manada | Medido: −9 de energía media y +46 % de colapsos; ahora pagan solo los que participan |
| Océano | Fase 2 imposible para voladores y anfibios (sin tierra ni herbívoros): arreglado (0/24 → 8/24) |
| Desierto / tundra | Oferta de comida 0,19 / 0,15 de la pradera con las mismas metas: comprimida, con topes de salvajes y meta de población propia. Desierto (camino real) 6 % → 21 %; **tundra 4 % → 6 %: sigue injugable** |
| Órdenes | `move` ya no huye de un depredador normal (solo pánico); nueva desobediencia por hambre; verificado `attack`/`move`/`forage`/desobediencia |
| Causa y consecuencia | `Bus.emit('cause', animal, texto, tipo)`: 11 tipos, límite de 3 frases por segundo para los no seleccionados |
| Dificultad | Fácil 97 %, Normal 51 %, Difícil 27 % (8 perfiles, IC95 de Wilson [91-99], [44-58], [21-33]); bot razonable Normal 63-65 % (borde alto de la meta) |
| No resuelto | Aves 25 puntos por encima de las demás clases; tundra; posible efecto negativo del Rugido en Normal (+16 puntos al quitarlo, N = 36); estrategias agresivas/defensivas y de órdenes rinden menos que la automática |

