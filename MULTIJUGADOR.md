# Multijugador — estado y plan

**Desde el Ciclo 6:** en línea en las **Eras 1 (hasta 8 colonias), 5 y 6 (hasta 4 civilizaciones)**, con reconexión en las Eras 5 y 6 y relay listo para publicar. Ver «Eras 5 y 6» y «Publicar el relay» al final.

Objetivo: entrar hasta 8 personas con su célula, diferenciarse y competir; las casillas sin persona las juega un bot.

## Estado: el online de la Era 1 funciona (beta)
Verificado con `tests/online.js`: **relay real + 3 navegadores en la misma partida (3 personas + 3 bots)**, órdenes de cada persona (dividir, impulso, especializar, sembrar), **una desconexión** (la colonia pasa a un bot en todas las pantallas) y comparación del hash del estado cada 50 turnos: **10 puntos de comparación idénticos** y ningún aviso de desincronización.

| Pieza | Dónde | Prueba |
| --- | --- | --- |
| **8 colonias**, sala con casillas (vos + bots), semilla compartible | menú de la Era 1 | `tests/determinismo.js` |
| **Azar con semilla** (`R()`; ni partículas ni ofertas de mutación consumen el azar de la simulación) y **paso fijo** 1/60 s | `era1-celula.html` | misma semilla ⇒ mismo estado |
| **Capa de órdenes**: la interfaz solo emite `dispatch(tipo, datos)`; `applyCmd(equipo, orden)` las ejecuta con el mismo código para cualquier equipo (`ACT`, `CMD`, `ME`) | `era1-celula.html` | `tests/acciones.js`: el juego individual da el mismo hash que antes de la refactorización |
| **Estado por equipo** (etapa, fusión, impulso, ATP, camuflaje, recargas, ADN, mutaciones) y humano vs IA por `T.ai` | `era1-celula.html` | idem |
| **Cliente lockstep** (`netPump/netTurn`), sala online (crear/unirse con código), hash cada 50 turnos, reemplazo por bot | `era1-celula.html` | `tests/online.js` |
| **Relay** de salas de hasta 8, turnos, anti-spam, aviso de desincronización | `server/relay.js` | `server/test.js` (13 comprobaciones) |
| **Partida guardada** (solo individual) | `snapshot/saveGame/restoreGame` | guardar→cargar→seguir = mismo hash |

## Cómo jugar online
1. `cd server && npm install && npm start` en un host con Node (por defecto `ws://localhost:8787`; `PORT=…`).
2. Abrí `eras/era1-celula.html?relay=ws://TU_SERVIDOR:8787` (o escribí la dirección en el menú) → **Crear sala** → pasá el código de 4 letras.
3. Las demás personas ponen el código y **Unirme**. El anfitrión elige cuántos bots y toca **Empezar online**.

## Límites conocidos (honestos)
- **Solo probado en Chromium** (dos instancias). `Math.sin/cos/atan2/hypot` no están garantizados idénticos entre motores (Chrome, Firefox, Safari): entre navegadores distintos podría desincronizarse. El hash de estado lo detecta y avisa, pero no lo repara. Mitigación futura: tablas propias de trigonometría o servidor autoritativo.
- **Era 1 sin reconexión**: si alguien se desconecta, su colonia pasa a un bot para siempre (las Eras 5 y 6 sí reconectan).
- **Sin pausa ni velocidad ×2** en online; las decisiones evolutivas (endosimbiosis, Gran Oxidación…) están desactivadas online (hoy son un diálogo que pausa el juego); sin guardado ni legado.
- **Lockstep**: todos esperan al más lento; con mala red la partida se «congela» hasta que llegan los turnos.
- **Sin autenticación**: cualquiera con el código entra; el relay no valida que las órdenes sean legales más allá de que cada orden solo puede mover células del propio equipo.
- **El relay no está desplegado** (sí está listo para hacerlo: ver abajo). GitHub Pages solo sirve archivos estáticos.
- **Fin de partida online**: gana quien llega al dominio (porcentaje de vida total sostenido) o es el último vivo; los eliminados siguen mirando.

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

## Eras 5 y 6 (Ciclo 6)
- Cliente compartido `eras/net-lockstep.js`: en el menú de cada era, **Jugar en línea** → dirección del relay, tu nombre, **Crear sala** o código + **Unirme**. El anfitrión elige bots (los lugares vacíos) y su dificultad. Cada lugar recibe una clase distinta (empezando por la del anfitrión).
- 1 turno del relay (100 ms) = 1 paso de simulación (0,1 s). Sin pausa ni velocidad ×2 en línea; las decisiones de la Era 5 no pausan (40 s y se toma la segunda opción).
- **Reconexión**: al empezar, el relay da una ficha a cada persona (se guarda en el navegador). Si se corta, la civilización la juega un bot; en el mismo navegador, **Volver a mi partida** reenvía la ficha, el relay manda toda la historia de órdenes, la era la re-simula en segundos y una orden `{type:'human'}` devuelve el mando. Probado en `tests/online56.js` (mismo hash que los demás).
- El relay separa salas por era (una sala de la Era 5 rechaza a la Era 6) y responde `GET /` con «ok» (chequeo de salud). Tope de 16 conexiones por IP.

## Publicar el relay
- **Render**: «New → Blueprint», elegir el repositorio: `render.yaml` levanta `server/` (plan gratis: se duerme sin uso; la primera conexión tarda ~1 min).
- **Fly.io**: `cd server`, después `fly launch --copy-config --no-deploy` y `fly deploy` (`server/fly.toml`, región Buenos Aires). Dirección: `wss://<app>.fly.dev`.
- **Docker** en cualquier VPS: `docker build -t fondal-relay server` y `docker run -p 8787:8787 fondal-relay` (con HTTPS delante para `wss://`).
- Después, poner la dirección pública en `DEFAULT_RELAY` (`eras/net-lockstep.js`) para que el juego la use sin escribirla. Una página servida por HTTPS (GitHub Pages) solo puede conectarse a `wss://` (o a `ws://localhost`).
