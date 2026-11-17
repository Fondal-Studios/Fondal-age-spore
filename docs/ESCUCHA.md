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
