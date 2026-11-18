# Fondal Age Spore: resumen del juego y puntos a mejorar (para analizar con ChatGPT)

Fecha: 2026-11-18. Rama `claude/arte-anakin-era3`, PR #3 (sin mergear). Repo: https://github.com/Fondal-Studios/Fondal-age-spore
Todo lo medido es con **bots** en Chromium; **ninguna persona jugó** esta versión (el dueño jugó una versión anterior). Los N son chicos: indicios, no estadística.

## 1. Qué es
Juego web de estrategia evolutiva, gratis y sin instalar, en español. Seguís una misma vida desde la célula hasta la civilización: **Célula → Especie → Civilización por Edades → Guerra entre civilizaciones**. Cada era guarda un **linaje** (`evo_lineage`) que la siguiente lee: tu rama, tu especie, tus rasgos, tu civilización. Nombres y propiedad intelectual originales. Inspiración de género: estrategia en tiempo real tipo Age of Empires, constructor de base tipo juegos de aldea para celular, y simulación evolutiva; base «científica» con cifras de manual (sin verificar en fuentes primarias).

## 2. Las cuatro eras hoy
**Era 1 · Célula** (la más pulida). Colonia de células: dividir, especializar (5 tipos), 6 estructuras/orgánulos, 42 mutaciones en 4 ramas (Depredador, Parásito, Fotosintético, Colonial) + variantes e híbridos, 14 habilidades activas, ecología (praderas, corrientes, arrecifes), eventos evolutivos con decisión (endosimbiosis, Gran Oxidación, Tierra Bola de Nieve, Cámbrico). Multijugador online hasta 8 (lockstep con relay, determinista). Cuerpos de célula pintados (Runway). **Nuevo:** calma inicial sin conexión (no te atacan, no morís de hambre ni cambia el ambiente hasta tu primer hito o 4/3/2 min), aviso 12 s antes de una oleada, primera partida en Fácil con 1 rival.

**Era 2 · Especie.** Simulación de agentes: 12 especies en 4 clases (Terrestres, Insectos, Acuáticos, Aves), 36 rasgos con variantes, maestrías e híbridos; **cada rasgo da una capacidad** (vuelo, nado, caza en manada, cripsis, camada, castas…) y cambia el aspecto; 7 pares de ramas excluyentes; los acuáticos pueden **salir del agua** (aletas lobuladas → pulmones → piel seca); 5 biomas, estaciones, nidos, 5 habilidades, prioridades estratégicas (comida, reproducción, expansión, defensa, exploración), modo Foco. Arte procedural (vector) con los rasgos visibles.

**Era 3 · Civilización por Edades.** Constructor de base en grilla: colocás edificios, producen solos, los mejorás y subís de Edad (Campamento → Aldea → Ciudad); en la Edad III salís al mapa (expediciones, nodos, campamentos rivales) y la Maravilla funda tu civilización. **Una civilización por clase**: Clanes de la madriguera, La Colmena, La Ciudad del Arrecife (submarina, o anfibia si tu especie salió a tierra), La Bandada; cada una con sus recursos, 13 casilleros de edificio × 3 niveles, 12 tecnologías, edificio único, Maravilla y campeón. Los habitantes son tu especie de la Era 2 **con tus rasgos** (alas, cuernos, caparazón, veneno, camuflaje…). Arte pintado (205 dibujos) con el motor de imágenes de Anakin.

**Era 4 · Guerra entre civilizaciones** (antes bosquejo, ahora jugable). Mapa con terreno, combate por las leyes de Lanchester con panel «por qué ganó», Sun Tzu mínimo (niebla, espías, emboscada, moral, provisiones), doctrinas. **Nuevo:** juega con tu civilización y especie de la Era 3 (rivales de otras clases), bono de linaje explicado, tope de ejército, asedio de capitales, rendición con tributo; usa el mismo arte pintado de la Era 3.

**Eras 5 y 6** (moderna y espacial): no existen.

## 3. Estado técnico
- Cada era es un HTML autocontenido (canvas). Simulación determinista (semilla, paso fijo), guardado por era, linaje común.
- Pruebas automáticas en Chromium para las 4 eras + CI en GitHub Actions (5 trabajos). Publicación en GitHub Pages (`main`).
- Audio procedural lo-fi en las 4 eras. **Nadie lo escuchó**: no está aprobado.
- Arte: Era 1 pintada (Runway), Era 2 procedural vectorial, Eras 3 y 4 pintadas con Stable Diffusion local (DreamShaper 8 LCM), con recorte automático de fondo.

## 4. Números (bots)
| Era | Medida | Resultado |
| --- | --- | --- |
| 1 | Colonia quieta, Normal | antes moría a los 89 s; ahora vive toda la calma (180 s) |
| 1 | Bot simple, Normal | 1/4 victorias (antes 0/4); IA de rival jugando por vos: Fácil 3/4, Normal 0/4 |
| 2 | 12 especies, Normal, perfil razonable | 10/12 victorias; muertes propias sobre todo por hambre (insectos y aves) |
| 2 | Balance del ciclo 4 (N=192 por dificultad) | Fácil 97 %, Normal 56 %, Difícil 27 % |
| 3 | Normal (N=192) | 86 % funda; fundación 25–40 min; 3 derrotas en 192 |
| 4 | N=24 por dificultad | terminan antes de 40 min 100 / 96 / 96 %; victorias 100 / 96 / 21 %; mediana ≈ 9 min |
| todas | fps escritorio (CPU ocupada, comparativo) | Era 1 ≈ 28, Era 2 ≈ 47, Era 3 ≈ 60, Era 4 ≈ 25 |

## 5. Puntos a mejorar (mi opinión, de más a menos importante)
1. **Validación con personas.** Todo el balance, el ritmo y la diversión salen de bots. Hace falta la sesión con 5 jugadores nuevos (`docs/PRUEBAS-HUMANAS.md`) y la escucha de audio antes de seguir sumando contenido.
2. **Curva de dificultad entre eras.** Era 1 es muy dura (aun la IA no gana en Normal), Era 3 y Era 4 en Normal son casi imposibles de perder, Era 4 Difícil muy dura para el bot. No hay una progresión pensada de punta a punta.
3. **Ritmo.** Era 1 dura 4–8 min, Era 3 dura 25–40 min, Era 4 dura ~9 min: el tramo largo (Era 3) es el de menos riesgo. Falta decidir cuánto debería durar el recorrido completo y repartirlo.
4. **Era 2 todavía caótica y con hambre.** Con el Foco igual se acumulan números y mensajes; las evoluciones quedan sin gastar sin que el juego empuje; el hambre mata decenas por partida sin un aviso que anticipe. La prioridad «Exploración» no tiene efecto medible y la habilidad Alarma es neutra.
5. **Identidad visual común.** Cada era tiene un estilo distinto (pintado Runway, vector, pintado SD). Las Eras 3 y 4 ya comparten arte; falta una guía de estilo para las cuatro y decidir si la Era 2 pasa a pintado (sin perder los rasgos visibles). Algunos dibujos son flojos o faltan (conejo, barro, 2 íconos de insectos; edificios de una misma civilización que se parecen).
6. **Continuidad que se note en pantalla.** El linaje viaja, pero el jugador casi no lo ve: falta una pantalla de transición entre eras («tu especie llega a…»), una portada con tu recorrido y que la Era 4 muestre tus rasgos en los ejércitos (hoy solo la Era 3 los muestra).
7. **Celular.** Funciona y se publica, pero en la Era 2 el tutorial y los avisos tapan medio mapa y en la Era 4 los diálogos aparecen temprano; rendimiento de las Eras 1 y 4 a la mitad de la Era 3; no se probó en un celular real de gama baja.
8. **Portada desactualizada.** Sigue describiendo la Era 3 como «Tribus» y la Era 4 como bosquejo; no guía por dónde empezar.
9. **Multijugador solo en la Era 1.** El relay no tiene cuentas, persistencia ni pruebas de carga; las Eras 2–4 son solo contra la IA.
10. **Contenido científico sin verificar.** Fechas, cifras y explicaciones son de manual; hay que verificarlas antes de venderlo como educativo.

## 6. Preguntas para discutir
- ¿Cuánto debería durar una partida completa (Era 1 → 4) y cuánto cada era?
- ¿La Era 3 debería tener más riesgo (derrota posible) o es mejor que sea el respiro constructor entre dos eras de conflicto?
- ¿Unificar todo el arte en pintado (y cómo mostrar rasgos en la Era 2) o aceptar un estilo por era como «capítulos»?
- ¿Priorizar multijugador (Era 1 online ya existe) o pulir la experiencia de un jugador de punta a punta?
- ¿Qué tiene que tener la primera versión pública (alfa) para que valga la pena mostrarla?

## 7. Documentos de referencia en el repo
`docs/AUDITORIA-C5.md` (auditoría con datos), `docs/DEVOLUCION_CHATGPT.md` (ciclo 4), `docs/ERA3-CIVILIZACIONES.md`, `docs/ERA2-EVOLUCION.md`, `docs/ERA4.md` §12, `docs/ARTE-RUNWAY-ERA3.md` §10, `docs/MONETIZACION.md`, `docs/PRUEBAS-HUMANAS.md`.
