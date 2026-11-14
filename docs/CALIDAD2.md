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
