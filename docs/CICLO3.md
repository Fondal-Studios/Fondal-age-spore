# Ciclo 3: estabilización y calidad jugable (informe final)

Rama `claude/dazzling-davinci-wvedmk`, PR #1. Todo lo de abajo está comprobado con pruebas automáticas en Chromium sin pantalla y con el run de GitHub Actions indicado. Lo que necesita personas o dispositivos físicos está en la sección «Pendiente de validación humana».

## 1. Problemas corregidos y evidencia

| Problema | Causa medida | Corrección | Evidencia |
| --- | --- | --- | --- |
| CI inestable (`tests/online.js`, run #18 falló y #19 pasó con el mismo commit) | Esperas por reloj de pared y una métrica que los bots rivales podían anular | Esperas por condición; cuenta órdenes entregadas y nacimientos | 22/22 corridas verdes, 12 con 3 copias sobre 1 solo núcleo |
| CI sin cobertura de Era 2, 3 y 4 | Solo corría `npm test` | 4 jobs (Era 1, 2, 3, 4), artefactos si falla, `balance.yml` manual | Run #24 sobre `18e9821`: 4/4 en verde |
| Fallo real de audio en GitHub (cambio de bioma «corta») | Métrica de una sola semilla sobre ambiente con eventos aleatorios | Mediana de 5 semillas | Run #22 falló, run #24 pasa; el salto de transición queda igual al del régimen en las 5 semillas |
| Hash de simulación dependía del animal seleccionado | El registro de causas del módulo de arte escribía en `G.log` y `G.x2.arte`, que se guardan y se hashean | Registro solo de interfaz (`CLOG`) fuera del estado | `era2-ordenes`, `era2-calidad-sim` y `era2-guardado` pasan (antes fallaban al integrar) |
| Terrestres perdían (Normal 8→4 de 12) | Umbral de reproducción 75 (lo subió el rework) | 60 para tus animales; 75 para salvajes | Ablación 3 terrestres × 8 semillas: 3/24 → 9/24 con umbral 60; previo al rework 13/24 |
| Insectos / Colmena 0/4 | Era ruido de N=4 (IC95 0–49 %) | Sin cambio mecánico propio | Con N=4 el mismo bot daba Colmena 2/4; no hay mecánica que los castigue, solo fragilidad de diseño |
| Rugido y Alarma cobraban energía a toda la manada | Costo global por un efecto local | Pagan solo los del radio; Rugido 10/12/14 → 5/6/7 | N=192 pareado: Rugido viejo 69 %, sin Rugido 76 %, nuevo 79 % |
| Alarma sin utilidad | Efecto débil | Red de aviso, huida ×1,15-1,35, −15/20/25 % de daño, sin bono de emboscada | Escenarios cerrados N=96: IC95 excluye 0 en 8 de 12; **neutra en partida completa** |
| Fugas contra la pared, `move` cancelado por miedo, órdenes que mataban de hambre | Varios | Huida desviada al centro; solo el pánico cancela `move`; hambre < 8 cancela | `tests/era2-ordenes.js` |
| Metas imposibles (carnívoros, desierto, tundra, océano para voladores) | Metas de población y construcción fuera de alcance | Metas por nivel trófico; voladores construyen en el océano | Océano voladores 0/24 → 8/24 |
| Tundra injugable | Oferta de plantas contra gasto de hambre (el frío y la meta de población no pesan) | Plantas 44→60, piso invernal .6→.75, −8 % de hambre por rasgo de piel/sangre/hibernación | N=96: empezando en tundra 17 % → 31 %; camino real 9 % → 21 % |
| Botón de sonido solapaba el HUD a 390 px | Sin espacio reservado | Reserva de 54 px; resúmenes ≥44 px | `era2-ui.js` mide rectángulos a 360, 390 y 430 px; control negativo confirmado |
| Audio: el océano sonaba 3,3×–5,6× más fuerte que pradera/desierto | Sin nivelación | Nivelación por bioma | Los 5 biomas quedan a 1,1 dB |

## 2. Cambios por etapa

- **Etapa 1 (PR #1):** lo anterior. El PR queda listo para merge; **no se hizo merge**.
- **Etapa 2 (visual):** capturas de las Eras 1, 2 y 3 (1280×800 y 390×800) en `docs/ciclo3/antes`, `docs/ciclo3/despues` y hojas `docs/ciclo3/hoja-era{1,2,3}-{d,m}.png`; notas y evidencia en `docs/CICLO3-VISUAL.md`. Era 3: oficios por silueta y herramienta, gestos de trabajo, señales de hambre/huida/herido, andamio en obras. Era 1: rótulos de 12 px fijos con cualquier zoom.
- **Etapa 3 (profundidad de Era 2):** señales sobre el animal (peligro, hambre, caza, descanso, reproducción, frío, evolución) con límite por cantidad; burbujas de causa («Huye de Lobos: ×0,7 de ventaja») con 11 tipos; órdenes `move/attack/forage` verificadas (`attack`: 7 golpes al objetivo elegido y 0 al más cercano); desobediencia por pánico, agotamiento, herida y hambre.
- **Etapa 4 (audio):** volumen maestro, música, efectos y ambiente independientes, silencio por capa, M para silenciar, persistencia; transiciones medidas; `eras/escucha.html` + `docs/ESCUCHA.md` para la prueba humana.
- **Etapa 5 (Era 3):** auditoría con capturas y `docs/ERA3-PLAN.md`; sin reconstrucción.

## 3. Comparativas visuales
`docs/ciclo3/hoja-era1-d.png`, `hoja-era2-d.png`, `hoja-era3-d.png` (escritorio) y `-m` (móvil). Notas del evaluador (antes → después, ver `docs/CICLO3-VISUAL.md`): Era 2 información visible 4 → 8, animación 6 → 7, siluetas 7 → 7, diferenciación de especies 6 → 6; Era 3 oficios 4 → 6, animación 2 → 5, información 3 → 6, coherencia 4 → 6; Era 1 información 5 → 6. Siguen débiles: Era 2 con cientos de animales (mancha) y animales de 6-10 px en móvil. Las notas son del propio agente, no de una persona.

## 4. Balance de la Era 2 (partidas completas, bots)
Cifras de `tests/era2-balance.md` (IC95 en el documento). 8 perfiles de bot; N=192 en Normal y Difícil, 96 en Fácil.

| Dificultad | Victorias |
| --- | --- |
| Fácil | 97 % [91–99] |
| Normal | 51 % [44–58] |
| Difícil | 27 % [21–33] |

Por perfil (victorias de 24, Normal / Difícil): migrador 17/11, razonable 15/9, enjambre 14/8, hábil 14/8, táctico 12/8, órdenes 11/2, cazador 9/4, defensivo 5/1.
Por clase (Normal / Difícil): aves 71/42 %, insectos 48/29 %, terrestres 46/19 %, acuáticos 38/17 %. **Las clases no quedan parejas.**
Por bioma (Normal, N=48): pradera 50 %, selva 38 %, desierto 13 %, tundra 33 %, océano 67 %. Las diferencias entre biomas son de diseño y no se igualaron artificialmente; el desierto es el más duro.
Causas de derrota: casi todas por hambre; los insectos y acuáticos mueren además por rivales (10–22 por partida).
Habilidades en partida completa (N=36 por celda, ±15 puntos): las 5 juntas +11 y +22 puntos sobre ninguna; Camuflaje es la que más suma; Excavar, Alarma y Migrar no se distinguen de 0.
Calibración: `hd` y `dmg` de `DIFFS` y las constantes de bioma (`kw`, `kp`, `gmin`, plantas de tundra) salen de mediciones con bots y son elecciones de dificultad, no leyes naturales.

## 5. Rendimiento
Medido en Chromium sin GPU con la máquina libre: 55 fps con 574 animales (antes de la integración), 44,2 fps (mejor de 3 ventanas: 44,2 / 38,6 / 37,8) con 558 animales después de integrar todo. El costo de las señales de estado es de 0,5–0,8 ms por cuadro. Una comparación contra el commit base no mostró regresión de la simulación. El fps varía con la carga de la máquina y no está garantizado en dispositivos reales. En CI el fps no se mide (`CI_NO_FPS=1`).

## 6. Pruebas ejecutadas
Locales con el código final: `npm test` (determinismo, acciones, sonido, online, relay), `era2-guardado`, `era2-ordenes`, `era2-calidad-sim`, `era2-ui`, `era2-arte`, `era2-audio`, `era2-bot`, `era3-guardado`, `era4-guardado`, `era2-biomas`, `era2-alarma`. GitHub Actions run #24 (`18e9821`): Era 1, 2, 3 y 4 en verde. Los commits posteriores (tundra, Rugido) se verificaron en local; ver estado del último run en el PR.

## 7. Pendiente de validación humana o de dispositivos físicos
- **Audio: nadie lo escuchó.** Solo hay mediciones (picos, clics, transiciones, determinismo). Falta correr `eras/escucha.html` según `docs/ESCUCHA.md` (≥3 personas, una en celular).
- Dispositivo táctil real y iOS (solo emulación de Playwright).
- Diversión real: ningún test sustituye jugar. Falta una sesión con jugadores nuevos que midan cuánto entienden sin explicación.
- Balance con personas (todo se midió con bots).
- Rendimiento en gamas bajas.

## 8. Problemas conocidos
Perfil defensivo débil; desierto 13 %; aves +25 puntos sobre las demás clases; Anfibios y Gigantes sin causa mecánica única encontrada (no se tocaron); Alarma, Excavar y Migrar sin utilidad demostrada en partida completa; Rugido ya no resta pero tampoco se demostró que sume; tundra sin fuentes propias (carroña, pesca bajo hielo) sería diseño nuevo; la prueba de fps es ruidosa.

## 9. Cinco mejoras prioritarias para la Era 3 (`docs/ERA3-PLAN.md`)
1. Bus de eventos + HUD de alertas, tendencias y panel de persona con «porque…» + panel móvil plegable (4–5 días).
2. Sprites por oficio y edad con caché y zoom (3–4 días).
3. Animaciones de trabajo y combate con números de daño (4–5 días).
4. Edificios que evolucionan con la tecnología y obras por etapas (3–4 días).
5. Eventos de dos opciones con vista previa y rival con carácter (6–8 días).
Estimaciones orientativas.
