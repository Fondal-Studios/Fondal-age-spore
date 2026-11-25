# Era 5: La Industria — diseño y estado

Archivo: `eras/era5-industria.html` (autocontenido, canvas). Ganchos de prueba: `window.__e5`. Guardado: `evo_save5_v1`. Linaje: lee `evo_lineage` (Eras 1 a 4) y al ganar escribe `from: 5` con `era5: {civ, especie, K, temp, t, como, pacto, techs, regiones, dificultad}`.
Marca de honestidad: todo lo descripto existe y corre; balance medido **con bots**, no con personas.

## 1. Pilares
1. **Energía = progreso.** La **escala de Kardashev** (Sagan: K = (log₁₀ P − 6) / 10, P en vatios) se muestra siempre. En el juego, 1 unidad de energía = 1 TW: la capital sola da K ≈ 0,61; la humanidad real anda en K ≈ 0,73.
2. **Logística:** una región unida por **vía férrea** a la capital rinde 100 %; sin vía, 50 % (70 % con Electricidad: la red eléctrica).
3. **Un clima de todos.** El calentamiento sale del CO₂ **acumulado** de todas las civilizaciones (en la ciencia real el calentamiento es casi proporcional a las emisiones acumuladas; acá el factor es de juego: 0,0009 °C por «Gt» de juego). A +1,4 °C hay **Cumbre climática** (firmar: CO₂ fósil −50 %, energía fósil −15 %); a +2 °C empiezan sequías y tormentas; a **+4 °C el planeta colapsa y nadie gana**. Es un dilema de bienes comunes: quemar carbón te adelanta, pero le cobra a todos.
4. **Carrera al espacio.** Gana quien hace despegar primero el **Arca estelar** (tercera etapa del programa espacial). Todas las etapas de todos se ven en el panel «Carrera al espacio».

## 2. Mapa y regiones
Continente con ~26 regiones (Voronoi sobre una grilla con ruido; semilla). Terrenos: llanura fértil, montañas, cuenca de carbón, valle de río, costa ventosa, desierto soleado. Un edificio por región, niveles 1–3 (obra con tiempo). La capital da un poco de todo. Influencia para **anexar** regiones libres vecinas (costo 12 + 4,5 × regiones) o **absorber** regiones de un rival con estabilidad < 35 (triple costo).

| Edificio | Terreno | Efecto por nivel (a pleno) |
| --- | --- | --- |
| Granjas | llanura, río (+25 %), costa | +1,05 comida/s |
| Minas | montaña, cuenca | +0,62 materiales/s |
| Central de carbón | cuenca, montaña | +2,1 energía, +0,5 Gt CO₂/s |
| Fábrica | casi todos | −1,4 energía → +1 material/s, +0,1 influencia, bienes (estabilidad) |
| Universidad | todos | −0,6 energía → +0,5 ciencia/s |
| Represa | río (Electricidad) | +2,3 energía limpia |
| Parque solar y eólico | desierto (×1,4), costa (×1,3), llanura (Solar y eólica) | +1,9 energía limpia |
| Central nuclear | llanura, montaña, cuenca, desierto (Fisión) | +5,2 energía; consume materiales; accidentes raros |
| Captura de carbono | todos (Captura) | −0,7 Gt CO₂/s; −1,2 energía |

Cada clase pone sus nombres (p. ej. Colmena: «Hornos de turba», «Reactor de la reina»; Acuáticos: «Quemadores de metano», «Turbinas de corriente»); la mecánica es la misma.
**Población:** crece con comida de sobra hasta un tope (10 + 3,2 × regiones; +30 % con Medicina). Cada edificio necesita gente: si falta, todo rinde menos (`eff`). **Apagones:** si la demanda de energía supera la oferta, fábricas y universidades rinden menos y baja la estabilidad. **Estabilidad:** sube con bienes (fábricas), Medicina, Radio y el acuerdo climático; baja con hambre, apagones, calor y humo propio. En 0 durante 12 s: revolución (perdés).

## 3. Tecnologías (14, en 4 edades)
Vapor: Ferrocarril, Química, Acero → Electricidad (Edad II): Electricidad, Radio, Medicina, Motor → Edad III: Fisión, Solar y eólica, Computación, Captura de carbono, Cohetería → Era espacial: Satélites, Arca estelar. Programa espacial: Satélite (Cohetería, 110 materiales, 30 s), Misión tripulada (Satélites, K ≥ 0,68, 220, 45 s), Arca estelar (Arca, K ≥ 0,72, 380, 70 s). Sin energía suficiente la obra avanza a un tercio.

## 4. Eventos con decisión
Petróleo (explotar: +60 materiales y +80 Gt / dejarlo bajo tierra), huelga ferroviaria, exposición universal, epidemia (desde el minuto 4), inventora, y la Cumbre climática. Cada civilización decide la suya (los bots con `R()` según su personalidad). En línea el juego no se pausa: si nadie elige en 40 s se toma la segunda opción.

## 5. Rivales
Las otras clases, con los nombres de la Era 4 (Clanes de Tolmar, Colmena de Kerán, Arrecife de Ushad, Bandada de Ilen) y personalidad: **industrial** (carbón), **verde** (río y sol, firma acuerdos), **científica** (universidades y fisión). Ante +2,3 °C hasta la industrial deja el carbón; sin lugar libre reconvierten edificios que sobran (universidades sin nada que investigar, granjas de más) en energía.

## 6. Balance medido (bots, `tests/era5-balance.js`, jugador manejado por la IA industrial)
| Dificultad | Rivales | Victorias | Duración mediana | Fines |
| --- | --- | --- | --- | --- |
| Fácil | 1 | 9/10 | 12 min | Arca 10 |
| Normal | 2 | 7/10 | 11 min | Arca 10 |
| Difícil | 3 | 3/10 | 10 min | Arca 10 |
Calentamiento mediano +1,4 a +1,9 °C; el colapso aparece cuando varias civilizaciones queman carbón sin firmar (visto en corridas anteriores al ajuste de la IA). Una persona juega distinto que el bot: falta medir con gente.

## 7. En línea
Hasta 4 civilizaciones (personas + bots) con el mismo relay de la Era 1, lockstep: 1 turno del relay = 1 paso de 0,1 s. Ver `MULTIJUGADOR.md`.

## 8. Qué es aproximación
La fórmula de Kardashev y la proporcionalidad calentamiento–CO₂ acumulado son ciencia publicada; **todos** los números (rendimientos, costos, el factor °C/Gt, umbrales de 2 y 4 °C como disparadores de eventos, accidentes nucleares) son parámetros de juego. Verificar antes de usar el juego como material educativo.
