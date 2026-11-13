# Auditoría completa de Fondal Age Spore (2026-11-13)

Qué se probó y cómo: **Era 1** jugada y medida por mí en Chromium real (capturas, bots de 30 mutaciones, determinismo, guardado, 250 células, 8 colonias). **Eras 2 y 3 y portada** auditadas por un agente aparte con bots de 20 y 30 min, móvil 390×800, rendimiento y contraste; yo verifiqué y corregí dos de sus hallazgos. Chromium sin GPU: los fps son pesimistas. No probé: audio (no existe), Safari/Firefox, GPU real, ni partidas humanas completas.

## Hechos medidos
| Tema | Resultado |
| --- | --- |
| Errores de consola | 0 en las tres eras y la portada, en 1280 y 390 px |
| Tamaño | portada 1 KB; Era 1 ≈ 340 KB (+0,9 MB de arte pintado); Era 2 117 KB; Era 3 58 KB. Cada era es una IIFE con líneas de 300+ caracteres |
| Era 1, rendimiento | 27 fps con 250 células en render por software (el original, 30) |
| Era 2, rendimiento | normal: 0,6 ms por tick; **+200 animales = 15 fps, +500 = 7 fps** (búsqueda de amenazas O(n²), `era2:353`) |
| Era 3, rendimiento | +600 personas: 44 fps |
| Azar | las Eras 2 y 3 usan `Math.random` (10 y 11 sitios) sin semilla; la Era 1 ya usa semilla |
| Móvil | sin scroll horizontal y los toques funcionan, pero el mapa queda en **119 px (Era 2) y 209 px (Era 3)** de alto; 4 y 13 botones bajo 44 px; 8-9 textos bajo 12 px |
| Contraste | «Evolucionar» 3,67:1 y «Tecnología» 4,34:1 con texto de 13 px (piden 4,5:1) |
| Accesibilidad | 0 atributos aria en Era 2 y 1 en Era 3; canvas sin texto alternativo |
| Guardado | Era 1: sí (nuevo). Eras 2 y 3: no; sus estados llevan referencias a objetos que se duplicarían al serializar |
| Herencia entre eras | Era 1→2 solo viaja la clase por el hash de la URL; Era 2→3 no viaja nada; la Era 3 es un callejón sin salida |

## Bugs concretos
1. **Plural roto en Era 2** («Murió un cazadores de manada»): corregido en esta entrega.
2. **Texto contradictorio de la regla del 10 %** en Era 2 (mostraba el stock de biomasa como si fuera transferencia de energía): corregido.
3. **Era 3, extinción por reasignar oficios**: con un bot que sube constructores, 2 de 3 corridas en Fácil terminan en extinción (554 s y 859 s) por hambre; el `+` de un oficio quita gente de otro sin avisar. *(Reportado por el agente; no lo reproduje yo.)*
4. **Era 3, Conocimiento casi gratis**: un bot que no hace nada acumula 147 sin chamanes; las 9 tecnologías casi no tienen tensión de elección.
5. **Era 2 con jugador pasivo**: en 20 min no cumple la fase 1 (0 nidos, 0 ecosistemas) en ninguna dificultad.
6. **Era 1, orden de teclas de habilidades al cargar partida**: las habilidades se reconstruyen en el orden del catálogo y no en el que las conseguiste, así que las teclas 3-0 pueden cambiar de lugar. Menor.
7. **Era 1, rasgos vectoriales** (`TR`) siguen dibujándose encima del cuerpo pintado con muchas mutaciones y ensucian.

## Lo que hace bien el juego
Ramas con piedra-papel-tijera, híbridos, ecología, estructuras; la Era 2 es la más rica visualmente; las tres eras corren estables durante 20-30 minutos de bot sin NaN ni excepciones.

## Entregado desde la primera auditoría
Cuerpos celulares pintados con Runway (3 niveles × 4 ramas) con movimiento; **partida guardada** (autoguardado cada 20 s, al ocultar la pestaña y botón Guardar; «Continuar» en el menú); **sala de hasta 8 colonias** con bots; **semilla compartible**; PRNG con semilla y paso fijo; **relay de salas** con pruebas; correcciones 1 y 2.

## 10 propuestas (en el orden que haría)
1. **Capa de comandos para el online** (lo grande de `MULTIJUGADOR.md`): pasar las ~80 referencias a «el jugador = equipo 0» a `apply(slot, cmd)`, cliente de red lockstep, hash de desincronización y bot de reemplazo. *Puedo hacerlo yo; es 1 o 2 sesiones y se prueba con 2-3 navegadores en Playwright.*
2. **Portada, guardado y linaje comunes**: «Continuar» en la portada, guardado en Eras 2 y 3 y un único «linaje» en `localStorage` que traspase rama, nivel y rasgos de la Era 1→2→3 (hoy se pierde). *Puedo hacerlo yo.*
3. **Arreglar el móvil de las Eras 2 y 3**: mapa ≥ 50 % de la pantalla, botones de 44 px, textos ≥ 12 px, turquesa más oscuro, `aria-label`. *Puedo hacerlo yo.*
4. **Rendimiento de la Era 2**: rejilla espacial para amenazas y objetivo de 500 animales a 30+ fps. *Puedo hacerlo yo.*
5. **Equilibrio medido** de Era 3 (aviso y tope al reasignar oficios, costo real del Conocimiento) y Era 2 (jugador pasivo) con 20+ corridas de bot por dificultad. *Puedo hacerlo yo; los números finales los decidís vos.*
6. **Rasgos pintados uno por uno** (flagelo, cilios, pseudópodo, haustorio, tricocisto…) con Runway como capas animadas que se acoplan al cuerpo, en Era 1 y luego Era 2. Quedan ~99 créditos (2 por imagen): alcanza para ≈ 40 piezas.
7. **Endosimbiosis y presiones de selección con nombre real** (Gran Oxidación, Tierra Bola de Nieve, Cámbrico) como eventos de dos opciones. Es el salto evolutivo más espectacular que falta. Las cifras hay que verificarlas en fuentes primarias antes de mostrarlas.
8. **Habilidades activas y líder controlable en la Era 2** (rugido, camuflaje, excavar, alarma, migrar), como ya tiene la Era 1.
9. **Sonido adaptativo**: burbujas, golpes de membrana, música que gana capas con cada nivel evolutivo.
10. **Higiene técnica**: PRNG con semilla en Eras 2 y 3, separar simulación de dibujo, partir cada era en módulos y correr `tests/determinismo.js` y `server/test.js` en GitHub Actions para que ningún cambio rompa el online ni el guardado.

*Cifras científicas del juego: siguen siendo aproximaciones de manual; verificar en fuentes primarias antes de afirmarlas dentro del juego.*
