# Biblia de arte de la Era 2 (Runway) · Animales que evolucionan

Documento del Ciclo 4 (módulo Era 2 · Evolución y claridad). Describe **qué hay que dibujar** para reemplazar los marcadores procedurales de la Era 2 por arte pintado con Runway. **Solo documentación**: no se generó ninguna imagen. El juego hoy dibuja todo en canvas (`eras/era2-arte.js`) con formas simples a propósito (el dueño no quiere gastar en dibujo hasta Runway); cada id de este documento corresponde a algo que el código ya distingue, así que el reemplazo es id por id.

Usa el mismo lenguaje y las mismas reglas que la biblia de la Era 3 (`docs/ARTE-RUNWAY-ERA3.md`, escrita por el director de arte en paralelo): gouache digital, contorno **#2b2233**, luz arriba a la izquierda, brillo blanco translúcido, **sin texto dentro del dibujo**, fondo magenta plano **#FF00FF** al generar (clave de color) y **transparente** después del procesado. Los habitantes de la Era 3 son tu especie de la Era 2 (`docs/ERA3-CIVILIZACIONES.md` §3): las referencias `e2.<especie>.retrato` de acá son las que la Era 3 pide como referencia de especie.

## 0. Resumen

| Grupo | Ids | Qué es | Prioridad |
| --- | --- | --- | --- |
| Especies jugables (mapa + retrato) | 12 × 2 = 24 | el cuerpo base de cada especie | F1 |
| Transición a tierra (acuáticos) | 3 especies × 3 etapas × 2 vistas + 3 «radiadas» × 2 = 24 | pez → orilla → anfibio → tetrápodo; o quedarse en el agua | F1 |
| Fauna salvaje y jefe | 7 × 1 = 7 | conejo, ciervo, escarabajo, pez, lobo, pez grande, oso | F1 |
| Piezas de rasgo (superpuestas) | 40 | una pieza por rasgo, anclada a la anatomía | F2 |
| Marcas de variante A/B | 36 × 2 = 72 | cómo cambia la pieza con cada variante | F3 |
| Auras de maestría | 12 | una por hilo | F3 |
| Patrones de híbrido | 12 | bandas / manchas sobre el lomo | F3 |
| Íconos de capacidad (interfaz) | 40 | chips de la ficha de especie y de la pantalla de evolución | F2 |
| Zonas del lago | 3 | praderas de algas, bajío de desove, fosa | F2 |
| Efecto de metamorfosis | 1 hoja de 4 cuadros | destello antes → después | F2 |
| **Total** | **≈ 239 ids** | | |

Carpeta: `art/runway/era2/<grupo>/<id>.png`. Modelo y costo: los mismos que fija la biblia de la Era 3 (verificar en el panel de Runway antes de lanzar un lote).

## 1. Reglas de estilo y de cámara (Era 2)

### 1.1 Dos vistas por especie
- **`mapa` (cenital pura, mirando a la derecha)**: el juego **rota** el sprite hacia donde camina el animal (`drawAnimal` usa `ctx.rotate(a)`), así que el animal se pinta **visto desde arriba**, con la cabeza hacia la **derecha** (este) y el eje del cuerpo horizontal y centrado. No 3/4: un sprite en 3/4 rotado se ve cabeza abajo. Patas, alas y aletas abiertas hacia los costados (como se ven desde arriba).
- **`retrato` (cenital 3/4, ≈ 45°, mirando a la derecha)**: el de la ficha de especie, la pantalla de evolución (antes → después) y la referencia que usa la Era 3 para sus habitantes. Misma especie, mismo color, mismo nivel de detalle.

### 1.2 Tamaños
| Tipo | Lienzo final | Ocupación | Nota |
| --- | --- | --- | --- |
| `mapa` | 128×128 | el cuerpo (sin patas) ≈ 45 % del ancho; con patas, alas y cola ≤ 90 % | el código escala por el radio `r` de la especie (`SP2`), así que **todas se piden al mismo tamaño en el cuadro** (también los insectos) |
| `retrato` | 256×256 | ≈ 80 % del cuadro, anclado abajo al centro | |
| pieza de rasgo | 128×128 (la misma grilla que `mapa`) | solo la pieza, en su lugar sobre un cuerpo «fantasma» del tamaño estándar | se superpone al `mapa`; ver §4 |
| ícono de capacidad | 64×64 | ≈ 70 % del cuadro | para chips de interfaz |
| zona del lago | 256×256 | baldosa que se repite o mancha suelta | vista cenital |

### 1.3 Consistencia de la evolución (lo más importante)
La queja del dueño fue «evolucionar no se siente». El arte tiene que hacer **evidente** el cambio, como hoy lo hace el marcador procedural (`MORPH` en `eras/era2-arte.js`):
1. **Silueta primero**: cada rasgo cambia el contorno (algo que sale del cuerpo: alas, púas, cuernos, aletas, patas largas, caparazón). Si un rasgo es químico o mental, cambia el **color** y agrega un **patrón** (manchas de advertencia, bandas, brillo).
2. **Mismo animal**: las piezas se pintan sobre la misma pose y el mismo tamaño de cuerpo; el jugador tiene que reconocer a SU especie antes y después.
3. **Tamaño**: el cuerpo crece un poco con cada evolución (el juego ya lo hace: +1,2 % por rasgo, hasta +14 %); no hace falta pintarlo, el código escala.
4. **Color**: el código vira el color del cuerpo según los rasgos (tabla `MORPH.tint`); las piezas se pintan en sus propios colores y el cuerpo base en el color de la especie (`SP2[...].col`).

### 1.4 Fórmula del prompt (en inglés)
`[subject], top-down view looking straight down, head pointing right, body centered and horizontal, limbs spread to the sides | (retrato: three-quarter top-down view at 45 degrees, facing right) , [details], hand-painted 2D game sprite, painterly gouache texture, bold dark plum outline (#2b2233), soft light from the upper left, small white glossy highlight upper left, toy-like readable shapes, no text, no letters, no cast shadow, flat solid magenta background (#FF00FF)`.

Para piezas: `[only the part], placed where it attaches to a generic ghost body of a [species type] seen from above (ghost body very faint grey, will be removed), ...` y en el procesado se borra todo lo que no sea la pieza.

### 1.5 Qué evitar
Sombras proyectadas (el juego dibuja la elipse de contacto), fondos con textura, perspectiva distinta entre especies, realismo anatómico (formas de juguete legibles a 40 px), texto, marcos.

## 2. Especies jugables (12)

Cada especie: `e2.<especie>.mapa` (128×128, cenital mirando a la derecha) y `e2.<especie>.retrato` (256×256, 3/4). Color base = `col` del juego. Lo que el marcador procedural ya dibuja es la guía de silueta.

| Id | Especie | Color base | Descripción (silueta y rasgos que la distinguen) |
| --- | --- | --- | --- |
| `e2.ter_cazador` | Cazadores de manada | #8a6b4a | Lobo esbelto: hocico largo, orejas en punta, cola poblada, patas finas. Ágil, cazador. |
| `e2.ter_gigante` | Gigantes herbívoros | #7a6a55 | Mole herbívora: joroba, cabeza baja y ancha, patas gruesas como columnas, piel gruesa. El más grande (radio 13). |
| `e2.ter_ingeniero` | Omnívoros ingenieros | #9a7a5a | Castor: cuerpo redondo, cola plana escamada, dientes de roer, sostiene una ramita. |
| `e2.ins_colmena` | Colmena con castas | #d9a520 | Abeja: abdomen rayado amarillo y negro, alas transparentes rápidas, antenas. |
| `e2.ins_enjambre` | Enjambre migratorio | #a9c040 | Langosta: cuerpo largo y fino verde, patas traseras de salto, alas plegadas. |
| `e2.ins_parasito` | Parasitoides | #7b4aa0 | Avispa parasitoide: cintura de avispa muy fina, ovipositor largo, violeta metálico. |
| `e2.acu_abisal` | Depredadores abisales | #2a5a8a | Pez abisal: boca enorme con dientes, señuelo luminoso en una antena, puntos bioluminiscentes. |
| `e2.acu_arrecife` | Arrecife constructor | #e07a5f | Pez de arrecife: franjas blancas, aletas amarillas vistosas, cola bifurcada. |
| `e2.acu_anfibio` | Anfibios pioneros | #4a9a6a | Ajolote: cuatro patitas con dedos, branquias rosadas a los lados de la cabeza, cola de salamandra. Nace en la etapa 2 de la transición. |
| `e2.ave_rapaz` | Rapaces | #6a4a3a | Rapaz: alas anchas con «dedos» en la punta, pico curvo, garras amarillas. |
| `e2.ave_carronera` | Carroñeras oportunistas | #4a4a52 | Buitre: cuello pelado con gorguera clara, pico robusto, alas largas oscuras. |
| `e2.ave_migratoria` | Migratorias y polinizadoras | #3f8fd1 | Golondrina o colibrí: aerodinámica, alas largas y finas, cola en horquilla. |

## 3. Transición a tierra (acuáticos) · lo nuevo del Ciclo 4

Basada en el orden real de la evolución de los tetrápodos (peces de aletas lobuladas → anfibios que respiran aire pero crían en el agua → amniotas con piel que no se seca y huevo con cáscara). **No** se afirman fechas ni especies fósiles concretas en el juego; el arte puede inspirarse en la idea general, sin copiar reconstrucciones.

Cada etapa necesita `mapa` y `retrato` para `acu_abisal` y `acu_arrecife`; para `acu_anfibio` solo la etapa 3 (nace en la 2).

| Id | Etapa | Qué cambia en el dibujo | Cómo se juega (para que el arte lo cuente) |
| --- | --- | --- | --- |
| `e2.<acu>.t1` | 1 · Aletas lobuladas (orilla) | El mismo pez, con **cuatro aletas carnosas** con un hueso visible (como brazos cortos) apoyadas en el piso; cabeza algo más chata; color un poco más verdoso. | Sale hasta 70 de la costa; ahí lo cazan los de tierra. Nada 10 % más lento. |
| `e2.<acu>.t2` | 2 · Pulmones y patas (anfibio) | Cuerpo de anfibio: **cuatro patas con dedos**, cuello, cola de salamandra; conserva el color y una marca de su especie (la franja del arrecife, los puntos luminosos del abisal). Burbujitas en la nariz. | Camina por toda la tierra; se seca lejos del agua y cría solo junto a ella. |
| `e2.<acu>.t3` | 3 · Piel seca y huevo con cáscara (tierra) | **Tetrápodo de tierra**: cuerpo largo y bajo, patas con codo hacia los costados, **escamas** en chevron sobre el lomo, ojos dorados, sin branquias; un huevo con cáscara junto a la cola (pieza aparte `e2.rasgo.amniota`). Color más terroso. | Animal de tierra: cría en cualquier lado y no se seca; nada 35 % más lento. En la Era 3 funda una ciudad anfibia de costa. |
| `e2.<acu>.rad` | Rama «aletas radiadas» (quedarse en el agua) | El pez más **hidrodinámico**: más largo y fino, aletas de radios finos y abiertos como abanicos azules, cola más grande. | Nada más rápido y en cardumen los peces grandes fallan. Cierra la salida del agua. |

Además, una **hoja de comparación** `e2.transicion.hoja` (1024×256, 4 paneles, solo para el documento de diseño y la pantalla de carga): pez → orilla → anfibio → tierra del arrecife, en fila.

## 4. Piezas de rasgo (36 + 4 de transición)

Una pieza por rasgo, pintada **sobre la grilla de `mapa`** (128×128, cenital, cabeza a la derecha), anclada a la parte del cuerpo indicada. El código ya conoce la anatomía de cada especie (`h.A`: `fx` punta del hocico, `hx` cabeza, `bw` ancho del cuerpo, `bl` largo, `bx` grupa, `tx` punta de la cola, `neck` cuello) y la ubica; la pieza se pinta para un cuerpo estándar de ancho medio. Variantes A y B: §5.

| Id | Rasgo | Ancla | Descripción de la pieza |
| --- | --- | --- | --- |
| `e2.rasgo.alas` | Alas | lomo, a los dos lados | Par de alas abiertas (membrana en terrestres, plumas en aves, transparentes en insectos: 3 sub-ids `.membrana`, `.plumas`, `.insecto`). |
| `e2.rasgo.aletas` | Aletas y branquias | costados + cuello | Aletas triangulares azules a los costados y una cresta dorsal; branquias rosadas detrás de la cabeza. |
| `e2.rasgo.patas` | Patas largas | 4 patas | Patas largas y finas de corredor, en pose de zancada, abiertas hacia los costados. |
| `e2.rasgo.caparazon` | Caparazón | todo el lomo | Caparazón ovalado de placas (marrón con bordes claros), cubre el cuerpo entero. |
| `e2.rasgo.exo` | Exoesqueleto | segmentos del lomo | Anillos de quitina oscura con brillo metálico sobre el cuerpo. |
| `e2.rasgo.piel` | Piel gruesa | contorno | Pelaje desflecado que sobresale de todo el contorno (más claro). |
| `e2.rasgo.garras` | Colmillos y garras | hocico | Colmillos blancos curvos asomando del hocico y garras en las patas delanteras. |
| `e2.rasgo.cuernos` | Cuernos y embestida | cabeza | Dos cuernos gruesos curvados hacia adelante. |
| `e2.rasgo.aguijon` | Aguijón | punta de la cola | Aguijón triangular naranja con gota. |
| `e2.rasgo.olfato` | Olfato agudo | hocico | Nariz grande y oscura con tres ondas de olor saliendo (las ondas son trazos, no texto). |
| `e2.rasgo.vision` | Visión nocturna | ojos | Ojos grandes amarillos con pupila vertical, brillantes. |
| `e2.rasgo.eco` | Ecolocación | frente | Arcos de sonido violeta-azulados delante de la cabeza. |
| `e2.rasgo.sangre` | Sangre caliente | alrededor | Halo cálido rojo anaranjado suave alrededor del cuerpo (se anima con pulso). |
| `e2.rasgo.hiber` | Hibernación | alrededor | Contorno punteado celeste con tres copitos de nieve orbitando. |
| `e2.rasgo.digest` | Digestión eficiente | vientre | Panza verde redondeada con un intestino dibujado en espiral. |
| `e2.rasgo.camadas` | Camadas numerosas | detrás de la cola | Cuatro huevitos crema en racimo. |
| `e2.rasgo.cuidado` | Cuidado parental | costado | Una cría pegada al costado (versión mini de la especie, sin detalle). |
| `e2.rasgo.metamorfosis` | Metamorfosis | alrededor | Capullo punteado violeta y una larva chica junto a la grupa. |
| `e2.rasgo.manada` | Manada | detrás, a los lados | Siluetas oscuras translúcidas de dos compañeros (sombras de manada). |
| `e2.rasgo.colmena` | Colmena | lomo | Tres celdas hexagonales de panal ámbar sobre el lomo. |
| `e2.rasgo.territorio` | Territorialidad | alrededor | Círculo punteado de marca con una mojonera marrón. |
| `e2.rasgo.veneno` | Veneno | hocico + borde | Gotas verdes que caen del hocico y borde verde tóxico en el lomo. |
| `e2.rasgo.feromonas` | Feromonas | cola | Dos estelas onduladas violetas saliendo de la grupa. |
| `e2.rasgo.defquim` | Defensas químicas | lomo | Glándulas redondas amarillas con contorno, como ampollas. |
| `e2.rasgo.camuflaje` | Camuflaje | todo el cuerpo | Manchas verde musgo irregulares (en `.B`: manchas gris piedra). |
| `e2.rasgo.senuelo` | Señuelo y fuga | grupa | Dos ocelos (falsos ojos) en la grupa. |
| `e2.rasgo.imitacion` | Imitación de advertencia | todo el cuerpo | Franjas diagonales amarillas y negras de advertencia. |
| `e2.rasgo.madriguera` | Madriguera | debajo, a un costado | Montículo de tierra con la boca oscura de un túnel. |
| `e2.rasgo.nido` | Nido elevado | sobre el lomo | Nido de ramitas con un huevo. |
| `e2.rasgo.ingenieria` | Ingeniería del ecosistema | lomo | Un brote verde de dos hojas que crece del lomo. |
| `e2.rasgo.migracion` | Migración | grupa | Líneas de movimiento en V detrás del animal. |
| `e2.rasgo.reserva` | Reserva de agua | sobre el lomo | Gota azul grande (en `.A`: gota ámbar de grasa). |
| `e2.rasgo.pirofila` | Adaptación al fuego | grupa | Dos llamitas naranjas en la grupa. |
| `e2.rasgo.herramientas` | Herramientas | pata delantera | Piedra tallada atada a un palo, sostenida. |
| `e2.rasgo.fuego` | Dominio del fuego | grupa | Antorcha chica encendida. |
| `e2.rasgo.lenguaje` | Lenguaje y gestos | sobre la cabeza | Globo de diálogo blanco con tres puntos (sin letras). |
| `e2.rasgo.lobuladas` | Aletas lobuladas | 4 aletas debajo | (Transición) cuatro aletas carnosas con un hueso claro, por DEBAJO del cuerpo. |
| `e2.rasgo.pulmones` | Pulmones y patas | nariz | (Transición) dos burbujas de aire saliendo de la nariz. |
| `e2.rasgo.amniota` | Piel seca y huevo con cáscara | junto a la cola | (Transición) un huevo con cáscara moteada. |
| `e2.rasgo.radiadas` | Aletas radiadas | costados | Dos aletas grandes en abanico de radios finos, azul translúcido. |

## 5. Variantes A y B (72 marcas)

Ids `e2.rasgo.<id>.A` y `.B`: la misma pieza modificada. Regla del marcador actual (que el arte tiene que respetar para que A y B se distingan de un vistazo): **A = la pieza más grande y robusta**; **B = la pieza con otro color y forma más alargada**. Lo que dice cada una:

| Rasgo | Variante A | Variante B |
| --- | --- | --- |
| alas | Alas de planeo: más anchas, puntas redondeadas | Alas de vuelo batido: más angostas y largas, en movimiento |
| aletas | Nado de persecución: aletas grandes y filosas, azules | Nado de resistencia: aletas cortas y gruesas, naranja |
| patas | Zancada de carrera: patas aún más largas, muslos marcados | Zancada de migración: patas con pelo, pezuñas anchas |
| caparazon | Placas óseas: placas más gruesas y altas | Espinas: caparazón con púas que sobresalen |
| exo | Muda rápida: quitina más fina y brillante (piel nueva) | Quitina gruesa: anillos más anchos y opacos |
| piel | Capa de grasa: cuerpo más redondo, pelo corto | Pelaje denso: flecos largos blancos |
| garras | Desgarro: garras largas curvas | Mordida de presa: mandíbula ancha con muelas |
| cuernos | Cuernos de combate: cortos y gruesos | Cornamenta de exhibición: ramificada y alta |
| aguijon | Aguijón paralizante: más largo, naranja | Aguijón en cadena: violeta, con anillos |
| olfato | Rastro fino: nariz más larga | Olfato de carroña: nariz arrugada, ondas verdosas |
| vision | Ojos de cazador: ojos frontales, amarillo claro | Ojos de presa: ojos laterales, naranja |
| eco | Eco fino: arcos cortos y apretados | Eco de largo alcance: arcos amplios naranja |
| sangre | Termorregulación: halo tenue | Hipertermia activa: halo intenso con vapor |
| hiber | Letargo profundo: más copos, cuerpo enroscado | Letargo parcial: pocos copos, ojos entreabiertos |
| digest | Rumia: panza doble | Digestión de carroña: panza oscura |
| camadas | Puesta masiva: más huevos | Crías precoces: dos crías ya nacidas |
| cuidado | Crianza en manada: dos crías | Crianza prolongada: cría bajo el cuerpo, más protegida |
| metamorfosis | Larva acuática: larva con aletas | Larva voraz: larva grande con mandíbulas |
| manada | Manada de caza: compañeros en posición de ataque | Manada de defensa: compañeros en círculo |
| colmena | Casta obrera: celdas con miel | Casta soldado: celdas oscuras con mandíbulas |
| territorio | Marcado fuerte: mojón alto | Territorio laxo: marcas dispersas |
| veneno | Neurotoxina: gotas verde neón | Hemotoxina: gotas magenta |
| feromonas | Feromona de alarma: estelas rojas en zigzag | Feromona de rastro: estelas largas violetas |
| defquim | Sabor amargo: glándulas amarillas | Repelente: glándulas celestes con vapor |
| camuflaje | Mimetismo de hoja: manchas verdes con forma de hoja | Mimetismo de roca: manchas grises de piedra |
| senuelo | Fuga en zigzag: ocelos con líneas de velocidad | Señuelo de cría: ocelos rojos más grandes |
| imitacion | Colores falsos: franjas amarillas | Imitación de toxina: franjas naranja |
| madriguera | Red de túneles: dos bocas | Cámara de cría: boca con huevos adentro |
| nido | Nido colgante: nido en forma de bolsa | Nido comunal: nido ancho con varios huevos |
| ingenieria | Arrecife de coral: brote de coral rosado | Termitero: torrecita de barro |
| migracion | Ruta de verano: líneas cálidas | Ruta de invierno: líneas celestes con copos |
| reserva | Reserva de grasa: gota ámbar | Pozos excavados: gota con tierra |
| pirofila | Carroña de incendio: llama con hueso | Refugio subterráneo: llama baja con tierra |
| herramientas | Piedra tallada: hacha de piedra | Herramienta de excavación: palo cavador |
| fuego | Fuego de cocina: antorcha con brasas | Fuego de defensa: antorcha alta |
| lenguaje | Gestos de alarma: globo con signo de alerta (sin letras: un triángulo) | Enseñanza: globo con tres puntos y una cría mirando |

## 6. Maestrías (12) e híbridos (12)

- **Maestría** (tres rasgos del mismo hilo): `e2.maestria.<hilo>` (128×128): un **aura** ovalada alrededor del cuerpo, pincelada, del color del hilo (Movimiento #2f7fd1, Defensa #7a8a90, Ataque #d1495b, Sentidos #e0a526, Metabolismo #e08a1e, Reproducción #c9406f, Social #12958f, Química #8a5cd0, Engaño #8c6a3b, Construcción #8c5a2b, Entorno #4f9d3a, Mente #3f56d9) y un pequeño **emblema** del hilo sobre el lomo (sin letras: una pluma, un escudo, un colmillo, un ojo, una llama, un huevo, tres puntos unidos, una gota, una máscara, una casita, una hoja, una espiral).
- **Híbrido** (dos hilos con dos rasgos cada uno): `e2.hibrido.<id>` (128×128): un **patrón** sobre el lomo que mezcla los dos colores de los hilos (bandas diagonales, manchas, rayas). Ids: `emboscador_toxico`, `cazador_de_rastros`, `muro_viviente`, `hibernador`, `colmena_expansiva`, `cultura_temprana`, `tactico`, `simbionte_digestivo`, `migrador`, `fortaleza_natural`, `herborista`, `estratega`.

## 7. Íconos de capacidad (40)

`e2.cap.<id>` (64×64, cenital, fondo transparente, contorno #2b2233): un ícono por capacidad (los chips de la ficha de especie y de la pantalla de evolución). Ids y motivo: `alas` ala abierta · `aletas` aleta con gota · `patas` pata en zancada · `caparazon` escudo-caparazón · `exo` anillo de quitina · `piel` copo sobre pelaje · `garras` tres garras · `cuernos` cuernos con onda de choque · `aguijon` aguijón con rayito · `olfato` nariz con ondas · `vision` ojo abierto · `eco` arcos de sonido · `sangre` gota roja con calor · `hiber` luna con copo · `digest` panza con hoja y hueso · `camadas` tres huevos · `cuidado` cría bajo un ala · `metamorfosis` capullo · `manada` tres huellas · `colmena` hexágono · `territorio` mojón · `veneno` gota con calavera de hueso (sin letras) · `feromonas` ondas violetas · `defquim` ampolla · `camuflaje` hoja y ojo tachado · `senuelo` ocelo · `imitacion` franjas de advertencia · `madriguera` boca de túnel · `nido` nido con huevo · `ingenieria` brote · `migracion` flecha curva · `reserva` gota azul · `pirofila` llama con escudo · `herramientas` hacha de piedra · `fuego` antorcha · `lenguaje` globo con puntos · `radiadas` aleta en abanico · `lobuladas` aleta con hueso · `pulmones` pulmón con burbuja · `amniota` huevo con cáscara.

## 8. Zonas del lago y efectos

| Id | Qué | Tamaño | Descripción |
| --- | --- | --- | --- |
| `e2.lago.algas` | Pradera de algas | 256×256 (mancha suelta) | Algas largas onduladas verde oscuro sobre agua, densas al centro y ralas al borde, vista cenital. |
| `e2.lago.bajio` | Bajío de desove | 256×256 | Agua muy poco profunda sobre arena clara, piedritas redondas, huevitos transparentes en grupos. |
| `e2.lago.fosa` | Fosa | 256×256 | Agua profunda azul muy oscuro al centro que se aclara hacia el borde; una silueta de pez grande apenas visible. |
| `e2.fx.metamorfosis` | Destello de evolución | 1024×256 (4 cuadros de 256) | Anillo dorado que se abre, chispas, destello blanco y aura que se cierra (el juego lo usa alrededor de cada animal propio al evolucionar). |
| `e2.fx.foco` | Halo del modo foco | 128×128 | Óvalo turquesa suave (#12e0d6 al 16 %) que va debajo de cada animal propio cuando el modo foco está prendido. |

## 9. Fauna salvaje (7)

`e2.salvaje.<id>.mapa` (128×128): `conejo` (orejas largas, beige), `ciervo` (astas, marrón), `escarabajo` (élitros verdes oscuros, seis patas), `pez` (pez chico celeste), `lobo` (gris, esbelto), `lucio` (pez grande alargado, azul oscuro, boca con dientes), `oso` (jefe: oso enorme marrón oscuro, garras claras; 96×96 de cuerpo en lienzo 192×192). Con el modo foco la fauna se dibuja atenuada (28-50 % de opacidad): conviene que sus colores sean **menos saturados** que los de las especies jugables para que tus animales resalten.

## 10. Orden sugerido (para gastar poco)
1. **F1** (lo que más se nota): las 12 especies `mapa` + `retrato` (24) y la transición de los acuáticos (24): 48 generaciones.
2. **F2**: las 40 piezas de rasgo, los 40 íconos de capacidad, las 3 zonas del lago y el destello: 84.
3. **F3**: variantes, maestrías e híbridos: 96.
Hoy la Era 2 **no carga ningún PNG**: todo es vector. Cuando se integre el arte, el cargador tiene que caer al marcador procedural para lo que falte o no cargue (como hace la Era 1 con `SPR_SVG` y `paintBody`), así se puede entregar por fases.
