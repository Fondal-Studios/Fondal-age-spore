# Era 2 · Evolución y claridad (Ciclo 4)

Respuesta a la prueba del dueño: la Era 2 «se vuelve algo aburrida» porque **evolucionar no se siente** y hay **mucho caos en pantalla**; además «los acuáticos están muy limitados por su entorno» y eligió **poder salir del agua**. Archivos: `eras/era2-animales.html` (simulación e interfaz) y `eras/era2-arte.js` (dibujo). Prueba: `tests/era2-evolucion.js`. Arte a encargar: `docs/ARTE-RUNWAY-ERA2.md`.

## 1. Cada evolución cambia algo que se ve, algo que se juega y abre una decisión

### 1.1 Capacidades (`CAPS`)
Cada uno de los 36 rasgos (y los 4 de transición) da una **capacidad**: una regla nueva, no un porcentaje. Nivel 1 = el rasgo; 2 = con su variante A o B; 3 = con la maestría de su hilo; cada híbrido da una capacidad (o le sube un nivel, `HYBCAP`). El parámetro de cada nivel está en `CAPS[id].L` y el texto de la interfaz se arma con esos mismos números (`capText`).

| Tipo | Capacidades (rasgo → qué cambia en la partida) |
| --- | --- |
| Terreno | **Vuelo** (alas): lo que camina vuela, cruza el lago y lo terrestre falla más; si ya volaba, *vuelo alto* (lo que no vuela lo ve desde menos lejos); un pez con alas es *pez volador*. **Nado** (aletas): lo que camina entra al lago (refugio, algas); un ave pesca (algas +25 %); un pez caza sin que le esquiven. **Rutas** (migración): colonizar pide 4 animales, no 8. **Cardumen veloz** (radiadas). **Orilla / Tierra firme / Huevo con cáscara** (transición, §2). |
| Presas | **Cazador** (garras): presas hasta ×1,45/1,6/1,75 su tamaño y un herbívoro también caza. **Caza en manada**: hasta ×1,7/1,9/2,1. **Embestida** (cuernos): 30/45/60 % de asustar y empujar. **Parálisis** (aguijón): 25/35/45 % de paralizar 1 s. **Ecolocación**: busca presas ×1,4/1,6/1,8 más lejos. **Herramientas**: ignora 50/75/100 % de la defensa del blanco. |
| Defensa | **Coraza** (caparazón): los atacantes más chicos hacen 35 % del daño; con Espinas, el que muerde recibe 20 %. **Quitina** (exo): casi no queda herido. **Carrera** (patas): perseguirlo cansa 1,5/2/2,5 de energía por s. **Ojo avizor** (visión): nadie lo embosca y huye a ×1,2-1,4. **Aposematismo** (veneno) y **Falsa advertencia** (imitación): los depredadores salvajes no lo eligen como presa. **Cripsis** (camuflaje): quieto es invisible. **Señuelo**: esquiva un golpe entero cada 12/10/8 s. **Repelente** (defquim): el que muerde deja de perseguir 4/6/8 s. **Alarma química** (feromonas): si atacan a uno, los aliados del radio huyen. **Territorio**: los rivales no entran a 100-140 de tus nidos. **Fuego**: los depredadores salvajes no entran a 110-150 de tus nidos. |
| Cría | **Camada**: 2 (nivel 3: 3) crías por huevo. **Crianza** (cuidado): crías crecen ×1,6-2 y reciben 40 % menos daño. **Larvas** (metamorfosis): huevos junto al agua eclosionan ×1,5-2. **Castas** (colmena): +15/20/25 de población máxima. **Madriguera**: refugio del nido 80/90/100 (antes 58) y a salvo del fuego. **Nido elevado**: nadie come tus huevos. |
| Comida y clima | **Rastreo** (olfato): carroña y huevos ×2-3 más lejos. **Estómago fuerte** (digestión): carnívoro come plantas, herbívoro carroña. **Jardín** (ingeniería): cada nido hace brotar 3-5 plantas. **Abrigo** (piel): inmune al frío. **Sangre caliente**: el invierno no frena ni da hambre. **Letargo** (hibernación): quieto en invierno/sequía gasta ×0,6-0,4 de hambre. **Reserva**: sin el hambre de la sequía y del calor. **Pirófila**: inmune al fuego. |
| Mente | **Lenguaje**: obedecen las órdenes salvo pánico. |

### 1.2 Ramas que se excluyen (`EXCL`)
Elegir una cierra la otra para siempre (como en la Era 1): camadas ⟂ cuidado (estrategia r contra K), veneno ⟂ camuflaje e imitación ⟂ camuflaje (advertir contra esconderse), alas ⟂ caparazón (peso), exo ⟂ piel, territorio ⟂ migración, radiadas ⟂ lobuladas (quedarse o salir del agua). La pantalla de evolución ofrece a veces los dos lados juntos («Decisión: dos caminos que se excluyen»: 86 de 200 ofertas en la prueba) y cada carta dice qué cierra. Los rivales también respetan las exclusiones y nunca reciben rasgos de transición.

### 1.3 Se ve (marcador procedural, sin gastar en dibujo)
`eras/era2-arte.js` · `MORPH`: cada rasgo cambia **tamaño** (k), **proporciones** (largo sx, ancho sy) y **color** (vira hacia un tono), además de la pieza que ya dibujaba (`TV`). Variante A: más grande; B: más alargada y color más fuerte. Maestría: aura del color del hilo; híbrido: bandas en el lomo; cada evolución suma +1,2 % de tamaño (hasta +14 %). Transición: aletas lobuladas debajo del pez → cuerpo de anfibio con patas → tetrápodo de tierra (`DRAW.tetrapodo`). Prueba: los 36 rasgos, las 72 variantes (y A ≠ B), las 12 maestrías, los 12 híbridos y las etapas cambian el hash de píxeles del dibujo.

### 1.4 Pantalla de evolución y metamorfosis
- Cada carta: dibujo **antes (izquierda) → después (derecha)** calculado sobre una copia de tu especie (`previewSp`), la capacidad nueva o su nuevo nivel, el cambio de terreno, lo que gana y lo que pierde (efectos reales de `fx`, costos de la transición y «Cierra: …»). Arriba: el hábitat y las capacidades que ya tenés.
- Al elegir: **metamorfosis** de 1,8 s en el mapa (tus animales muestran la forma vieja, destello, la nueva con un rebote) y una tarjeta de 4,5 s «antes → después» con la capacidad nueva (un clic la cierra). Es solo interfaz (`META`, fuera de `G`).
- Ficha de tu especie: hábitat (o etapa de la transición), capacidades como chips y rasgos.

### 1.5 Ritmo
`INST_STEP` 5 → 6 (cuánto más Instinto pide cada evolución). Medido con bots (8 perfiles, 12 especies, Normal, N = 190 partidas con evolución): primera evolución a los **23 s** de mediana (p90 34 s, máx. 77 s: siempre ≤ 90 s); intervalos de mediana 34 s (1.ª→2.ª), 36 s, 54 s, 61 s, 59 s, 61 s, 65 s, 60 s (p75 83-95 s). Es decir: dos decisiones rápidas al empezar y después **una cada ≈ 1 min (hasta 1,5 min)**; no llega a «cada 2 min». Con `INST_STEP` 8 los intervalos eran 30/49/58/70 s, pero los carnívoros perdían 12-31 puntos de victoria (evolucionan menos y dependen de los multiplicadores de caza): se dejó en 6.

## 2. Los acuáticos salen del agua
Sigue el orden real de los tetrápodos (sin cifras ni fechas): peces de aletas lobuladas → anfibios que respiran aire pero crían en el agua → amniotas con piel que no se seca y huevo con cáscara. Etapa `sp.lst` derivada de los rasgos (no hay estado nuevo que guardar); los anfibios pioneros nacen en la etapa 2.

| Etapa | Rasgo | Abre | Paga |
| --- | --- | --- | --- |
| 0 · agua | — | lago (y las zonas del §2.1) | — |
| 1 · orilla | Aletas lobuladas | sale hasta 70 de la costa: plantas y presas de la orilla | nada ×0,9; en tierra ×0,75; en la orilla lo cazan los de tierra |
| 2 · anfibio | Pulmones y patas | toda la tierra (hábitat `amph`) y sus plantas | nada ×0,8; a > 160 del agua +15 % de hambre (anfibios: +10 %, como antes), a > 340 se deshidrata (−0,4 vida/s); **pone huevos solo a ≤ 70 del agua**; al merodear vuelve hacia el agua. Empieza en la orilla. (Los costos nuevos de esta etapa valen para tu especie; los rivales anfibios conservan su ritmo afinado.) |
| 3 · tierra | Piel seca y huevo con cáscara | cría en cualquier lado, sin deshidratación, tierra ×1,05 | nada ×0,65: el agua deja de ser refugio |
| rama | Aletas radiadas | +15 % nadando; en cardumen (≥ 3) los depredadores fallan 30 % más | cierra la salida del agua |

La siguiente etapa siempre está en la mesa para un acuático; en la etapa 0, contra «aletas radiadas». Al ganar la Era 2, `evo_lineage.era2.tierra = true` si completó la transición (el resto de `era2` sigue igual; se agregan `etapa` y `capacidades`); el diálogo final lo dice («ciudad anfibia de costa» o «submarina»).

### 2.1 Más para hacer en el agua
Zonas fijas por bioma (no usan `R()`), dibujadas en el lago: **praderas de algas** (las algas rebrotan el doble), **bajío de desove** (tus huevos eclosionan 60 % antes y nadie se los come) y **fosa** (los cazadores del agua pegan 25 % más: peligro para los chicos, ventaja para los abisales).

## 3. Menos caos
Modo foco (por defecto; botón «Foco», tecla F) y paneles cerrados: `docs/ERA2-UX.md` (sección Ciclo 4). Capturas en `docs/ciclo4/era2-evo/`.

## 4. Balance
Ver `tests/era2-balance.md` §13.
Resumen (pareado contra `245b102`, N = 192 por dificultad): Fácil 97 %, Normal 56 % [49-63], Difícil 27 % [21-33] (metas ≥ 70 / 40-60 / 15-35), con hambre recalibrada (Normal hd 4,5; Difícil 5,0) porque las capacidades subían Difícil a 49 %. Salir del agua: abisales 0 → 21 %, anfibios 13 → 46 %, arrecife 96 → 63 % (quedarse vs salir, N = 24): ni dominante ni inviable. Los rivales no usan 6 capacidades que dejaban sin comida a los carnívoros (`RIVNO`).

## 5. Pendiente
- Anfibios que no completan la transición: 17 % en Normal (la etapa 2 es de paso, pero es bajo).
- Las capacidades sueltas no se midieron una por una en partidas completas; el bot no las busca a propósito.
- Escucha y juego humano: nadie jugó esta versión.
