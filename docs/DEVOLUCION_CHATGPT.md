# Devolución para ChatGPT: Fondal Age Spore, Ciclo 4

Fecha: 2026-11-17. Este documento separa lo **verificado en CI**, lo **verificado en local**, lo **dicho por personas** (solo el dueño, N=1) y lo **pendiente**. No hay notas inventadas: si algo no se midió, se dice.

## 1. Estado técnico
| Dato | Valor |
| --- | --- |
| Repositorio | https://github.com/Fondal-Studios/Fondal-age-spore |
| `main` | `211e740` (sin cambios en este ciclo; no se hizo merge) |
| PR #1 (Ciclo 3) | https://github.com/Fondal-Studios/Fondal-age-spore/pull/1, rama `claude/dazzling-davinci-wvedmk` @ `34505c5`, CI run #26 verde. Esperando autorización del dueño para el merge |
| PR #2 (Ciclo 4, borrador) | https://github.com/Fondal-Studios/Fondal-age-spore/pull/2, rama `claude/ciclo4-estrategia-evolutiva`, base = rama del PR #1 |
| Commit probado en CI | `7b51ccb`, run #29 verde (ver «Registro de CI») |
| Diferencia con el PR #1 | 26 commits, 140 archivos, +23 525 / −751 líneas (incluye ~16 800 de biblias de arte y prompts) |

### 1.1 CI
Ver el resultado del run #27 en https://github.com/Fondal-Studios/Fondal-age-spore/actions/runs/44080724839 (jobs: Era 1, Era 2, Era 3, Era 4, audio Eras 3-4). El estado final se anota abajo en «Registro de CI».

### 1.2 Pruebas locales (Chromium sin pantalla, commit `032ae83` o su padre con el mismo código de juego)
Todas pasan:
- Era 2: `era2-evolucion`, `era2-guardado`, `era2-ordenes`, `era2-ui`, `era2-arte --sinfps`, `era2-calidad-sim`, `era2-bot`, `era2-audio`.
- Era 3: `era3-civs`, `era3-ciclo`, `era3-guardado`, `era3-ui`, `era3-arte`, `era3-bot`, `era3-audio`.
- Otras: `era4-guardado`, `determinismo` (Era 1), `acciones` (Era 1).

`era2-prioridades` no pasa completa: tiene 2–3 fallas de 10 según la corrida, también en el código base, así que es ruido con N chico y no una regresión. Ver §6.

### 1.3 Rendimiento (local, sin GPU, máquina libre, 3 repeticiones)
- **Era 2, ~240 animales:** 9,0 ms de simulación + 11,7 ms de dibujo por cuadro. Antes del ciclo: 8,5 + 11,0 ms. Son unos 48 fps sin pantalla contra 51; la diferencia es chica y está dentro de la variación entre repeticiones.
- **Era 3, 90 habitantes:** 11,5 ms por cuadro (`era3-arte`).
- No hay medidas en celulares reales.

## 2. Cambios del ciclo
**Era 2: estrategia y evolución**
- Prioridades estratégicas: comida, reproducción, expansión, defensa y exploración, en 3 niveles. El texto de cada nivel sale de la misma tabla que usa la simulación.
- Identidades de clase.
- Habilidades con nivel, costo, duración y evento de fin.
- Cada uno de los 36 rasgos y los 4 de transición da una **capacidad** con efecto mecánico (`CAPS`).
- 7 pares de ramas excluyentes (por ejemplo, camadas contra cuidado, o veneno contra camuflaje).
- La forma del animal cambia por rasgo, variante, maestría e híbrido; está verificado por hash de píxeles en 132 dibujos.
- Pantalla de evolución que compara antes y después y muestra la rama que se cierra.
- **Acuáticos a tierra:** aletas lobuladas → pulmones y patas → piel seca y huevo con cáscara, o la alternativa de quedarse con «aletas radiadas». Al ganar se escribe `evo_lineage.era2.tierra`.
- Tres zonas nuevas en el lago.
- **Modo foco**, activo por defecto, sin efecto en la simulación (mismo hash).

**Era 3: rehecha como civilización de tu especie**
- Constructor de base en grilla con Edades I–III; la Edad III se abre al mapa (expediciones, nodos, campamentos rivales, caravanas, Maravilla).
- 4 civilizaciones según la clase de la Era 2:
  - Clanes de la madriguera (terrestres).
  - La Colmena (insectos).
  - Ciudad del Arrecife (acuáticos): submarina, o anfibia si la especie salió a tierra.
  - La Bandada (aves).
- Cada civilización tiene sus nombres de recursos y edificios, 12 tecnologías, un edificio único, una Maravilla y un campeón.
- Los habitantes se dibujan con tu animal de la Era 2 y sus rasgos. Los 36 rasgos dan bonos con su origen visible.
- Las partidas viejas se migran a Terrestres.
- El linaje se escribe en `era3`.
- Dibujo provisorio con marcadores. `__e3.assets.register` acepta los ids de la biblia de Runway y cubre 201 de los 205 ids del juego.

**Arte, audio, pruebas humanas**
- Biblia de arte para Runway de la Era 3: 461 prompts y 501 archivos, estimados en ~920–1400 créditos. De la Era 2: ~239 ids. **No se generó ninguna imagen ni se gastaron créditos.**
- Motor de audio compartido para las Eras 2–4. **No está aprobado**: falta la escucha humana.
- Protocolo de prueba con 5 jugadores nuevos (`docs/PRUEBAS-HUMANAS.md`), todavía sin hacer.

## 3. Evaluación por era (sin puntajes inventados)
| Era | Qué hay | Evidencia | Qué falta |
| --- | --- | --- | --- |
| 1 Célula | Completa, multijugador lockstep, arte pintado | Al dueño le pareció «buenísima» (N=1). Pruebas de determinismo, acciones y online | Escucha humana del audio. La música es 5–6 dB más fuerte que la de las otras eras |
| 2 Especie | Evolución con capacidades, transición a tierra, foco, prioridades | Bots, N=192 por dificultad. El dueño la encontró aburrida *antes* de este ciclo (N=1), por dos motivos: la evolución no se sentía y había mucho caos | Que una persona juegue la versión nueva. Arte final de rasgos |
| 3 Tribu | Constructor por Edades con 4 civilizaciones | Bots, 576 partidas. Ninguna persona la jugó | Arte (Runway). Prueba humana. Aves es la más lenta |
| 4 Civilización | Bosquejo jugable (Lanchester, Sun Tzu mínimo) | Prueba de guardado | Todavía no recibe la civilización de la Era 3; equilibrio sin medir |

## 4. Balance (bots, IC de Wilson al 95 %)
**Era 2.** N=192 por dificultad, 8 perfiles de bot, semillas pareadas contra `245b102`:

| Dificultad | Antes | Ahora | Diferencia (puntos) |
|---|---|---|---|
| Fácil | 98 % | 97 % [94–99] | −1,0 ± 2,0 |
| Normal | 61 % | 56 % [49–63] | −5,2 ± 7,5 |
| Difícil | 27 % | 27 % [21–33] | −0,5 ± 6,8 |

- **Por clase, en Normal** (antes de las capacidades): terrestres 69 %, insectos 58 %, acuáticos 46 %, aves 69 %. La diferencia entre la mejor y la peor clase pasó de 33 a 23 puntos.
- **Transición de los acuáticos** (Normal, N=24 por condición): abisales 0 → 21 %, anfibios 13 → 46 %, arrecife 96 → 63 %.
- **Anfibios** en general: 48 → 35 % (N=48). Es el punto más débil.
- **Ritmo de evolución:** la primera llega a los 23 s (mediana); después, aproximadamente una por minuto.

**Era 3.** Partidas en que se fundó la civilización; N=48 por civilización y dificultad, 4 perfiles de bot, tope de 50 min de juego:

| Civilización | Fácil | Normal | Difícil | Fundación F/N/D (min, mediana) |
|---|---|---|---|---|
| Terrestres | 100 % | 100 % | 69 % [55–80] | 22 / 29 / 30 |
| Insectos | 100 % | 100 % | 81 % [68–90] | 19 / 27 / 30 |
| Acuáticos | 100 % | 96 % [86–99] | 71 % [57–82] | 20 / 24 / 30 |
| Aves | 100 % | 81 % [68–90] | 60 % [46–73] | 22 / 30 / 38 |

- La ciudad submarina y la anfibia rinden igual: 89 % cada una.
- El perfil militar funda solo el 13 % de las veces en Difícil.
- En Normal casi no hay derrotas, así que la dificultad Normal probablemente es fácil.

Limitación general: los bots no miden diversión ni comprensión.

## 5. Diez problemas principales
1. **Nadie jugó las versiones nuevas** de las Eras 2 y 3. Es el riesgo principal.
2. Era 3 en Normal es casi imposible de perder (100 % / 100 % / 96 % / 81 %): falta presión.
3. Los anfibios que no completan la transición ganan poco (35 %).
4. El arte de la Era 3 son marcadores provisorios. Depende de Runway (~920–1400 créditos) y de un script de recorte nuevo con fondo magenta que todavía no existe.
5. El audio no tuvo escucha humana, y la música de la Era 1 está 5–6 dB más fuerte.
6. La Era 4 no lee la civilización de la Era 3 (la cadena de linaje se corta en la 3).
7. La prioridad Exploración no tiene beneficio medible, y Alarma es neutra en partida completa.
8. La biblia de arte no incluye la «presa» de cada mundo (4 ids).
9. `tests/acciones.js` a veces falla con la CPU muy cargada (sin investigar) y el fps es ruidoso.
10. Las cifras científicas de los textos no están verificadas en fuentes primarias.

## 6. Decisiones
**Implementadas**
- La Era 3 es la civilización de tu especie, con continuidad por clase y por la transición a tierra.
- La evolución es mecánica: capacidades y ramas que se excluyen.
- Modo foco activo por defecto.
- El registro de causas y la selección quedan fuera del estado (`G`).
- La biblia de arte usa fondo magenta.

**Descartadas**
- Era 3 con personas genéricas: el dueño la rechazó.
- Igualar los biomas de forma artificial.
- Gastar tokens en dibujo final: lo pidió el dueño.

**Necesitan aprobación del dueño**
- Merge de los PR #1 y #2.
- Gastar créditos de Runway, empezando por la Fase 0 de 12 imágenes.
- El volumen de la Era 1.
- Subir la dificultad Normal de la Era 3.
- Publicar en GitHub Pages para probar en el celular.

## 7. Próximo ciclo: tres alternativas
- **Conservadora:** prueba humana con 5 personas y escucha de audio; corregir solo lo que salga de ahí. Endurecer la Era 3 en Normal y dar un empujón a Aves y Anfibios. Riesgo bajo, poco contenido nuevo.
- **Equilibrada (recomendada):**
  1. Primero, la prueba humana.
  2. En paralelo, la Fase 0 de arte en Runway (12 imágenes) con el script de recorte, y el ajuste de dificultad de la Era 3.
  3. Conectar la Era 4 con la civilización de la Era 3 (linaje completo de la Era 1 a la 4).
  4. Arte por fases si la Fase 0 convence.
- **Ambiciosa:** todo lo anterior más la producción completa de arte de las Eras 2 y 3, multijugador en la Era 3 y la Era 4 como juego completo. Riesgo alto: más trabajo sin validar con personas.

Recomendación: la equilibrada. Sin datos de personas, la Era 2 y la Era 3 son apuestas de diseño razonables, pero no validadas.

## Registro de CI
- Run #27 (`032ae83`): cancelado por un push posterior (concurrencia).
- Run #28 (`6b99849`): Era 1, Era 2 (con `era2-evolucion`), Era 4 y Audio en verde; **Era 3 falló**. `era3-bot.js` se colgó hasta el límite de 30 min: el CI le pasa las rutas de captura como primer argumento y la versión nueva leía ahí los segundos (`T = NaN`, espera infinita). Se corrigió en el test, que ahora acepta ambas formas; corrido en local con los mismos argumentos que el CI: OK en 4 min.
- **Run #29 (`7b51ccb`): verde en los 5 jobs** (Era 1, 2, 3, 4 y Audio Eras 3-4). https://github.com/Fondal-Studios/Fondal-age-spore/actions/runs/44086582335. Los commits posteriores solo tocan este documento.
