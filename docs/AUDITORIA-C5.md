# Auditoría de las Eras 1 a 4 (2026-11-18)

Hecha con bots y capturas en Chromium sin pantalla; **ninguna persona jugó**. N chicos: son indicios, no estadística. Scripts en `tools/auditoria/` (correr con `NODE_PATH=$(npm root -g)`), capturas en `docs/auditoria-c5/`.

## Qué se corrió
| Era | Qué | Resultado |
| --- | --- | --- |
| 1 | Bot «humano» simple (`e1bot.js`: divide, especializa, muta, construye, ataca), Fácil/Normal/Difícil, 2 rivales | 1 victoria en 15; casi todas extinciones a los 2–6 min (agresivo y pasivo dan lo mismo) |
| 1 | Tu colonia manejada por la misma IA que los rivales (`e1bot.js … ia`) | Fácil 3/4 ganadas (4,5–8,5 min); Normal 0/4 (2 extinciones, 2 ganó un rival) |
| 1 | Sin tocar nada, Normal con 3 bots (por defecto) | **Extinción a 1:29** |
| 2 | `tests/era2-perfiles.js auditoria --diffs 1 --profiles razonable --specs all` (12 partidas) | 10/12 victorias; muertes propias sobre todo por **hambruna** (insectos 44–50, aves 31–34 por partida); 16–25 % del tiempo quietos |
| 2 | 3 min sin tocar nada | 4 evoluciones sin gastar, nube de números de daño y mensajes alrededor del rebaño aun con Foco |
| 3 | Balance del ciclo anterior (N=192, Normal) | 86 % funda, 3 derrotas en 192; fundación a los 25–40 min |
| 4 | Bot de `tests/era4-bot.js` sin dibujo (`e4bot.js`), 3 por dificultad, 45 min | **7/9 sin terminar** con 300–650 unidades; 1 victoria (Fácil, 22 min), 1 derrota (Difícil, 5 min) |
| 1→4 | Cadena de linaje (`linaje.js`) | La Era 4 lee especie y una «ciudad» vieja, ignora `era3.civ`; la rama de la Era 1 llega vacía |
| todas | fps de referencia (con la CPU ocupada, solo comparativo) | escritorio: Era 1 ≈ 28, Era 2 ≈ 47, Era 3 ≈ 60, Era 4 ≈ 25 |

## 10 puntos críticos (de más a menos grave)
1. **Era 1 castiga demasiado al que empieza.** Por defecto (Normal, 3 bots) una colonia quieta se extingue a los 89 s, mientras el tutorial todavía explica cómo dividir; la IA de los rivales jugando por vos no gana ninguna en Normal. → Primera partida en Fácil con 1 rival, gracia sin oleadas hasta completar los primeros hitos, aviso antes del primer ataque.
2. **La Era 4 rompe el hilo «seguir tu vida».** No usa tu civilización (Terrestres/Colmena/Arrecife/Bandada): unidades humanas, bronce, mapa pixelado; ignora `era3.civ`, especie, tecnologías y Maravilla; la rama de la Era 1 se pierde. → Era 4 por civilización: tus unidades son tu especie, recursos y edificios de la Era 3, bono según tu Maravilla.
3. **La Era 4 no termina.** 7 de 9 partidas siguen a los 45 min con ejércitos de 300–650 unidades y un rival vivo: no hay tope ni forma de cerrar la guerra. → Tope de población, toma de la capital rival como victoria, rendición/tributo, y que la IA consolide.
4. **Era 2: el caos y la espera siguen.** Con el Foco prendido igual se acumulan números de daño y mensajes alrededor del rebaño; las evoluciones quedan sin gastar sin que el juego lo empuje; el hambre mata decenas por partida (insectos y aves) sin una alerta que lo anticipe; los animales pasan 16–25 % quietos. → Foco que oculte números/mensajes ajenos a la selección, aviso fuerte de «evolución lista», alerta de hambruna con causa y solución.
5. **Era 3 en Normal es larga y sin riesgo.** 86 % funda y casi nadie pierde; fundar lleva 25–40 min. → Edades más cortas, saqueos con objetivos (robar, quemar una obra), eventos de decisión, derrota posible.
6. **Arte sin una dirección común.** Era 1 pintada (Runway), Era 2 procedural, Era 3 pintada con Stable Diffusion (y los habitantes ya no muestran tus rasgos), Era 4 grilla pixelada. → Una guía de estilo para las cuatro; en la Era 3, rasgos encima del habitante pintado; la Era 4 reutiliza el arte de la Era 3.
7. **Celular.** La Era 1 dice «mové el mouse a los bordes» en pantallas táctiles; en la Era 2 el tutorial y los mensajes tapan la mitad del mapa; en la Era 4 aparece un diálogo a los 2 min que tapa todo. → Textos por dispositivo, tutorial compacto, avisos abajo y descartables.
8. **La portada no cuenta el juego.** Sigue diciendo «Era 3: Tribus» y «Era 4 (bosquejo)», no guía por dónde empezar ni muestra tu linaje (tu especie, tu civilización). → Portada con el recorrido célula → especie → civilización y «continuar con tu especie».
9. **Rendimiento desparejo.** Con la misma máquina, la Era 1 y la Era 4 dan la mitad de cuadros que la Era 3. → Perfilar: caché del terreno en la Era 4, partículas y redibujos en la Era 1; medir en un celular de gama baja real.
10. **Nada está validado con personas.** El balance es todo de bots, el audio no tuvo escucha, la prioridad «Exploración» de la Era 2 no tiene efecto medible y la habilidad Alarma es neutra; dos íconos de insectos son flojos. → Correr el protocolo de 5 jugadores (`docs/PRUEBAS-HUMANAS.md`) y la escucha antes de seguir sumando contenido.

## Estado de los puntos 1-3 y del arte (2026-11-18)
- **1. Era 1 (resuelto, falta prueba humana):** calma inicial sin conexión (sin ataques, hambre ni cambios de ambiente hasta el primer hito o 4/3/2 min según dificultad), aviso 12 s antes de una oleada contra vos, aviso al terminar la calma, primera partida en Fácil con 1 rival, texto táctil correcto. Una colonia quieta en Normal pasa de morir a los 89 s a durar hasta el final de la calma (220 s). `tests/era1-calma.js` (en `npm test`). Se corrigió además que `snapshot()` guardaba la dificultad del menú en vez de la de la partida.
- **2. Era 4 por civilización (resuelto):** la Era 4 usa `era3.civ`/especie (o `era2`, o un selector), nombres de recursos/unidades/edificios por civilización, rivales de otras clases, bono explicado por Maravilla, Edad, tecnologías y rama; la rama de la Era 1 ya llega. `tests/era4-continuidad.js`. Detalle en `docs/ERA4.md` §12.
- **3. Era 4 termina (resuelto):** tope de ejército, asedio de capitales, rendición con tributo, IA que no acumula. Bot, N = 24 por dificultad: terminan antes de 40 min Fácil 100 %, Normal 96 %, Difícil 96 %; victorias 100 % / 96 % / 21 %. **Pendiente:** Normal casi igual a Fácil y Difícil duro para el bot; partidas de ~9 min (cortas).
- **Arte unificado por era:** la Era 3 y la Era 4 comparten los 205 dibujos de `art/era3/` (edificios, íconos, habitantes, fauna, terreno, obras, daño), hechos con el motor de Anakin; la Era 4 dejó el mapa pixelado. Era 1 (cuerpos pintados + íconos SVG) y Era 2 (procedural con rasgos visibles) siguen con su estilo propio y coherente. Faltan dibujos: conejo y barro (descartados), y los pedidos para la Era 4 en `docs/ciclo5/era4/dibujos-pedidos.md`.
