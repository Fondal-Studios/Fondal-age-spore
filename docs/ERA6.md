# Era 6: Las Estrellas — diseño y estado

Archivo: `eras/era6-estrellas.html`. Ganchos: `window.__e6`. Guardado: `evo_save6_v1`. Linaje: lee Eras 1 a 5; al ganar escribe `from: 6` y `era6: {civ, especie, K, t, como, sistemas, dificultad}`, y suma una entrada a `evo_recorridos` (la portada cuenta cuántas veces llegaste a las estrellas). Es el **final del recorrido**: muestra el epílogo «de la célula a las estrellas» con lo que hiciste en cada era.

## 1. Pilares
1. **Kardashev Tipo II.** K = (log₁₀ P − 6) / 10. La población aporta ~2·10¹² W por unidad (un planeta lleno ≈ K 0,73, donde terminó la Era 5). Un **enjambre de Dyson** capta una fracción de la luz de su estrella: niveles 1–5 = 10⁻¹⁰, 10⁻⁷, 10⁻⁴, 10⁻², 1 × luminosidad (Sol = 3,8·10²⁶ W). Un enjambre completo (nivel 5) alrededor de una estrella como el Sol da K ≈ 2,06: **Tipo II, victoria**.
2. **Flotas con la ley cuadrática de Lanchester** (la misma idea de la Era 4): fuerza = eficacia × naves². El panel «Por qué ganó» muestra la cuenta. Juntar naves rinde: el doble de naves pega cuatro veces más.
3. **Cada especie, su mundo.** Habitabilidad por clase: acuáticos en océanos, insectos en mundos rocosos, terrestres y aves en mundos jardín; las aves pueden vivir flotando en gigantes gaseosos. Terraformación suma 0,3.
4. **Partidas cortas y legibles** (12–14 min): tocar un sistema propio, tocar el destino (o arrastrar), elegir 25/50/100 %.

## 2. Galaxia
40 estrellas en una espiral de dos brazos (semilla). Tipos: enana roja (×0,05 de luz), amarilla (×1), blanca (×3), gigante azul (×12). Planetas: jardín, océano, rocoso, helado, gaseoso, asteroides. Los sistemas libres tienen defensa propia (6–30 naves). Cada sistema natal empieza con 18 naves, población 8 y un astillero; resiste +50 %.

## 3. Economía y obras
Energía: 0,07 × población + enjambre (0,5 a 7 × luz). Ciencia: población × laboratorios. Naves: (0,035 + 0,014 × población) × astilleros. Obras por sistema (una a la vez): Astillero 1–3, Laboratorio 1–3, Escudo planetario 1–3 (Escudos), Enjambre de Dyson 1–5 (3–4 piden Enjambres de Dyson; 5 pide Esfera de Dyson). Costos del enjambre: 70, 170, 340, 640, 1100 de energía; 12 a 75 s. **Aviso a todos** cuando alguien empieza el nivel 4 o 5: es la señal para atacar ese sistema.
Tecnologías (8): Motor de curvatura, Armas de energía, Blindaje de nanotubos, Escudos planetarios, Terraformación, Fábricas replicantes, Enjambres de Dyson, Esfera de Dyson.

## 4. Fin
Tipo II (K ≥ 2), o conquista (tomar los sistemas natales de todos los rivales, o ser la única civilización en pie). Se pierde si te eliminan o si otro llega antes.

## 5. Rivales
Las otras clases con personalidad: conquista (terrestres), enjambre (insectos), dyson (acuáticos), ciencia (aves). Defienden su sistema natal (reserva mínima), refuerzan sistemas amenazados y atacan al que está cerca del Tipo II.

## 6. Balance (bots, `tests/era6-balance.js`, jugador manejado por la IA)
| Dificultad | Rivales | Victorias | Duración mediana |
| --- | --- | --- | --- |
| Fácil | 1 | 6/6 | 14 min |
| Normal | 2 | 4/6 (perfil dyson), 5/6 (conquista) | 12–13 min |
| Difícil | 3 | 3/8 | 13 min |

## 7. En línea
Hasta 4 civilizaciones con el relay compartido, lockstep (1 turno = 0,1 s), reconexión con «Volver a mi partida». Cosméticos del Pase Fundador: estela de tus flotas (no cambia nada del juego ni del hash).

## 8. Qué es aproximación
Kardashev, Dyson (1960) y Lanchester (1916) son ideas publicadas; las cifras de luz por tipo de estrella son órdenes de magnitud simplificados; viajar más rápido que la luz y todo lo demás (costos, tiempos, habitabilidad) es diseño de juego.
