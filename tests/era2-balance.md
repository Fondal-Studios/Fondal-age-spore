# Equilibrio de la Era 2 (medido con bots)

## Cómo se midió
Chromium real (Playwright), partida simulada llamando `__e2.step(.05)` directo, sin dibujar (≈ 1-3 s por partida de 3 min de juego). Semilla distinta por corrida (`S<dificultad>x<i>`); especie inicial rotando entre las **12** (i mod 12, así cada clase y especie tiene el mismo peso); bioma inicial: Pradera (como hace el botón Empezar). Tope de 2400 s (40 min) de juego: lo que ni ganó ni se extinguió es «estancada». «Gana» = completar la fase 2 (fogata, 3 refugios, corral con 3 domésticos, tótem); «fase 2» = cumplir la fase 1 (población, 4 evoluciones, 2 nidos, 2 ecosistemas).
Scripts: `tests/era2-balance-bot.js` (bots), `tests/era2-balance-run.js` (una tanda), `tests/era2-balance-all.sh` (4 procesos en paralelo), `tests/era2-balance-agg.js` (tabla; IC95 de Wilson). Los resultados crudos quedan en `tests/.balance-out/` (ignorado por git). Las muertes por causa salen de una copia diagnóstica del HTML con un contador en `kill()` (no cambia la simulación).
Los bots usan su propio azar (nunca `R()`), así que no alteran la simulación.

Bots:
- **razonable**: elige el rasgo con mejor puntaje según sus efectos; pone huevos cada 6 s; construye 2 nidos de a uno; cuando el ecosistema ya está colonizado viaja al más productivo compatible; en fase 2 construye fogata, 3 refugios, corral, tótem en cuanto alcanza la Tradición; habilidades con criterio (Rugido con ≥2 enemigos cerca, Alarma con manada ≥5 y amenaza fuerte, Excavar con vida media <50 %, Camuflaje con vida <65 % o jefe, Migrar si hay hambre moderada y pocas plantas cerca; las que gastan energía no se usan si la manada ya tiene hambre media <40).
- **pasivo**: evoluciona (primera oferta) y pone huevos cada 10 s; sin nidos ni Planeta (por diseño no puede ganar: la fase 1 pide 2 nidos y 2 ecosistemas).

## Hallazgos (antes de tocar nada)
- La Era 2 tenía **solo Fácil y Normal** (el encargo hablaba de tres: se agregó Difícil).
- Con el bot razonable **100 % de victorias en Fácil y en Normal** (N=36 c/u, sin extinciones, ganan en ≈ 3 min de juego). Normal solo cambiaba rivales ×2, lobos ×2, meta de población 28 y plantas ×1 en vez de ×1,35: no presionaba.
- Probé palancas sueltas en Normal con el razonable (N=24): hambre ×1,3 → 96 %; ×2 → 83 %; daño ×2,2 + lobos ×4 → 100 %. La manada es muy robusta porque se reproduce rápido (huevo 14 s, 7 s en nido). Solo cuando se combinan hambre alta, meta de población más grande, plantas más lentas y rivales que evolucionan más rápido aparecen fracasos.
- Pasivo (antes): 0 victorias (esperable); Fácil 19 % de extinciones y 81 % estancadas; Normal 39 % de extinciones. Causas de muerte propia por partida: hambre y rivales (≈ 95 cada uno en Fácil) mucho antes que lobos (≈ 5). Cae sobre todo insectos y acuáticos.

## Antes / después (bot razonable)
| Dificultad | Antes (N=36) | Después (N=48) | Meta |
| --- | --- | --- | --- |
| Fácil | gana 100 % [90-100], extinción 0 % | gana **100 %** [93-100], extinción **0 %** [0-7], estancadas 0 % | ≥ 70 % y < 10 % ext → **cumple** |
| Normal | gana 100 % [90-100], extinción 0 % | gana **50 %** [36-64], extinción 38 % [25-52], estancadas 13 % | 40-60 % → **cumple** |
| Difícil | no existía | gana **19 %** [10-32], extinción 60 % [46-73], estancadas 21 % | 15-35 % → **cumple** |

IC95 de Wilson entre corchetes. El «antes» con el bot v1 (habilidades sin gastar criterio de hambre) y el «después» con el bot v2 + constantes finales. Control cruzado: el juego original con el bot v2 dio Fácil 97 % y Normal 94 % (N=36), o sea el «antes» no depende del bot.

Hitos (medianas, s): Fácil: nido 1 a los 14, nido 2 a los 22, 4 evoluciones a los 100, población a los 60, 2.º ecosistema a los 76, fase 2 a los 101, victoria a los **174** (≈ 3 min). Normal: 15 / 21 / 96 / 130 / 92 / 161 / victoria **234**. Difícil: 16 / 21 / 90 / 210 / 104 / 253 / victoria **314**. Hoy una persona hábil tarda poco: no se alargó la partida de Fácil.

Por clase del bot razonable (después): Fácil 12/12 en cada clase. Normal: terrestres 8/12, aves 8/12, acuáticos 5/12, **insectos 3/12** (9 extinciones). Difícil: terrestres 4/12, aves 4/12, acuáticos 1/12, **insectos 0/12** (11 extinciones). Las especies más débiles con este bot: Parasitoides, Enjambre, Depredadores abisales (0/4 en Normal). **No se corrigió el desbalance por clase** (insectos pequeños con 7-10 de vida mueren a manos de los rivales).

## Pasivo (después, N=36)
| Dificultad | Victorias | Extinción | Estancadas vivas a 40 min |
| --- | --- | --- | --- |
| Fácil | 0 (por diseño) | **8 %** (antes 19 %) | 92 % |
| Normal | 0 | 81 % (antes 39 %) | 19 % |
| Difícil | 0 | 83 % | 17 % |
Meta (Fácil sin extinguirse en la mayoría): **cumple** (92 % sobrevive). Efecto colateral aceptado: en Normal/Difícil un jugador que no anida ni coloniza se extingue casi siempre; así conviene que sea. Ojo: el pasivo nunca completa la fase 1, así que el hallazgo de AUDITORIA («no cumple la fase 1») sigue siendo cierto; no es un bug de balance sino que anidar y colonizar son requisitos.

## Qué se cambió y por qué
Todo en `eras/era2-animales.html`, ahora hay una tabla `DIFFS` (también en `window.__e2.DIFFS`, se puede pisar desde las pruebas) y botón **Difícil** en el menú:

| | pop | rivales | lobos×| plantas | hambre propia | daño recibido | rasgos rivales cada | Tradición |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fácil (antes: 20, 1, ×1, ×1,35, 1, 1) | 20 | 1 | ×1 | ×1,35 | ×0,9 | ×0,8 | ×1,5 (más lento) | ×1 |
| Normal (antes: 28, 2, ×2, ×1) | 36 | 2 | ×3 | ×0,8 | ×2,6 | ×1,2 | ×0,55 (más rápido) | ×1 |
| Difícil (nuevo) | 38 | 2 | ×4 | ×0,7 | ×3 | ×1,5 | ×0,5 | ×1 |

Notas: «hambre» multiplica el consumo de tus animales (no el de los salvajes); «lobos» multiplica lobos y peces grandes iniciales; la meta de población máxima posible en fase 1 es 40 (tope de `capOf`), por eso 36 y 38. Los valores salieron de barridos de ≈ 15 combinaciones con N=24-36; los de Normal y Difícil están en el borde de ruido (±14 puntos con N=48), así que **un cambio de ±0,2 en hambre mueve Normal entre ≈ 50 y 70 %**: si se toca, volver a medir.
Fácil: hambre ×0,9, daño ×0,8 y rivales más lentos solo para que el pasivo sobreviva (extinción 19 → 8 %).

Habilidades (costos; `ABD`): Rugido energía 6→4; Excavar 5→3; Migrar 8→4 y duración 8→5 s; Alarma: la reunión forzada dura 3 s (antes 6; el bonus de defensa sigue 6 s) y resiste 25 % (antes 20 %). Motivo: con las dificultades altas gastar energía de una manada con hambre la mataba, y Migrar/Alarma mantenían a los animales lejos de la comida.
Hook nuevo en `__e2`: `placeMig`, `DIFFS`.

## Equilibrio de las 5 habilidades (razonable, N=48, constantes finales)
| Condición | Normal gana | Difícil gana |
| --- | --- | --- |
| con las 5 | 50 % [36-64] | 19 % [10-32] |
| ninguna | 54 % | 29 % |
| sin Rugido | 54 % | 27 % |
| sin Camuflaje | 56 % | 17 % |
| sin Excavar | 52 % | 19 % |
| sin Alarma | 67 % | 29 % |
| sin Migrar | 63 % | 40 % |
Ninguna habilidad es dominante: quitar cualquiera cambia ≤ 4 puntos (Rugido, Camuflaje, Excavar), dentro del ruido. **Pero tampoco ayudan**: Alarma y Migrar parecen restar (+13 a +21 puntos al quitarlas; en el límite de significancia con N=48), y «ninguna» rinde igual o mejor que «las 5». Antes de los cambios era peor (con 5 habilidades 31 % vs ninguna 50 % en Difícil, N=36). Conclusión honesta: las habilidades están en un punto «no rompen el juego», pero no demostré que valgan la pena para este bot; no sé cuánto de eso es del bot (un humano las usa con mejor lectura) y cuánto del diseño.

## Verificaciones
- `tests/era2-guardado.js`: OK (determinismo, guardado/continuar).
- Consola: 0 errores en 4 corridas de 10 min por dificultad con el bot razonable y en las 3 corridas de `tests/era2-bot.js` que terminaron (en las tandas grandes el runner registra `pageerror`/`console.error` pero no mostré esa salida).
- `tests/era2-bot.js` (bot real con clics, 10 min): pasa en las tres dificultades, pero es **intermitente**: a veces falla por una carrera del arnés (un diálogo, p. ej. «Tu especie despertó», tapa un botón y el clic expira). Ocurre igual con el HTML original (≥ 3 de 8 corridas) y con Fácil ahora es más frecuente porque la fase 2 llega en ≈ 100 s. No es un error del juego; no se tocó el arnés (fuera de mi alcance).

## Límites
- Todo depende del bot; no se jugó con personas. Un humano suele ser menos eficiente en el principio y más inteligente al elegir rasgos.
- Solo bioma inicial Pradera; los otros biomas se visitan al colonizar.
- No se midió la fase 2 por separado más allá de los hitos; no hay Difícil guardada en partidas viejas (los guardados con `diffI` 0/1 siguen cargando; el 2 es nuevo).
- Las cifras científicas del juego no se tocaron.
