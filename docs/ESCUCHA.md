# Protocolo de escucha humana del audio

**El audio de la Era 2 NO está aprobado.** Está *verificado técnicamente* (sin recortes, sin NaN, sin fugas de nodos, transiciones sin clics, volúmenes independientes) pero **nadie lo escuchó**. Este protocolo es lo que falta para poder decir «aprobado». Un número de un instrumento no dice si algo suena a Rhodes o a campanita.

Herramienta: `eras/escucha.html` (abrirla con `file://` o servida; necesita `audio-lofi.js` en la misma carpeta). No tiene otras dependencias ni usa audio de terceros. Los ajustes de volumen son los mismos que los del juego (`evo_audio_v1`).

## Quiénes y cuánto
- Mínimo **3 personas** distintas, de las cuales **1 no conoce el proyecto**. Una de ellas, en celular.
- Cada sesión: **20 a 25 minutos**, sin hacer otra cosa a la vez durante el bloque 5.
- Pedir que anoten *qué sonido* molesta o confunde, no solo «no me gusta».

## Condiciones (cada persona prueba al menos 2)
| Condición | Cómo | Qué suele fallar |
| --- | --- | --- |
| Auriculares | Volumen del sistema a nivel cómodo; maestro del juego en 80 % | Crepitar y ruido de cinta se hacen notar; paneo exagerado; graves |
| Parlantes de escritorio / notebook | Parlantes chicos, sala normal | Se pierden los graves (supervivencia casi no se oye); platillos y burbujas agudos molestan |
| Celular (parlante) y celular con auriculares | Abrir `escucha.html` en el navegador del celular; tocar «Activar sonido» | El sistema puede cortar el audio con el interruptor de silencio (iPhone); tocar fuera del panel; que no se pueda alcanzar el volumen con el pulgar |

Ruido ambiente: anotarlo (silencio / oficina / calle / transporte).

## Guion (en orden)
1. **Bloque 0, 1 minuto.** «Activar sonido». Dejar los volúmenes por defecto. Probar mover cada uno y el «Silenciar todo». ¿Se entiende para qué sirve cada deslizador?
2. **Bloque 1, ánimos (4 × 30 s).** Elegir cada ánimo y dejarlo sonar 30 s con «Mezcla». Antes de leer la descripción, anotar con palabras propias qué situación del juego imagina. Después, calificar si «se entiende».
3. **Bloque 2, ambientes (5 × 20 s).** «Solo ambiente». Tapar la pantalla y adivinar el bioma de a uno (que otra persona toque los botones sin decirlo): pradera, selva, desierto, tundra, océano. Anotar los aciertos.
4. **Bloque 3, efectos (5 min).** Tocar cada efecto 3 veces, con la música en «Mezcla». Para las **5 habilidades** (rugido, camuflaje, excavar, alarma, migrar): ¿se distinguen entre sí sin mirar el nombre? Tocar «Ráfaga de combate»: ¿los golpes se pisan con la música?
5. **Bloque 4, transición adaptativa.** Correr la «Partida de 5 minutos» **sin tocar nada**. Anotar:
   - cada momento en que el cambio de ánimo se sintió brusco, tarde o equivocado (con la hora que muestra el guion);
   - si el arpegio de evolución es un buen premio;
   - a partir de qué minuto empezó a molestar o a cansar (si pasó).
6. **Bloque 5, ficha.** Completar la ficha de la página (12 preguntas de 1 a 5 + comentarios), «Copiar» o «Descargar .txt» y mandarla al equipo.

## Qué anotar siempre
Dispositivo y navegador (la ficha lo agrega sola), minutos escuchados, volúmenes usados, y para cada problema: **qué sonido, cuándo, qué sentiste** (molesta, confunde, aburre, se corta, se pisa, suena metálico/de juguete/a campanita).

## Criterios para decir «aprobado»
Los fija el dueño; propuesta de partida:
- Ninguna pregunta de la ficha con promedio < 3,5 y ningún valor ≤ 2 repetido por 2 o más personas.
- «Molesta a los 5 minutos» ≥ 4 en promedio (o, si no, la queja es de un único sonido concreto y se arregla).
- ≥ 4 de 5 biomas reconocidos por quien no conoce el proyecto; las 5 habilidades distinguibles por ≥ 2 de 3 personas.
- Nadie reporta clics, cortes ni saltos de volumen en las transiciones.
- En celular: el panel se abre con un toque y se puede silenciar sin ayuda.

## Preguntas abiertas que solo se contestan escuchando
El Rhodes FM, ¿suena a Rhodes o a campanita?; el swing y el pulso de supervivencia, ¿dan tensión sin molestar?; el crepitar de vinilo y el «wow» de cinta, ¿fatigan?; el reverb de peines, ¿suena metálico?; la ballena y las burbujas del océano, ¿distraen?; el equilibrio entre música, ambiente y efectos; el stinger de evolución con cambio de tonalidad; y si la entrada a combate llega a tiempo (hoy tarda ~3 a 6 s).

## Qué hacer con los resultados
Pegar cada ficha en el issue de audio. Los ajustes se hacen en los parámetros de `MOODS` / `BIOMES` / `FX` de `eras/audio-lofi.js` (por eso la ficha pide «qué sonido»). Después de cada cambio: `node tests/era2-audio.js` (que no rompa lo medido) y repetir **solo** el bloque afectado con una persona. El estado del audio en `docs/CALIDAD2.md` pasa a «aprobado» únicamente con fichas que lo respalden.

---

# Ciclo 4: protocolo de escucha de la Era 3 (tribus, estrategia)

**El audio de la Era 3 NO está aprobado.** Está *verificado técnicamente* (`tests/era3-audio.js`: sin recortes, sin NaN, sin clics nuevos en las transiciones, sin fugas de nodos, hash idéntico con audio activo y mudo) pero **nadie lo escuchó**. Lo medido no dice si el cuerno de saqueo da miedo o da risa, si el martillo suena a martillo, si el ducking se siente como un corte o si la tribu grande es una pared de ruido. Eso solo lo dice una persona escuchando.

Herramienta: `eras/escucha.html`, selector **«Qué era escuchar» → Era 3: tribus**. Mismos volúmenes y memoria (`evo_audio_v1`) que el juego. La ficha de la Era 3 tiene 20 preguntas y un borrador propio (`escucha_borrador_e3_v1`); la de la Era 2 no cambió. Para el **juego real**: abrir `eras/era3-tribus.html`, tocar el parlante (esquina superior derecha) o la tecla `M`.

## Quiénes, cuánto, condiciones
Igual que el protocolo de arriba (mínimo 3 personas, una que no conozca el proyecto, una en celular; auriculares, parlantes de notebook, celular). Sesión de la Era 3: **30 a 35 minutos** (más larga porque hay una partida guionada de 5 minutos y una real). Anotar ruido ambiente.

## Guion de la Era 3 (en orden)
1. **Bloque 0, 1 min.** Elegir «Era 3», «Activar sonido», probar los cuatro deslizadores, el silencio por capa y «Silenciar todo». En el juego real: abrir el panel del parlante y probar la tecla `M`.
2. **Bloque 1, ánimos (6 × 30 s).** Elegir cada uno con «Mezcla». Antes de leer la descripción, anotar con palabras propias qué situación imagina: calma, construcción, supervivencia, amenaza, combate, progreso. **Pregunta clave: ¿la amenaza se distingue del combate?** (la amenaza debe dar tensión *antes* del golpe; el combate, urgencia).
3. **Bloque 2, ambientes (4 × 30 s).** «Solo ambiente»: campamento, campamento en invierno, y las referencias pradera y océano. Con los ojos cerrados: ¿se oye el fuego? ¿el invierno se distingue? Después los tres ajustes de **ruido de trabajo** (1 persona por oficio, pocas, muchas): ¿se entiende que alguien corta leña, pica piedra, martilla? ¿es suave o molesta?
4. **Bloque 3, efectos (6 min).** Recorrer los 44 botones, cada uno 2 o 3 veces, con la música en «Mezcla». Agrupados por oficios, carga, vida y muerte, amenazas y avisos, progreso y diplomacia, mundo e interfaz. Preguntas: ¿hacha, picota, martillo, huerto y recolección se distinguen sin mirar el nombre? ¿cuerno de saqueo, aullido, alerta crítica, aviso y «se normalizó» se entienden como lo que son? ¿obra, mejora, tecnología, alianza y victoria se sienten como logros distintos?
5. **Bloque 4, escala (3 min).** «Tribu chica (8 personas, 20 s)» y después «Tribu grande (60 personas, 20 s)», con música en «Mezcla». La grande debe sonar a más gente trabajando, **no** a una pared de ruido ni a un sonido por persona; compararlas. Después «Alerta crítica con ducking» tres veces: ¿la música baja lo justo para oír la alerta y vuelve sin sentirse como un corte?
6. **Bloque 5, partida guionada (5 min, SIN tocar nada).** «Partida de 5 minutos»: calma → obra → tecnología → lobo → saqueo en preparación (cuerno + ducking) → combate → saqueo repelido → invierno y hambre → primavera → alianza → mejora. Anotar con la hora del guion: cada cambio que se sintió brusco, tarde, equivocado o que oscila; si el golpe de progreso es buen premio; **a partir de qué minuto cansa** (si pasó).
7. **Bloque 6, juego real (10 min, opcional pero recomendado).** Jugar la Era 3 con sonido, mirando poco la pantalla: ¿el audio acompaña decisiones y consecuencias (construir, investigar, defender, el invierno)? ¿hay momentos en que suena algo que no corresponde? Anotar la hora y qué pasaba.
8. **Bloque 7, ficha.** Completar las 20 preguntas (1 a 5), «Copiar» o «Descargar .txt» y mandarla.

## Criterios propuestos para decir «aprobado» (los fija el dueño)
- Ninguna pregunta con promedio < 3,5 y ningún valor ≤ 2 repetido por 2 o más personas.
- `amenaza` y `combate` distinguibles por ≥ 2 de 3 personas; los 5 sonidos de oficio distinguibles por ≥ 2 de 3.
- «Tribu grande»: ≥ 4 en `escala` (no es pared de ruido) y `cansa` ≥ 4.
- Nadie reporta clics, cortes, oscilaciones de ánimo ni saltos de volumen (el ducking cuenta como corte si alguien lo dice así).
- En celular: el botón del parlante se alcanza con el pulgar, el panel se abre con un toque y se puede silenciar sin ayuda.

## Preguntas abiertas que solo se contestan escuchando (Ciclo 4)
¿El fuego continuo suena a fuego o a lluvia/estática? ¿El viento del invierno cansa? ¿Los golpes de hacha/picota/martillo del *ambiente* (más suaves, al azar) se confunden con los efectos *puntuales* (cuando alguien termina de cortar)? ¿El aullido de lobo llega a asustar o suena a sirena? ¿El cuerno de saqueo es creíble? ¿La música de construcción se parece demasiado a la calma (comparten tonalidad mayor)? ¿Cambia demasiado seguido de ánimo en una partida real (el director sube de inmediato y baja tras 6 s)? Con una tribu de 60, ¿el agrupado de 250 ms suena a ritmo (los eventos caen en rejilla) en lugar de a azar? ¿El botón de audio arriba a la derecha estorba al HUD nuevo?

## Qué hacer con los resultados
Pegar cada ficha en el issue de audio. Ajustes: `MOODS_X` / `BIOMES_X` / `FXX` / `WORK_RATE` / `AMBWORK` en `eras/audio-lofi.js` y el director en el bloque `/* === AUDIO === */` al final de `eras/era3-tribus.html` (prioridades, 6 s de histéresis, 250 ms de agrupado, tiempos de ducking). Después de cada cambio: `node tests/era3-audio.js`, `tests/era2-audio.js` y `tests/sonido.js`, y repetir **solo** el bloque afectado con una persona. El estado pasa a «aprobado» únicamente con fichas que lo respalden. Lo mismo vale para el bloque mínimo de la Era 4 (sin ficha propia todavía: usar el juego real).
