# Era 4: Civilizaciones (El arte de la guerra) — diseño y estado del bosquejo

Archivo jugable: `eras/era4-civilizaciones.html` (prototipo). Pruebas: `tests/era4-guardado.js`, `tests/era4-bot.js`, `tests/era4-continuidad.js`, `tests/era4-fin-run.js`. **Ciclo 5** (civilización de la Era 3, fin de partida, arte pintado): §12; donde §2-§10 dicen «lanceros/arqueros/jinetes» y «bronce», hoy cada civilización usa sus propios nombres (§12.1); la mecánica es la misma.
Marca de honestidad: **todo lo que dice «prototipo» existe y corre; todo lo que dice «diseño» todavía no está construido.**

## 1. Pilares
1. **La guerra es una simulación con base real, no una tirada de dados.** Cada choque se resuelve con las leyes de Lanchester (1916), y el juego muestra el cálculo en el panel «Por qué ganó».
   - **Ley cuadrática** (fuego a distancia, todos pueden pelear a la vez): la fuerza de un bando crece con el cuadrado de sus efectivos, `poder × N²`. Se usa en **llanura abierta**.
   - **Ley lineal** (combate cuerpo a cuerpo con frente limitado): la fuerza crece de forma lineal, `poder × N`. Se usa en **bosque, colina, vado y detrás de murallas** (frente angosto: solo pelea la primera línea). Esto es una simplificación de diseño: Lanchester asoció la ley lineal al combate antiguo y la cuadrática al fuego moderno; acá la elegimos según el terreno para que el mapa importe.
2. **Ideas del Arte de la guerra, parafraseadas** (sin citas): *elegí el terreno* (el que defiende en colina o bosque rinde más; los jinetes rinden menos en terreno cerrado), *conocé al enemigo* (niebla de guerra y espías), *el engaño y la sorpresa* (emboscada desde bosque o colina, que se arruina si el rival te espió), *la logística gana guerras* (provisiones: un ejército lejos de casa sin comida pierde moral y pelea peor) y *la moral* (un ejército quebrado huye).
3. **Piedra-papel-tijera con costo de oportunidad.** Lanceros vencen jinetes, jinetes vencen arqueros, arqueros vencen lanceros. Ningún ejército puro gana a todos: hay que leer qué arma usa el rival y contrarrestarla.
4. **Todo es reproducible.** Misma semilla, mismo mundo y misma guerra (`R()` mulberry32, paso fijo 0,05 s). El guardado devuelve el mismo futuro.

## 2. Qué hereda de la Era 3
- **La ciudad fundada** (clave `evo_lineage`, `from: 3`, campo `city`): *Ciudad militarista* (Jefatura) ⇒ +3 lanceros iniciales; *Ciudad mercantil* (Mercado) ⇒ +30 comida y +30 madera; *Ciudad teocrática* (Templo) ⇒ +10 de moral base. Además, +20 comida y +20 madera por venir de cualquier era anterior, y +2 obreros si la Era 3 terminó con 30 personas o más. Desde las Eras 1 y 2 (`from` 1 o 2) solo se aplica el bono general. Sin linaje el juego es idéntico, sin bono. **Prototipo**: lectura y bono; el menú los explica.
- **Tecnologías de la Era 3** (fuego, piedra tallada, lanza, arco, cerámica…): *diseño*. Hoy `evo_lineage` de la Era 3 no las exporta (`owned: []`); la Era 4 reemplaza el árbol por 4 **doctrinas** militares (ver §5). Cuando la Era 3 exporte sus tecnologías, la lanza y el arco podrían dar ventaja inicial a lanceros y arqueros.
- **Ramas de la Era 1** (`branch`): se guardan y se reescriben, pero no cambian nada en la Era 4 (*diseño*: Depredador ⇒ ataque, Colonial ⇒ población, etc.).

## 3. Recursos
| Recurso | De dónde sale | En qué se gasta |
| --- | --- | --- |
| **Comida** | campesinos × terreno llano cercano × Granjas | obreros, soldados, mantenimiento (obrero 0,08/s, soldado 0,02/s), provisiones de ejércitos |
| **Madera** | leñadores × bosque cercano × Aserradero | edificios, lanceros, arqueros |
| **Bronce** | mineros × colinas cercanas × Mina | jinetes, doctrinas, espías, murallas, templo |
| **Moral** | objetivo = 55 + 8×Templo + gloria reciente − 30 si hay hambre | multiplica la producción (×0,7 a ×1,0) y el ataque (×0,6 a ×1,0) |

Cada ejército lleva **provisiones** (6 comida por soldado al salir; 0,06/s por soldado fuera de territorio propio).

## 4. Edificios (hasta nivel 3)
Granja (+20% comida), Aserradero (+20% madera), Mina de bronce (+20% bronce), Cuartel (recluta más rápido; **habilita Jinetes**), Muralla (la guarnición pelea en frente angosto y resiste 12% más por nivel), Templo (+8 moral), Casa de espías (habilita espías y baja el éxito de los espías rivales). *Prototipo*: los 7 edificios, como niveles de la ciudad (no se colocan en el mapa). *Diseño*: Mercado funcional (trueque de recursos), puentes y fuertes avanzados.

## 5. Unidades, doctrinas y Sun Tzu en juego
| Clase | Ataque | Resistencia | Fuerte contra | Débil contra | Nota |
| --- | --- | --- | --- | --- | --- |
| Lanceros | 1,0 | 1,0 | Jinetes (×1,6) | Arqueros (×0,65) | baratos |
| Arqueros | 1,1 | 0,7 | Lanceros (×1,6) | Jinetes (×0,65) | frágiles |
| Jinetes | 1,5 | 1,5 | Arqueros (×1,6) | Lanceros (×0,65) | ×(1−0,35·proporción) en terreno angosto; requieren Cuartel |

Doctrinas (se compran una vez): *Armas de bronce* (+12% ataque), *Corazas* (+15% resistencia), *Carros de intendencia* (provisiones +50%), *Arte del engaño* (emboscada ×1,7 en vez de ×1,5 y espías con +15% de éxito).
**Prototipo**: niebla de guerra (solo se ve cerca de tus fuerzas o con espías), espías (12 bronce, 10 s de viaje, 55% + 10%/nivel de éxito menos 10%/nivel del rival; revelan 50 s), emboscada (ejército quieto en bosque o colina, invisible; sorprende con ×1,5 y −20 de moral al rival; no funciona si te espiaron), logística y moral.
**Diseño**: señuelos (campamentos falsos), asedio, sabotaje de provisiones, formaciones.

## 6. Cómo se calcula un choque (prototipo)
Para cada bando: `poder = 0,045 × Σ ataque × ventaja de clase ÷ resistencia media`, multiplicado por moral, provisiones, doctrina y emboscada, y dividido por la defensa del terreno del rival (llanura ×1,0; bosque ×1,15; colina ×1,25; vado ×1,2; más ×1,12 por nivel de muralla). La forma cerrada predice ganador y sobrevivientes: cuadrática `√(A² − (β/α)B²)`, lineal `A − (β/α)B`. Después el juego **integra** las ecuaciones paso a paso para animar el choque y compara «predicción vs simulado» en el panel. El **factor decisivo** se calcula neutralizando uno a uno terreno, clases, moral/provisiones y emboscada, y viendo si el ganador cambia. Los coeficientes se fijan al empezar el choque (Lanchester los supone constantes) y los ejércitos mixtos usan promedios ponderados.

## 7. Eventos
*Prototipo*: crecida del río (los vados se cierran 30 s: nadie cruza), cosecha abundante, plaga en graneros, y tres decisiones de dos opciones (mercaderes de bronce, desertores, rumores de traición). *Diseño*: hambruna, peste, rebelión, mercenarios, cambios de estación.

## 8. Rivales (IA simple, sin hacer trampas con el azar)
1 a 3 civilizaciones con personalidad visible: **belicosa** (ataca temprano), **mercantil** (crece y ataca tarde) y **astuta** (espía y tiende emboscadas). Deciden cada 1,5 s: obreros, edificios, doctrinas, composición contra lo más numeroso del enemigo y expediciones. **Hacen trampa de información**: conocen las fuerzas de los demás (la niebla solo limita al jugador). *Diseño*: diplomacia, alianzas y tratados.

## 9. Condiciones de victoria
- **Conquista** (prototipo): tomar la ciudad de todos los rivales (una ciudad cae cuando su guarnición queda en cero y un ejército enemigo llega a ella). Se pierde si cae la tuya.
- *Diseño*: **Hegemonía** (alianza + Maravilla), **Cultural** (Templos y Conocimiento) y **Tributo** (rivales vasallos).

## 10. Progresión hacia la Era 5
Al ganar se escribe `evo_lineage` con `from: 4` (ramas heredadas, ciudad, obreros, soldados, doctrinas, semilla) y se borra el guardado. **Las Eras 5 y 6 no existen**: el juego lo dice en el menú y en la pantalla final. Ideas de diseño: era moderna (industria, logística de ferrocarril) y espacio (escalas de Kardashev, inspirado en space opera con nombres originales), con el linaje de doctrinas como bono.

## 11. Qué es aproximación y hay que verificar
- Las leyes de Lanchester son modelos simplificados (coeficientes constantes, dos bandos). La asociación lineal = terreno cerrado es **decisión de diseño**, no hecho histórico.
- Todas las cifras (rendimiento por obrero, costos, velocidad, bonificaciones de terreno, ×1,6 de ventaja de clase, 0,35 de penalización de caballería, éxito de espías) son **parámetros de juego**, no datos históricos. Verificar contra fuentes primarias antes de afirmar nada dentro del texto del juego.
- Las referencias a Sun Tzu son ideas parafraseadas de traducciones modernas; no se probó la fidelidad de cada una con el original.
- Equilibrio: medido solo con un bot simple (no con personas). No hay garantía de que Fácil sea fácil para una persona.
- El proyecto (bot, tests) no mide audio (no existe), Safari/Firefox ni GPU real.

## 12. Ciclo 5: tu civilización sigue, la guerra termina y el arte es el de la Era 3
Respuesta a la auditoría `docs/AUDITORIA-C5.md` (puntos 2, 3 y 6). Medido con bots, **no con personas**.

### 12.1 Continuidad por civilización
- **De dónde sale tu civilización** (`readLineage`/`linCiv`): `evo_lineage.era3.civ` y `era3.especie`; si no hay Era 3, la clase y la especie de `era2`; si no hay nada, el menú muestra el **selector de 12 especies** (como la Era 3) y la clase decide la civilización. `newGame(seed, {civ, sp})` lo fuerza (pruebas). Estado nuevo en `G`: `ver: 2`, `civ`, `sp`, `amph`, `how`, `capB`, `maxU`; por ciudad `cv`, `sp`, `sg` (barra de asedio), `taken`, `lost`, `vassal`, `bld.vivienda`.
- **Todo dirigido por datos** (`CV`, `SPECIES`, `SPJ`, `RN`, `unitName`, `bldName`, `docName`, `tname`): la lógica sigue usando las claves internas `food/wood/bronze`, `lan/arq/jin`, `granja/aserr/mina/cuartel/vivienda/muralla/templo/espias`; solo cambian nombres, textos y dibujo.

| Civ | Recursos (comida · mat. 1 · mat. 2) | Infantería · tiradores · choque (según especie) | Terreno (llano · obstáculo · colina · río · paso) | Rival que la representa |
| --- | --- | --- | --- | --- |
| Terrestres | carne · madera · piedra | Lanceros del clan · Honderos · Cazadores de asalto / Gigantes de embestida / Carros de embestida | llanura · bosque · colina · río · vado | Clanes de Tolmar (belicosa) |
| Insectos | jalea · fibra · cera | Soldados de mandíbula · Lanzadoras de ácido · Voladoras / Enjambres de asalto / Avispas parasitoides | claro · raíces · montículo · arroyo · vado de hojas | Colmena de Kerán (belicosa) |
| Acuáticos | algas · coral · nácar | Guardias de coral · Lanzadores de púas · Cazadores abisales / Embestidores de coral / Saltadores anfibios | lecho · arrecife · roca · fosa · paso | Arrecife de Ushad (mercantil) |
| Aves | semillas · ramas · barro | Picadores · Lanzadoras de piedras · Halcones de picada / Picos de carroña / Escuadrillas en V | pradera · árboles gigantes · acantilado · río · vado | Bandada de Ilen (astuta) |

  Los edificios llevan el nombre de su casillero en la Era 3 (p. ej. Colmena: Cámara de cultivo, Molino de pulpa, Glándulas de cera, Cuartel de castas, Panal de celdas, Muralla viva, Mente de la colmena, Red de feromonas). Los rivales son **las otras clases** (Fácil: la primera; Difícil: las tres). La mecánica de Lanchester y el triángulo (MU) no cambian.
- **Bono de linaje (chico y explicado en el menú)**: +20/+20 por venir de la Era 2/3; carácter de la ciudad (Jefatura +3 de infantería, Mercado +30/+30, Templo +10 de moral; sale de `era3.path` o del campo viejo `city`); población ≥ 30: +2 obreros; **Maravilla** de la Era 3 (Terrestres +8 de moral, Colmena +2 obreras, Arrecife +25 de nácar, Bandada ve a los rivales 60 s); **Edad III**: tope de ejército +6; **≥ 8 tecnologías**: +15 de material 2; **rama de la Era 1**: Depredador +2 de infantería, Parásito +10 de material 2, Fotosintético +25 de comida, Colonial +1 obrero.
- **Linaje de salida** (`from: 4`): conserva `branch`, `tier`, `mutCount`, `era2` y `era3`, y suma `era4 {civ, especie, como, t, capitales, rendiciones, techs, dificultad}`. Rejugar la Era 4 sigue con tu civilización. La **Era 3** ahora también acepta un linaje que viene directo de la Era 1 (o de una Era 4) y conserva la rama (antes llegaba vacía porque `readLineage` solo aceptaba `from` 2 o 3).
- **Partidas viejas** (`evo_save4_v1` del Ciclo 4): `migrate()` las pasa a Terrestres (rivales: Colmena, Arrecife, Bandada; `sg` 100, `vivienda` 0) sin tocar lo ya jugado. Prueba con `tests/fixtures/era4-save-v1-base.json` (generada con el código anterior).

### 12.2 Que la partida termine
- **Tope de ejército por ciudad**: `armyCap = 36 + 12 × Cuartel + 8 × Viviendas + 15 × capitales tomadas (+6 por Edad III)`; la IA tiene ×0,75 en Fácil y ×0,9 en Normal. El nuevo edificio **Viviendas** (casillero `vivienda` de la Era 3) también da lugar a 3 obreros por nivel.
- **Asedio**: un ejército enemigo acampado a menos de 48 px de una capital sin guarnición que pueda salir (vacía o peleando) baja su barra `sg` (100 → 0) a `(3 + 0,12 × sitiadores) / (1 + 0,4 × murallas)` por segundo; sin sitiadores se recupera 2/s. En 0 la capital cae (`fall`). Sitiada, la ciudad recluta 3 veces más lento. La guarnición en su capital pelea ×1,2 (aparece en «Por qué ganó»).
- **Rendición con tributo** (`surrenders`, cada 1 s): una IA que perdió `DF.stub` choques grandes (≥ 8 unidades) contra vos y tiene menos ejército que vos, o `stub − 1` y menos del 60 %, o queda por debajo del 25 %, se rinde: sale del mapa como **tributaria** (te da la mitad de sus reservas y +15 de tope). `stub`: Fácil 3, Normal 4, Difícil 5.
- **La IA no acumula**: con el ejército al 85 % de su tope sale con el 80 % aunque no llegue a su umbral.
- Arreglo: si el otro bando de un choque desaparecía (capital caída), el que quedaba seguía «en combate» para siempre y se trababa la IA.
- **Medición** (`tests/era4-fin-run.js 0,1,2 24 2700 mix`: lógica de `tests/era4-bot.js`, sin dibujar, `E.step(2)` + acción cada 2 s, 6 partidas por civilización y dificultad, IC de Wilson 95 %):

| Dificultad | N | Victorias | Derrotas | Sin terminar a 45 min | Terminó < 40 min | Victoria | Mediana (terminadas) | Cómo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fácil | 24 | 24 | 0 | 0 | 100 % (86–100 %) | 100 % (86–100 %) | 9:10 | rendición 24 |
| Normal | 24 | 23 | 0 | 1 | 96 % (80–99 %) | 96 % (80–99 %) | 9:32 | rendición 11, conquista 12 |
| Difícil | 24 | 5 | 18 | 1 | 96 % (80–99 %) | 21 % (9–40 %) | 8:15 | derrota por asedio 18, rendición 4, conquista 1 |

  Antes (mismo bot, código del Ciclo 4, N = 3): Fácil 1/3 terminó, Normal 0/3, Difícil 1/3; ejércitos de 300–650. Ahora el ejército más grande visto fue 111. Por civilización en Difícil: victorias ter 1/6, ins 0/6, acu 1/6, ave 3/6 (N chico). **Riesgos**: Normal quedó casi tan fácil como Fácil para este bot y las partidas son cortas (≈ 9 min); en Difícil el bot pierde sobre todo por asedio temprano (4–6 min). Ninguna persona lo jugó.

### 12.3 Arte unificado con la Era 3
- Carga `../art/era3/manifest.js` (`window.ERA3_ART`, `window.ERA3_FACE`); `art(id)` crea la imagen la primera vez y devuelve `null` hasta que carga o si no existe; **`?sinarte`** no carga ninguna (para pruebas que leen píxeles en file://). El dibujo NUNCA toca `G` ni `R()`; el rumbo de cada ejército (`FACE`) vive fuera de `G`.
- **Ciudades**: el `corazon` de su civilización (nivel 1-3 según cuántas mejoras tiene) con sus edificios construidos alrededor (`<civ>.<casillero>.<nivel>`), la `maravilla` de la Era 3 junto a tu capital si la tenías, muralla punteada, barra de asedio, escombros (`gen.dano.escombros`) si cayó y aro dorado si es tributaria.
- **Ejércitos**: el habitante pintado de su especie (`hab.<especie>`), espejado según el rumbo (×`ERA3_FACE`), 1, 2 o 3 figuras según el tamaño (< 12, < 40, más), mancha con el color de la civilización, número y mini-torta con la composición del triángulo.
- **Terreno** (`buildBg`, a 2× de resolución): suelo con patrón de tu civilización, manchas suaves, colinas y obstáculos como uniones de círculos difuminados (sin grilla), `obstaculo` pintado en los obstáculos, `veta` en algunas colinas, `arbusto` suelto en el llano, río como curva con orilla y vados como bancos de arena con piedras. La lógica sigue siendo la grilla de 48 × 30.
- **HUD**: íconos `<civ>.recurso.{comida,mat1,mat2}` en las fichas; el selector de especies muestra el habitante.
- **Faltan** (queda el fallback procedural): `ins.terreno.suelo`, `ter.terreno.arbusto`, `ave.terreno.veta`. Pedidos para el Anakin: `docs/ciclo5/era4/dibujos-pedidos.md`.
- Capturas: `tools/era4-capturas.js` → `docs/ciclo5/era4/` (escritorio 1280×800 y móvil 390×844 por civilización, menú con y sin linaje, y `?sinarte`).

### 12.4 Pruebas
`tests/era4-continuidad.js` (4 civilizaciones desde la Era 3, sin linaje con selector, linaje solo de la Era 2, tope, asedio, rendición, derrota por asedio, partida vieja migrada y determinista, Era 1 → 3 → 4 conserva la rama, arte con y sin `?sinarte`), `tests/era4-guardado.js` (bono actualizado), `tests/era4-bot.js`, `tests/era4-audio.js`, `tests/era4-fin-run.js` (balance de fin de partida).
