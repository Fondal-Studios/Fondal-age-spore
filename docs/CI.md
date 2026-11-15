# Integración continua (GitHub Actions)

**Estado de verificación: pendiente.** Esta configuración se escribió y se validó como YAML (parser) y cada comando se corrió en local, pero **GitHub todavía no la ejecutó**. El arquitecto la empuja y mira el run; si algo falla en el runner (versiones, dependencias del sistema, tiempos) se ajusta en este mismo archivo.

## Cuándo corre cada cosa
| Workflow | Disparador | Qué hace |
| --- | --- | --- |
| `.github/workflows/tests.yml` («Pruebas») | `push` **solo a `main`**, `pull_request` (cualquier rama) y manual (`workflow_dispatch`) | 4 trabajos independientes: era1, era2, era3, era4 |
| `.github/workflows/balance.yml` («Balance (manual)») | **solo** manual (`workflow_dispatch`) | suites largas de balance con bots; nunca corre sola |

Por qué `push` solo en `main`: el run #18 (push) y el #19 (pull_request) del mismo commit `1166564` corrían dos veces las mismas pruebas, y encima una falló y la otra no. Con este esquema, una rama con PR corre una vez (por el PR); una rama sin PR no corre nada hasta abrirlo (o hasta correrlo a mano con «Run workflow»). `concurrency` cancela la corrida anterior de la misma rama/PR si llega un commit nuevo.

## Trabajos de `tests.yml`
Cada trabajo es independiente (no hay matriz, así que cada uno corre hasta el final aunque otro falle: es el efecto buscado por `fail-fast: false`). Todos usan `bash -e -o pipefail` y guardan el log en `ci-logs/`.

| Trabajo | Tiempo máx. | Pasos |
| --- | --- | --- |
| `era1` | 15 min | `npm test` = determinismo, acciones, sonido de la Era 1, online (relay + 3 navegadores), prueba del relay |
| `era2` | 30 min | `era2-guardado`, `era2-ui` (con capturas), `era2-arte --sinfps`, `era2-audio`, `era2-calidad-sim` |
| `era3` | 20 min | `era3-guardado`, `era3-bot` (10 min de juego a ×4, capturas) |
| `era4` | 20 min | `era4-guardado`, `era4-bot` (5 min a ×4, capturas) |
| `audio-eras34` | 45 min | `era3-audio` (mediciones offline, ~10 a 20 min en un runner compartido), `era4-audio`, `escucha` (la página de escucha humana abre y sus botones andan). Independiente de los demás trabajos |

Si un trabajo falla se sube un artefacto `fallo-eraN` (14 días) con `ci-logs/`, `ci-shots/` y, en la Era 2, `docs/artgate/screens/`. Se baja desde la página del run, sección «Artifacts».

`era2-arte` corre con `--sinfps` porque mide fps con ~540 animales y un runner compartido da números que no significan nada. `era2-audio` sí mide un cociente de fps (audio activo / suspendido, mediana de 4 rondas alternadas) y es tolerante (≥80 %); si diera falsos positivos en el runner, ese es el primer sospechoso.

## Cómo correr cada cosa en local
Requisitos: `npm install` en la raíz, `npx playwright install chromium`, y `cd server && npm install` para el relay. Los tests de Playwright usan `NODE_PATH=$(npm root -g)` si Playwright está instalado globalmente.

```
npm test                              # era1 completa
node tests/era2-guardado.js           # y era2-ui.js (SHOTS=carpeta guarda capturas), era2-arte.js [--sinfps] [--sincapturas],
node tests/era2-audio.js              #   era2-audio.js (~3-4 min), era2-calidad-sim.js
node tests/era3-guardado.js ; node tests/era3-bot.js [captura-escritorio.png] [captura-movil.png]
node tests/era4-guardado.js ; node tests/era4-bot.js [captura-escritorio.png] [captura-movil.png]
ONLINE_PORT=19001 node tests/online.js   # el puerto se puede cambiar para correr varias a la vez
```

Balance (no va en CI por defecto): `tests/era2-balance-run.js`, `era2-balance-all.sh`, `era3-balance-run.js`; desde GitHub, pestaña Actions → «Balance (manual)» → «Run workflow» (elige suite, partidas y dificultades; sube `tests/.balance-out` como artefacto).

## Diagnóstico del fallo de `tests/online.js` (run #18)
Síntoma: línea 38, «las órdenes de cada persona deben tener efecto», con `propias A/B: 0 11`.

Causa (confirmada reproduciéndola en local, atando 3 copias de la prueba a un solo núcleo; la versión vieja falló en 1 de 3, con `propias A/B: 7 3`):
1. **La prueba marcaba el ritmo por reloj de pared** (`waitForTimeout(700|800)` entre órdenes). Dividir cuesta nutrientes y energía que se juntan con el tiempo de *simulación*. En un runner lento los clientes ejecutan menos turnos por segundo real, así que entre una orden y la siguiente pasaba menos tiempo simulado: faltaban nutrientes/energía y la orden se rechazaba en `x_divide` (mensaje «Faltan nutrientes»).
2. **Medía un resultado de combate, no la orden**: contaba las células propias al final. Los 3 bots rivales atacan y pueden eliminar una colonia chica (de ahí el 0), y el desenlace cambia según en qué turno entra cada orden. No hay descarte por anti-spam en juego (el relay acepta 1 orden por persona y turno y la prueba manda 1 por iteración) ni órdenes antes del arranque (la prueba espera `NET.on && S`).
3. El resultado dependía además de esperas fijas de 8 s para ver al bot tomar el lugar del que se va.

Arreglo (en `tests/online.js`; la simulación, el relay y los hashes no se tocaron):
- Todas las esperas son **por condición con timeout de 90 s**: `advance(n)` espera a que el cliente haya ejecutado `n` turnos más (tiempo simulado, no real); el cliente A y el B esperan llegar al turno 350 antes de leer hashes; la carga de la página espera `__e1`.
- «Las órdenes tienen efecto» se verifica con evidencia directa: (a) el relay **entregó** ≥30 órdenes `divide` de cada persona (se cuentan los frames del WebSocket, independiente de los clientes) y (b) el **pico** de células propias supera en 3 las iniciales; si el runner es lento y todavía no hubo nacimientos, la prueba sigue ordenando dividir (hasta 40 veces más) hasta verlos. No se debilita lo que se verifica: sigue exigiendo órdenes con efecto, y sigue comparando los hashes de estado entre clientes en ≥6 puntos y que no haya `desync`.
- El puerto se puede fijar con `ONLINE_PORT`, para correr varias en paralelo.

Evidencia de estabilidad (VM de 4 núcleos, local): 10 corridas seguidas a velocidad normal y 12 corridas con las 3 copias atadas a UN solo núcleo (`taskset -c 0`, 4 rondas de 3 en paralelo), todo a la vez con otras cargas: **22/22 verdes**. La versión anterior de la prueba falló 1 de 3 en esa misma condición (`propias A/B: 7 3`). Primer intento con 12 copias en un núcleo: dio `TimeoutError` (90 s) por sobrecarga absurda, no es una condición realista de runner.

Observación de diseño (no es un bug de la prueba): la colonia del slot 0 suele crecer menos que la del slot 1 (el capital inicial de 40 nutrientes paga 2 divisiones y después depende de dónde cae el mapa); por eso el criterio mínimo son 2 nacimientos por persona, lo que el capital inicial paga siempre.

## Tiempos medidos en local (VM lenta, sin carga)
`era2-guardado` 13 s · `era2-ui` 35 s · `era2-arte --sinfps` 17 s · `era2-calidad-sim` 46 s · `era2-audio` ~3 a 4,5 min · `era3-guardado` 5 s · `era3-bot` 309 s · `era4-guardado` 2 s · `era4-bot` 156 s · `npm test` 65 s. Los timeouts de los trabajos (15/30/20/20 min) tienen holgura de 3x o más sobre eso.
`era2-calidad-sim` mide fps con 574 animales (≥ 40): en esta VM dio 19,5 con otra carga y 46 sin ella, por eso en CI se corre con `CI_NO_FPS=1` (única línea tocada de ese test).
