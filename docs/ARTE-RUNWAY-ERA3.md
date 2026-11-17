# Biblia de arte de la Era 3 (Runway) · De tribu a ciudad

Documento del Ciclo 4 (director de arte). Contrato de diseño que obedece: `docs/ERA3-CIVILIZACIONES.md`. Lo usa el dueño para generar en Runway (`gen4_image_turbo`) y el agente de código para cargar las imágenes **por id**. **Solo documentación**: no se generó ninguna imagen ni se tocó código del juego. Idioma: español rioplatense; los prompts van en inglés (Runway rinde mejor) con su traducción o descripción en español.

Compañero de máquina: `docs/ARTE-RUNWAY-ERA3.prompts.json` trae **los 461 prompts completos, ya armados** (≤ 1000 caracteres, el límite de Runway), con referencias, proporción, tipo de procesado y los ids de lo que sale de cada imagen. Este documento explica y justifica; el JSON es lo que se pega o lo que lee un script (`tools/runway_gen.py` se generaliza con él).

## 0. Resumen en una pantalla

| Dato | Valor |
| --- | --- |
| Generaciones (llamadas a Runway) | **461** |
| Archivos finales (ids) | **501** (muchas generaciones dan una hoja de 2×2 o de 3 paneles que se corta en varios ids) |
| Modelo | `gen4_image_turbo` (el repo lo fija en `tools/runway_gen.py`) |
| Costo por imagen | 2 créditos (lo declara `art/runway/LEEME.md`; el código solo fija el nombre del modelo, **verificar en el panel de Runway antes de lanzar el lote grande**) |
| Costo base | **922 créditos** (461 × 2) |
| Costo realista con descartes (≈ 35 % de reintentos) | **≈ 1250 créditos** |
| Primer juego completo (Fase 1) | 141 generaciones, 282 créditos (≈ 390 con descartes) |
| Fondo | magenta plano `#FF00FF` (clave de color), nunca blanco |
| Carpeta | `art/runway/era3/<civ>/<id>.png` (civ = `ter`, `ins`, `acu`, `ave`, `anf`, `gen`, `ui`) |

Qué hay que hacer ANTES de generar (una vez): (1) capturar las 12 referencias de especie (§3.1), (2) tener a mano `tools/runway_gen.py` generalizado y `tools/runway_process_era3.py` (§6.5; los escribe el agente de código a partir de este documento), (3) revisar el crédito disponible.

## 1. Guía de estilo global

### 1.1 Qué estamos pintando
Arte **pintado a mano (gouache digital)** con el mismo lenguaje que la Era 1 pintada con Runway (`art/runway/cells/`) y las reglas de `AGENTS.md`: contorno oscuro **#2b2233** de 2 a 3 unidades (a 1024 px: ≈ 10–14 px), degradado claro arriba a la izquierda, brillo blanco translúcido arriba a la izquierda, **sin texto dentro del dibujo**, fondo transparente después del procesado. Formas gordas, legibles y simples (tipo juguete), no realistas.

### 1.2 Vista, ángulo y luz (fijos para TODO el juego)
- **Vista**: cenital en 3/4 («desde arriba y de frente», ≈ 45° de picado), la que usan los juegos de construir bases en el celular. **No isométrica en rombo**: la grilla del juego es ortogonal (celdas de 20 px), así que la huella de un edificio es un **cuadrado** visto de frente, con el frente hacia abajo de la pantalla. El volumen sube hacia arriba del lienzo.
- **Luz**: siempre desde arriba a la izquierda. Las caras izquierda y superior más claras; derecha e inferior más oscuras. Sombra proyectada: **no se pinta** (el juego dibuja una elipse de contacto); por eso el prompt dice «no cast shadow».
- **Ángulo constante** entre edificios, nodos, unidades y proyectiles; es lo que hace que «todo viva en el mismo mundo». Si una imagen sale con otra cámara (muy cenital, o en rombo), se descarta.
- Terreno: vista casi cenital (para que las baldosas encajen), con la misma luz.

### 1.3 Escala: de celdas a píxeles
El juego usa celdas de **20 px**. Los sprites se exportan a **64 px por celda** (×3,2: aguanta el zoom máximo 2,8× y pantallas de alta densidad sin pixelarse). La imagen original de Runway es de 1024×1024; el procesado la reduce.

| Huella | Dónde se usa | Lienzo de exportación (ancho×alto) | Huella dentro del lienzo | Margen superior para altura |
| --- | --- | --- | --- | --- |
| 1×1 | muros, hitos | 96×128 | 64×64 abajo al centro | 48 px |
| 2×2 | vivienda, almacén, ext1, ext2, saber, torre, nodos (128×128), puesto | 160×208 | 128×128 | 64 px |
| 3×3 | corazón, granja, cría, cuartel, único, Maravilla | 224×288 | 192×192 | 80 px |

Regla de procesado: tras quitar el fondo, se recorta a la caja de contenido y se **escala para que el ANCHO del contenido ocupe el ancho del lienzo menos 16 px por lado** (si no entra en alto, se escala por alto). Se ancla **abajo al centro** con 16 px de margen inferior. Así todos los niveles de un edificio comparten la misma huella aunque el nivel 3 sea más alto. Punto de anclaje que usa el código: centro-abajo (`ax = .5`, `ay = 1`, a 16 px del borde inferior).

Unidades: cuadro de **64×64** (cuadro de 96×96 para campeones y fauna). El animal llena ≈ 80 % del cuadro; el código lo escala por el radio de la especie (`r` de `SP2`), así que **todas se piden al mismo tamaño dentro del cuadro**, también las hormigas. Iconos: 64×64. Baldosas: 256×256 (= 4×4 celdas). Pantallas: 1920×1080.

### 1.4 Fondo y procesado (cómo pedirlo para que se quite)
La Era 1 usó fondo blanco y funcionó porque eran células. Acá hay nácar, cera, hueso, espuma, plumas blancas y brillos blancos: con fondo blanco el recorte se comería partes del dibujo. **Se pide siempre magenta plano puro `#FF00FF`** (ningún material de las paletas es magenta; el violeta de los parasitoides `#7b4aa0` y el rosa de coral quedan lejos del umbral). Frase fija: `isolated on a flat solid pure magenta #FF00FF background, no ground, no cast shadow`.
- El procesado (§6.5) hace flood-fill del magenta desde los bordes, borra el halo (despill: píxeles con R y B altos y G bajo), abre la máscara 1 iteración, descarta motas < 2 % del mayor componente y suaviza el borde con blur gaussiano de 1 px, como `tools/runway_process.py`.
- Si Runway devuelve un fondo magenta con degradé o ruido, el umbral lo absorbe; si devuelve otro color o una escena, **se descarta y se repite** (no se arregla a mano).
- Excepciones: baldosas de suelo y niebla (no se recortan), pantallas (escena completa).

### 1.5 Consistencia entre niveles (1 → 2 → 3)
1. El **nivel 1** se genera con la referencia `@anchor` (el corazón nivel 1 de la civilización) para fijar paleta y pincelada.
2. Los **niveles 2 y 3** se generan con la imagen aprobada del nivel anterior como `@prev` y la frase fija «the evolution of @prev: same square footprint, same camera angle and same colour scheme, now larger in detail and better built». Es lo que mantiene la silueta base reconocible.
3. Test de aceptación: reducir las tres a 40 px de ancho, ponerlas lado a lado y comprobar que (a) se lee la misma cosa creciendo, (b) la huella es la misma, (c) cada nivel se distingue de los otros a ese tamaño.
4. Qué cambia por nivel: **material** (tierra → madera → piedra, cera → resina → papel, esponja → coral → nácar, rama → tejido → barro cocido), **altura/pisos**, **cantidad de detalles** y **brillo interior**. Qué NO cambia: huella, colores base de la civilización, posición de la puerta/entrada (abajo al centro).

### 1.6 Qué evitar
- **Texto, letras, números, logos, escudos con letras** (lo más repetido por el modelo; el prompt lo prohíbe y la revisión lo caza).
- **IP de terceros**: la IP es original. Inspiración permitida solo en lo genérico (construir una base por edades, hormigueros, arrecifes); **nunca nombrar** juegos, estudios ni personajes en un prompt, ni pedir «al estilo de» un autor o juego. Nada de colmenas, reinas, naves ni criaturas que copien un diseño conocido.
- **Sangre y gore**: el moderador de Runway ya rechazó «células pegadas» en la Era 1. Las muertes se piden como «defeat / collapsing / fainted, cartoon style, no blood»; las armas como «tool» o «spear» sin detalles de heridas.
- Sombras proyectadas, suelo debajo del edificio, personas humanas (los habitantes son animales), cámara en rombo isométrico, figuras cortadas por el borde, texto en banderas o en tablillas (las tablillas llevan «marcas» sin letras).
- Magenta, rosa fucsia o violeta casi magenta en objetos.

### 1.7 Cómo se arma un prompt (fórmula)
`[intro de referencia] + [tamaño y tipo] + [descripción del ficha] + [estilo de la civilización] + [nivel] + [ENV de la familia]`

| Bloque | Texto fijo |
| --- | --- |
| ENV edificios | `hand-painted 2D game sprite, rich painterly gouache texture, bold dark plum outline (#2b2233), soft glossy highlight from the top-left, light from the upper left, front-facing 3/4 top-down view looking down about 45 degrees like a mobile base-builder strategy game, clean square base footprint, chunky stylized readable silhouette, centered and filling the frame, isolated on a flat solid pure magenta #FF00FF background, no ground, no cast shadow, no text, no letters, no logo, no characters` |
| ENV unidades | `hand-painted 2D game sprite, painterly gouache, bold dark plum outline (#2b2233), soft glossy highlight from the top-left, chunky readable silhouette, a flat solid pure magenta #FF00FF background, no cast shadow, no text, no letters, no logo` |
| ENV íconos | `hand-painted 2D game icon, rich painterly gouache texture, bold dark plum outline (#2b2233), soft glossy highlight from the top-left, chunky simple readable shape, each icon centered in its own quadrant, isolated on a flat solid pure magenta #FF00FF background, no text, no letters, no numbers, no cast shadow` |
| Estilo Terrestres | `prehistoric tribal village style, warm earth-tone palette of ochre, clay red, moss green, weathered wood and grey stone` |
| Estilo Insectos | `insectoid hive-city style grown from beeswax, paper pulp, resin and packed clay, amber and cream palette with soft indigo shadows, hexagonal motifs` |
| Estilo Acuáticos | `underwater reef-city style of living coral, mother-of-pearl and kelp, teal and deep blue water palette with coral orange accents and cyan bioluminescent glow, a few floating bubbles` |
| Estilo Aves | `bird-city style of woven twigs, baked clay, cliff stone and tree branches, warm brown palette with sky-blue, turquoise and red feather accents` |

Runway (gen4_image) no tiene campo de prompt negativo: **las exclusiones van en positivo dentro del prompt** («no text, no cast shadow…»), y la revisión del Art Gate caza lo que se cuele. Las referencias se pasan en `referenceImages` con una etiqueta (`@anchor`, `@prev`, `@ref`, `@style`, `@estilo`) que el prompt usa en el texto, exactamente como `tools/runway_gen.py` hace hoy con `@ref`. Hasta 3 referencias por imagen; acá nunca se usan más de 2.

Ejemplo completo (nivel 1 del ancla de las Terrestres, sin referencias):
```
A large 3x3-tile central town hall: a big campfire in a ring of rough stones, three leaning logs forming a tripod, animal hides hanging, a small feather pennant, packed-earth base. prehistoric tribal village style, warm earth-tone palette of ochre, clay red, moss green, weathered wood and grey stone. Level 1 of 3. hand-painted 2D game sprite, rich painterly gouache texture, bold dark plum outline (#2b2233), soft glossy highlight from the top-left, light from the upper left, front-facing 3/4 top-down view looking down about 45 degrees like a mobile base-builder strategy game, clean square base footprint, chunky stylized readable silhouette, centered and filling the frame, isolated on a flat solid pure magenta #FF00FF background, no ground, no cast shadow, no text, no letters, no logo, no characters.
```
Ejemplo de nivel 2 (referencias `prev` = `ter.vivienda.1` aprobada y `anchor` = `ter.corazon.1`):
```
Level 2 of 3, the evolution of @prev: the same dwelling on the same square footprint, same camera angle and same colour scheme, now larger in detail and better built: a round stick-and-mud hut with a conical thatched roof and a low hide-curtain door. prehistoric tribal village style, warm earth-tone palette of ochre, clay red, moss green, weathered wood and grey stone. hand-painted 2D game sprite, rich painterly gouache texture, bold dark plum outline (#2b2233), soft glossy highlight from the top-left, light from the upper left, front-facing 3/4 top-down view looking down about 45 degrees like a mobile base-builder strategy game, clean square base footprint, chunky stylized readable silhouette, centered and filling the frame, isolated on a flat solid pure magenta #FF00FF background, no ground, no cast shadow, no text, no letters, no logo, no characters. Match the painterly style and palette of @anchor.
```

## 2. Civilizaciones: edificios

13 casilleros por civilización: 11 con 3 niveles (`corazon`, `vivienda`, `almacen`, `granja`, `cria`, `ext1`, `ext2`, `saber`, `muro`, `torre`, `cuartel`), más `unico` y `maravilla` (un solo dibujo cada uno) = **35 dibujos por civilización, 140 en total**, más el muelle de la ciudad anfibia. Convención de id: `civ.casillero.nivel` (`ter.corazon.1`, `ins.vivienda.3`), y `civ.unico` / `civ.maravilla` sin nivel (`ave.unico`, `acu.maravilla`).

Huellas: corazón, granja, cría, cuartel, único y Maravilla **3×3**; vivienda, almacén, ext1, ext2, saber y torre **2×2**; muro **1×1** (segmento). Qué abre cada Edad: nivel 1 de `corazon`, `vivienda`, `almacen`, `granja`, `ext1`, `saber` en la Edad I; nivel 2 de todo y nivel 1 de `cria`, `ext2`, `muro`, `torre`, `cuartel`, `unico` en la Edad II; nivel 3 y `maravilla` en la Edad III (columna «Fase» = en qué fase de producción se genera, §6).

### 2.0 Variantes comunes a todos los edificios (por civilización y tamaño)

Para no multiplicar por tres cada edificio, las variantes son **genéricas por huella** (1×1, 2×2, 3×3) y por civilización; el código las superpone o las usa como etapa.

| Variante | Ids | Cómo se usa | Resolución |
| --- | --- | --- | --- |
| En obra, etapa 1 «plano» | `civ.obra1.plano`, `civ.obra2.plano`, `civ.obra3.plano` | huella marcada con estacas, hilos y pila de materiales | igual que el lienzo de la huella |
| En obra, etapa 2 «andamio» | `civ.obraN.andamio` | cimiento con andamio y escalera | ídem |
| En obra, etapa 3 «mitad» | `civ.obraN.mitad` | estructura a medio hacer | ídem |
| En obra, etapa 4 «terminado» | el edificio mismo (`civ.slot.nivel`) | sprite final con «pop» al terminar | ídem |
| Dañado | `civ.dano1`, `civ.dano2`, `civ.dano3` | superposición con chamuscado, grietas, escombros, llamitas y humo (se dibuja encima cuando el edificio baja de ⅔ y de ⅓ de vida) | ídem |
| Fantasía de colocación | (ninguna) | el código tiñe de verde/rojo el sprite terminado con alfa 0,55 | — |
| Estandarte | `civ.estandarte` | bandera del clan sobre el Corazón (la teñis por código con el color del clan) | 64×128 |

Prompt de ejemplo de una tira de obra (`ter.obra2`, 3 paneles; el procesado corta en tercios):
```
Three panels side by side in one image, each showing the same 2x2-tile construction site, same square footprint, same camera and scale in every panel. Left panel: only a marked blueprint outline made of string lines and stakes, a small pile of stacked logs, stone blocks, ropes and wooden stakes. Middle panel: a bare foundation with a wooden scaffold frame and a ladder, no walls yet. Right panel: a half-built structure with partial walls, scaffold and tools, about half complete. prehistoric tribal village style, warm earth-tone palette of ochre, clay red, moss green, weathered wood and grey stone. hand-painted 2D game sprite, painterly gouache, bold dark plum outline (#2b2233), front-facing 3/4 top-down view, light from the upper left, flat solid pure magenta #FF00FF background, no ground, no cast shadow, no text, no characters. Match the painterly style and palette of @anchor.
```

### 2.1 Terrestres · Clanes de la madriguera

**Concepto visual.** Aldea que crece de madrigueras y chozas a una ciudad de piedra. La más equilibrada y la más «reconocible»: es el punto de partida visual de todo el juego (por eso `ter.corazon.1` es el ancla de estilo de las demás civilizaciones). Las formas son redondeadas y pesadas, asentadas en el suelo; el progreso se lee en el material: tierra y palos → madera ensamblada → piedra tallada.

**Materiales.** tierra apisonada, troncos, paja, barro, pieles, piedra suelta y luego piedra tallada, humo de fogata.

**Hilo de evolución.** Del montículo a la piedra. Cada nivel cambia de MATERIAL dominante (tierra → madera → piedra) manteniendo la huella y el elemento central (el fuego, la puerta, el techo).

**Paleta** (los hex son guía para el director de arte y para revisar; el contorno es siempre `#2b2233`):

| Tierra ocre | Barro rojizo | Madera | Piedra cálida | Pasto | Ceniza/humo | Luz de fuego |
| --- | --- | --- | --- | --- | --- | --- |
| `#c9a063` | `#b5573b` | `#8a5a35` | `#9a9288` | `#6aa84f` | `#5c5560` | `#f2d9a0` |

#### `ter.corazon` · Corazón · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.corazon.1` | F1 | Fogón del clan | Gran fogata en un hoyo bordeado de piedras, tres troncos inclinados como trípode, pieles colgadas y una banderola de plumas; suelo de tierra apisonada. | a big campfire in a ring of rough stones, three leaning logs forming a tripod, animal hides hanging, a small feather pennant, packed-earth base |
| `ter.corazon.2` | F2 | Gran hogar | Casa larga con muros bajos de piedra suelta, techo grueso de paja con chimenea central humeante y dos tótems tallados en la entrada. | a large longhouse with low fieldstone walls, a thick thatched roof with a smoking central chimney, two carved wooden totem posts at the entrance |
| `ter.corazon.3` | F3 | Salón de piedra | Gran salón de bloques de piedra ajustados, techo empinado de vigas y tejas de pizarra, portal con arco y dintel tallado con espirales, dos braseros y estandarte de cuero. | a grand stone hall of fitted stone blocks, steep timber-beamed slate roof, wide arched doorway with a spiral-carved lintel, two braziers, a hide banner |

#### `ter.vivienda` · Vivienda · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.vivienda.1` | F1 | Madriguera | Montículo de tierra con entrada redonda oscura, raíces y pasto encima. | a grassy earth mound dwelling with a round dark entrance, exposed roots, tufts of grass on top |
| `ter.vivienda.2` | F2 | Choza | Choza redonda de palos con barro y techo cónico de paja, entrada baja con cortina de piel. | a round stick-and-mud hut with a conical thatched roof and a low hide-curtain door |
| `ter.vivienda.3` | F3 | Casa de barro y piedra | Casa rectangular con base de piedra, muros de adobe, puerta de madera, ventana chica y techo de tablillas. | a rectangular house with a stone foundation, mud-brick walls, wooden door, small window and wooden shingle roof |

#### `ter.almacen` · Almacén · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.almacen.1` | F1 | Hoyo de reserva | Pozo circular con tapa tejida a medio abrir y canastas apiladas al borde. | a round storage pit with a half-open woven lid and stacked baskets at the rim |
| `ter.almacen.2` | F2 | Almacén | Depósito de madera sobre pilotes con techo de paja, canastas y sacos junto a la puerta. | a wooden storehouse raised on stilts with a thatched roof, baskets and sacks by the door |
| `ter.almacen.3` | F3 | Granero de piedra | Granero de piedra con techo abovedado, puerta ancha de tablones y sacos apilados. | a stone granary with a domed roof, wide plank door and stacked sacks |

#### `ter.granja` · Granja · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.granja.1` | F1 | Huerto silvestre | Parches irregulares de arbustos de bayas y raíces con algunos palos de cerco. | irregular patches of wild berry bushes and root plants with a few stick fence posts |
| `ter.granja.2` | F2 | Huerto | Canteros prolijos con cerco de madera y un espantapájaros. | tidy raised garden beds with a wooden fence and a straw scarecrow |
| `ter.granja.3` | F3 | Campos con surcos | Campo arado con surcos de cultivo, acequia de riego y una chocita de guardia. | a plowed field with neat crop furrows, an irrigation ditch and a small watch hut |

#### `ter.cria` · Cría · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.cria.1` | F2 | Corral | Corral rústico de palos con un par de animales chicos y lanudos. | a rough stick pen holding a couple of small woolly animals |
| `ter.cria.2` | F2 | Establo | Refugio de madera con corral, heno y bebedero. | a wooden shelter with an attached pen, hay and a water trough |
| `ter.cria.3` | F3 | Rancho | Rancho de piedra y madera con corral grande, bebedero y pajar. | a stone-and-timber ranch with a large pen, long trough and a haystack |

#### `ter.ext1` · Extractor de material 1 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.ext1.1` | F1 | Campamento de leñadores | Pila de troncos, tocón con hacha clavada y una carpa de pieles. | a woodcutters camp: log pile, stump with an axe stuck in it, a small hide tent |
| `ter.ext1.2` | F2 | Aserradero | Caballete de madera con sierra grande sobre un tronco, pila de tablones. | a sawmill: timber trestle with a big hand saw over a log, stack of planks |
| `ter.ext1.3` | F3 | Taller de carpintería | Taller de madera con banco de trabajo, armazón de ruedas y tablones. | a timber carpentry workshop with a workbench, wheel frames and planks |

#### `ter.ext2` · Extractor de material 2 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.ext2.1` | F2 | Pedrera | Afloramiento rocoso con unos bloques tallados y cuñas de madera. | a rocky outcrop with a few hewn blocks and wooden wedges |
| `ter.ext2.2` | F2 | Cantera | Pozo de cantera con escalones cortados y una grúa de madera que levanta un bloque. | an open quarry pit with cut steps and a wooden crane lifting a stone block |
| `ter.ext2.3` | F3 | Cantera con rampas | Cantera en terrazas con rampas de tierra, rieles de trineo y bloques cortados apilados. | a terraced quarry with earth ramps, sled rails and stacked cut blocks |

#### `ter.saber` · Saber · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.saber.1` | F1 | Tótem | Tótem alto de madera tallada con caras de animales pintadas y plumas. | a tall carved wooden totem with painted animal faces and feathers |
| `ter.saber.2` | F2 | Círculo de relatos | Anillo de troncos-asiento alrededor de un fogón y un poste tallado. | a ring of log seats around a fire pit with a carved story-pole |
| `ter.saber.3` | F3 | Santuario | Santuario chico de piedra con techo en espiral tallado, cuencos de ofrenda y amuletos colgantes. | a small stone shrine with a spiral-carved roof, offering bowls and hanging charms |

#### `ter.muro` · Muro · 1×1 · lienzo 96×128

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.muro.1` | F2 | Empalizada | Tramo de troncos afilados clavados en fila. | a short row of sharpened upright logs |
| `ter.muro.2` | F2 | Muro de troncos | Tramo de muro de troncos gruesos con travesaños atados. | a thick log wall segment with lashed crossbeams |
| `ter.muro.3` | F3 | Muralla de piedra | Tramo de muralla de piedra con almenas. | a stone wall segment with crenellations |

#### `ter.torre` · Torre · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.torre.1` | F2 | Torre de honderos | Torre chica de madera con plataforma, escalera y canasta de piedras para honda. | a small wooden platform tower with a ladder and a basket of sling stones |
| `ter.torre.2` | F2 | Torre de arqueros | Atalaya de vigas más alta con plataforma techada y escudos en la baranda. | a taller timber watchtower with a roofed platform and shields on the rail |
| `ter.torre.3` | F3 | Bastión | Torre bastión de piedra con almenas, aspilleras y estandarte. | a stone bastion tower with battlements, arrow slits and a banner |

#### `ter.cuartel` · Cuartel · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.cuartel.1` | F2 | Campo de cazadores | Campamento de carpas con armeros de lanzas y un muñeco de práctica. | a tent camp with spear racks and a straw training dummy |
| `ter.cuartel.2` | F2 | Cuartel | Casa larga de madera con armeros, pared de escudos y puerta ancha. | a timber barracks longhouse with weapon racks and a wall of shields |
| `ter.cuartel.3` | F3 | Fuerte | Fuerte de piedra y madera con patio, torrecilla y portón. | a stone-and-timber fort with a courtyard, small tower and heavy gate |

#### `ter.unico` · Edificio único · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.unico` | F2 | Madriguera profunda | Gran montículo reforzado con troncos y una puerta-roca; escalera que baja a la tierra, antorchas en la boca. | a large log-reinforced earth mound with a heavy boulder door, stone stairs descending into the ground, torches at the entrance, roots and grass on top |

#### `ter.maravilla` · Maravilla · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ter.maravilla` | F3 | Círculo de piedras | Círculo de megalitos altos con dinteles, altar central alineado con el sol y un rayo de luz; espirales talladas. | a circle of tall standing megaliths with stone lintels, a central altar stone aligned with a beam of sunlight, carved spiral patterns |

### 2.2 Insectos · La Colmena

**Concepto visual.** Civilización insectoide de castas: la ciudad es un termitero-colmena que crece hacia arriba (torres de panales) y hacia abajo (túneles, que se insinúan con bocas oscuras). Formas orgánicas, hexágonos como motivo repetido, luz ámbar cálida adentro, sombras índigo. Biología real: hormigas cultivadoras de hongos, pulgones ordeñados, termiteros con ventilación, cera de abeja.

**Materiales.** cera ámbar, pulpa de papel gris-crema, resina brillante, arcilla compactada, hongos pálidos; celdas hexagonales; brillo de miel en ventanas.

**Hilo de evolución.** De la celda al panal a la torre. Cada nivel suma PISOS y hexágonos: la silueta crece en altura y la luz interior se intensifica.

**Paleta** (los hex son guía para el director de arte y para revisar; el contorno es siempre `#2b2233`):

| Cera ámbar | Miel | Pulpa crema | Tierra oscura | Hongo | Verde jalea | Sombra índigo | Feromona azul |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `#d9a520` | `#f0c35a` | `#e6d9b5` | `#6b4330` | `#efe6d0` | `#a9c040` | `#3b3560` | `#6fb6ff` |

#### `ins.corazon` · Corazón · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.corazon.1` | F1 | Cámara de la Reina | Montículo de arcilla y pulpa prensada con entrada hexagonal abierta y brillo de miel adentro; se adivina la reina. | a small mound of pressed clay and paper pulp with an open hexagonal entrance, warm honey glow inside, a plump queen insect faintly visible |
| `ins.corazon.2` | F2 | Gran cámara real | Domo más alto de terrazas de cera y pulpa, portales arqueados más anchos y ventanas ámbar encendidas. | a taller domed hive mound of layered wax and pulp terraces, wider arched gates and glowing amber windows |
| `ins.corazon.3` | F3 | Corazón de la Colmena | Espiral monumental de colmena-termitero con rampas, ventanas hexagonales luminosas y chimenea de coronación; núcleo ámbar brillante. | a towering spire-shaped hive-termitary with spiral ramps, glowing hexagonal windows, a crowning chimney and a bright amber core |

#### `ins.vivienda` · Vivienda · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.vivienda.1` | F1 | Celdas de cría | Racimo de pocas celdas hexagonales de cera hundidas en un montículo, cada una con una larva blanca. | a cluster of a few hexagonal wax cells pressed into a clay mound, each holding a white larva |
| `ins.vivienda.2` | F2 | Panal de celdas | Pared de panal más grande, celdas ámbar con orificios de entrada. | a larger honeycomb wall of amber hexagonal cells with entry holes |
| `ins.vivienda.3` | F3 | Torre de panales | Torre alta de pisos de panal apilados con balcones y galerías. | a tall tower of stacked honeycomb tiers with balconies and gallery ledges |

#### `ins.almacen` · Almacén · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.almacen.1` | F1 | Despensa de cera | Cámaras selladas con cera, bulbos tipo hormiga mielera. | wax-sealed bulb-shaped chambers like honeypot ants, packed in a mound |
| `ins.almacen.2` | F2 | Silo de jalea | Silos altos de cera con gotas de jalea real. | tall wax silos with royal-jelly drips |
| `ins.almacen.3` | F3 | Bóveda de reserva | Bóveda blindada de cera y resina con tope abovedado y puerta gruesa sellada. | an armored vault of wax and resin with a domed top and a thick sealed door |

#### `ins.granja` · Granja · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.granja.1` | F1 | Jardín de hongos | Montón de mantillo con hongos pálidos, fragmentos de hoja y un túnel chico. | a mulch pile with pale mushrooms, leaf fragments and a small tunnel |
| `ins.granja.2` | F2 | Cámara de cultivo | Canteros elevados de mantillo con hileras de sombreros de hongo bajo techo de papel. | raised mulch beds with rows of mushroom caps under a pulp-paper roof |
| `ins.granja.3` | F3 | Jardín climatizado | Domo de cera translúcida con chimeneas de ventilación y terrazas de hongos luminosos. | a domed translucent-wax greenhouse with ventilation chimneys and terraces of softly glowing mushrooms |

#### `ins.cria` · Cría · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.cria.1` | F2 | Establo de pulgones | Refugio de ramitas y cera con unos pulgones verdes sobre un tallo. | a twig-and-wax shelter with a few green aphids on a plant stem |
| `ins.cria.2` | F2 | Granja de pulgones | Corral en un tallo grande con muchos pulgones cuidados por hormigas y gotas de melaza. | a big plant-stem pen with many aphids tended by ants, honeydew droplets |
| `ins.cria.3` | F3 | Rebaño ordeñado | Gran invernadero vegetal con canales que recogen melaza hacia tinas de cera. | a large plant greenhouse with milking channels collecting honeydew into wax vats |

#### `ins.ext1` · Extractor de material 1 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.ext1.1` | F1 | Masticadero de fibra | Montículo con pilas de fibra vegetal masticada y astillas. | a mound with piles of chewed plant fibre and wood chips |
| `ins.ext1.2` | F2 | Molino de pulpa | Prensa de cera y arcilla con rodillos y cuenca de pulpa. | a wax-and-clay press with rollers and a pulp basin |
| `ins.ext1.3` | F3 | Fábrica de papel | Nido-fábrica de varios pisos con hojas grises de papel secándose en bastidores y canaletas. | a multi-storey paper-nest factory with grey paper sheets drying on racks and gutters |

#### `ins.ext2` · Extractor de material 2 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.ext2.1` | F2 | Cerería | Cámara chica con escamas de cera y gotas de resina acumulándose. | a small chamber with wax flakes and amber resin blobs collecting |
| `ins.ext2.2` | F2 | Glándulas de cera | Colmena de cosecha con pilares blancos de cera y canales de goteo. | a wax-harvesting hive with tall white wax pillars and drip channels |
| `ins.ext2.3` | F3 | Destilería de resina | Destilería con alambiques de arcilla y tubos de vidrio ámbar que gotean resina. | a resin distillery with clay stills and amber glass tubes dripping resin |

#### `ins.saber` · Saber · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.saber.1` | F1 | Sala de antenas | Montículo con delgadas agujas altas como antenas. | a mound topped with thin tall antenna-like spires |
| `ins.saber.2` | F2 | Red de feromonas | Cámara central con rastros azulados luminosos en el piso, agujas unidas por hilos y nubecitas de aroma. | a central chamber with glowing blue trails on the floor, spires joined by silk threads and drifting scent clouds |
| `ins.saber.3` | F3 | Mente de la colmena | Racimo de esferas luminosas con forma de cerebro sobre una torre, hilos radiales. | a brain-shaped cluster of glowing orbs on a tower with radiating threads |

#### `ins.muro` · Muro · 1×1 · lienzo 96×128

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.muro.1` | F2 | Pared de pulpa | Tramo de pared de pulpa de papel gris. | a grey paper-pulp wall segment |
| `ins.muro.2` | F2 | Muro de cera endurecida | Tramo grueso de cera y resina ámbar, brillante. | a thick glossy amber wax-and-resin wall segment |
| `ins.muro.3` | F3 | Muralla viva | Tramo formado por soldados blindados trabados entre sí, con mandíbulas hacia afuera. | a wall segment formed by armored soldier insects locked together, mandibles outward |

#### `ins.torre` · Torre · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.torre.1` | F2 | Torre de aguijones | Torre esbelta de arcilla con aguijones apuntando hacia afuera. | a slender clay tower with stingers pointing outward |
| `ins.torre.2` | F2 | Torre de ácido | Torre más alta con sacos de ácido verde-amarillo brillantes arriba y goteo. | a taller tower with glowing green-yellow acid sacs at the top and dripping |
| `ins.torre.3` | F3 | Torre de enjambre | Aguja con cientos de diminutos defensores alados girando en la cima y puertos de panal. | a spire with a swirling cloud of tiny winged defenders at the top and honeycomb launch ports |

#### `ins.cuartel` · Cuartel · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.cuartel.1` | F2 | Criadero de soldados | Nido con celdas de larvas soldado de cabeza grande. | a nest with cells of big-headed soldier larvae |
| `ins.cuartel.2` | F2 | Cuartel de castas | Cuartel en terrazas con portales de colores por casta y puertas con forma de mandíbula. | a terraced barracks with colour-coded caste entrances and mandible-shaped gates |
| `ins.cuartel.3` | F3 | Nido de guerra | Fortaleza-colmena con púas, portón-mandíbula, placas blindadas y estandartes de espiral. | a fortified spiked hive keep with a mandible gate, armored plates and spiral banners |

#### `ins.unico` · Edificio único · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.unico` | F2 | Chimenea de ventilación | Chimenea alta tipo termitero con nervaduras y rejillas; aire fresco ondulante y cámara en la base. | a tall termite-mound chimney spire with ridged vents, shimmering cool air and a chamber at its base |

#### `ins.maravilla` · Maravilla · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ins.maravilla` | F3 | La Reina Madre | Palacio-colmena colosal con la reina enorme brillando ámbar en una cámara abovedada coronada de agujas hexagonales; obreras la atienden. | a colossal hive palace holding an enormous queen insect glowing amber in a domed chamber crowned with hexagonal spires, tiny workers attending |

### 2.3 Acuáticos · La Ciudad del Arrecife

**Concepto visual.** Ciudad submarina viva sobre el lecho marino: coral, nácar y burbujas, con corrientes como caminos. Sin fuego: la energía viene de fumarolas y bioluminiscencia (cian y naranja-rojizo). Todo se ve «bajo el agua»: azules profundos, partículas flotando, luz que baja desde arriba a la izquierda. Biología real: arrecifes, acuicultura, pulpos con herramientas, ecolocalización.

**Materiales.** coral ramificado, nácar iridiscente, esponjas, quelpo, conchas, basalto; luz bioluminiscente cian; fumarolas naranja-rojizas.

**Hilo de evolución.** Del refugio a la torre de coral. Cada nivel pasa de elementos sueltos (grietas, estacas, conchas) a estructuras vivas ensambladas y luego a arquitectura de nácar pulido con luz propia.

**Paleta** (los hex son guía para el director de arte y para revisar; el contorno es siempre `#2b2233`):

| Agua profunda | Turquesa | Coral | Nácar | Arena | Quelpo | Bioluminiscencia | Fumarola |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `#1f4e79` | `#3fb6b0` | `#e07a5f` | `#eadfe8` | `#cdbb94` | `#3d7a4a` | `#7ff5e8` | `#d9482b` |

#### `acu.corazon` · Corazón · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.corazon.1` | F1 | Concha del consejo | Almeja gigante abierta con una perla brillante adentro y un anillo de piedras lisas. | a giant open clam shell with a glowing pearl inside, ringed by smooth stones |
| `acu.corazon.2` | F2 | Gran anémona | Anémona enorme de tentáculos ondulantes que forman un anillo sobre una arena de coral encendida. | a vast sea anemone with swaying tentacles forming a ring over a glowing coral arena |
| `acu.corazon.3` | F3 | Palacio de nácar | Palacio de coral y nácar con cúpulas, torres en espiral, perlas luminosas y estandartes de quelpo. | a palace of coral and mother-of-pearl with domes, spiral towers, glowing pearls and kelp banners |

#### `acu.vivienda` · Vivienda · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.vivienda.1` | F1 | Grieta-refugio | Grieta en la roca con cortina de esponjas. | a crack in the rock with a curtain of tube sponges |
| `acu.vivienda.2` | F2 | Pólipo-vivienda | Cápsulas de coral blando vivo con ventanas redondas. | living soft-coral polyp pods with round windows |
| `acu.vivienda.3` | F3 | Torre de coral | Torre alta de coral ramificado con muchas ventanas redondas y burbujas. | a tall branching coral tower with many round windows and bubbles |

#### `acu.almacen` · Almacén · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.almacen.1` | F1 | Cueva de reservas | Cueva con red de quelpo y conchas amontonadas en la boca. | a rock cave with a kelp net and piled shells at its mouth |
| `acu.almacen.2` | F2 | Bóveda de nácar | Bóveda forrada de nácar con puerta redonda de almeja. | a mother-of-pearl-lined vault with a round clam-shell door |
| `acu.almacen.3` | F3 | Cámara sellada | Cámara de placas de nácar con cierres de perla y una junta luminosa. | a sealed chamber of nacre plates with pearl locks and a glowing seam |

#### `acu.granja` · Granja · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.granja.1` | F1 | Pradera de algas | Parche de algas y pasto marino con estacas. | a patch of seagrass and algae with stakes |
| `acu.granja.2` | F2 | Granja de algas | Terrazas de algas en bastidores con cuerdas. | terraced algae beds on rack frames with rope lines |
| `acu.granja.3` | F3 | Bosque de quelpo | Bosque alto de quelpo con flotadores y una plataforma de cosecha. | a tall kelp forest with floats and a harvest platform |

#### `acu.cria` · Cría · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.cria.1` | F2 | Corral de peces | Corral circular de estacas de coral con peces chicos. | a ring pen of coral stakes holding small fish |
| `acu.cria.2` | F2 | Vivero de peces | Vivero de redes y coral con varios corrales y plataforma de alimentación. | a net-and-coral fish nursery with several pens and a feeding platform |
| `acu.cria.3` | F3 | Criadero de cardúmenes | Gran anillo de acuicultura con túneles-portón y cardúmenes. | a large circular aquaculture ring with tunnel gates and schooling fish |

#### `acu.ext1` · Extractor de material 1 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.ext1.1` | F1 | Arrecife cultivado | Parcela chica de arrecife con coral creciendo en bastidores. | a small reef plot with coral growing on frames |
| `acu.ext1.2` | F2 | Vivero de coral | Mesas de vivero con fragmentos de coral y herramientas. | coral nursery tables with coral fragments and tools |
| `acu.ext1.3` | F3 | Jardín de coral | Jardines frondosos de arcos de coral multicolor con grúas de cosecha. | lush gardens of colourful coral arches with harvest cranes |

#### `acu.ext2` · Extractor de material 2 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.ext2.1` | F2 | Lecho de ostras | Lecho de ostras en un hueco de roca. | an oyster bed in a rocky pocket |
| `acu.ext2.2` | F2 | Ostrario | Estantes elevados con jaulas de ostras. | raised racks of oyster cages |
| `acu.ext2.3` | F3 | Taller de nácar | Taller con puestos de pulido, láminas de nácar y perlas luminosas. | a workshop with polishing stations, nacre sheets and glowing pearls |

#### `acu.saber` · Saber · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.saber.1` | F1 | Gruta de cantos | Gruta con arco, anillos de ondas de sonido y un caracol-trompeta. | a grotto with an arch, rings of sound ripples and a conch horn |
| `acu.saber.2` | F2 | Anfiteatro de ecos | Anfiteatro en forma de concha con gradas y arcos de sonido. | a shell-shaped amphitheatre with tiers and arcs of sound |
| `acu.saber.3` | F3 | Biblioteca de corrientes | Torre de estantes espirales de nácar con conchas-rollo luminosas y cintas de corriente. | a tower of spiral nacre shelves with glowing scroll-shells and ribbons of current |

#### `acu.muro` · Muro · 1×1 · lienzo 96×128

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.muro.1` | F2 | Barrera de esponjas | Tramo de esponjas tubulares. | a segment of tube sponges |
| `acu.muro.2` | F2 | Barrera de medusas | Tramo de medusas amarradas con tentáculos urticantes brillantes. | a segment of tethered jellyfish with glowing stinging tentacles |
| `acu.muro.3` | F3 | Muralla de coral de fuego | Tramo de púas de coral de fuego naranja-rojizo, brillante. | a segment of orange-red fire-coral spikes, glowing |

#### `acu.torre` · Torre · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.torre.1` | F2 | Pulpo vigía | Pilar de roca con un pulpo chico asomando y hilos de tinta. | a rock pillar with a small octopus peeking out and wisps of ink |
| `acu.torre.2` | F2 | Torre de erizos | Torre de coral coronada de erizos que lanzan espinas. | a coral tower topped with sea urchins launching spines |
| `acu.torre.3` | F3 | Torre de luz | Torre tipo faro con un gran bulbo bioluminiscente que lanza un haz. | a lighthouse-like tower with a big bioluminescent bulb casting a beam |

#### `acu.cuartel` · Cuartel · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.cuartel.1` | F2 | Escuela del cardumen | Anillo de entrenamiento con postes de quelpo y peces-muñeco. | an open training ring with kelp posts and dummy fish |
| `acu.cuartel.2` | F2 | Guarnición | Cuartel de coral con armeros de escudos de concha. | a coral barracks with racks of shell shields |
| `acu.cuartel.3` | F3 | Fortaleza de las mareas | Fortaleza de coral y basalto con compuertas de marea y grandes escudos de nácar. | a coral-and-basalt fortress with tide gates and big nacre shields |

#### `acu.unico` · Edificio único · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.unico` | F2 | Fumarola domada | Chimenea hidrotermal de roca con anillo de piedra y cañerías de nácar que canalizan agua caliente naranja-rojiza luminosa; gusanos tubulares y burbujas. | a rocky hydrothermal vent chimney in a stone ring with nacre pipes channelling hot glowing orange-red water, tube worms and bubbles |

#### `acu.maravilla` · Maravilla · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `acu.maravilla` | F3 | Corriente domada | Gran arco espiral de coral y nácar atravesado por una cinta de corriente luminosa que arrastra carga flotante. | a great spiralling arch of coral and mother-of-pearl straddling a glowing ribbon of current that carries floating cargo |

#### Ciudad anfibia (`anf.*`)

Si en la Era 2 el linaje desarrolló la transición a tierra, la ciudad es de costa: usa los edificios **Acuáticos** en el agua y los **Terrestres** de nivel 1–2 en tierra (sin dibujos nuevos de edificios), más un edificio de conexión, el terreno de costa (§4.1) y una transición propia (§5).

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) | Lienzo |
| --- | --- | --- | --- | --- | --- |
| `acu.muelle` | F4 | Muelle anfibio | Embarcadero de madera y coral que sale de la orilla hacia el agua, con sogas de quelpo y un farol (ciudad anfibia). | a jetty pier of timber and coral extending from a sandy shore into water, with kelp ropes and a lantern | 2×2 · 160×208 |

### 2.4 Aves · La Bandada

**Concepto visual.** Ciudades en acantilados y copas de árboles gigantes: ligera, vertical y abierta al cielo; cielo celeste de fondo en la luz (no en la imagen: el fondo se quita). Biología real: nidos tejidos (tejedores), hornero (barro cocido), cuervos con herramientas, rutas migratorias. Edificios más frágiles y aireados (pasarelas, perchas, soportes finos).

**Materiales.** ramas y juncos tejidos, barro cocido, piedra de acantilado, follaje, plumas de acento (turquesa, roja).

**Hilo de evolución.** Del nido a la ciudad del acantilado. Cada nivel pasa de tejido suelto (ramas) a tejido prolijo y a barro cocido y piedra; la silueta gana verticalidad y pasarelas.

**Paleta** (los hex son guía para el director de arte y para revisar; el contorno es siempre `#2b2233`):

| Piedra de acantilado | Rama | Barro cocido | Follaje | Cielo | Pluma turquesa | Pluma roja | Paja |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `#8c8579` | `#8a6a44` | `#b27a4d` | `#4f8a46` | `#7fb6e0` | `#3f8fd1` | `#c4503a` | `#d9c48a` |

#### `ave.corazon` · Corazón · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.corazon.1` | F1 | Nido mayor | Nido enorme de ramas tejidas en la horqueta de una rama gruesa, con huevos. | a huge woven-branch nest in the fork of a thick tree limb, with eggs |
| `ave.corazon.2` | F2 | Árbol de la bandada | Tronco gigante con plataformas tejidas, pasarelas colgantes y muchos nidos. | a giant tree trunk with woven platforms, hanging walkways and many nests |
| `ave.corazon.3` | F3 | Ciudad del acantilado | Ciudad en la pared del acantilado con terrazas talladas, puentes y torres de barro cocido sobre un pilar de roca. | a cliff-face city with carved terraces, bridges and baked-clay towers on a rock pillar |

#### `ave.vivienda` · Vivienda · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.vivienda.1` | F1 | Nidos | Dos o tres nidos redondos chicos sobre una rama. | two or three small round nests on a branch |
| `ave.vivienda.2` | F2 | Nidos tejidos | Nidos colgantes en forma de gota, tejidos prolijos, con entrada. | tidy teardrop-shaped woven hanging nests with entrance holes |
| `ave.vivienda.3` | F3 | Colonia de nidos | Colonia densa de nidos de barro y trama apilados en una torre de ramas con perchas. | a dense colony of clay-and-weave nests stacked on a branch tower with perches |

#### `ave.almacen` · Almacén · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.almacen.1` | F1 | Hueco del árbol | Hueco de un tronco con puertita tejida y semillas. | a tree hollow with a little woven door and seeds |
| `ave.almacen.2` | F2 | Granero colgante | Canasto-granero tejido colgado de ramas con soga. | a woven granary basket hanging from branches on ropes |
| `ave.almacen.3` | F3 | Despensa del acantilado | Despensa excavada en la repisa de un acantilado con jarras de barro. | a pantry dug into a cliff ledge with clay jars |

#### `ave.granja` · Granja · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.granja.1` | F1 | Campo de bayas | Arbustos de bayas en un claro. | berry bushes in a clearing |
| `ave.granja.2` | F2 | Huerta de semillas | Parcelas de girasoles y granos con postes-percha. | plots of sunflowers and grain with perch posts |
| `ave.granja.3` | F3 | Terrazas | Terrazas escalonadas en una ladera con bordes de barro. | stepped terraces on a slope with clay edges |

#### `ave.cria` · Cría · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.cria.1` | F2 | Criadero de larvas | Tronco con larvas en agujeros. | a log with insect larvae in holes |
| `ave.cria.2` | F2 | Gusanera | Cajones de madera con gusanos y tapas de mimbre. | wooden bins with worms and wicker lids |
| `ave.cria.3` | F3 | Criadero de insectos | Insectario de barro en pisos con tubos y perchas de alimentación. | a tiered clay insectary with tubes and feeding perches |

#### `ave.ext1` · Extractor de material 1 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.ext1.1` | F1 | Recolección de ramas | Atados de ramitas apilados en una rama. | bundles of twigs piled on a branch |
| `ave.ext1.2` | F2 | Tejeduría | Bastidores de tejer con juncos. | weaving frames with reeds |
| `ave.ext1.3` | F3 | Taller de cestería | Taller con canastos y mimbre. | a basketry workshop with baskets and wicker |

#### `ave.ext2` · Extractor de material 2 · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.ext2.1` | F2 | Pozo de barro | Pozo de barro con terrones de arcilla al borde del acantilado. | a mud pit with clay lumps at the cliff edge |
| `ave.ext2.2` | F2 | Alfarería de nido | Montículo con vasijas de barro secándose. | a mound with clay pots drying |
| `ave.ext2.3` | F3 | Horno de barro | Horno de barro en cúpula estilo hornero, con humo. | a domed clay kiln in the style of an oven-bird nest, with smoke |

#### `ave.saber` · Saber · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.saber.1` | F1 | Atalaya de vuelos | Poste-percha alto con plataforma y bandera. | a tall perch pole with a platform and a flag |
| `ave.saber.2` | F2 | Mirador de rutas | Plataforma ancha con mesa de piedra con mapa y percha. | a wide platform with a stone map table and a perch |
| `ave.saber.3` | F3 | Observatorio del cielo | Observatorio abovedado con cartas del cielo en piedra y una ranura. | a domed observatory with stone sky-charts and a slit window |

#### `ave.muro` · Muro · 1×1 · lienzo 96×128

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.muro.1` | F2 | Espinal | Cerco de zarzas espinosas. | a thorn bramble fence |
| `ave.muro.2` | F2 | Seto de espinos | Seto denso de espinos con estacas tejidas. | a dense thorn hedge with woven stakes |
| `ave.muro.3` | F3 | Muro de barro cocido | Tramo de muro de barro cocido con púas. | a baked-clay wall segment with spikes |

#### `ave.torre` · Torre · 2×2 · lienzo 160×208

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.torre.1` | F2 | Percha de vigías | Poste alto con un nido de vigía. | a tall pole with a lookout nest |
| `ave.torre.2` | F2 | Nido de rapaces | Torre-aguilera con gran nido y adornos de garras. | an aerie tower with a big nest and talon decorations |
| `ave.torre.3` | F3 | Torre de halcones | Torre de barro y madera con perchas de halcón y soga de descenso. | a clay-and-timber tower with falcon roosts and a drop rope |

#### `ave.cuartel` · Cuartel · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.cuartel.1` | F2 | Nido de cazadores | Zona de nidos con perchas de caza y blancos de plumas. | a nest ground with hunting perches and feather targets |
| `ave.cuartel.2` | F2 | Escuela de picada | Torre alta de picada con rampas. | a tall dive-training tower with ramps |
| `ave.cuartel.3` | F3 | Aguilera | Fortaleza de acantilado con banderas. | a high cliff aerie fortress with banners |

#### `ave.unico` · Edificio único · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.unico` | F2 | Dormidero | Árbol enorme de dormidero con cientos de perchas tejidas y copa ancha, un anillo luminoso suave. | a massive roosting tree with hundreds of woven perches across its wide canopy and a soft glowing ring |

#### `ave.maravilla` · Maravilla · 3×3 · lienzo 224×288

| id | Fase | Nombre | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- | --- | --- |
| `ave.maravilla` | F3 | La Gran Ruta Migratoria | Arco-portal monumental de barro y piedra en lo alto del acantilado con una V de aves esculpida, banderas al viento y corona de plumas. | a monumental clay-and-stone cliff-top gateway arch with a sculpted V of birds in flight, wind banners and a feather crown |

### 2.5 Edificio único y Maravilla: resumen visual

| id | Civilización | Nombre | Qué lo hace inconfundible a 40 px |
| --- | --- | --- | --- |
| `ter.unico` | Terrestres | Madriguera profunda | montículo con puerta-roca y escalera hacia abajo (lo subterráneo) |
| `ter.maravilla` | Terrestres | Círculo de piedras | círculo de megalitos con dinteles y rayo de sol |
| `ins.unico` | Insectos | Chimenea de ventilación | chimenea alta nervada con aire ondulante |
| `ins.maravilla` | Insectos | La Reina Madre | palacio con la reina colosal brillando ámbar |
| `acu.unico` | Acuáticos | Fumarola domada | chimenea de roca con agua naranja-rojiza y burbujas (único brillo cálido bajo el agua) |
| `acu.maravilla` | Acuáticos | Corriente domada | arco espiral sobre una cinta de corriente luminosa |
| `ave.unico` | Aves | Dormidero | copa ancha con cientos de perchas y anillo luminoso |
| `ave.maravilla` | Aves | La Gran Ruta Migratoria | arco-portal con una V de aves esculpida y plumas |

## 3. Unidades y habitantes

Los habitantes **son tu especie de la Era 2**: el cuerpo, el color y las proporciones salen del módulo `eras/era2-arte.js` (`DRAW.ter_cazador` = lobo, `ter_gigante` = animal macizo con joroba, `ter_ingeniero` = castor, `ins_colmena` = abeja, `ins_enjambre` = langosta, `ins_parasito` = avispa parasitoide, `acu_abisal` = pez con señuelo, `acu_arrecife` = pez de arrecife con franjas, `acu_anfibio` = ajolote, `ave_rapaz`, `ave_carronera`, `ave_migratoria`; colores `col` de `SP2`). Cada oficio es **la misma especie + accesorios** (no humanos).

### 3.1 Imagen de referencia por especie (obligatoria antes de generar unidades)
Se capturan una vez las 12 especies con `Era2Arte.drawAnimal` (a ~600 px, de lado mirando a la derecha, fondo magenta `#FF00FF`, sin cinta de linaje ni rasgos) y se guardan en `art/runway/era3/_ref/<clase>_<especie>.png` (`ter_cazador.png`, …, `ave_migratoria.png`). Es la `@ref` de cada hoja y lo que garantiza que «sea la misma especie». Ayuda a la lectura: cuando Runway repinta, tiende a embellecer; se exige que **conserve la silueta de la referencia** (cola, joroba, alas, señuelo).

### 3.2 Las 12 especies

**Terrestres**

| Especie (id) | Cómo se ve (EN, para el prompt) | Variante visible en la Era 3 (EN) | Qué se ve (ES) |
| --- | --- | --- | --- |
| `ter_cazador` · Cazadores de manada | a slender grey-brown wolf with a long snout, pointed ears and a bushy tail (fur #8a6b4a) | an ochre-red war-paint stripe across the shoulder and a necklace of teeth | lobo esbelto gris-marrón, hocico largo, cola poblada; franja de pintura ocre-roja en el hombro y collar de dientes |
| `ter_gigante` · Gigantes herbívoros | a massive heavy dark-brown humped herbivore with a low head, short tusks, big claws and shaggy fur (#7a6a55) | pale carved bone plates on the hump and shoulders | herbívoro enorme y macizo con joroba, cabeza baja, colmillos cortos, garras y pelaje hirsuto; placas de hueso claro tallado en la joroba y los hombros |
| `ter_ingeniero` · Omnívoros ingenieros | a stocky tan beaver-like omnivore with a flat paddle tail and big front teeth (#9a7a5a) | a green cloth sash and a leather tool belt | omnívoro robusto tipo castor, cola plana de remo, dientes grandes; banda verde de tela y cinturón de cuero con herramientas |

**Insectos**

| Especie (id) | Cómo se ve (EN, para el prompt) | Variante visible en la Era 3 (EN) | Qué se ve (ES) |
| --- | --- | --- | --- |
| `ins_colmena` · Colmena con castas | a small golden bee with a striped abdomen and fast translucent wings (#d9a520) | a tiny amber-wax cap | abeja dorada chica, abdomen rayado, alas translúcidas; gorrito chico de cera ámbar |
| `ins_enjambre` · Enjambre migratorio | a tiny slender lime-green locust with long hind jumping legs (#a9c040) | a small leaf-fibre sash | langosta diminuta lima, patas traseras largas de salto; banda chica de fibra de hoja |
| `ins_parasito` · Parasitoides | a violet-bodied parasitoid wasp with a thin waist, long ovipositor and long dangling legs (#7b4aa0) | a dark resin-black stinger sheath | avispa parasitoide violeta, cintura fina, ovipositor largo, patas largas colgantes; vaina de resina oscura en el aguijón |

**Acuáticos**

| Especie (id) | Cómo se ve (EN, para el prompt) | Variante visible en la Era 3 (EN) | Qué se ve (ES) |
| --- | --- | --- | --- |
| `acu_abisal` · Depredadores abisales | a deep-blue abyssal predator fish with a glowing lure on its head and a big toothy mouth (#2a5a8a) | a cyan glowing lure kept bright | pez abisal azul profundo con señuelo luminoso y boca grande con dientes; señuelo cian encendido |
| `acu_arrecife` · Arrecife constructor | an orange-coral striped reef fish with showy yellow fins (#e07a5f) | a small coral-fragment crest on the head | pez de arrecife naranja con franjas y aletas amarillas vistosas; cresta chica de fragmentos de coral |
| `acu_anfibio` · Anfibios pioneros | a green axolotl-like amphibian with feathery external gills, stubby legs with toes and a salamander tail (#4a9a6a) | a pearl bead necklace | anfibio verde tipo ajolote, branquias plumosas, patitas con dedos, cola de salamandra; collar de perlitas |

**Aves**

| Especie (id) | Cómo se ve (EN, para el prompt) | Variante visible en la Era 3 (EN) | Qué se ve (ES) |
| --- | --- | --- | --- |
| `ave_rapaz` · Rapaces | a dark-brown raptor with broad fingered wings, hooked beak and a barred tail (#6a4a3a) | a red feather tuft on the head | rapaz marrón oscura, alas anchas con dedos, pico curvo, cola barrada; mechón de plumas rojas en la cabeza |
| `ave_carronera` · Carroñeras oportunistas | a grey-black vulture-like scavenger with a bare neck, a ruff of feathers and a heavy beak (#4a4a52) | a patched leather scrap cape | carroñera gris-negra, cuello pelado, gorguera, pico pesado; capita de retazos de cuero |
| `ave_migratoria` · Migratorias y polinizadoras | a sleek sky-blue swift-like migratory bird with long swept-back wings and a forked tail (#3f8fd1) | a small yellow pollen-dusted scarf | ave migratoria celeste aerodinámica, alas largas hacia atrás, cola en horquilla; pañuelo amarillo con polen |

La «variante» es un detalle propio que se pinta siempre encima de la especie base (franja, collar, placas, cintita, señuelo, cresta) para que dos especies de la misma clase no se confundan a 12 px (punto débil que el Art Gate de la Era 2 ya marcó en insectos). Los colores de la cinta de linaje de la rama los sigue poniendo el código encima.

### 3.3 Roles y accesorios por civilización

| Rol | `ter` | `ins` | `acu` | `ave` |
| --- | --- | --- | --- | --- |
| **Obrero** | canasto tejido a la espalda y hacha de piedra atada al costado | bolita de pulpa masticada entre las mandíbulas y canastito de hoja a la espalda | martillo con punta de coral sujeto con la aleta y bolsita de red con conchas | atado de ramitas en el pico y bolsita tejida en el pecho |
| **Guerrero** | escudo redondo de madera, lanza con punta de hueso y vincha de plumas | placas gruesas de quitina blindada, casco de caparazón con púas y mandíbulas afiladas | escudo de concha de nácar y lanza de coral afilada | casquete blindado en el pico, cuchillas en las garras y escudo con borde de plumas |
| **Tirador** | honda de cuero, bandolera con piedras redondas y arco corto al hombro | saco de ácido verde-amarillo hinchado y luminoso en el abdomen, levantado para escupir | tubo lanzador de espinas de erizo en las aletas con bandolera de espinas | bandolera de dardos de pluma en el pecho y honda de vaina de semillas en las garras |
| **Explorador** | capa de piel con capucha y morral chico, liviano y atento | antenas larguísimas con un rastro azul tenue de feromonas detrás, esbelto y liviano | farolito-señuelo luminoso, cuerpo fino e hidrodinámico y capita de escamas de nácar | cresta liviana, banda en el ala con un rollito de mapa y ojos muy atentos |

Texto en inglés de cada accesorio (el que entra al prompt):

- `ter` · Obrero: a woven basket strapped on its back and a stone hand-axe tied at its side
- `ter` · Guerrero: a round wooden shield, a bone-tipped spear and a feather headband
- `ter` · Tirador: a leather sling and a pouch of round stones bandolier, a short bow slung over the shoulder
- `ter` · Explorador: a hooded hide cape and a small satchel, light and alert
- `ins` · Obrero: a ball of chewed pulp held in its mandibles and a tiny leaf basket on its back
- `ins` · Guerrero: thick armored chitin plates with a spiked carapace helmet and sharpened mandibles
- `ins` · Tirador: a swollen glowing green-yellow acid sac on its abdomen, raised to spit
- `ins` · Explorador: very long antennae with a faint glowing blue pheromone trail behind it, slim and light
- `acu` · Obrero: a coral-tipped hammer held in a fin-grip and a small net bag of shells
- `acu` · Guerrero: a mother-of-pearl shell shield and a sharpened coral spear
- `acu` · Tirador: a urchin-spine launcher tube held in the fins with a bandolier of spines
- `acu` · Explorador: a small glowing lantern-lure and a slim streamlined build, a mother-of-pearl scale cape
- `ave` · Obrero: a bundle of twigs held in its beak and a woven pouch around the chest
- `ave` · Guerrero: a small armored beak cap, talon blades on the feet and a feather-edged shield
- `ave` · Tirador: a bandolier of feather darts across the chest and a small seed-pod sling in the claws
- `ave` · Explorador: a light feather crest, a wing-band with a small map-roll and very alert eyes

**Campeones** (uno por civilización, no es la especie del jugador sino su «gran representante»; Edad III):

| id | Nombre | Qué se ve (ES) | Habilidad que se anima |
| --- | --- | --- | --- |
| `ter.uni.gigante_guerra` | Gigante de guerra | Bestia gigante de guerra: enorme, hirsuta, con placas de piedra tallada, pintura de guerra, colmillos de hueso y una maza de piedra | the war-giant swings its club overhead in a ground-shaking slam with dust rings |
| `ins.uni.soldado_mandibulas` | Soldado de mandíbulas | soldado gigante blindado con mandíbulas enormes aserradas, placas de quitina brillantes y cabeza con púas, ámbar y marrón oscuro | the soldier clamps its giant mandibles shut with a shockwave |
| `acu.uni.pulpo_tinta` | Pulpo de tinta | pulpo grande e inteligente con placas de nácar en los tentáculos, ojos cian brillantes y nube de tinta, azul profundo y coral | the octopus bursts a huge ink cloud around itself and its tentacles flare |
| `ave.uni.halcon_picada` | Halcón de picada | halcón grande y majestuoso con cresta ceremonial de plumas y protectores dorados en las garras, plumaje turquesa y bronce | the falcon folds its wings and dives, trailing wind streaks and feathers |

### 3.4 Hojas de animación

**Formato**: cada fila de animación es **una generación** de Runway con **2×2 cuadros** (cuatro cuadrantes iguales de 512×512, orden de lectura izquierda→derecha, arriba→abajo). El procesado corta los cuadrantes, quita el fondo y arma **una sola hoja por unidad** de 4 columnas × N filas.
- **Cuadro**: 64×64 (campeón y fauna 96×96). **Alineación**: un único factor de escala por hoja (el de la unión de todos los cuadros) y **línea de pies común** (borde inferior de la unión menos 4 px), centrado en el eje horizontal del cuadro; así no «baila» entre cuadros.
- **Dirección**: solo derecha; el código espeja para ir a la izquierda. No hay vistas de frente/espalda (la vista es 3/4 cenital; el costo de 3 vistas triplicaría la producción).
- **Filas, en este orden dentro del PNG**:

| Rol | Filas (de arriba a abajo) | Tamaño de la hoja | Generaciones |
| --- | --- | --- | --- |
| obrero | caminar · trabajar · morir | 256×192 | 3 |
| guerrero | caminar · atacar · morir | 256×192 | 3 |
| tirador | caminar · atacar (a distancia) · morir | 256×192 | 3 |
| explorador | caminar · morir | 256×128 | 2 |
| *`acu_anfibio` (todos los roles)* | caminar (tierra) · **nadar** · acción · morir | 256×(+64) | +1 por rol |
| campeón | caminar · atacar · habilidad · morir | 384×384 | 4 |
| amenaza (fauna) | caminar · atacar · morir | 384×288 | 3 |

- **caminar** = 4 cuadros en ciclo; para Acuáticos es *nadar* (ondulación y aleteo), para Insectos marcha de trípode con antenas, para Aves salto-paso con aleteo. **trabajar** = levantar herramienta, golpear/recolectar, levantar carga, cargarla (se reproduce en bucle; cargar un objeto lo dibuja el código encima). **atacar** = preparación, embestida, golpe, recuperación. **morir** = golpe, tambaleo, caída, tendido con los ojos cerrados (nunca sangre). Estados «parado» y «herido» salen por código (cuadro 1 de caminar y destello blanco).
- La fila `nadar` del anfibio permite entrar y salir del agua en la ciudad anfibia; las demás especies acuáticas usan `caminar` también para quedarse quietas (cuadro 1).

**Ids**: `civ.uni.especie.rol` (por ejemplo `ter.uni.cazador.obrero`, `acu.uni.anfibio.guerrero`, `ave.uni.migratoria.explorador`) y `civ.uni.<campeón>` (`ter.uni.gigante_guerra`, `ins.uni.soldado_mandibulas`, `acu.uni.pulpo_tinta`, `ave.uni.halcon_picada`). Cada hoja es 1 id; sus filas son generaciones con id `<id>-<fila>` (`ter.uni.cazador.obrero-caminar`, `…-trabajar`, `…-morir`).

**Fórmula de prompt de unidad** (el JSON trae los 136 ya armados):
```
A 2x2 sprite sheet of four animation frames of the same game character, four equal quadrants (left-to-right, top-to-bottom), same size, scale and baseline in each, no grid lines, no numbers. The character is a slender grey-brown wolf with a long snout, pointed ears and a bushy tail (fur #8a6b4a), exactly as in @ref, wearing an ochre-red war-paint stripe across the shoulder and a necklace of teeth and with a woven basket strapped on its back and a stone hand-axe tied at its side. Side-on three-quarter view from slightly above, facing right. Animation: a 4-frame walk cycle on land: contact, passing, contact, passing, limbs alternating. hand-painted 2D game sprite, painterly gouache, bold dark plum outline (#2b2233), soft glossy highlight from the top-left, chunky readable silhouette, a flat solid pure magenta #FF00FF background, no cast shadow, no text, no letters, no logo.
```
Las filas siguientes de la misma hoja reciben además `@prev` = la fila «caminar» aprobada, para mantener cara, accesorios y proporciones. El primer cuadro de cada rol distinto usa `@prev` = el obrero de esa especie. Ejemplo de campeón:
```
A 2x2 sprite sheet of four animation frames of the same large game champion character, four equal quadrants (left-to-right, top-to-bottom), same size, scale and baseline in each, no grid lines, no numbers. The character is a large intelligent octopus with mother-of-pearl armor plates on its tentacles, glowing cyan eyes and a trailing cloud of ink, deep blue and coral. Side-on three-quarter view from slightly above, facing right. Animation: a 4-frame swim cycle: body undulation and fin beat, drifting slowly forward. hand-painted 2D game sprite, painterly gouache, bold dark plum outline (#2b2233), soft glossy highlight from the top-left, chunky readable silhouette, a flat solid pure magenta #FF00FF background, no cast shadow, no text, no letters, no logo.
```

### 3.5 Retratos
Un retrato por especie (`civ.ret.especie`, 192×192, busto 3/4 de frente, fondo recortado) para el panel de selección, la pantalla de transición y los rivales. 12 generaciones, `@ref` = la referencia de la especie.

### 3.6 Clanes rivales
Los rivales son otras civilizaciones: **reutilizan** los edificios y unidades de su clase. No se pintan versiones especiales; el color del clan sale de un anillo y del estandarte teñido por código.

## 4. Terreno, recursos, fauna e íconos

### 4.1 Terreno por mundo

Cada mundo tiene: 3 baldosas de suelo (variación para no repetir), 1 baldosa de borde, 1 de camino/corriente, 4 objetos de decorado (una hoja), 3 hitos de territorio (uno por Edad) y 1 puesto avanzado para expediciones (una hoja), más una niebla de guerra común. Baldosas: **256×256 = 4×4 celdas**; ids `mundo.suelo.1..3`, `mundo.borde`, `mundo.camino`, `mundo.decor.1..4`, `mundo.hito.1..3`, `mundo.puesto` con mundo ∈ {`ter`, `ins`, `acu`, `ave`, `anf`}.
- **Continuidad** (`tile`): no se recortan. El procesado las hace repetibles mezclando con un desplazamiento de medio tile y una máscara coseno; si aun así se nota la costura, se descarta.
- El **borde** se pinta con el borde hacia la derecha; el código lo rota para los otros lados.

**`ter` · Pradera y bosque**

| id | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- |
| `ter.suelo.1` | pradera | short green grass with tiny clover |
| `ter.suelo.2` | pradera florida | green grass with small wildflowers and pebbles |
| `ter.suelo.3` | suelo de bosque | dark forest floor with leaf litter and moss |
| `ter.borde` | borde | a lake shoreline strip: grass meeting a sand rim and shallow water along one edge |
| `ter.camino` | camino | a dirt footpath crossing grass |
| `ter.decor.1` | decorado | a round green bush |
| `ter.decor.2` | decorado | a mossy boulder |
| `ter.decor.3` | decorado | a clump of wildflowers |
| `ter.decor.4` | decorado | a fallen log |
| `ter.hito.1` | hito Edad I | a stone cairn with a feather |
| `ter.hito.2` | hito Edad II | a carved wooden boundary post |
| `ter.hito.3` | hito Edad III | a tall standing stone with a hide banner |
| `ter.puesto` | puesto avanzado | a forward camp with a small tent and fire |

**`ins` · Tierra, raíces y túneles**

| id | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- |
| `ins.suelo.1` | tierra apisonada | packed dark brown soil with small pebbles |
| `ins.suelo.2` | tierra con raíces | soil crossed by thin pale roots |
| `ins.suelo.3` | piso de túnel | smooth tunnel floor of pressed clay with a faint waxy sheen |
| `ins.borde` | borde | an earth cross-section edge: a soil cliff face with roots and layers along one edge |
| `ins.camino` | rastro | a soil trail marked by faint glowing dots of pheromone |
| `ins.decor.1` | decorado | a cluster of pale mushrooms |
| `ins.decor.2` | decorado | a small pebble pile |
| `ins.decor.3` | decorado | a loop of exposed root |
| `ins.decor.4` | decorado | a torn leaf fragment |
| `ins.hito.1` | hito Edad I | a wax-capped marker pillar |
| `ins.hito.2` | hito Edad II | a pulp-and-wax boundary post |
| `ins.hito.3` | hito Edad III | a tall glowing resin spire |
| `ins.puesto` | puesto avanzado | a forward burrow mound outpost |

**`acu` · Lecho marino, arrecife y fumarolas**

| id | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- |
| `acu.suelo.1` | arena | seabed sand with gentle ripples |
| `acu.suelo.2` | lecho rocoso | rocky seabed with patches of short algae |
| `acu.suelo.3` | fondo de arrecife | reef floor with coral rubble and warm glow from below |
| `acu.borde` | borde | a deep drop-off edge: seabed fading into dark abyssal blue along one edge |
| `acu.camino` | corriente | a lighter sand lane with flowing current streaks |
| `acu.decor.1` | decorado | a small sea anemone |
| `acu.decor.2` | decorado | a spiral shell |
| `acu.decor.3` | decorado | a rounded rock with algae |
| `acu.decor.4` | decorado | a short kelp tuft |
| `acu.hito.1` | hito Edad I | a coral stake with a glowing lantern |
| `acu.hito.2` | hito Edad II | a nacre boundary post with a lantern |
| `acu.hito.3` | hito Edad III | a tall coral pillar with a bright bioluminescent bulb |
| `acu.puesto` | puesto avanzado | a forward outpost shell hut |

**`ave` · Acantilado y copas**

| id | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- |
| `ave.suelo.1` | meseta | cliff-top plateau of grey rock with grass tufts |
| `ave.suelo.2` | copas | a treetop canopy surface of leafy crowns |
| `ave.suelo.3` | plataforma | a woven branch platform of tightly laced twigs |
| `ave.borde` | borde | a cliff edge with open sky and soft clouds along one edge |
| `ave.camino` | pasarela | a rope-and-branch walkway path |
| `ave.decor.1` | decorado | a loose feather |
| `ave.decor.2` | decorado | a grey boulder |
| `ave.decor.3` | decorado | a tuft of flowers |
| `ave.decor.4` | decorado | a small twisted tree |
| `ave.hito.1` | hito Edad I | a feather-topped pole |
| `ave.hito.2` | hito Edad II | a woven boundary post with feathers |
| `ave.hito.3` | hito Edad III | a tall carved pole with a banner |
| `ave.puesto` | puesto avanzado | a forward perch outpost |

**`anf` · Costa anfibia**

| id | Qué se ve | Núcleo del prompt (EN) |
| --- | --- | --- |
| `anf.suelo.1` | arena de orilla | dry beach sand with small shells |
| `anf.suelo.2` | arena mojada | wet sand with a thin film of shallow water |
| `anf.suelo.3` | agua baja | shallow clear water over pebbles |
| `anf.borde` | orilla | a shoreline: surf foam where sand meets water along one edge |
| `anf.camino` | pasarela | a wooden plank walkway |
| `anf.decor.1` | decorado | a piece of driftwood |
| `anf.decor.2` | decorado | a clump of reeds |
| `anf.decor.3` | decorado | a few scattered shells |
| `anf.decor.4` | decorado | a small tide pool |

`gen.niebla`: una baldosa 256×256 de bruma gris-azulada continua; el código la convierte en transparencia con la luminancia (`proc = luma`).

### 4.2 Nodos de recursos (3 estados)

Cada recurso del mapa (los 3 que se extraen; el «saber» también tiene un nodo especial, ruina o reliquia) se pide **como tira de 3 paneles en una sola generación** (así los tres estados comparten forma, posición y escala): **lleno**, **a medias**, **agotado**. Exportan a 128×128 (2×2 celdas). Ids `civ.nodo.casillero.1|2|3`.

| id | Recurso (casillero) | Qué se ve lleno (EN) | Qué se ve (ES) |
| --- | --- | --- | --- |
| `ter.nodo.comida.1/2/3` | Carne y bayas (`comida`) | a thick wild berry thicket heavy with red berries | matorral de bayas silvestres cargado de frutos rojos |
| `ter.nodo.mat1.1/2/3` | Madera (`mat1`) | a small grove of tall straight trees | arboleda de árboles altos y rectos |
| `ter.nodo.mat2.1/2/3` | Piedra (`mat2`) | a cluster of grey boulders and a rocky outcrop | rocas grises y un afloramiento |
| `ter.nodo.saber.1/2/3` | Saber (`saber`) | an ancient standing stone carved with spirals and cave-painting marks | piedra antigua erguida con espirales y marcas de pinturas rupestres |
| `ins.nodo.comida.1/2/3` | Jalea (`comida`) | a giant nectar flower dripping golden jelly droplets | flor gigante de néctar que gotea jalea dorada |
| `ins.nodo.mat1.1/2/3` | Fibra masticada (`mat1`) | a heap of fallen dry plant stems and leaves | montón de tallos secos y hojas caídas |
| `ins.nodo.mat2.1/2/3` | Cera y resina (`mat2`) | a tree trunk base oozing amber resin and wax lumps | base de un tronco que chorrea resina ámbar y grumos de cera |
| `ins.nodo.saber.1/2/3` | Memoria de la colmena (`saber`) | a ring of softly glowing blue mushrooms around a crystallised scent stone | círculo de hongos azules luminosos alrededor de una piedra de aroma cristalizada |
| `acu.nodo.comida.1/2/3` | Algas y peces (`comida`) | a patch of green algae with a small school of fish above it | parche de algas verdes con un cardumen chico encima |
| `acu.nodo.mat1.1/2/3` | Coral (`mat1`) | a branching coral head in orange and pink | cabeza de coral ramificado naranja y rosa |
| `acu.nodo.mat2.1/2/3` | Nácar (`mat2`) | a giant open clam holding a large pearl on a rock | almeja gigante abierta con una perla grande sobre una roca |
| `acu.nodo.saber.1/2/3` | Cantos (`saber`) | a ring of resonant spiral conch shells emitting faint sound ripples | círculo de caracoles espirales resonantes con ondas de sonido tenues |
| `ave.nodo.comida.1/2/3` | Semillas e insectos (`comida`) | a patch of tall seed-heavy grass and sunflowers with a few insects | parche de pasto alto con semillas y girasoles, unos insectos |
| `ave.nodo.mat1.1/2/3` | Ramas (`mat1`) | a fallen tree with many loose branches and twigs | árbol caído con muchas ramas sueltas |
| `ave.nodo.mat2.1/2/3` | Barro (`mat2`) | a riverbank of soft grey-brown clay with wet mud lumps | barranca de arcilla gris-marrón blanda con terrones húmedos |
| `ave.nodo.saber.1/2/3` | Rutas (`saber`) | a flat boulder scratched with star charts and feather marks | roca plana rayada con cartas de estrellas y marcas de plumas |

Estados: 1 = lleno y abundante · 2 = a medias, con huecos visibles · 3 = agotado, solo un resto. Las unidades que cosechan no se dibujan en el nodo (las pone el código).

### 4.3 Amenazas de fauna por mundo

Tres por mundo, con hoja de caminar·atacar·morir (96×96 por cuadro, hoja 384×288, id `civ.fau.<clave>`). Son salvajes: no llevan accesorios; su silueta se distingue de las especies del jugador por tamaño, ojos y postura agresiva.

| id | Amenaza | Qué se ve (EN) |
| --- | --- | --- |
| `ter.fau.lobo` | Lobo gris | a menacing grey wolf with red eyes, lean and fierce |
| `ter.fau.oso` | Oso pardo | a huge brown bear, heavy and powerful |
| `ter.fau.jabali` | Jabalí | a bristly wild boar with curved tusks, charging |
| `ins.fau.arana` | Araña lobo | a hairy wolf spider with eight legs and glinting eyes |
| `ins.fau.mantis` | Mantis religiosa | a green praying mantis with raptorial forelegs raised |
| `ins.fau.hormiga_roja` | Hormiga roja invasora | a red invader ant with sharp mandibles, aggressive |
| `acu.fau.tiburon` | Tiburón | a grey reef shark, sleek and toothy |
| `acu.fau.morena` | Morena | a spotted moray eel lunging from a crevice |
| `acu.fau.medusa` | Medusa gigante | a giant translucent jellyfish with long stinging tentacles |
| `ave.fau.gato_montes` | Gato montés | a tawny wildcat, stalking with a flicking tail |
| `ave.fau.serpiente` | Serpiente arborícola | a green tree snake coiled to strike |
| `ave.fau.buho` | Búho nocturno | a large dark horned owl with glowing amber eyes |

La ciudad anfibia usa las amenazas de `ter` en tierra y de `acu` en el agua.

### 4.4 Proyectiles, estandarte y hitos

| id | Qué es | Detalle |
| --- | --- | --- |
| `ter.proy.1..4` | 4 proyectiles (hoja 2×2; 32×32 c/u) | a round sling stone with a motion streak; a bone-tipped arrow; a thrown stone-tipped spear; a burning torch arrow |
| `ter.estandarte` | estandarte 64×128 | a tall hide banner on a wooden pole with simple painted claw marks (no text) |
| `ins.proy.1..4` | 4 proyectiles (hoja 2×2; 32×32 c/u) | an amber stinger dart; a glob of green acid spit; a small swarm puff; a resin blob |
| `ins.estandarte` | estandarte 64×128 | a hanging wax-and-pulp banner with a hexagon motif on a stem pole (no text) |
| `acu.proy.1..4` | 4 proyectiles (hoja 2×2; 32×32 c/u) | a spiny urchin dart; a cloud of ink; a glowing pearl bolt; a bubble burst |
| `acu.estandarte` | estandarte 64×128 | a flowing kelp banner on a coral pole with a spiral shell motif (no text) |
| `ave.proy.1..4` | 4 proyectiles (hoja 2×2; 32×32 c/u) | a feather dart; a small clay pebble; a falling talon-strike streak; a seed-pod shot |
| `ave.estandarte` | estandarte 64×128 | a streamer of coloured feathers on a perch pole with a V motif (no text) |

### 4.5 Íconos de recursos (4 por civilización = 16)

Hoja 2×2 por civilización, 64×64 por ícono, ids `civ.ico.comida`, `civ.ico.mat1`, `civ.ico.mat2`, `civ.ico.saber`. Son versiones simplificadas del nodo (mismo objeto, menos detalle y contorno más grueso) para que se lean a 24 px en el HUD.

| civ | comida | mat1 | mat2 | saber |
| --- | --- | --- | --- | --- |
| `ter` | Carne y bayas | Madera | Piedra | Saber |
| `ins` | Jalea | Fibra masticada | Cera y resina | Memoria de la colmena |
| `acu` | Algas y peces | Coral | Nácar | Cantos |
| `ave` | Semillas e insectos | Ramas | Barro | Rutas |

### 4.6 Íconos de tecnologías (48)

Hojas de 4 íconos (2×2), 64×64 por ícono. Ids `civ.tec.<clave>`. Cada hoja agrupa una fila de tecnologías de la misma Edad (3 hojas por civilización, `civ.tec.hoja1..3`). El marco redondo lo pone el código; el ícono es solo el objeto.

**Terrestres**

| id | Tecnología | Edad | Ícono (EN) |
| --- | --- | --- | --- |
| `ter.tec.fuego` | Fuego | I | a burning campfire flame on logs |
| `ter.tec.piedra` | Herramientas de piedra | I | a knapped stone hand axe |
| `ter.tec.recoleccion` | Recolección organizada | I | a woven basket full of berries and roots |
| `ter.tec.pieles` | Pieles | I | a tanned animal hide cloak |
| `ter.tec.agricultura` | Agricultura | II | a sprouting grain plant beside a digging stick |
| `ter.tec.domesticacion` | Domesticación | II | a small tame animal on a rope |
| `ter.tec.alfareria` | Alfarería | II | a clay pot with painted bands |
| `ter.tec.arcos` | Arcos | II | a wooden bow with an arrow |
| `ter.tec.metal` | Metal blando | III | a soft copper blade |
| `ter.tec.rueda` | Rueda | III | a wooden spoked wheel |
| `ter.tec.calendario` | Calendario | III | a carved stone disk with sun and moon marks |
| `ter.tec.escritura` | Escritura de marcas | III | a clay tablet with incised marks |

**Insectos**

| id | Tecnología | Edad | Ícono (EN) |
| --- | --- | --- | --- |
| `ins.tec.castas` | Castas | I | three insect silhouettes of different sizes: worker, soldier and queen |
| `ins.tec.feromonas` | Rastro de feromonas | I | a trail of glowing scent dots |
| `ins.tec.hongos` | Cultivo de hongos | I | a mushroom growing on leaf fragments |
| `ins.tec.hexagonal` | Celdas hexagonales | I | a single hexagonal wax cell |
| `ins.tec.pulgones` | Domesticación de pulgones | II | an aphid with a honeydew drop |
| `ins.tec.formico` | Ácido fórmico | II | a droplet spray of acid |
| `ins.tec.ventilacion` | Ventilación | II | a chimney with airflow arrows |
| `ins.tec.puentes` | Puentes vivientes | II | a bridge made of linked insect bodies |
| `ins.tec.enjambre` | Enjambre coordinado | III | a swarm of tiny insects in formation |
| `ins.tec.metamorfosis` | Metamorfosis guiada | III | a cocoon splitting to reveal a winged insect |
| `ins.tec.antibioticos` | Antibióticos naturales | III | a leaf with green mold and a small shield |
| `ins.tec.colmenaciudad` | Colmena-ciudad | III | a tiny city tower of hexagonal cells |

**Acuáticos**

| id | Tecnología | Edad | Ícono (EN) |
| --- | --- | --- | --- |
| `acu.tec.conchas` | Herramientas de concha | I | a sharp shell blade tool |
| `acu.tec.cardumen` | Pesca en cardumen | I | a school of fish swimming in a circle |
| `acu.tec.algas` | Cultivo de algas | I | a bundle of kelp fronds |
| `acu.tec.biolum` | Bioluminiscencia | I | a glowing jellyfish lantern |
| `acu.tec.acuicultura` | Acuicultura | II | a ring fish pen with fish |
| `acu.tec.ecolocacion` | Ecolocalización | II | concentric sound waves from a dolphin silhouette |
| `acu.tec.nacar` | Nácar trabajado | II | a polished nacre shell with a pearl |
| `acu.tec.tinta` | Tinta | II | an ink cloud with an octopus tentacle |
| `acu.tec.corrientes` | Corrientes | III | a spiral ribbon of current |
| `acu.tec.presion` | Presión profunda | III | an armored deep-sea shell with pressure arrows |
| `acu.tec.ballenas` | Simbiosis con ballenas | III | a whale silhouette with a small fish beside it |
| `acu.tec.escritura` | Escritura en nácar | III | a nacre tablet etched with wavy marks |

**Aves**

| id | Tecnología | Edad | Ícono (EN) |
| --- | --- | --- | --- |
| `ave.tec.nidos` | Nidos tejidos | I | a woven nest |
| `ave.tec.vuelov` | Vuelo en V | I | a V formation of birds |
| `ave.tec.semillas` | Recolección de semillas | I | a bundle of seeds in a beak pouch |
| `ave.tec.pico` | Herramientas con pico | I | a bird beak holding a twig tool |
| `ave.tec.alfareria` | Alfarería de barro | II | a clay oven-bird nest pot |
| `ave.tec.vigias` | Vigías | II | a bird eye on a perch |
| `ave.tec.mensajeros` | Mensajeros | II | a bird carrying a rolled leaf message |
| `ave.tec.picada` | Picada | II | a diving falcon with motion lines |
| `ave.tec.rutas` | Rutas migratorias | III | a curving dotted route across clouds |
| `ave.tec.mapas` | Mapas del cielo | III | a star chart with constellations |
| `ave.tec.comercio` | Comercio lejano | III | two birds exchanging a woven pouch for a gem |
| `ave.tec.plumas` | Plumas ceremoniales | III | a ceremonial feather crown |

### 4.7 Íconos de interfaz

**Por civilización** (`civ.ico.edad1`, `edad2`, `edad3`, `maravilla`, 64×64): medallón de bronce con el motivo de la civilización en cada Edad: `ter` = a small campfire with sticks / a cluster of three huts / a stone hall / a standing-stone circle; `ins` = a single hexagonal wax cell / a honeycomb wall / a tall hive spire / a giant queen silhouette; `acu` = a small closed clam shell / a swaying sea anemone / a nacre palace dome / a current spiral arch; `ave` = a small woven nest / a big tree with nests / a cliff city with towers / a V of birds through an arch. Los nombres genéricos de Edad (Campamento, Aldea, Ciudad) los pone el texto del juego.

**Neutros** (comunes a todas las civilizaciones; `ui.<clave>`, 64×64, 3 hojas):

| id | Qué es | Ícono (EN) |
| --- | --- | --- |
| `ui.construir` | Construir | a wooden hammer |
| `ui.mejorar` | Mejorar | a bold upward arrow with small sparkles |
| `ui.mover` | Mover | a four-direction arrow cross |
| `ui.demoler` | Demoler | a pickaxe breaking a block |
| `ui.alerta` | Alerta | a bold exclamation-mark warning triangle |
| `ui.vender` | Vender (devuelve 50 %) | a coin returning in a curved arrow |
| `ui.entrenar` | Entrenar | a warrior helmet |
| `ui.expedicion` | Expedición | a trail of footprints leading to a flag |
| `ui.defender` | Defender | a heater shield |
| `ui.comerciar` | Comerciar | two curved exchange arrows with a small sack |
| `ui.cancelar` | Cancelar | a bold X mark |
| `ui.aceptar` | Aceptar | a bold check mark |

## 5. Transición Era 2 → Era 3 y portadas

### 5.1 Pantalla «tu especie se vuelve tribu»
Dos planos de fondo por civilización (`civ.tran.1`, `civ.tran.2`, 1920×1080) **sin personajes**: el código dibuja encima a la especie del jugador con `Era2Arte.drawAnimal` (o su retrato `civ.ret.especie`) y hace el fundido entre los dos planos con el texto («tu especie se vuelve tribu»). Plano 1 = el lugar salvaje al atardecer con una chispa de fuego; plano 2 = el mismo lugar al amanecer con el primer campamento. El plano 2 se genera con `@prev` = el plano 1 aprobado para que sea el **mismo lugar**. Variante anfibia: `anf.tran.2` (el mismo lugar de `acu.tran.1`, pero en la costa con el primer muelle).

Composición: el sujeto en el **área segura central** (1080×1080 centrados), porque en el celular el cuadro 16:9 se recorta a la altura.

| id | Civilización | Plano |
| --- | --- | --- |
| `ter.tran.1` | Terrestres | a wild meadow clearing at dusk, a lone spark of fire on the ground and animal footprints, tall grass, a forest edge and a lake, no characters |
| `ter.tran.2` | Terrestres | the same clearing at dawn with the first huts, a campfire and a carved totem, warm morning light, no characters |
| `ins.tran.1` | Insectos | a dark soil underground cavern with roots hanging and a lone glowing amber larva-cell, scattered pebbles, no characters |
| `ins.tran.2` | Insectos | the same cavern with a first wax-and-pulp mound, hexagonal cells and glowing amber chambers, no characters |
| `acu.tran.1` | Acuáticos | a calm sandy seabed in deep blue water with a faint glow from a distant vent, floating particles, no characters |
| `acu.tran.2` | Acuáticos | the same seabed with a first giant clam council hall, coral pods and glowing pearls, no characters |
| `ave.tran.1` | Aves | a windy cliff-top with a lone tree and scattered twigs at sunset, no characters |
| `ave.tran.2` | Aves | the same cliff-top with the first woven nests, a perch pole and a cliff-edge terrace, no characters |
| `anf.tran.2` | Acuáticos anfibios | the same place on a shoreline with a first jetty and a coral-and-timber hut |

### 5.2 Portadas
Una por civilización (`civ.portada`, 1920×1080, para elegir/arrancar la era) y una general (`gen.portada`) con las cuatro. Misma paleta que su transición (`@prev` = `civ.tran.2`). Sin texto: el título y los botones los pone el HTML.

| id | Qué muestra |
| --- | --- |
| `ter.portada` | a wide scenic view of a burrow village growing into a stone-hall town on a green meadow with a lake and forest, warm sunrise |
| `ins.portada` | a wide cutaway view of an insect hive-city: a termite-mound spire above ground and glowing tunnels and honeycomb chambers below |
| `acu.portada` | a wide underwater view of a coral-and-nacre reef city with glowing vents, kelp forests and swaying currents |
| `ave.portada` | a wide view of a cliff-face bird city with woven nests, clay towers and bridges against a bright sky and clouds |
| `gen.portada` | panorama de las cuatro civilizaciones bajo un mismo amanecer |

Para las 14 pantallas conviene `gen4_image` (no turbo) si hay presupuesto: son lo que se ve primero y lo que el dueño más mira. El repo no fija su precio; consultarlo en el panel de Runway. Con turbo, 28 créditos.

## 6. Plan de producción

### 6.1 Orden recomendado (para que el juego se vea completo cuanto antes)

El criterio es **horizontal**: primero las cuatro civilizaciones con lo mínimo para jugar la Edad I, después la Edad II, después la III, y al final lo accesorio. Así nunca hay una civilización «sin arte» mientras otra está terminada, y el juego puede probarse con marcadores donde falta algo (el código ya tiene fallback procedural).

| Fase | Qué cubre | Generaciones | Créditos base | Con descartes (×1,35) |
| --- | --- | --- | --- | --- |
| **F1** | Edad I jugable (4 civilizaciones): nivel 1 de corazón/vivienda/almacén/granja/ext1/saber, obras, obreros y exploradores de las 12 especies, nodos de comida y material 1, suelo, borde y camino, íconos de recursos y de Edad, íconos de interfaz básicos | 141 | 282 | ≈ 390 |
| **F2** | Edad II: nivel 2 de todo, nivel 1 de cría/ext2/muro/torre/cuartel, edificio único, guerreros y tiradores, fauna, daño, nodos de material 2 y saber, hitos y puestos, proyectiles, estandarte, niebla | 212 | 424 | ≈ 580 |
| **F3** | Edad III: nivel 3 de todo, las 4 Maravillas, los 4 campeones | 64 | 128 | ≈ 180 |
| **F4** | Pulido: retratos, decorados, íconos de tecnologías (48), transiciones, portadas, muelle anfibio | 44 | 88 | ≈ 120 |
| **Total** | | **461** | **922** | **≈ 1250** |

Dentro de cada fase, el orden es por dependencia de referencias:
1. **Fase 0 «anclas» (12 generaciones, parte de F1)**: `ter.corazon.1` → `ins.corazon.1`, `acu.corazon.1`, `ave.corazon.1` (las tres con `@style` = `ter.corazon.1`); un `obrero` caminar por civilización (`ter.uni.cazador.obrero-caminar`, `ins.uni.colmena.obrero-caminar`, `acu.uni.arrecife.obrero-caminar`, `ave.uni.rapaz.obrero-caminar`); un `suelo.1` por mundo. **El dueño mira estas 12 y aprueba el estilo antes de seguir**: si algo está mal, se corrige el prompt de familia (ENV o estilo de civilización) y se repite solo esto; no se gastó nada del resto.
2. Después, por civilización (en el orden Terrestres, Insectos, Acuáticos, Aves; las Terrestres primero porque son la civilización por defecto y las del linaje común), por casillero, **nivel 1 → 2 → 3** (cada nivel necesita aprobado el anterior).
3. Unidades: primero la fila `caminar` de cada rol, y después `trabajar`/`atacar`/`morir` con `@prev`.
4. Las tiras de obra y de nodos se pueden pedir en cualquier momento de su fase (solo dependen del ancla).

### 6.2 Cantidades

| Categoría | Generaciones | Archivos finales (ids) |
| --- | --- | --- |
| edificio | 141 | 141 |
| obra | 12 | 36 |
| daño | 12 | 12 |
| estandarte | 4 | 4 |
| proyectil | 4 | 16 |
| hito | 4 | 16 |
| terreno | 26 | 26 |
| decorado | 5 | 20 |
| nodo | 16 | 48 |
| unidad | 136 | 48 |
| campeón | 16 | 4 |
| retrato | 12 | 12 |
| fauna | 36 | 12 |
| ícono recurso | 4 | 16 |
| ícono edad | 4 | 16 |
| ícono tecnología | 12 | 48 |
| ícono interfaz | 3 | 12 |
| transición | 9 | 9 |
| portada | 5 | 5 |
| **Total** | **461** | **501** |

Notas: «edificio» son 140 + el muelle anfibio; las hojas de unidad, campeón y fauna se arman con varias generaciones (una por fila de animación: 136 + 16 + 36) pero son 1 archivo cada una (48 + 4 + 12); «terreno» incluye 25 baldosas de suelo/borde/camino (5 mundos × 5) y la niebla.

### 6.3 Créditos
- Base: 461 generaciones × 2 créditos (`gen4_image_turbo`, según `art/runway/LEEME.md`) = **922 créditos**.
- Con descartes: en la Era 1, `colo1` tuvo que reformularse y `para3`/`foto3` pidieron limpieza; con arte más complejo y fondo magenta, asumir **≈ 35 % de generaciones repetidas** (una de cada tres) → **≈ 1250 créditos**. Presupuesto recomendado: **1400 créditos** (con 10 % de reserva).
- A precio público de ≈ 0,01 USD por crédito (verificar en el momento): del orden de 9 a 14 USD en total. Dato a confirmar; no está en el repo.
- Reducción si hace falta recortar (en este orden): íconos de tecnología (12 gen), decorados (5), retratos (12), `anf.*`, fauna de la 3.ª amenaza (12), transiciones 1 solo plano (4).

### 6.4 Lotes
- **Lote = 12 generaciones (24 créditos)**. Se revisa el lote entero con el checklist antes de lanzar el siguiente. Primer lote: Fase 0.
- Generar de a **3 en paralelo** como máximo (el script actual es secuencial con espera de 3 s; el límite de concurrencia depende del plan: respetar el que indique Runway) con 3 reintentos automáticos por error de API, como `runway_gen.py`.
- Se guarda el original de 1024 (`_raw/`) de **todo** lo aprobado: es la referencia `@prev`/`@anchor` de las siguientes, y permite reprocesar sin gastar.
- Si el moderador de Runway rechaza un prompt (como pasó con «células pegadas» en `colo1`): reformular sin los términos conflictivos («battle», «gore», «kill»…) y dejar anotado en el log.
- Registro por imagen en `art/runway/era3/_log.jsonl`: `gid`, `promptText`, referencias, `task id`, `seed` (se fija una semilla por `gid` para reproducir), fecha, aprobado/descartado y motivo. Sirve para `docs/LICENCIAS-ARTE.md` (modelo, fecha, prompts; salidas de Runway generadas con la cuenta del estudio).

### 6.5 Procesado (`tools/runway_process_era3.py`, a escribir por el agente de código)
Generaliza `tools/runway_process.py` (que hoy asume fondo blanco y 256×256 cuadrado). Entrada: `_raw/<gid>.png` + el JSON de este documento. Salida: `art/runway/era3/<civ>/<id>.png` y `art/runway/era3/manifest.json`.

| `proc` | Qué hace |
| --- | --- |
| `sprite` | quita magenta (flood-fill desde el borde + despill), apertura, descarta motas, blur 1 px; recorta, **escala al ancho del lienzo −32 px** (o al alto si no entra), ancla abajo al centro con 16 px de margen. Edificios, obras (cortadas por tercios), daño, nodos, estandarte, retratos |
| `tira3` | corta la imagen 1680×720 en 3 paneles de 560×720, cada uno como `sprite` pero con **un único factor de escala** para los tres (si no, el nodo «lleno» y el «agotado» cambiarían de tamaño) |
| `hoja2x2` | corta en 4 cuadrantes de 512×512; cada uno se recorta; un único factor de escala para los 4 (unión de cajas); pies en una línea común; centra; cuadro de 64 (96 en campeón/fauna). Unidades: une las hojas de cada fila en un PNG de 4 columnas. Íconos: cada cuadrante a 64×64 con 8 % de margen |
| `tile` | sin recorte de fondo; recorte central cuadrado; mezcla con desplazamiento de medio tile y máscara coseno para que sea repetible; 256×256 |
| `luma` | niebla: la luminancia pasa a alfa; 256×256 repetible |
| `escena` | solo reescala a 1920×1080 (PNG o WebP calidad 90; menos de 2 MB cada una) |

El procesado debe fallar en voz alta (código de salida ≠ 0 y lista de ids) si encuentra magenta restante > 0,5 % del contenido, un componente conexo grande separado del principal (señal de texto o de un segundo objeto) o una caja de contenido que toca el borde de la imagen (objeto cortado).

### 6.6 Criterio de aceptación por imagen (checklist del Art Gate)

Mismas letras que `docs/ARTGATE-ERA2.md` (A–E) y tres más específicas de esta tanda. Una imagen entra al juego solo si cumple todo; si falla una, se repite (no se retoca a mano).

| Código | Criterio | Cómo se mira |
| --- | --- | --- |
| A | **Silueta distinta**: se distingue de los otros casilleros, de los otros niveles del mismo y de las otras civilizaciones | reducida a 40 px, en gris |
| B | **Legible a tamaño de juego**: a 1× (huella 40 px; unidad ≈ 20 px; ícono 24 px) se entiende qué es | captura a 1× y a 2,8× |
| C | **Paleta de la civilización** y sin magenta ni verdes/rojos fuera de la paleta | cuentagotas sobre §2 |
| D | **Expresividad y estilo**: contorno #2b2233 visible, gouache, brillo arriba a la izquierda, luz desde la izquierda, cámara 3/4 | contra `ter.corazon.1` |
| E | **Evolución**: el nivel N es reconocible como el nivel N−1 (misma huella, misma paleta, más material/detalle) | las 3 reducidas lado a lado |
| F | **Fondo limpio**: sin halo magenta, sin motas, borde suave, nada cortado | sobre fondo gris 50 % y sobre verde pasto |
| G | **Cero texto/logos/IP de terceros** (también en tablillas, banderas, cartas del cielo) | revisión a 100 % |
| H | **Huella y escala**: la base ocupa las celdas indicadas (±10 %); unidad ocupa ≈ 80 % del cuadro; cuadros de animación sin saltos de escala | superponer la grilla de 64 px |
| I | **Misma especie** (unidades): conserva la silueta de la referencia de la Era 2 y su variante | al lado de `_ref/<especie>.png` |
| J | **Registro**: anotado en `_log.jsonl` y, al cerrar la tanda, en `docs/LICENCIAS-ARTE.md` | — |

### 6.7 Nombres y carga por id
- Originales: `art/runway/era3/_raw/<gid>.png` (1024×1024, 1680×720 o 1920×1080). Referencias de especie: `art/runway/era3/_ref/<clase>_<especie>.png`.
- Finales: `art/runway/era3/<civ>/<id>.png`, donde `<civ>` es el primer segmento del id (`ter`, `ins`, `acu`, `ave`, `anf`, `gen`, `ui`). El id es el nombre del archivo, **con puntos** (`ter.corazon.1.png`, `ins.uni.colmena.obrero.png`).
- Manifiesto `art/runway/era3/manifest.json` (lo escribe el procesado): `{ id: { src, w, h, ax, ay, cells?, frame?, cols?, rows? } }`. El agente de código lo usa para su tabla `ASSETS` (id → sprite); rutas relativas desde `eras/` como en la Era 1 (`../art/runway/era3/`), con **fallback al marcador procedural** si el PNG no carga.
- Para animación el manifiesto trae `frame`, `cols` y `rows` (nombres de filas en orden): el código calcula el cuadro por `fila * cols + cuadro`.
- Ninguna imagen se referencia por nombre de archivo en el código: siempre por id.

## 7. Índice de ids (para la tabla `ASSETS`)

501 ids. Columnas: id · categoría · tamaño de exportación (ancho×alto) · celdas o cuadros · generación (`gid`) · fase. Las hojas de unidad, campeón y fauna salen de varias generaciones (la primera se lista; las demás son las demás filas, ver §3.4).

| id | categoría | tamaño | celdas/cuadro | gid | fase |
| --- | --- | --- | --- | --- | --- |
| `ter.corazon.1` | edificio | 224×288 | 3×3 | `ter.corazon.1` | F1 |
| `ter.corazon.2` | edificio | 224×288 | 3×3 | `ter.corazon.2` | F2 |
| `ter.corazon.3` | edificio | 224×288 | 3×3 | `ter.corazon.3` | F3 |
| `ter.vivienda.1` | edificio | 160×208 | 2×2 | `ter.vivienda.1` | F1 |
| `ter.vivienda.2` | edificio | 160×208 | 2×2 | `ter.vivienda.2` | F2 |
| `ter.vivienda.3` | edificio | 160×208 | 2×2 | `ter.vivienda.3` | F3 |
| `ter.almacen.1` | edificio | 160×208 | 2×2 | `ter.almacen.1` | F1 |
| `ter.almacen.2` | edificio | 160×208 | 2×2 | `ter.almacen.2` | F2 |
| `ter.almacen.3` | edificio | 160×208 | 2×2 | `ter.almacen.3` | F3 |
| `ter.granja.1` | edificio | 224×288 | 3×3 | `ter.granja.1` | F1 |
| `ter.granja.2` | edificio | 224×288 | 3×3 | `ter.granja.2` | F2 |
| `ter.granja.3` | edificio | 224×288 | 3×3 | `ter.granja.3` | F3 |
| `ter.cria.1` | edificio | 224×288 | 3×3 | `ter.cria.1` | F2 |
| `ter.cria.2` | edificio | 224×288 | 3×3 | `ter.cria.2` | F2 |
| `ter.cria.3` | edificio | 224×288 | 3×3 | `ter.cria.3` | F3 |
| `ter.ext1.1` | edificio | 160×208 | 2×2 | `ter.ext1.1` | F1 |
| `ter.ext1.2` | edificio | 160×208 | 2×2 | `ter.ext1.2` | F2 |
| `ter.ext1.3` | edificio | 160×208 | 2×2 | `ter.ext1.3` | F3 |
| `ter.ext2.1` | edificio | 160×208 | 2×2 | `ter.ext2.1` | F2 |
| `ter.ext2.2` | edificio | 160×208 | 2×2 | `ter.ext2.2` | F2 |
| `ter.ext2.3` | edificio | 160×208 | 2×2 | `ter.ext2.3` | F3 |
| `ter.saber.1` | edificio | 160×208 | 2×2 | `ter.saber.1` | F1 |
| `ter.saber.2` | edificio | 160×208 | 2×2 | `ter.saber.2` | F2 |
| `ter.saber.3` | edificio | 160×208 | 2×2 | `ter.saber.3` | F3 |
| `ter.muro.1` | edificio | 96×128 | 1×1 | `ter.muro.1` | F2 |
| `ter.muro.2` | edificio | 96×128 | 1×1 | `ter.muro.2` | F2 |
| `ter.muro.3` | edificio | 96×128 | 1×1 | `ter.muro.3` | F3 |
| `ter.torre.1` | edificio | 160×208 | 2×2 | `ter.torre.1` | F2 |
| `ter.torre.2` | edificio | 160×208 | 2×2 | `ter.torre.2` | F2 |
| `ter.torre.3` | edificio | 160×208 | 2×2 | `ter.torre.3` | F3 |
| `ter.cuartel.1` | edificio | 224×288 | 3×3 | `ter.cuartel.1` | F2 |
| `ter.cuartel.2` | edificio | 224×288 | 3×3 | `ter.cuartel.2` | F2 |
| `ter.cuartel.3` | edificio | 224×288 | 3×3 | `ter.cuartel.3` | F3 |
| `ter.unico` | edificio | 224×288 | 3×3 | `ter.unico` | F2 |
| `ter.maravilla` | edificio | 224×288 | 3×3 | `ter.maravilla` | F3 |
| `ins.corazon.1` | edificio | 224×288 | 3×3 | `ins.corazon.1` | F1 |
| `ins.corazon.2` | edificio | 224×288 | 3×3 | `ins.corazon.2` | F2 |
| `ins.corazon.3` | edificio | 224×288 | 3×3 | `ins.corazon.3` | F3 |
| `ins.vivienda.1` | edificio | 160×208 | 2×2 | `ins.vivienda.1` | F1 |
| `ins.vivienda.2` | edificio | 160×208 | 2×2 | `ins.vivienda.2` | F2 |
| `ins.vivienda.3` | edificio | 160×208 | 2×2 | `ins.vivienda.3` | F3 |
| `ins.almacen.1` | edificio | 160×208 | 2×2 | `ins.almacen.1` | F1 |
| `ins.almacen.2` | edificio | 160×208 | 2×2 | `ins.almacen.2` | F2 |
| `ins.almacen.3` | edificio | 160×208 | 2×2 | `ins.almacen.3` | F3 |
| `ins.granja.1` | edificio | 224×288 | 3×3 | `ins.granja.1` | F1 |
| `ins.granja.2` | edificio | 224×288 | 3×3 | `ins.granja.2` | F2 |
| `ins.granja.3` | edificio | 224×288 | 3×3 | `ins.granja.3` | F3 |
| `ins.cria.1` | edificio | 224×288 | 3×3 | `ins.cria.1` | F2 |
| `ins.cria.2` | edificio | 224×288 | 3×3 | `ins.cria.2` | F2 |
| `ins.cria.3` | edificio | 224×288 | 3×3 | `ins.cria.3` | F3 |
| `ins.ext1.1` | edificio | 160×208 | 2×2 | `ins.ext1.1` | F1 |
| `ins.ext1.2` | edificio | 160×208 | 2×2 | `ins.ext1.2` | F2 |
| `ins.ext1.3` | edificio | 160×208 | 2×2 | `ins.ext1.3` | F3 |
| `ins.ext2.1` | edificio | 160×208 | 2×2 | `ins.ext2.1` | F2 |
| `ins.ext2.2` | edificio | 160×208 | 2×2 | `ins.ext2.2` | F2 |
| `ins.ext2.3` | edificio | 160×208 | 2×2 | `ins.ext2.3` | F3 |
| `ins.saber.1` | edificio | 160×208 | 2×2 | `ins.saber.1` | F1 |
| `ins.saber.2` | edificio | 160×208 | 2×2 | `ins.saber.2` | F2 |
| `ins.saber.3` | edificio | 160×208 | 2×2 | `ins.saber.3` | F3 |
| `ins.muro.1` | edificio | 96×128 | 1×1 | `ins.muro.1` | F2 |
| `ins.muro.2` | edificio | 96×128 | 1×1 | `ins.muro.2` | F2 |
| `ins.muro.3` | edificio | 96×128 | 1×1 | `ins.muro.3` | F3 |
| `ins.torre.1` | edificio | 160×208 | 2×2 | `ins.torre.1` | F2 |
| `ins.torre.2` | edificio | 160×208 | 2×2 | `ins.torre.2` | F2 |
| `ins.torre.3` | edificio | 160×208 | 2×2 | `ins.torre.3` | F3 |
| `ins.cuartel.1` | edificio | 224×288 | 3×3 | `ins.cuartel.1` | F2 |
| `ins.cuartel.2` | edificio | 224×288 | 3×3 | `ins.cuartel.2` | F2 |
| `ins.cuartel.3` | edificio | 224×288 | 3×3 | `ins.cuartel.3` | F3 |
| `ins.unico` | edificio | 224×288 | 3×3 | `ins.unico` | F2 |
| `ins.maravilla` | edificio | 224×288 | 3×3 | `ins.maravilla` | F3 |
| `acu.corazon.1` | edificio | 224×288 | 3×3 | `acu.corazon.1` | F1 |
| `acu.corazon.2` | edificio | 224×288 | 3×3 | `acu.corazon.2` | F2 |
| `acu.corazon.3` | edificio | 224×288 | 3×3 | `acu.corazon.3` | F3 |
| `acu.vivienda.1` | edificio | 160×208 | 2×2 | `acu.vivienda.1` | F1 |
| `acu.vivienda.2` | edificio | 160×208 | 2×2 | `acu.vivienda.2` | F2 |
| `acu.vivienda.3` | edificio | 160×208 | 2×2 | `acu.vivienda.3` | F3 |
| `acu.almacen.1` | edificio | 160×208 | 2×2 | `acu.almacen.1` | F1 |
| `acu.almacen.2` | edificio | 160×208 | 2×2 | `acu.almacen.2` | F2 |
| `acu.almacen.3` | edificio | 160×208 | 2×2 | `acu.almacen.3` | F3 |
| `acu.granja.1` | edificio | 224×288 | 3×3 | `acu.granja.1` | F1 |
| `acu.granja.2` | edificio | 224×288 | 3×3 | `acu.granja.2` | F2 |
| `acu.granja.3` | edificio | 224×288 | 3×3 | `acu.granja.3` | F3 |
| `acu.cria.1` | edificio | 224×288 | 3×3 | `acu.cria.1` | F2 |
| `acu.cria.2` | edificio | 224×288 | 3×3 | `acu.cria.2` | F2 |
| `acu.cria.3` | edificio | 224×288 | 3×3 | `acu.cria.3` | F3 |
| `acu.ext1.1` | edificio | 160×208 | 2×2 | `acu.ext1.1` | F1 |
| `acu.ext1.2` | edificio | 160×208 | 2×2 | `acu.ext1.2` | F2 |
| `acu.ext1.3` | edificio | 160×208 | 2×2 | `acu.ext1.3` | F3 |
| `acu.ext2.1` | edificio | 160×208 | 2×2 | `acu.ext2.1` | F2 |
| `acu.ext2.2` | edificio | 160×208 | 2×2 | `acu.ext2.2` | F2 |
| `acu.ext2.3` | edificio | 160×208 | 2×2 | `acu.ext2.3` | F3 |
| `acu.saber.1` | edificio | 160×208 | 2×2 | `acu.saber.1` | F1 |
| `acu.saber.2` | edificio | 160×208 | 2×2 | `acu.saber.2` | F2 |
| `acu.saber.3` | edificio | 160×208 | 2×2 | `acu.saber.3` | F3 |
| `acu.muro.1` | edificio | 96×128 | 1×1 | `acu.muro.1` | F2 |
| `acu.muro.2` | edificio | 96×128 | 1×1 | `acu.muro.2` | F2 |
| `acu.muro.3` | edificio | 96×128 | 1×1 | `acu.muro.3` | F3 |
| `acu.torre.1` | edificio | 160×208 | 2×2 | `acu.torre.1` | F2 |
| `acu.torre.2` | edificio | 160×208 | 2×2 | `acu.torre.2` | F2 |
| `acu.torre.3` | edificio | 160×208 | 2×2 | `acu.torre.3` | F3 |
| `acu.cuartel.1` | edificio | 224×288 | 3×3 | `acu.cuartel.1` | F2 |
| `acu.cuartel.2` | edificio | 224×288 | 3×3 | `acu.cuartel.2` | F2 |
| `acu.cuartel.3` | edificio | 224×288 | 3×3 | `acu.cuartel.3` | F3 |
| `acu.unico` | edificio | 224×288 | 3×3 | `acu.unico` | F2 |
| `acu.maravilla` | edificio | 224×288 | 3×3 | `acu.maravilla` | F3 |
| `ave.corazon.1` | edificio | 224×288 | 3×3 | `ave.corazon.1` | F1 |
| `ave.corazon.2` | edificio | 224×288 | 3×3 | `ave.corazon.2` | F2 |
| `ave.corazon.3` | edificio | 224×288 | 3×3 | `ave.corazon.3` | F3 |
| `ave.vivienda.1` | edificio | 160×208 | 2×2 | `ave.vivienda.1` | F1 |
| `ave.vivienda.2` | edificio | 160×208 | 2×2 | `ave.vivienda.2` | F2 |
| `ave.vivienda.3` | edificio | 160×208 | 2×2 | `ave.vivienda.3` | F3 |
| `ave.almacen.1` | edificio | 160×208 | 2×2 | `ave.almacen.1` | F1 |
| `ave.almacen.2` | edificio | 160×208 | 2×2 | `ave.almacen.2` | F2 |
| `ave.almacen.3` | edificio | 160×208 | 2×2 | `ave.almacen.3` | F3 |
| `ave.granja.1` | edificio | 224×288 | 3×3 | `ave.granja.1` | F1 |
| `ave.granja.2` | edificio | 224×288 | 3×3 | `ave.granja.2` | F2 |
| `ave.granja.3` | edificio | 224×288 | 3×3 | `ave.granja.3` | F3 |
| `ave.cria.1` | edificio | 224×288 | 3×3 | `ave.cria.1` | F2 |
| `ave.cria.2` | edificio | 224×288 | 3×3 | `ave.cria.2` | F2 |
| `ave.cria.3` | edificio | 224×288 | 3×3 | `ave.cria.3` | F3 |
| `ave.ext1.1` | edificio | 160×208 | 2×2 | `ave.ext1.1` | F1 |
| `ave.ext1.2` | edificio | 160×208 | 2×2 | `ave.ext1.2` | F2 |
| `ave.ext1.3` | edificio | 160×208 | 2×2 | `ave.ext1.3` | F3 |
| `ave.ext2.1` | edificio | 160×208 | 2×2 | `ave.ext2.1` | F2 |
| `ave.ext2.2` | edificio | 160×208 | 2×2 | `ave.ext2.2` | F2 |
| `ave.ext2.3` | edificio | 160×208 | 2×2 | `ave.ext2.3` | F3 |
| `ave.saber.1` | edificio | 160×208 | 2×2 | `ave.saber.1` | F1 |
| `ave.saber.2` | edificio | 160×208 | 2×2 | `ave.saber.2` | F2 |
| `ave.saber.3` | edificio | 160×208 | 2×2 | `ave.saber.3` | F3 |
| `ave.muro.1` | edificio | 96×128 | 1×1 | `ave.muro.1` | F2 |
| `ave.muro.2` | edificio | 96×128 | 1×1 | `ave.muro.2` | F2 |
| `ave.muro.3` | edificio | 96×128 | 1×1 | `ave.muro.3` | F3 |
| `ave.torre.1` | edificio | 160×208 | 2×2 | `ave.torre.1` | F2 |
| `ave.torre.2` | edificio | 160×208 | 2×2 | `ave.torre.2` | F2 |
| `ave.torre.3` | edificio | 160×208 | 2×2 | `ave.torre.3` | F3 |
| `ave.cuartel.1` | edificio | 224×288 | 3×3 | `ave.cuartel.1` | F2 |
| `ave.cuartel.2` | edificio | 224×288 | 3×3 | `ave.cuartel.2` | F2 |
| `ave.cuartel.3` | edificio | 224×288 | 3×3 | `ave.cuartel.3` | F3 |
| `ave.unico` | edificio | 224×288 | 3×3 | `ave.unico` | F2 |
| `ave.maravilla` | edificio | 224×288 | 3×3 | `ave.maravilla` | F3 |
| `acu.muelle` | edificio | 160×208 | 2×2 | `acu.muelle` | F4 |
| `ter.obra1.plano` | obra | 96×128 | 1×1 | `ter.obra1` | F1 |
| `ter.obra1.andamio` | obra | 96×128 | 1×1 | `ter.obra1` | F1 |
| `ter.obra1.mitad` | obra | 96×128 | 1×1 | `ter.obra1` | F1 |
| `ter.obra2.plano` | obra | 160×208 | 2×2 | `ter.obra2` | F1 |
| `ter.obra2.andamio` | obra | 160×208 | 2×2 | `ter.obra2` | F1 |
| `ter.obra2.mitad` | obra | 160×208 | 2×2 | `ter.obra2` | F1 |
| `ter.obra3.plano` | obra | 224×288 | 3×3 | `ter.obra3` | F1 |
| `ter.obra3.andamio` | obra | 224×288 | 3×3 | `ter.obra3` | F1 |
| `ter.obra3.mitad` | obra | 224×288 | 3×3 | `ter.obra3` | F1 |
| `ter.dano1` | daño | 96×128 | 1×1 | `ter.dano1` | F2 |
| `ter.dano2` | daño | 160×208 | 2×2 | `ter.dano2` | F2 |
| `ter.dano3` | daño | 224×288 | 3×3 | `ter.dano3` | F2 |
| `ins.obra1.plano` | obra | 96×128 | 1×1 | `ins.obra1` | F1 |
| `ins.obra1.andamio` | obra | 96×128 | 1×1 | `ins.obra1` | F1 |
| `ins.obra1.mitad` | obra | 96×128 | 1×1 | `ins.obra1` | F1 |
| `ins.obra2.plano` | obra | 160×208 | 2×2 | `ins.obra2` | F1 |
| `ins.obra2.andamio` | obra | 160×208 | 2×2 | `ins.obra2` | F1 |
| `ins.obra2.mitad` | obra | 160×208 | 2×2 | `ins.obra2` | F1 |
| `ins.obra3.plano` | obra | 224×288 | 3×3 | `ins.obra3` | F1 |
| `ins.obra3.andamio` | obra | 224×288 | 3×3 | `ins.obra3` | F1 |
| `ins.obra3.mitad` | obra | 224×288 | 3×3 | `ins.obra3` | F1 |
| `ins.dano1` | daño | 96×128 | 1×1 | `ins.dano1` | F2 |
| `ins.dano2` | daño | 160×208 | 2×2 | `ins.dano2` | F2 |
| `ins.dano3` | daño | 224×288 | 3×3 | `ins.dano3` | F2 |
| `acu.obra1.plano` | obra | 96×128 | 1×1 | `acu.obra1` | F1 |
| `acu.obra1.andamio` | obra | 96×128 | 1×1 | `acu.obra1` | F1 |
| `acu.obra1.mitad` | obra | 96×128 | 1×1 | `acu.obra1` | F1 |
| `acu.obra2.plano` | obra | 160×208 | 2×2 | `acu.obra2` | F1 |
| `acu.obra2.andamio` | obra | 160×208 | 2×2 | `acu.obra2` | F1 |
| `acu.obra2.mitad` | obra | 160×208 | 2×2 | `acu.obra2` | F1 |
| `acu.obra3.plano` | obra | 224×288 | 3×3 | `acu.obra3` | F1 |
| `acu.obra3.andamio` | obra | 224×288 | 3×3 | `acu.obra3` | F1 |
| `acu.obra3.mitad` | obra | 224×288 | 3×3 | `acu.obra3` | F1 |
| `acu.dano1` | daño | 96×128 | 1×1 | `acu.dano1` | F2 |
| `acu.dano2` | daño | 160×208 | 2×2 | `acu.dano2` | F2 |
| `acu.dano3` | daño | 224×288 | 3×3 | `acu.dano3` | F2 |
| `ave.obra1.plano` | obra | 96×128 | 1×1 | `ave.obra1` | F1 |
| `ave.obra1.andamio` | obra | 96×128 | 1×1 | `ave.obra1` | F1 |
| `ave.obra1.mitad` | obra | 96×128 | 1×1 | `ave.obra1` | F1 |
| `ave.obra2.plano` | obra | 160×208 | 2×2 | `ave.obra2` | F1 |
| `ave.obra2.andamio` | obra | 160×208 | 2×2 | `ave.obra2` | F1 |
| `ave.obra2.mitad` | obra | 160×208 | 2×2 | `ave.obra2` | F1 |
| `ave.obra3.plano` | obra | 224×288 | 3×3 | `ave.obra3` | F1 |
| `ave.obra3.andamio` | obra | 224×288 | 3×3 | `ave.obra3` | F1 |
| `ave.obra3.mitad` | obra | 224×288 | 3×3 | `ave.obra3` | F1 |
| `ave.dano1` | daño | 96×128 | 1×1 | `ave.dano1` | F2 |
| `ave.dano2` | daño | 160×208 | 2×2 | `ave.dano2` | F2 |
| `ave.dano3` | daño | 224×288 | 3×3 | `ave.dano3` | F2 |
| `ter.estandarte` | estandarte | 64×128 |  | `ter.estandarte` | F2 |
| `ter.proy.1` | proyectil | 32×32 |  | `ter.proy` | F2 |
| `ter.proy.2` | proyectil | 32×32 |  | `ter.proy` | F2 |
| `ter.proy.3` | proyectil | 32×32 |  | `ter.proy` | F2 |
| `ter.proy.4` | proyectil | 32×32 |  | `ter.proy` | F2 |
| `ins.estandarte` | estandarte | 64×128 |  | `ins.estandarte` | F2 |
| `ins.proy.1` | proyectil | 32×32 |  | `ins.proy` | F2 |
| `ins.proy.2` | proyectil | 32×32 |  | `ins.proy` | F2 |
| `ins.proy.3` | proyectil | 32×32 |  | `ins.proy` | F2 |
| `ins.proy.4` | proyectil | 32×32 |  | `ins.proy` | F2 |
| `acu.estandarte` | estandarte | 64×128 |  | `acu.estandarte` | F2 |
| `acu.proy.1` | proyectil | 32×32 |  | `acu.proy` | F2 |
| `acu.proy.2` | proyectil | 32×32 |  | `acu.proy` | F2 |
| `acu.proy.3` | proyectil | 32×32 |  | `acu.proy` | F2 |
| `acu.proy.4` | proyectil | 32×32 |  | `acu.proy` | F2 |
| `ave.estandarte` | estandarte | 64×128 |  | `ave.estandarte` | F2 |
| `ave.proy.1` | proyectil | 32×32 |  | `ave.proy` | F2 |
| `ave.proy.2` | proyectil | 32×32 |  | `ave.proy` | F2 |
| `ave.proy.3` | proyectil | 32×32 |  | `ave.proy` | F2 |
| `ave.proy.4` | proyectil | 32×32 |  | `ave.proy` | F2 |
| `ter.suelo.1` | terreno | 256×256 | 4×4 | `ter.suelo.1` | F1 |
| `ter.suelo.2` | terreno | 256×256 | 4×4 | `ter.suelo.2` | F1 |
| `ter.suelo.3` | terreno | 256×256 | 4×4 | `ter.suelo.3` | F1 |
| `ter.borde` | terreno | 256×256 | 4×4 | `ter.borde` | F1 |
| `ter.camino` | terreno | 256×256 | 4×4 | `ter.camino` | F1 |
| `ter.decor.1` | decorado | 64×64 |  | `ter.decor` | F4 |
| `ter.decor.2` | decorado | 64×64 |  | `ter.decor` | F4 |
| `ter.decor.3` | decorado | 64×64 |  | `ter.decor` | F4 |
| `ter.decor.4` | decorado | 64×64 |  | `ter.decor` | F4 |
| `ter.hito.1` | hito | 64×96 |  | `ter.hito` | F2 |
| `ter.hito.2` | hito | 64×96 |  | `ter.hito` | F2 |
| `ter.hito.3` | hito | 64×96 |  | `ter.hito` | F2 |
| `ter.puesto` | hito | 96×128 | 2×2 | `ter.hito` | F2 |
| `ins.suelo.1` | terreno | 256×256 | 4×4 | `ins.suelo.1` | F1 |
| `ins.suelo.2` | terreno | 256×256 | 4×4 | `ins.suelo.2` | F1 |
| `ins.suelo.3` | terreno | 256×256 | 4×4 | `ins.suelo.3` | F1 |
| `ins.borde` | terreno | 256×256 | 4×4 | `ins.borde` | F1 |
| `ins.camino` | terreno | 256×256 | 4×4 | `ins.camino` | F1 |
| `ins.decor.1` | decorado | 64×64 |  | `ins.decor` | F4 |
| `ins.decor.2` | decorado | 64×64 |  | `ins.decor` | F4 |
| `ins.decor.3` | decorado | 64×64 |  | `ins.decor` | F4 |
| `ins.decor.4` | decorado | 64×64 |  | `ins.decor` | F4 |
| `ins.hito.1` | hito | 64×96 |  | `ins.hito` | F2 |
| `ins.hito.2` | hito | 64×96 |  | `ins.hito` | F2 |
| `ins.hito.3` | hito | 64×96 |  | `ins.hito` | F2 |
| `ins.puesto` | hito | 96×128 | 2×2 | `ins.hito` | F2 |
| `acu.suelo.1` | terreno | 256×256 | 4×4 | `acu.suelo.1` | F1 |
| `acu.suelo.2` | terreno | 256×256 | 4×4 | `acu.suelo.2` | F1 |
| `acu.suelo.3` | terreno | 256×256 | 4×4 | `acu.suelo.3` | F1 |
| `acu.borde` | terreno | 256×256 | 4×4 | `acu.borde` | F1 |
| `acu.camino` | terreno | 256×256 | 4×4 | `acu.camino` | F1 |
| `acu.decor.1` | decorado | 64×64 |  | `acu.decor` | F4 |
| `acu.decor.2` | decorado | 64×64 |  | `acu.decor` | F4 |
| `acu.decor.3` | decorado | 64×64 |  | `acu.decor` | F4 |
| `acu.decor.4` | decorado | 64×64 |  | `acu.decor` | F4 |
| `acu.hito.1` | hito | 64×96 |  | `acu.hito` | F2 |
| `acu.hito.2` | hito | 64×96 |  | `acu.hito` | F2 |
| `acu.hito.3` | hito | 64×96 |  | `acu.hito` | F2 |
| `acu.puesto` | hito | 96×128 | 2×2 | `acu.hito` | F2 |
| `ave.suelo.1` | terreno | 256×256 | 4×4 | `ave.suelo.1` | F1 |
| `ave.suelo.2` | terreno | 256×256 | 4×4 | `ave.suelo.2` | F1 |
| `ave.suelo.3` | terreno | 256×256 | 4×4 | `ave.suelo.3` | F1 |
| `ave.borde` | terreno | 256×256 | 4×4 | `ave.borde` | F1 |
| `ave.camino` | terreno | 256×256 | 4×4 | `ave.camino` | F1 |
| `ave.decor.1` | decorado | 64×64 |  | `ave.decor` | F4 |
| `ave.decor.2` | decorado | 64×64 |  | `ave.decor` | F4 |
| `ave.decor.3` | decorado | 64×64 |  | `ave.decor` | F4 |
| `ave.decor.4` | decorado | 64×64 |  | `ave.decor` | F4 |
| `ave.hito.1` | hito | 64×96 |  | `ave.hito` | F2 |
| `ave.hito.2` | hito | 64×96 |  | `ave.hito` | F2 |
| `ave.hito.3` | hito | 64×96 |  | `ave.hito` | F2 |
| `ave.puesto` | hito | 96×128 | 2×2 | `ave.hito` | F2 |
| `anf.suelo.1` | terreno | 256×256 | 4×4 | `anf.suelo.1` | F1 |
| `anf.suelo.2` | terreno | 256×256 | 4×4 | `anf.suelo.2` | F1 |
| `anf.suelo.3` | terreno | 256×256 | 4×4 | `anf.suelo.3` | F1 |
| `anf.borde` | terreno | 256×256 | 4×4 | `anf.borde` | F1 |
| `anf.camino` | terreno | 256×256 | 4×4 | `anf.camino` | F1 |
| `anf.decor.1` | decorado | 64×64 |  | `anf.decor` | F4 |
| `anf.decor.2` | decorado | 64×64 |  | `anf.decor` | F4 |
| `anf.decor.3` | decorado | 64×64 |  | `anf.decor` | F4 |
| `anf.decor.4` | decorado | 64×64 |  | `anf.decor` | F4 |
| `gen.niebla` | terreno | 256×256 | 4×4 | `gen.niebla` | F2 |
| `ter.nodo.comida.1` | nodo | 128×128 | 2×2 | `ter.nodo.comida` | F1 |
| `ter.nodo.comida.2` | nodo | 128×128 | 2×2 | `ter.nodo.comida` | F1 |
| `ter.nodo.comida.3` | nodo | 128×128 | 2×2 | `ter.nodo.comida` | F1 |
| `ter.nodo.mat1.1` | nodo | 128×128 | 2×2 | `ter.nodo.mat1` | F1 |
| `ter.nodo.mat1.2` | nodo | 128×128 | 2×2 | `ter.nodo.mat1` | F1 |
| `ter.nodo.mat1.3` | nodo | 128×128 | 2×2 | `ter.nodo.mat1` | F1 |
| `ter.nodo.mat2.1` | nodo | 128×128 | 2×2 | `ter.nodo.mat2` | F2 |
| `ter.nodo.mat2.2` | nodo | 128×128 | 2×2 | `ter.nodo.mat2` | F2 |
| `ter.nodo.mat2.3` | nodo | 128×128 | 2×2 | `ter.nodo.mat2` | F2 |
| `ter.nodo.saber.1` | nodo | 128×128 | 2×2 | `ter.nodo.saber` | F2 |
| `ter.nodo.saber.2` | nodo | 128×128 | 2×2 | `ter.nodo.saber` | F2 |
| `ter.nodo.saber.3` | nodo | 128×128 | 2×2 | `ter.nodo.saber` | F2 |
| `ter.ico.comida` | ícono recurso | 64×64 |  | `ter.ico.res` | F1 |
| `ter.ico.mat1` | ícono recurso | 64×64 |  | `ter.ico.res` | F1 |
| `ter.ico.mat2` | ícono recurso | 64×64 |  | `ter.ico.res` | F1 |
| `ter.ico.saber` | ícono recurso | 64×64 |  | `ter.ico.res` | F1 |
| `ter.ico.edad1` | ícono edad | 64×64 |  | `ter.ico.edad` | F1 |
| `ter.ico.edad2` | ícono edad | 64×64 |  | `ter.ico.edad` | F1 |
| `ter.ico.edad3` | ícono edad | 64×64 |  | `ter.ico.edad` | F1 |
| `ter.ico.maravilla` | ícono edad | 64×64 |  | `ter.ico.edad` | F1 |
| `ter.tec.fuego` | ícono tecnología | 64×64 |  | `ter.tec.hoja1` | F4 |
| `ter.tec.piedra` | ícono tecnología | 64×64 |  | `ter.tec.hoja1` | F4 |
| `ter.tec.recoleccion` | ícono tecnología | 64×64 |  | `ter.tec.hoja1` | F4 |
| `ter.tec.pieles` | ícono tecnología | 64×64 |  | `ter.tec.hoja1` | F4 |
| `ter.tec.agricultura` | ícono tecnología | 64×64 |  | `ter.tec.hoja2` | F4 |
| `ter.tec.domesticacion` | ícono tecnología | 64×64 |  | `ter.tec.hoja2` | F4 |
| `ter.tec.alfareria` | ícono tecnología | 64×64 |  | `ter.tec.hoja2` | F4 |
| `ter.tec.arcos` | ícono tecnología | 64×64 |  | `ter.tec.hoja2` | F4 |
| `ter.tec.metal` | ícono tecnología | 64×64 |  | `ter.tec.hoja3` | F4 |
| `ter.tec.rueda` | ícono tecnología | 64×64 |  | `ter.tec.hoja3` | F4 |
| `ter.tec.calendario` | ícono tecnología | 64×64 |  | `ter.tec.hoja3` | F4 |
| `ter.tec.escritura` | ícono tecnología | 64×64 |  | `ter.tec.hoja3` | F4 |
| `ins.nodo.comida.1` | nodo | 128×128 | 2×2 | `ins.nodo.comida` | F1 |
| `ins.nodo.comida.2` | nodo | 128×128 | 2×2 | `ins.nodo.comida` | F1 |
| `ins.nodo.comida.3` | nodo | 128×128 | 2×2 | `ins.nodo.comida` | F1 |
| `ins.nodo.mat1.1` | nodo | 128×128 | 2×2 | `ins.nodo.mat1` | F1 |
| `ins.nodo.mat1.2` | nodo | 128×128 | 2×2 | `ins.nodo.mat1` | F1 |
| `ins.nodo.mat1.3` | nodo | 128×128 | 2×2 | `ins.nodo.mat1` | F1 |
| `ins.nodo.mat2.1` | nodo | 128×128 | 2×2 | `ins.nodo.mat2` | F2 |
| `ins.nodo.mat2.2` | nodo | 128×128 | 2×2 | `ins.nodo.mat2` | F2 |
| `ins.nodo.mat2.3` | nodo | 128×128 | 2×2 | `ins.nodo.mat2` | F2 |
| `ins.nodo.saber.1` | nodo | 128×128 | 2×2 | `ins.nodo.saber` | F2 |
| `ins.nodo.saber.2` | nodo | 128×128 | 2×2 | `ins.nodo.saber` | F2 |
| `ins.nodo.saber.3` | nodo | 128×128 | 2×2 | `ins.nodo.saber` | F2 |
| `ins.ico.comida` | ícono recurso | 64×64 |  | `ins.ico.res` | F1 |
| `ins.ico.mat1` | ícono recurso | 64×64 |  | `ins.ico.res` | F1 |
| `ins.ico.mat2` | ícono recurso | 64×64 |  | `ins.ico.res` | F1 |
| `ins.ico.saber` | ícono recurso | 64×64 |  | `ins.ico.res` | F1 |
| `ins.ico.edad1` | ícono edad | 64×64 |  | `ins.ico.edad` | F1 |
| `ins.ico.edad2` | ícono edad | 64×64 |  | `ins.ico.edad` | F1 |
| `ins.ico.edad3` | ícono edad | 64×64 |  | `ins.ico.edad` | F1 |
| `ins.ico.maravilla` | ícono edad | 64×64 |  | `ins.ico.edad` | F1 |
| `ins.tec.castas` | ícono tecnología | 64×64 |  | `ins.tec.hoja1` | F4 |
| `ins.tec.feromonas` | ícono tecnología | 64×64 |  | `ins.tec.hoja1` | F4 |
| `ins.tec.hongos` | ícono tecnología | 64×64 |  | `ins.tec.hoja1` | F4 |
| `ins.tec.hexagonal` | ícono tecnología | 64×64 |  | `ins.tec.hoja1` | F4 |
| `ins.tec.pulgones` | ícono tecnología | 64×64 |  | `ins.tec.hoja2` | F4 |
| `ins.tec.formico` | ícono tecnología | 64×64 |  | `ins.tec.hoja2` | F4 |
| `ins.tec.ventilacion` | ícono tecnología | 64×64 |  | `ins.tec.hoja2` | F4 |
| `ins.tec.puentes` | ícono tecnología | 64×64 |  | `ins.tec.hoja2` | F4 |
| `ins.tec.enjambre` | ícono tecnología | 64×64 |  | `ins.tec.hoja3` | F4 |
| `ins.tec.metamorfosis` | ícono tecnología | 64×64 |  | `ins.tec.hoja3` | F4 |
| `ins.tec.antibioticos` | ícono tecnología | 64×64 |  | `ins.tec.hoja3` | F4 |
| `ins.tec.colmenaciudad` | ícono tecnología | 64×64 |  | `ins.tec.hoja3` | F4 |
| `acu.nodo.comida.1` | nodo | 128×128 | 2×2 | `acu.nodo.comida` | F1 |
| `acu.nodo.comida.2` | nodo | 128×128 | 2×2 | `acu.nodo.comida` | F1 |
| `acu.nodo.comida.3` | nodo | 128×128 | 2×2 | `acu.nodo.comida` | F1 |
| `acu.nodo.mat1.1` | nodo | 128×128 | 2×2 | `acu.nodo.mat1` | F1 |
| `acu.nodo.mat1.2` | nodo | 128×128 | 2×2 | `acu.nodo.mat1` | F1 |
| `acu.nodo.mat1.3` | nodo | 128×128 | 2×2 | `acu.nodo.mat1` | F1 |
| `acu.nodo.mat2.1` | nodo | 128×128 | 2×2 | `acu.nodo.mat2` | F2 |
| `acu.nodo.mat2.2` | nodo | 128×128 | 2×2 | `acu.nodo.mat2` | F2 |
| `acu.nodo.mat2.3` | nodo | 128×128 | 2×2 | `acu.nodo.mat2` | F2 |
| `acu.nodo.saber.1` | nodo | 128×128 | 2×2 | `acu.nodo.saber` | F2 |
| `acu.nodo.saber.2` | nodo | 128×128 | 2×2 | `acu.nodo.saber` | F2 |
| `acu.nodo.saber.3` | nodo | 128×128 | 2×2 | `acu.nodo.saber` | F2 |
| `acu.ico.comida` | ícono recurso | 64×64 |  | `acu.ico.res` | F1 |
| `acu.ico.mat1` | ícono recurso | 64×64 |  | `acu.ico.res` | F1 |
| `acu.ico.mat2` | ícono recurso | 64×64 |  | `acu.ico.res` | F1 |
| `acu.ico.saber` | ícono recurso | 64×64 |  | `acu.ico.res` | F1 |
| `acu.ico.edad1` | ícono edad | 64×64 |  | `acu.ico.edad` | F1 |
| `acu.ico.edad2` | ícono edad | 64×64 |  | `acu.ico.edad` | F1 |
| `acu.ico.edad3` | ícono edad | 64×64 |  | `acu.ico.edad` | F1 |
| `acu.ico.maravilla` | ícono edad | 64×64 |  | `acu.ico.edad` | F1 |
| `acu.tec.conchas` | ícono tecnología | 64×64 |  | `acu.tec.hoja1` | F4 |
| `acu.tec.cardumen` | ícono tecnología | 64×64 |  | `acu.tec.hoja1` | F4 |
| `acu.tec.algas` | ícono tecnología | 64×64 |  | `acu.tec.hoja1` | F4 |
| `acu.tec.biolum` | ícono tecnología | 64×64 |  | `acu.tec.hoja1` | F4 |
| `acu.tec.acuicultura` | ícono tecnología | 64×64 |  | `acu.tec.hoja2` | F4 |
| `acu.tec.ecolocacion` | ícono tecnología | 64×64 |  | `acu.tec.hoja2` | F4 |
| `acu.tec.nacar` | ícono tecnología | 64×64 |  | `acu.tec.hoja2` | F4 |
| `acu.tec.tinta` | ícono tecnología | 64×64 |  | `acu.tec.hoja2` | F4 |
| `acu.tec.corrientes` | ícono tecnología | 64×64 |  | `acu.tec.hoja3` | F4 |
| `acu.tec.presion` | ícono tecnología | 64×64 |  | `acu.tec.hoja3` | F4 |
| `acu.tec.ballenas` | ícono tecnología | 64×64 |  | `acu.tec.hoja3` | F4 |
| `acu.tec.escritura` | ícono tecnología | 64×64 |  | `acu.tec.hoja3` | F4 |
| `ave.nodo.comida.1` | nodo | 128×128 | 2×2 | `ave.nodo.comida` | F1 |
| `ave.nodo.comida.2` | nodo | 128×128 | 2×2 | `ave.nodo.comida` | F1 |
| `ave.nodo.comida.3` | nodo | 128×128 | 2×2 | `ave.nodo.comida` | F1 |
| `ave.nodo.mat1.1` | nodo | 128×128 | 2×2 | `ave.nodo.mat1` | F1 |
| `ave.nodo.mat1.2` | nodo | 128×128 | 2×2 | `ave.nodo.mat1` | F1 |
| `ave.nodo.mat1.3` | nodo | 128×128 | 2×2 | `ave.nodo.mat1` | F1 |
| `ave.nodo.mat2.1` | nodo | 128×128 | 2×2 | `ave.nodo.mat2` | F2 |
| `ave.nodo.mat2.2` | nodo | 128×128 | 2×2 | `ave.nodo.mat2` | F2 |
| `ave.nodo.mat2.3` | nodo | 128×128 | 2×2 | `ave.nodo.mat2` | F2 |
| `ave.nodo.saber.1` | nodo | 128×128 | 2×2 | `ave.nodo.saber` | F2 |
| `ave.nodo.saber.2` | nodo | 128×128 | 2×2 | `ave.nodo.saber` | F2 |
| `ave.nodo.saber.3` | nodo | 128×128 | 2×2 | `ave.nodo.saber` | F2 |
| `ave.ico.comida` | ícono recurso | 64×64 |  | `ave.ico.res` | F1 |
| `ave.ico.mat1` | ícono recurso | 64×64 |  | `ave.ico.res` | F1 |
| `ave.ico.mat2` | ícono recurso | 64×64 |  | `ave.ico.res` | F1 |
| `ave.ico.saber` | ícono recurso | 64×64 |  | `ave.ico.res` | F1 |
| `ave.ico.edad1` | ícono edad | 64×64 |  | `ave.ico.edad` | F1 |
| `ave.ico.edad2` | ícono edad | 64×64 |  | `ave.ico.edad` | F1 |
| `ave.ico.edad3` | ícono edad | 64×64 |  | `ave.ico.edad` | F1 |
| `ave.ico.maravilla` | ícono edad | 64×64 |  | `ave.ico.edad` | F1 |
| `ave.tec.nidos` | ícono tecnología | 64×64 |  | `ave.tec.hoja1` | F4 |
| `ave.tec.vuelov` | ícono tecnología | 64×64 |  | `ave.tec.hoja1` | F4 |
| `ave.tec.semillas` | ícono tecnología | 64×64 |  | `ave.tec.hoja1` | F4 |
| `ave.tec.pico` | ícono tecnología | 64×64 |  | `ave.tec.hoja1` | F4 |
| `ave.tec.alfareria` | ícono tecnología | 64×64 |  | `ave.tec.hoja2` | F4 |
| `ave.tec.vigias` | ícono tecnología | 64×64 |  | `ave.tec.hoja2` | F4 |
| `ave.tec.mensajeros` | ícono tecnología | 64×64 |  | `ave.tec.hoja2` | F4 |
| `ave.tec.picada` | ícono tecnología | 64×64 |  | `ave.tec.hoja2` | F4 |
| `ave.tec.rutas` | ícono tecnología | 64×64 |  | `ave.tec.hoja3` | F4 |
| `ave.tec.mapas` | ícono tecnología | 64×64 |  | `ave.tec.hoja3` | F4 |
| `ave.tec.comercio` | ícono tecnología | 64×64 |  | `ave.tec.hoja3` | F4 |
| `ave.tec.plumas` | ícono tecnología | 64×64 |  | `ave.tec.hoja3` | F4 |
| `ui.construir` | ícono interfaz | 64×64 |  | `ui.hoja1` | F1 |
| `ui.mejorar` | ícono interfaz | 64×64 |  | `ui.hoja1` | F1 |
| `ui.mover` | ícono interfaz | 64×64 |  | `ui.hoja1` | F1 |
| `ui.demoler` | ícono interfaz | 64×64 |  | `ui.hoja1` | F1 |
| `ui.alerta` | ícono interfaz | 64×64 |  | `ui.hoja2` | F1 |
| `ui.vender` | ícono interfaz | 64×64 |  | `ui.hoja2` | F1 |
| `ui.entrenar` | ícono interfaz | 64×64 |  | `ui.hoja2` | F1 |
| `ui.expedicion` | ícono interfaz | 64×64 |  | `ui.hoja2` | F1 |
| `ui.defender` | ícono interfaz | 64×64 |  | `ui.hoja3` | F2 |
| `ui.comerciar` | ícono interfaz | 64×64 |  | `ui.hoja3` | F2 |
| `ui.cancelar` | ícono interfaz | 64×64 |  | `ui.hoja3` | F2 |
| `ui.aceptar` | ícono interfaz | 64×64 |  | `ui.hoja3` | F2 |
| `ter.uni.cazador.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ter.uni.cazador.obrero-caminar` | F1 |
| `ter.uni.cazador.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ter.uni.cazador.guerrero-caminar` | F2 |
| `ter.uni.cazador.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ter.uni.cazador.tirador-caminar` | F2 |
| `ter.uni.cazador.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ter.uni.cazador.explorador-caminar` | F1 |
| `ter.uni.gigante.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ter.uni.gigante.obrero-caminar` | F1 |
| `ter.uni.gigante.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ter.uni.gigante.guerrero-caminar` | F2 |
| `ter.uni.gigante.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ter.uni.gigante.tirador-caminar` | F2 |
| `ter.uni.gigante.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ter.uni.gigante.explorador-caminar` | F1 |
| `ter.uni.ingeniero.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ter.uni.ingeniero.obrero-caminar` | F1 |
| `ter.uni.ingeniero.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ter.uni.ingeniero.guerrero-caminar` | F2 |
| `ter.uni.ingeniero.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ter.uni.ingeniero.tirador-caminar` | F2 |
| `ter.uni.ingeniero.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ter.uni.ingeniero.explorador-caminar` | F1 |
| `ter.uni.gigante_guerra` | campeón | 384×384 | 96 px × caminar/atacar/habilidad/morir filas | `ter.uni.gigante_guerra-caminar` | F3 |
| `ter.ret.cazador` | retrato | 192×192 |  | `ter.ret.cazador` | F4 |
| `ter.ret.gigante` | retrato | 192×192 |  | `ter.ret.gigante` | F4 |
| `ter.ret.ingeniero` | retrato | 192×192 |  | `ter.ret.ingeniero` | F4 |
| `ter.fau.lobo` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ter.fau.lobo-caminar` | F2 |
| `ter.fau.oso` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ter.fau.oso-caminar` | F2 |
| `ter.fau.jabali` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ter.fau.jabali-caminar` | F2 |
| `ins.uni.colmena.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ins.uni.colmena.obrero-caminar` | F1 |
| `ins.uni.colmena.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ins.uni.colmena.guerrero-caminar` | F2 |
| `ins.uni.colmena.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ins.uni.colmena.tirador-caminar` | F2 |
| `ins.uni.colmena.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ins.uni.colmena.explorador-caminar` | F1 |
| `ins.uni.enjambre.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ins.uni.enjambre.obrero-caminar` | F1 |
| `ins.uni.enjambre.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ins.uni.enjambre.guerrero-caminar` | F2 |
| `ins.uni.enjambre.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ins.uni.enjambre.tirador-caminar` | F2 |
| `ins.uni.enjambre.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ins.uni.enjambre.explorador-caminar` | F1 |
| `ins.uni.parasito.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ins.uni.parasito.obrero-caminar` | F1 |
| `ins.uni.parasito.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ins.uni.parasito.guerrero-caminar` | F2 |
| `ins.uni.parasito.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ins.uni.parasito.tirador-caminar` | F2 |
| `ins.uni.parasito.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ins.uni.parasito.explorador-caminar` | F1 |
| `ins.uni.soldado_mandibulas` | campeón | 384×384 | 96 px × caminar/atacar/habilidad/morir filas | `ins.uni.soldado_mandibulas-caminar` | F3 |
| `ins.ret.colmena` | retrato | 192×192 |  | `ins.ret.colmena` | F4 |
| `ins.ret.enjambre` | retrato | 192×192 |  | `ins.ret.enjambre` | F4 |
| `ins.ret.parasito` | retrato | 192×192 |  | `ins.ret.parasito` | F4 |
| `ins.fau.arana` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ins.fau.arana-caminar` | F2 |
| `ins.fau.mantis` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ins.fau.mantis-caminar` | F2 |
| `ins.fau.hormiga_roja` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ins.fau.hormiga_roja-caminar` | F2 |
| `acu.uni.abisal.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `acu.uni.abisal.obrero-caminar` | F1 |
| `acu.uni.abisal.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `acu.uni.abisal.guerrero-caminar` | F2 |
| `acu.uni.abisal.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `acu.uni.abisal.tirador-caminar` | F2 |
| `acu.uni.abisal.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `acu.uni.abisal.explorador-caminar` | F1 |
| `acu.uni.arrecife.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `acu.uni.arrecife.obrero-caminar` | F1 |
| `acu.uni.arrecife.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `acu.uni.arrecife.guerrero-caminar` | F2 |
| `acu.uni.arrecife.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `acu.uni.arrecife.tirador-caminar` | F2 |
| `acu.uni.arrecife.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `acu.uni.arrecife.explorador-caminar` | F1 |
| `acu.uni.anfibio.obrero` | unidad | 256×256 | 64 px × caminar/nadar/trabajar/morir filas | `acu.uni.anfibio.obrero-caminar` | F1 |
| `acu.uni.anfibio.guerrero` | unidad | 256×256 | 64 px × caminar/nadar/atacar/morir filas | `acu.uni.anfibio.guerrero-caminar` | F2 |
| `acu.uni.anfibio.tirador` | unidad | 256×256 | 64 px × caminar/nadar/atacar/morir filas | `acu.uni.anfibio.tirador-caminar` | F2 |
| `acu.uni.anfibio.explorador` | unidad | 256×192 | 64 px × caminar/nadar/morir filas | `acu.uni.anfibio.explorador-caminar` | F1 |
| `acu.uni.pulpo_tinta` | campeón | 384×384 | 96 px × caminar/atacar/habilidad/morir filas | `acu.uni.pulpo_tinta-caminar` | F3 |
| `acu.ret.abisal` | retrato | 192×192 |  | `acu.ret.abisal` | F4 |
| `acu.ret.arrecife` | retrato | 192×192 |  | `acu.ret.arrecife` | F4 |
| `acu.ret.anfibio` | retrato | 192×192 |  | `acu.ret.anfibio` | F4 |
| `acu.fau.tiburon` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `acu.fau.tiburon-caminar` | F2 |
| `acu.fau.morena` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `acu.fau.morena-caminar` | F2 |
| `acu.fau.medusa` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `acu.fau.medusa-caminar` | F2 |
| `ave.uni.rapaz.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ave.uni.rapaz.obrero-caminar` | F1 |
| `ave.uni.rapaz.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ave.uni.rapaz.guerrero-caminar` | F2 |
| `ave.uni.rapaz.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ave.uni.rapaz.tirador-caminar` | F2 |
| `ave.uni.rapaz.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ave.uni.rapaz.explorador-caminar` | F1 |
| `ave.uni.carronera.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ave.uni.carronera.obrero-caminar` | F1 |
| `ave.uni.carronera.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ave.uni.carronera.guerrero-caminar` | F2 |
| `ave.uni.carronera.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ave.uni.carronera.tirador-caminar` | F2 |
| `ave.uni.carronera.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ave.uni.carronera.explorador-caminar` | F1 |
| `ave.uni.migratoria.obrero` | unidad | 256×192 | 64 px × caminar/trabajar/morir filas | `ave.uni.migratoria.obrero-caminar` | F1 |
| `ave.uni.migratoria.guerrero` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ave.uni.migratoria.guerrero-caminar` | F2 |
| `ave.uni.migratoria.tirador` | unidad | 256×192 | 64 px × caminar/atacar/morir filas | `ave.uni.migratoria.tirador-caminar` | F2 |
| `ave.uni.migratoria.explorador` | unidad | 256×128 | 64 px × caminar/morir filas | `ave.uni.migratoria.explorador-caminar` | F1 |
| `ave.uni.halcon_picada` | campeón | 384×384 | 96 px × caminar/atacar/habilidad/morir filas | `ave.uni.halcon_picada-caminar` | F3 |
| `ave.ret.rapaz` | retrato | 192×192 |  | `ave.ret.rapaz` | F4 |
| `ave.ret.carronera` | retrato | 192×192 |  | `ave.ret.carronera` | F4 |
| `ave.ret.migratoria` | retrato | 192×192 |  | `ave.ret.migratoria` | F4 |
| `ave.fau.gato_montes` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ave.fau.gato_montes-caminar` | F2 |
| `ave.fau.serpiente` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ave.fau.serpiente-caminar` | F2 |
| `ave.fau.buho` | fauna | 384×288 | 96 px × caminar/atacar/morir filas | `ave.fau.buho-caminar` | F2 |
| `ter.tran.1` | transición | 1920×1080 |  | `ter.tran.1` | F4 |
| `ter.tran.2` | transición | 1920×1080 |  | `ter.tran.2` | F4 |
| `ter.portada` | portada | 1920×1080 |  | `ter.portada` | F4 |
| `ins.tran.1` | transición | 1920×1080 |  | `ins.tran.1` | F4 |
| `ins.tran.2` | transición | 1920×1080 |  | `ins.tran.2` | F4 |
| `ins.portada` | portada | 1920×1080 |  | `ins.portada` | F4 |
| `acu.tran.1` | transición | 1920×1080 |  | `acu.tran.1` | F4 |
| `acu.tran.2` | transición | 1920×1080 |  | `acu.tran.2` | F4 |
| `acu.portada` | portada | 1920×1080 |  | `acu.portada` | F4 |
| `ave.tran.1` | transición | 1920×1080 |  | `ave.tran.1` | F4 |
| `ave.tran.2` | transición | 1920×1080 |  | `ave.tran.2` | F4 |
| `ave.portada` | portada | 1920×1080 |  | `ave.portada` | F4 |
| `anf.tran.2` | transición | 1920×1080 |  | `anf.tran.2` | F4 |
| `gen.portada` | portada | 1920×1080 |  | `gen.portada` | F4 |

## 8. Qué NO resuelve este documento

- No hay imágenes: nada se generó. Las descripciones se validan al generar el lote de la Fase 0; los prompts se ajustan ahí (un cambio en un bloque de familia, `ENV` o `Estilo`, se propaga a todo y se regenera el JSON).
- Costo por imagen de `gen4_image_turbo`: 2 créditos está en `art/runway/LEEME.md`, **no** en el código; confirmar en el panel de Runway.
- No se verificó que Runway respete la hoja 2×2 con consistencia de personaje (en la Era 1 solo se generaron sprites sueltos). La Fase 0 incluye `obrero-caminar` justamente para probarlo; plan B si falla: pedir **un cuadro por generación** (4× el costo de las unidades: ≈ +1128 créditos) y animar por interpolación de pose en código.
- El procesado (§6.5), las referencias de especie (§3.1) y el generador multi-imagen son trabajo del agente de código/dueño; este documento solo los especifica.
- Las cifras y biología citadas (termiteros, hornero, cuervos con herramientas, acuicultura) son ideas de inspiración, no afirmaciones para mostrar dentro del juego sin verificar en fuentes primarias.
