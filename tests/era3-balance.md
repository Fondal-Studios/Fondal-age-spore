# Equilibrio de la Era 3 (medido con bots)

Cómo se midió: Chromium real (Playwright), partida simulada llamando `__e3.step` directo (paso fijo 0,05 s, sin dibujar), semilla distinta en cada corrida (`S<dificultad>x<n>`, posible desde que la Era 3 tiene PRNG con semilla). Tope de 2400 s (40 min) de juego: lo que no ganó ni se extinguió en ese tiempo cuenta como «estancada». Los scripts de medición eran temporales (no se versionan); la prueba permanente es `tests/era3-guardado.js` y `tests/era3-bot.js`.

Bots (todos con la misma lógica de construcción, tecnología y diplomacia; solo cambia lo que hacen con los oficios):
- **auto** (referencia «razonable»): investiga por orden fijo, construye 3 refugios + almacén + tótem + huerto, regala comida al clan para aliarse, deja que «asignar libres» reparta oficios. No pone chamanes a mano.
- **smart**: igual, pero además pone un chamán al inicio y uno más por cada 8 adultos.
- **con6**: sube constructores con `setRole('con', +1)` seis veces al principio (el caso del hallazgo 3 de AUDITORIA.md).
- **idle**: no toca nada.

## Antes (solo con PRNG agregado, reglas originales; 16 corridas por celda)

| Bot | Fácil | Normal |
| --- | --- | --- |
| auto | 16/16 victorias, ganó en 924 s de media | 16/16 victorias, 1256 s |
| con (2 constructores extra) | 16/16 | 15/16 (+1 estancada) |
| **con6** | **0/16 victorias, 16/16 extinciones a los ~160 s** | **0/16, 16/16 extinciones** |
| idle | 0 victorias, 0 extinciones (todas vivas a los 40 min) | igual |

No existía la dificultad Difícil. El Conocimiento del bot **idle** llegaba a ~195-210 a los 40 min (fórmula original `0,004 por adulto por segundo`, sin chamanes) cuando las 9 tecnologías costaban 62 en total: todo se podía comprar sin decidir nada. El hallazgo de extinción se **reprodujo** (con6: 100 %), pero no con el bot moderado (2 constructores: 0 extinciones en 32 corridas); la tasa de «2 de 3» del agente anterior depende de cuántos constructores suba el bot.

## Después (cambios de este trabajo)

| Bot | Fácil | Normal | Difícil |
| --- | --- | --- | --- |
| **auto** (N=32) | **30 victorias (94 %)**, 2 extinciones (6 %), 0 estancadas; 923 s de media | **16 (50 %)**, 11 extinciones (34 %), 5 estancadas (16 %); 1306 s | **6 (19 %)**, 13 extinciones (41 %), 13 estancadas (41 %); 1438 s |
| smart (N=32) | 32 (100 %), 0 extinciones; 771 s | 16 (50 %), 6 extinciones, 10 estancadas | 9 (28 %), 9 extinciones, 14 estancadas |
| con6 (N=24, con cota 60 %) | 20 (83 %), 4 extinciones (17 %) | 3 (12 %), 17 extinciones | n/m |
| idle (N=8) | 0 victorias, 3 extinciones, 5 estancadas | 0 victorias, 8 extinciones | 0 victorias, 8 extinciones |

Metas pedidas: Fácil ≥ 60 % de victorias y < 15 % de extinciones → **cumplida** con auto y smart (con6, un bot deliberadamente malo, queda en 17 %). Normal 35-55 % → **cumplida** (50 % con ambos bots). Difícil 15-35 % → **cumplida** (19 % y 28 %). Con N=32 el error estadístico de cada porcentaje ronda ±9 puntos: Normal con auto está pegado al borde alto de la meta.

Límites honestos de la medición:
- Todo depende del bot. Un jugador humano con mejor lectura (refugios antes, comida almacenada) debería ganar más; no se midió.
- Las partidas «estancadas» en Normal/Difícil son tribus que no llegan a la población pedida por falta de comida y siguen vivas a los 40 min. El juego no las termina solo; se dejó así.
- Los lobos siguen siendo la primera causa de muerte (≈10-15 muertes por partida, sobre todo niños y gente fuera del fuego); no se tocó su comportamiento. Después viene el hambre.
- Los cambios se calibraron con auto; smart y con6 son chequeos cruzados, no objetivos.

## Qué se cambió y por qué
1. **Reasignar oficios (`setRole`)**: ya no se puede sacar gente de recolectores/cazadores si quedan menos que `max(3, 60 % de los adultos)`; si no hay de dónde sacar, aviso rojo («la tribu necesita al menos N recolectores o cazadores…»); cuando se saca de otro oficio, aviso informativo («Un recolector pasó a ser constructor»). El `−` de recolectores/cazadores también respeta el mínimo (los «libres» no trabajan). Con6 pasó de 100 % de extinciones a 17 % (Fácil).
2. **Conocimiento con costo real**: tasa `(0,0015·adultos + 0,006·artesanos + 0,05·chamanes) · (1 + 0,05·tecnologías) · (×1,25 si hay alianza) · multiplicador de dificultad` (antes `0,004·adultos + 0,05·chamanes`): la gente sola ya casi no alcanza; los chamanes pesan. El costo de cada tecnología sube **15 % por cada tecnología ya aprendida** (las 6 claves para ganar cuestan ≈ 58 en vez de 39). Con auto la última clave (Marcas de cuenta) llega a los ~14 min en Fácil, ~18 en Normal, ~21 en Difícil.
3. **Exclusión entre tecnologías**: Arco y Domesticación se excluyen (o cazás mejor o criás animales); ninguna es necesaria para ganar. Lanza tampoco es requisito de victoria: cuesta Conocimiento que compite con las claves.
4. **Presión por dificultad** (tabla `DIFFS`): hambre (`hd`), frío creciente con los inviernos vividos, regeneración de arbustos, tamaño/daño de saqueos (crecen con el tiempo), meta de población y de inviernos, desgaste de la alianza (ahora hay que mantenerla con regalos, si la relación baja de 15 se rompe). El hambre base subió de 1,83 a 2,6 y el hambre de invierno ×1,4.
5. **Bug del camino militar**: `raidsOk` nunca se incrementaba, así que «Jefatura» era inalcanzable. Ahora cuenta un saqueo repelido sin pérdida de raciones.
6. Se agregó **Difícil** (Fácil y Normal ya existían).

Parámetros finales (`DIFFS` en `eras/era3-tribus.html`):

| | pop | inviernos | hambre | frío | arbustos | saqueo (inicio / ritmo / +n / crece cada s / daño) | Conocimiento | desgaste alianza |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fácil | 18 | 1 | ×1,1 | 0,3 | ×1 | 190 s / ×1,2 / +0 / 150 / 5 | ×1 | 0,05/s |
| Normal | 24 | 2 | ×1,36 | 0,45 | ×0,85 | 130 s / ×0,9 / +1 / 110 / 6 | ×0,9 | 0,09/s |
| Difícil | 26 | 2 | ×1,3 | 0,6 | ×0,8 | 100 s / ×0,7 / +2 / 80 / 8 | ×0,8 | 0,14/s |

El equilibrio es sensible: al probar, pasar el hambre de Normal de ×1,25 a ×1,45 llevaba las victorias de 94 % a 6 %. Si se toca algo, volver a medir.
