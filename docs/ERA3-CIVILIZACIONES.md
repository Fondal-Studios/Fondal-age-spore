# Era 3 · De tribu a ciudad: una civilización por clase

Contrato de diseño del Ciclo 4 (decisión del dueño, 2026-11-17). Lo usan el agente que reescribe la Era 3 y el que escribe la biblia de arte para Runway. Si algo de este documento cambia, se cambia acá primero.

## 1. Qué pidió el dueño
- «Tendría que ser como un Clash of Clans: yo ir poniendo los edificios, ir generando, avanzando de edades. Ya en la Era 3 tiene que tornarse más Age of Empires.»
- «Tiene que ser la continuidad de la 2: si superé la 1 y la 2 con un animal acuático, la 3 tiene que seguir siendo una tribu acuática.» Lo mismo para insectos (una civilización insectoide de colmena) y una ciudad bajo el agua.
- Tecnologías y edificios distintos para cada especie.
- No gastar en calidad de dibujo ahora: el arte final se hará con Runway. El juego usa marcadores simples; todo lo que haga falta dibujar queda descrito en `docs/ARTE-RUNWAY-ERA3.md`.

## 2. Núcleo de juego
**Constructor de base (fase Clash) que se abre a estrategia de mapa (fase Age of Empires).**
1. **Colocar**: el jugador elige un edificio del menú, ve un fantasma sobre una grilla (celdas de 20 px, edificios de 2×2 o 3×3) y lo pone con clic/toque dentro de su territorio. Se puede mover un edificio terminado (sin costo) y vender/demoler (devuelve 50 %).
2. **Construir**: la obra avanza por etapas con obreros (sistema actual de obras por etapas: pago por etapa, se detiene sin material).
3. **Generar**: los productores llenan los almacenes solos según obreros asignados y nivel. No hay que tocar para cosechar. Cada almacén tiene tope; si se llena, la producción se pierde (incentiva mejorar almacenes).
4. **Mejorar**: cada edificio sube de nivel (1 a 3). El nivel máximo de todo depende de la Edad.
5. **Avanzar de Edad**: se mejora el **Corazón** (el edificio central) cuando se cumplen requisitos (recursos, población, edificios clave). Cada Edad agranda el territorio, abre edificios, tecnologías y unidades.
6. **Defender y expandirse**: los clanes rivales (sistema actual de clanes con personalidad y relación con causas) atacan con motivo; las defensas, muros y guerreros importan. Desde la Edad II se entrenan unidades; desde la Edad III se pueden mandar expediciones al mapa (tomar nodos de recursos lejanos, atacar o comerciar con un rival): ahí el juego se vuelve más Age of Empires.
7. **Salir de la Era 3**: con la Edad III completa y una Maravilla de la civilización construida, se funda la civilización (Era 4).

### Edades
| Edad | Nombre genérico | Territorio | Abre |
| --- | --- | --- | --- |
| I | Campamento | radio 6 celdas | Corazón, vivienda, almacén, productor de comida, extractor de material 1, tótem/saber |
| II | Aldea | radio 10 | productor 2 (cría), extractor de material 2, muro, torre, cuartel, tecnologías II, unidades guerrero |
| III | Ciudad | radio 14 + nodos lejanos | Maravilla, nivel 3 de todo, tecnologías III, expediciones al mapa |

Requisitos de ejemplo (se calibran con bots): Edad II = Corazón nv1 + 8 habitantes + 2 viviendas + almacén + 150 comida + 120 material 1. Edad III = 16 habitantes + 1 torre + 2 tecnologías II + recursos.

### Recursos (4 casilleros, nombre según la civilización)
| Casillero | Terrestres | Insectos | Acuáticos | Aves |
| --- | --- | --- | --- | --- |
| `comida` | Carne y bayas | Jalea | Algas y peces | Semillas e insectos |
| `mat1` | Madera | Fibra masticada (pulpa de papel) | Coral | Ramas |
| `mat2` | Piedra | Cera y resina | Nácar | Barro |
| `saber` | Saber | Memoria de la colmena | Cantos (memoria de las corrientes) | Rutas |

La lógica usa los ids de casillero; los nombres, íconos y textos salen de una tabla por civilización.

## 3. Continuidad Era 2 → Era 3
- La **clase** de la especie con la que se terminó la Era 2 decide la civilización (`evo_lineage.era2.cls`): `ter` → Terrestres, `ins` → Insectos, `acu` → Acuáticos, `ave` → Aves.
- La **especie** (3 por clase) decide una especialización (tabla 4.x), y los **rasgos** de la Era 2 dan bonos iniciales chicos y visibles («Rasgo Pulmones de la Era 2: +1 casilla de costa»).
- Los **habitantes** son tu especie: se dibujan con el módulo de arte de la Era 2 (`Era2Arte.drawAnimal`, mismo cuerpo, color, rasgos y cinta de linaje) más un accesorio por oficio. Mientras no haya arte de Runway, eso alcanza.
- **Acuáticos que salieron del agua** en la Era 2 (rasgo de transición a tierra, ver más abajo): fundan una ciudad **anfibia** de costa (mitad agua, mitad tierra) con acceso a los edificios de las dos zonas. Sin esa transición, la ciudad es **submarina**.
- Sin linaje (entrar directo a la Era 3): selector de especie (las 12) al empezar.
- Los **rivales** son otras civilizaciones (otras clases), con su personalidad (comerciante, belicoso, orgulloso).
- Al salir, la Era 3 escribe en `evo_lineage`: `era3: { civ, especie, edad, techs, maravilla, ... }` para la Era 4.

## 4. Las cuatro civilizaciones
Cada civilización tiene los mismos **casilleros de edificio** (para que el código y el balance sean uno solo) con nombre, dibujo y efecto propios, más **un edificio único** y **una Maravilla**.

### Casilleros comunes de edificio
| Casillero | Función |
| --- | --- |
| `corazon` | Centro. Su nivel = Edad. Almacena un poco de todo. |
| `vivienda` | +camas (población máxima). |
| `almacen` | +tope de almacenamiento. |
| `granja` | Produce comida (con obreros). |
| `cria` | Produce comida estable con animales domesticados (Edad II). |
| `ext1` | Produce material 1. |
| `ext2` | Produce material 2 (Edad II). |
| `saber` | Produce saber; habilita tecnologías. |
| `muro` | Bloquea el paso; segmentos de 1×1 (Edad II). |
| `torre` | Defensa a distancia (Edad II). |
| `cuartel` | Entrena guerreros (Edad II). |
| `unico` | Edificio único de la civilización (Edad II). |
| `maravilla` | Maravilla (Edad III); construirla abre la Era 4. |

### 4.1 Terrestres · «Clanes de la madriguera»
Fantasía: aldea que crece de madrigueras y chozas a una ciudad de piedra. La más equilibrada.
| Casillero | Nivel 1 → 2 → 3 |
| --- | --- |
| corazon | Fogón del clan → Gran hogar → Salón de piedra |
| vivienda | Madriguera → Choza → Casa de barro y piedra |
| almacen | Hoyo de reserva → Almacén → Granero de piedra |
| granja | Huerto silvestre → Huerto → Campos con surcos |
| cria | Corral → Establo → Rancho |
| ext1 | Campamento de leñadores → Aserradero → Taller de carpintería |
| ext2 | Pedrera → Cantera → Cantera con rampas |
| saber | Tótem → Círculo de relatos → Santuario |
| muro | Empalizada → Muro de troncos → Muralla de piedra |
| torre | Torre de honderos → Torre de arqueros → Bastión |
| cuartel | Campo de cazadores → Cuartel → Fuerte |
| unico | **Madriguera profunda**: refugio subterráneo: protege la población durante saqueos y el invierno |
| maravilla | **Círculo de piedras** (megalito): +saber y +moral; marca el inicio de la astronomía |

Tecnologías (I: Fuego, Herramientas de piedra, Recolección organizada, Pieles · II: Agricultura, Domesticación, Alfarería, Arcos · III: Metal blando, Rueda, Calendario, Escritura de marcas). Bono de clase: +10 % defensa cerca del Corazón; caza +10 %.
Especializaciones: Cazadores de manada (+guerreros), Gigantes (+carga y defensa, +consumo), Ingenieros (+velocidad de obra).

### 4.2 Insectos · «La Colmena»
Fantasía: civilización insectoide de castas; la ciudad es un termitero/colmena que crece hacia arriba y hacia abajo. Muchos individuos frágiles, nacimientos rápidos, coordinación por feromonas. Inspiración en biología real: hormigas cultivadoras de hongos, hormigas que crían pulgones, termiteros con ventilación, celdas hexagonales de cera.
| Casillero | Nivel 1 → 2 → 3 |
| --- | --- |
| corazon | Cámara de la Reina → Gran cámara real → Corazón de la Colmena |
| vivienda | Celdas de cría → Panal de celdas → Torre de panales |
| almacen | Despensa de cera → Silo de jalea → Bóveda de reserva |
| granja | Jardín de hongos → Cámara de cultivo → Jardín climatizado |
| cria | Establo de pulgones → Granja de pulgones → Rebaño ordeñado |
| ext1 | Masticadero de fibra → Molino de pulpa → Fábrica de papel |
| ext2 | Cerería → Glándulas de cera → Destilería de resina |
| saber | Sala de antenas → Red de feromonas → Mente de la colmena |
| muro | Pared de pulpa → Muro de cera endurecida → Muralla viva (soldados anclados) |
| torre | Torre de aguijones → Torre de ácido → Torre de enjambre |
| cuartel | Criadero de soldados → Cuartel de castas → Nido de guerra |
| unico | **Chimenea de ventilación** (como en los termiteros): regula temperatura: sin pérdidas por frío ni calor, +eficiencia de cultivo |
| maravilla | **La Reina Madre**: natalidad muy alta y obreros más baratos |

Tecnologías (I: Castas, Rastro de feromonas, Cultivo de hongos, Celdas hexagonales · II: Domesticación de pulgones, Ácido fórmico, Ventilación, Puentes vivientes · III: Enjambre coordinado, Metamorfosis guiada, Antibióticos naturales (como las hormigas cortadoras), Colmena-ciudad). Bono de clase: nacimientos +50 %, construcción +20 %; habitantes con −30 % vida.
Especializaciones: Colmena (+producción), Enjambre (+unidades baratas), Parasitoides (sabotaje de rivales).

### 4.3 Acuáticos · «La Ciudad del Arrecife»
Fantasía: civilización submarina: ciudad de coral, nácar y burbujas sobre el lecho marino, con corrientes como caminos; no hay fuego, la energía viene de fuentes hidrotermales y bioluminiscencia. Inspiración real: arrecifes de coral, acuicultura, pulpos que usan herramientas, ecolocalización de cetáceos.
| Casillero | Nivel 1 → 2 → 3 |
| --- | --- |
| corazon | Concha del consejo → Gran anémona → Palacio de nácar |
| vivienda | Grieta-refugio → Pólipo-vivienda → Torre de coral |
| almacen | Cueva de reservas → Bóveda de nácar → Cámara sellada |
| granja | Pradera de algas → Granja de algas → Bosque de quelpo |
| cria | Corral de peces → Vivero de peces → Criadero de cardúmenes |
| ext1 | Arrecife cultivado → Vivero de coral → Jardín de coral |
| ext2 | Lecho de ostras → Ostrario → Taller de nácar |
| saber | Gruta de cantos → Anfiteatro de ecos → Biblioteca de corrientes |
| muro | Barrera de esponjas → Barrera de medusas (urticantes) → Muralla de coral de fuego |
| torre | Pulpo vigía (tinta) → Torre de erizos → Torre de luz (bioluminiscencia que ciega) |
| cuartel | Escuela del cardumen → Guarnición → Fortaleza de las mareas |
| unico | **Fumarola domada** (fuente hidrotermal): energía y calor para la ciudad; sustituye al fuego |
| maravilla | **Corriente domada**: una corriente que transporta recursos y unidades por todo el mapa |

Tecnologías (I: Herramientas de concha, Pesca en cardumen, Cultivo de algas, Bioluminiscencia · II: Acuicultura, Ecolocalización, Nácar trabajado, Tinta · III: Corrientes, Presión profunda, Simbiosis con ballenas, Escritura en nácar). Bono de clase: comida estable (algas +25 %), defensa por bioluminiscencia; no puede usar edificios de tierra.
Ciudad **anfibia** (si en la Era 2 desarrolló la transición a tierra): costa con agua y tierra; en tierra usa los edificios terrestres de nivel 1–2 y gana +material.
Especializaciones: Abisales (fumarolas +, visión en la oscuridad), Arrecife (coral +, defensa), Anfibios (ciudad de costa).

### 4.4 Aves · «La Bandada»
Fantasía: ciudades en acantilados y copas de árboles gigantes; movilidad, vista del mapa, comercio y migración.
| Casillero | Nivel 1 → 2 → 3 |
| --- | --- |
| corazon | Nido mayor → Árbol de la bandada → Ciudad del acantilado |
| vivienda | Nidos → Nidos tejidos → Colonia de nidos |
| almacen | Hueco del árbol → Granero colgante → Despensa del acantilado |
| granja | Campo de bayas → Huerta de semillas → Terrazas |
| cria | Criadero de larvas → Gusanera → Criadero de insectos |
| ext1 | Recolección de ramas → Tejeduría → Taller de cestería |
| ext2 | Pozo de barro → Alfarería de nido → Horno de barro |
| saber | Atalaya de vuelos → Mirador de rutas → Observatorio del cielo |
| muro | Espinal (cerco de espinas) → Seto de espinos → Muro de barro cocido |
| torre | Percha de vigías → Nido de rapaces → Torre de halcones |
| cuartel | Nido de cazadores → Escuela de picada → Aguilera |
| unico | **Dormidero**: la bandada ve todo el mapa cercano; revela ataques con anticipación |
| maravilla | **La Gran Ruta Migratoria**: comercio a distancia con todos los clanes y visión total |

Tecnologías (I: Nidos tejidos, Vuelo en V, Recolección de semillas, Herramientas con pico (como los cuervos) · II: Alfarería de barro (como el hornero), Vigías, Mensajeros, Picada · III: Rutas migratorias, Mapas del cielo, Comercio lejano, Plumas ceremoniales). Bono de clase: exploración y visión +, comercio +; edificios más frágiles.
Especializaciones: Rapaces (+ataque de torres y guerreros), Carroñeras (+comida de restos), Migratorias (+comercio y rutas).

## 5. Unidades (Edad II en adelante)
Mismos roles en todas las civilizaciones, con nombre y aspecto de la especie: **obrero** (construye, recolecta), **guerrero** (cuerpo a cuerpo), **tirador** (a distancia, Edad II), **explorador** (revela mapa, Edad I), **campeón** (Edad III, uno por civilización con habilidad propia: Gigante de guerra / Soldado de mandíbulas / Pulpo de tinta / Halcón de picada). Los habitantes ya existentes (oficios) son los obreros; los guerreros salen del cuartel.

## 6. Qué se conserva del código actual
Simulación por paso fijo con `R()`, Bus de eventos, `tribeInfo`/`rivalInfo`/`buildingInfo`, prioridades, oficios y organización automática, obras por etapas, clanes con personalidad y relación con causas, alertas, guardado y linaje. Lo nuevo (grilla, colocación, Edades, tablas por civilización, unidades) se agrega encima. Las partidas viejas (`evo_save3_v1`) se migran: sus edificios pasan a la civilización Terrestre (la que era) con el casillero equivalente.

## 7. Qué NO entra en este ciclo
Arte final (lo hará Runway), multijugador de la Era 3, combate táctico fino. El dibujo en el juego es provisorio: formas simples con el color y el ícono de cada civilización, más los habitantes dibujados con el arte de la Era 2.
