# Era 2: identidad de clases y especies (Ciclo 4, módulo balance/simulación)

## Qué existe realmente (verificado en `SP2` y `CLSN`)

El director planteó cinco identidades (Terrestres, Aves, Insectos, Anfibios, Gigantes). **En el código hay 4 clases con 3 especies cada una**: Terrestres (`ter_cazador`, `ter_gigante`, `ter_ingeniero`), Insectos (`ins_colmena`, `ins_enjambre`, `ins_parasito`), Acuáticos (`acu_abisal`, `acu_arrecife`, `acu_anfibio`) y Aves (`ave_rapaz`, `ave_carronera`, `ave_migratoria`). **Anfibios y Gigantes son especies, no clases** (Anfibios pioneros dentro de Acuáticos; Gigantes herbívoros dentro de Terrestres). Se mantuvo esa estructura (cambiarla rompe el menú, el linaje de la Era 1 y los guardados) y las identidades se asignaron así: clase = Terrestres, Insectos, Aves, Acuáticos; especie con identidad propia = Anfibios (agua/tierra) y Gigantes (poder con alto consumo).

## Por qué ganaban más las aves (causa medida)

`ave_rapaz` ganaba 92 % y `ave_migratoria` 75-79 % en Normal contra 29-67 % de acuáticos y terrestres (8 perfiles). La ventaja mecánica de volar en el código **base**: (1) `plantOk` deja comer en las plantas de tierra **y** en las algas del lago, el doble de comida disponible; (2) vista de 200-220 contra 110-170: encuentran comida a más distancia; (3) velocidad 88-95: escapan de todo terrestre (`miss += .2` contra presa voladora + huida ×1,3); (4) no tienen costo de vuelo: gastaban hambre y energía como un terrestre. La comida por animal-segundo era la más alta (10,1 contra 7,3-8,5) y las muertes por hambre y por rivales las más bajas. Costo agregado (medido): **+8 % de hambre y +15 % de energía al moverse** (el vuelo es caro; con +12 % y +20 % las aves bajaron de 72 a 60 % en Normal y de 40 a 18 % en Difícil, se recortó), y la ventaja de exploración se hizo visible con **merodeo ×1,4**.

## Tabla de identidades (`CLSX` y `SPX` en `eras/era2-animales.html`; `speciesInfo` genera el texto desde estos números)

| Clase / especie | Identidad | Qué cambia (número) | Ventaja visible | Desventaja honesta | Métrica |
| --- | --- | --- | --- | --- | --- |
| **Terrestres** | resistencia, control del territorio, versatilidad alimentaria | −15 % de energía al moverse; a < 130 de su nido, refugio o fogata: +10 % de ataque y −10 % de daño (matchup «En su territorio»); carroña aprovechable (`scav` +0,3: los herbívoros también) | no se agotan, ganan peleas en casa, comen restos | sin vuelo ni nado (el lago los frena); lejos del nido sin ventaja | colapsos por partida, % de la comida que es carroña |
| **Aves** | movilidad y exploración | vista 200-220 (ya estaba); merodeo ×1,4; **+8 % de hambre y +15 % de energía al moverse** | cobertura del mapa, cruzan lagos y biomas | el vuelo gasta | cobertura (celdas de 80 px visitadas), hambre por segundo |
| **Insectos** | colonia, reproducción, fragilidad | protección por aliados cerca hasta −24 % (otros −20 %; −6 % por aliado en vez de −5 %); eclosión 15 % más rápida; población máxima 60 (otros 40); consumo ∝ tamaño^0,25 (≈ −16 %) | nacimientos por animal-segundo (≈ ×2), población máxima | 7-10 de vida: son los que más animales pierden por animal-segundo; los brotes de enfermedad (5 o más a su alrededor) los castigan | nacimientos por animal-s, población máxima, muertes por animal-s |
| **Acuáticos** | agua, cardumen | +5 % de velocidad nadando; +30 % de protección grupal; las algas rinden +25 % por bocado | los terrestres no los alcanzan en el agua; comen mejor del lago | dependen del lago (poca comida, algas) | % del tiempo en el agua, golpes recibidos, comida por animal-s |
| **Anfibios** (especie) | especialización agua/tierra, dependencia ambiental | ante un depredador huyen hacia el lago; −15 % de daño y +10 % de velocidad en el agua; lejos del agua (> 160): +10 % de hambre y −5 % de velocidad | el lago es un refugio real (los terrestres no entran) | piel seca: en el desierto (lago chico) o lejos del agua pagan hambre | % del tiempo en agua, golpes recibidos |
| **Gigantes** (especie) | poder y resistencia, alto consumo, reproducción lenta | +20 % de hambre; cada huevo cuesta +40 % de hambre; espera entre puestas +25 %; (ya tenían 95 de vida y 30 % de defensa) | los depredadores chicos no pueden con un adulto (regla de tamaño) | comen más y crían lento | hambre por segundo, nacimientos por animal-s, muertes por enemigos |

Todas las clases y especies aplican la **alometría** (consumo de hambre ∝ radio^0,25, `ALO.e`): insectos ≈ −16 %, gigantes ≈ +12 %. Se aplica a las especies jugables, también si las lleva un rival, no a los animales salvajes (el ecosistema se afinó con ellos).

RESULTADOS: ver `tests/era2-balance.md` §12.
