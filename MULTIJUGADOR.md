# Multijugador (hasta 8) — estado y plan

Objetivo: entrar hasta 8 personas con su célula, diferenciarse y competir; las casillas sin persona las juega un bot.

## Qué ya está hecho (verificado)
| Pieza | Dónde | Prueba |
| --- | --- | --- |
| **8 colonias** en el mapa (2 colores y 2 bases nuevas) | `era1-celula.html` (`SLOT_*`, `HOMES`) | `tests/determinismo.js` (8 colonias, 1200 ticks) |
| **Sala** con casillas: vos + hasta 7 bots, nombre propio | menú de la Era 1 | captura + prueba manual |
| **Semilla del mundo**: el mismo código da el mismo mapa y rivales | `seedRng`/`R()` (mulberry32); ya no queda `Math.random` en la simulación | misma semilla ⇒ mismo hash; otra ⇒ distinto |
| **Paso fijo** de simulación (1/60 s) | `loop()` | idem |
| **Estado serializable** + hash (`stateHash`) | `snapshot()` | guardar→cargar→seguir da el mismo hash que no interrumpir |
| **Relay de salas** (crear/unirse con código, 8 plazas, turnos de 100 ms, orden único de comandos, anti-spam, bot de reemplazo, aviso de desincronización) | `server/relay.js` | `server/test.js` (13 comprobaciones con clientes reales) |

## Qué falta (en orden)
1. **Capa de comandos en el cliente.** Hoy las acciones (Dividir, Especializar, Construir, Fusionar, mutación, habilidades, órdenes) actúan directo sobre `S.teams[0]` (≈80 referencias a «el jugador = equipo 0»). Hay que convertirlas en `apply(slot, cmd)` con el equipo como parámetro y que la UI solo emita comandos (`{type:'divide', ids:[…]}`), con ids y no con objetos. Es el trabajo grande.
2. **Elecciones de mutación por equipo con su propio generador** (hoy `offers()` consume el azar global cuando el jugador abre el panel, y eso depende del momento en que cada uno mira).
3. **Cliente de red**: conectar al relay, esperar el turno `n` antes de simular 6 ticks (lockstep), enviar `hash` cada ~50 turnos y mostrar «desincronizado».
4. **Reemplazo por bot** al recibir `{type:'bot'}` (la IA ya existe: se enciende `T.ai` para ese equipo en ese turno).
5. **Riesgo conocido de determinismo entre navegadores**: `Math.sin/cos/atan2/hypot` no están garantizados idénticos en todos los motores. Probado solo en Chromium. Mitigación: tabla propia o un mismo motor para todos, o servidor autoritativo.

## Protocolo del relay (WebSocket, JSON)
Cliente → servidor: `create{name}`, `join{code,name}`, `start{seed,diff,bots}` (solo anfitrión), `cmd{c}`, `hash{turn,h}`, `leave`.
Servidor → cliente: `lobby{code,players,you}`, `start{seed,diff,turnMs,slots[{slot,kind,name,color}]}`, `turn{n,cmds[{slot,c}]}` cada `turnMs`, `desync{turn,hashes}`, `error{msg}`.
Un comando `{type:'bot'}` con `slot` marca que esa persona se fue. Un turno equivale a 6 ticks de 1/60 s.

## Cómo correr el relay
```
cd server && npm install && npm start        # ws://0.0.0.0:8787  (PORT=… para cambiarlo)
npm test                                       # prueba de integración
```
GitHub Pages solo sirve archivos estáticos: el relay necesita un host con Node (Fly.io, Render, un VPS…). No está desplegado.

## Opciones de arquitectura
- **Lockstep (elegido):** barato, el servidor no sabe jugar; exige determinismo estricto y que todos esperen al más lento.
- **Servidor autoritativo:** más robusto contra trampas y desincronización, pero hay que correr la simulación en Node (el juego está acoplado al DOM: habría que separar la simulación de `render()`).
