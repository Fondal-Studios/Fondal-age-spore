# Fondal Age Spore: guía para continuar el trabajo

Repositorio: https://github.com/Fondal-Studios/Fondal-age-spore
Idioma del juego y de la conversación: español rioplatense. Los nombres y la IP son originales (nada de marcas de terceros).

## Qué es
Juego de estrategia 2D estilo Age of Empires que mezcla eras y reglas de la naturaleza: célula, animales, tribus, civilizaciones (El arte de la guerra), era moderna y espacio. Debe sentirse como simulación interactiva con base científica y con muchos botones, ramas y progresión. Es un juego APARTE de "La Horda" (arena 16-bit de fantasía oscura del mismo equipo), con el mismo estilo; se busca reutilizar sus assets. Falta la auditoría de assets de La Horda (ruta, categoría, tamaño, frames, paleta, licencia, estado en Art Gate, reutilizar/repintar/nuevo), que debe hacer un agente que vea ese repo.

## Estructura
- `index.html`: portada. `eras/`: una era por archivo HTML autocontenido (canvas, sin dependencias salvo Google Fonts). `art/`: 48 dibujos SVG/PNG de orgánulos. `tools/`: generador de arte (`art.py`, `sheet.js`) y datos de rasgos de la Era 2.
- Cada era es una IIFE con ganchos de prueba: `window.__e1` (Era 1), `window.__e2` (Era 2), `window.__e3` (Era 3). Se usan para pruebas automáticas; no quitarlos.

## Estado por era
**Era 1 (era1-celula.html)**: unicelular, colonia, pluricelular. Dividir, especializar (6 tipos), 7 estructuras, 42 mutaciones en 4 ramas (Depredador, Parásito, Fotosintético, Colonial) más generales, variantes A/B, 6 híbridos por fusión de ramas, ecología (praderas, corrientes, arrecifes), recurso Proteína y restos que se digieren (fagocitosis). 14 habilidades activas desbloqueadas por orgánulos (teclas 3 a 0). Cada mutación tiene su dibujo (`SPR_SVG` embebido; se regenera con `tools/art.py`). Panel Anatomía con corte de célula numerado. Zoom máximo 4: al acercarse se ven los orgánulos dentro de la célula.
**Era 2 (era2-animales.html)**: simulación visible de agentes. 12 especies en 4 clases, 36 rasgos con variantes, nidos, estaciones, eventos, 5 ecosistemas (pradera, selva, desierto, tundra, océano) con botón Planeta para colonizar, pirámide trófica, fase 2 con fogata, refugios, corral y tótem. Los rasgos (TV) siguen dibujados con trazos simples: falta darles el mismo nivel que a la Era 1.
**Era 3 (era3-tribus.html)**: oficios (recolector, cazador, artesano, constructor, chamán), 9 tecnologías, 6 edificios, hambre, frío, lobos, límite de cohesión (Dunbar), clan vecino con comercio, regalos, alianza y saqueos, fundación de la ciudad (Jefatura, Mercado o Templo). Sin pulir el arte.
**Era 4 (era4-civilizaciones.html, BOSQUEJO jugable)**: mapa con terreno, combate por leyes de Lanchester con panel «Por qué ganó», Sun Tzu mínimo (niebla, espías, emboscada, moral, provisiones), 3 recursos, 7 edificios, 4 doctrinas, 1-3 rivales con IA; guardado `evo_save4_v1`, lee/escribe `evo_lineage`, ganchos `window.__e4`. Diseño y qué es solo diseño: `docs/ERA4.md`. Equilibrio sin medir.
**Eras 5 y 6**: sin construir. Ideas: Lanchester y Sun Tzu en el combate, escalas de Kardashev, espacio inspirado en space opera con nombres originales.

## Cómo probar (importante)
No alcanza con simular: abrir en navegador real. Playwright funciona offline (las fuentes no cargan, es normal). Ejemplo: abrir el HTML con `file://`, `page.click('#startBtn')`, esperar, `page.screenshot(...)` y mirar la imagen. Los ganchos `__e1/__e2/__e3` permiten forzar estados (dar mutaciones, cambiar de ecosistema, acelerar). Un bot de prueba (clics en Dividir, elegir mutación al azar, usar todas las habilidades) corrió sin errores a ×4.
Balance medido con bots: Era 1 Fácil, 10 de 10 victorias con 2 rivales; Normal y Difícil, entre 4 y 6 de 10. Era 3 Fácil: gana el bot en cerca de 500 s algunas veces.

## Arte pintado de la Era 1 (Runway)
`art/runway/cells/*.png` (13 sprites: basal + 4 ramas x 3 niveles). Se cargan con rutas relativas `../art/runway/cells/`; `drawCell` usa `paintBody` (sección "Cuerpos celulares pintados" de era1-celula.html). Nivel = `cellTier(T)` según `T.mutCount`. Los cuerpos pintados reemplazan el blob y el corte vectorial (`drawCutaway`); `SPR_SVG` sigue vivo para iconos, Anatomía y fallback si el PNG no carga. Ver `art/runway/LEEME.md` para regenerar y `AUDITORIA.md` para el plan de mejora. Gancho nuevo en `__e1`: `fuse`, `mk`, `cellTier`.

## Eras 2 y 3: guardado, semilla y linaje
Las tres eras usan `R()` (mulberry32) y guardan partida (`evo_save_v1`, `evo_save2_v1`, `evo_save3_v1`, forma `{v, at, summary, …}`, referencias por id/índice). Linaje común: `evo_lineage` `{v:1, from:1|2|3, branch, tier, mutCount, owned, seed, …}` (Era 1 lo escribe al evolucionar; Era 2 y 3 lo leen, dan un bono chico y lo reescriben). Era 2: rejilla espacial, 5 habilidades (teclas 1-5), LOD con sprites sobre ~160 animales. Era 3: setRole con tope de recolectores, Conocimiento por adultos/artesanos/chamanes/tecnologías, tres dificultades (`tests/era3-balance.md`). Pruebas: `tests/era2-*.js`, `tests/era3-*.js`.

## Guardado, semilla y multijugador (Era 1)
Toda la simulación usa `R()` (mulberry32, `seedRng`) y paso fijo `FIX=1/60`; **no usar `Math.random` ni `Date`/`performance.now` dentro de la simulación** (solo en dibujo). Guardado: `snapshot()/saveGame()/readSave()/restoreGame()` (clave `evo_save_v1`; `ai.seq` se guarda como ids). Sala: `lobby`, `newGame(di, nRiv, seed, slots)`, `SLOT_*`/`TEAM_*`. Si agregás estado nuevo a `S`, tiene que ser JSON-serializable (sin funciones ni referencias a objetos: usar ids) y correr `tests/determinismo.js`. **Órdenes (online)**: la interfaz NO modifica el estado; emite `dispatch(tipo, datos)` y `applyCmd(equipo, orden)` ejecuta (`x_divide`, `x_spec`, `x_mut`, `x_ab`… en `CMDS`) con `ACT` = equipo que actúa, `CMD` = orden en curso y `ME` = mi equipo. Dentro de un motor `x_*` usá `ACT`, `myCells(CMD.ids)`, `CMD.cc` (centro de cámara) y `tell()` (mensaje solo para quien actúa); nunca `S.sel`, `camCenter()` ni `toast()` directos. Lo que depende de la pantalla (selección, cámara, puntería) se resuelve al emitir la orden. Humano vs bot = `T.ai` (nunca «equipo > 0»). El azar de partículas es `Math.random` (cosmético); todo lo demás `R()`. Pruebas: `tests/acciones.js` (regresión del juego individual), `tests/online.js` (relay + 3 navegadores), `npm test` corre todo. Plan de red, relay y límites: `MULTIJUGADOR.md`. Auditoría y propuestas: `AUDITORIA.md`.

## Decisiones evolutivas y sonido (Era 1)
`EVT` (endosimbiosis en dos pasos, Gran Oxidación, Tierra Bola de Nieve, explosión del Cámbrico): diálogo de dos opciones con efecto real; los rivales deciden con `R()`; desactivadas online. Sonido: `Snd` (WebAudio procedural, capas por `cellTier`, modo musical por rama, tensión de combate); nunca toca `S` ni `R()`; `tests/sonido.js` mide que cada nivel suma energía. Fechas/cifras históricas de los textos: verificar en fuentes primarias antes de darlas por cerradas.

## Reglas de estilo del arte
Vector 100x100, contorno #2b2233 de 2 a 3 unidades, degradado radial claro arriba a la izquierda, brillo blanco translúcido, sin texto dentro del dibujo, fondo transparente. Cada mutación, variante e híbrido debe verse distinto. Cuando el agente pintor mejore un dibujo, reemplazar el SVG en `tools/art.py` (o el JSON embebido) y volver a generar.

## Documentos vinculados
Códice de diseño (Claude Doc): https://claude.ai/artifact/NNpLeumePBsvZRQsqb71jh (18 secciones: leyes y reglas, ramificación, recursos, Eras 2 y 3, tabla de reutilización de La Horda, guía del agente pintor, bibliografía). Las versiones publicadas: Era 1 https://claude.ai/artifact/D1XWnvv3mp4RBMJcMPJNca, Era 2 https://claude.ai/artifact/F4sioitHQXwuChDwFz5azg, Era 3 https://claude.ai/artifact/5esTP939V4AagPPEv6WeZM.

## Pendiente, en orden sugerido
1. Habilidades activas en la Era 2 (rugido, camuflaje, excavar, alarma, migrar), como en la Era 1.
2. Misiones con riesgo y recompensa en el mapa.
3. Control directo de una unidad líder (WASD o toque) con ataque y esquiva.
4. Órdenes tácticas: formaciones, emboscada, retirada, selección por arrastre.
5. Eventos con decisión de dos opciones; rivales con personalidad visible; meta-progresión (Genoma, Instinto, Tradición, Doctrina, Patente, Legado estelar).
6. Rasgos de la Era 2 y arte de la Era 3 con el mismo nivel visual que la Era 1; usar los dibujos nuevos dentro de los organismos pluricelulares.
7. Traspasar rasgos de la Era 1 a la Era 2 (hoy solo viaja la clase por el hash de la URL) y de la Era 2 a la 3.
8. Sonido y música; Eras 4 a 6; auditoría de assets de La Horda.
Las cifras científicas (productividad por bioma, tamaños de banda, etc.) son aproximaciones de manual de fuentes secundarias: verificar en fuentes primarias antes de afirmarlas dentro del juego.

## Ciclo 3 (estabilización)
Informe completo en `docs/CICLO3.md`; plan Era 3 en `docs/ERA3-PLAN.md`; CI en `docs/CI.md`; escucha humana en `docs/ESCUCHA.md`; lanzamiento/monetización en `docs/MONETIZACION.md`. Reglas nuevas: el registro de causas (`CLOG`) y cualquier estado que dependa de la selección NO va en `G` (rompe el hash); la Era 2 emite `Bus.emit('cause', animal, texto, tipo)`; el audio NO está aprobado hasta una escucha humana.

## Ciclo 4 · Era 3 como juego de estrategia
La Era 3 se **administra** (prioridades de comida/construcción/defensa/exploración/saber, oficios fijados, obras por etapas con mejoras de nivel, diplomacia con dos clanes de personalidad distinta). Contrato del Bus, datos para la interfaz (`tribeInfo`, `rivalInfo`, `buildingInfo`, `roleInfo`) y reglas: `docs/ERA3-ACCIONES.md`. Estado nuevo solo en `G.x3` (JSON, con valores por defecto en `ensureX3`); el mundo de clanes usa `mkRng` local; los suscriptores del Bus no mutan `G`. Pruebas: `tests/era3-ciclo.js` (circuito, decisiones, rivales, Bus, partida vieja `tests/fixtures/era3-save-v1-base.json`), balance con perfiles de bot `tests/era3-ciclo-run.js` (ver `tests/era3-balance.md`).

## Ciclo 4 · Audio
Informe y números en `docs/AUDIO.md` (sección Ciclo 4); protocolo de escucha humana en `docs/ESCUCHA.md`. El motor compartido `eras/audio-lofi.js` sirve a las Eras 2, 3 y 4 (la Era 1 conserva su `Snd`, que ahora comparte `evo_audio_v1` y se suspende con la pestaña oculta). Cada era tiene su bloque `/* === AUDIO === */` al final de la IIFE: solo se suscribe al Bus (Era 4: lee `G`) y NUNCA modifica la simulación ni usa `R()`. El botón de audio es compartido (`FondalAudio.mountUI`), fijo en la esquina superior derecha, y el HUD debe respetar `--audio-reserve` (52 px). Pruebas: `tests/era3-audio.js` (`ONLY=geo,dir,ctl` corre secciones sueltas), `tests/era4-audio.js`, `tests/escucha.js`. **El audio NO está aprobado hasta una escucha humana.**

## Ciclo 4 · Era 3 por civilización (constructor por Edades)
Contrato: `docs/ERA3-CIVILIZACIONES.md`; implementación, API y Bus nuevos: `docs/ERA3-ACCIONES.md` §8. La Era 3 es un constructor de base en grilla (colocar → generar → mejorar → avanzar de Edad I-III) que se abre a expediciones al mapa en la Edad III; la Maravilla termina la era (`found()`). La civilización sale de `evo_lineage.era2.cls` (ter/ins/acu/ave; acuático con `era2.tierra` = ciudad anfibia) o del selector de especie del menú; los rasgos de la Era 2 dan bonos con origen. Todo dirigido por datos (`SL`, `CIVS`, `SPECIES`, `TRAIT_FX`, `UNITS`, `AGE_REQ`); la lógica usa ids de casillero. El dibujo es PROVISORIO: marcadores (forma + color + inicial + nivel) y habitantes con `Era2Arte.drawAnimal`; el arte de Runway se enchufa por id en `ASSETS` (`__e3.assets.register(id, url)`), ver `docs/ARTE-RUNWAY-ERA3.md`. Estado nuevo solo en `G.x3` (v: 2) y campos por edificio/persona; las partidas viejas se migran. Pruebas: `tests/era3-civs.js` (4 civs, 48 tecnologías, Edades, Maravilla, continuidad de las 12 especies, submarina vs anfibia), `era3-ciclo.js`, `era3-ui.js`, `era3-arte.js`, `era3-guardado.js`, `era3-bot.js`; balance: `tests/era3-civs-run.js` y `tests/era3-civs-balance.md`; capturas: `tools/era3-civs-capturas.js` → `docs/ciclo4/era3-civs/`.
