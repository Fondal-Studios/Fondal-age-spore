# Art Gate de la Era 2 (módulo Arte/Animación, Calidad 2.0)

Hojas de contacto a 4x (12 especies × caminar, comer, atacar, descansar, herido, muerto + «juego 1x» + «12 px ×4»):
`docs/artgate/antes.png` (commit base `1bd2b9d3`, extraído con `git show`, el HTML viejo no tiene estados: ahí «comer/atacar/descansar» salen iguales y «muerto» no existía) y `docs/artgate/despues.png`.
Se regeneran con `node tools/art-gate-era2.js antes|despues`. Capturas por bioma: `docs/artgate/screens/` (1280 y 390 px).
Criterios: A silueta distinta · B legible a 12 px · C paleta coherente con su ecosistema · D expresividad (estados) · E coherencia de estilo (contorno #2b2233, degradado, brillo).
Veredicto honesto: miré ambas hojas. Ninguna especie quedó idéntica al dibujo viejo: las que «pasaban» (aves, peces) se conservan como **concepto y base** (misma paleta y proporciones) pero se redibujan para sumar estados y rasgos anatómicos propios.

| Especie | A | B (12 px) | C | D | E | Estado y motivo |
| --- | --- | --- | --- | --- | --- | --- |
| ter_cazador | sí (esbelto, hocico largo, cola poblada) | sí | sí | sí | sí | REDISEÑADO: era la misma silueta marrón que gigante e ingeniero |
| ter_gigante | sí (joroba, cabeza baja, colmillos, garras) | sí (masa grande) | sí | sí | sí | REDISEÑADO. Riesgo: la joroba oscura puede leerse como caparazón; se aclaró, a revisar con jugadores |
| ter_ingeniero | sí (cola plana, dientes, rama) | sí (cola + rama) | sí | sí | sí | REDISEÑADO |
| ins_colmena | sí (abdomen rayado) | sí (rayas) | sí | medio (alas, 4 px de cuerpo) | sí | REDISEÑADO |
| ins_enjambre | sí (alargada, patas de salto) | **débil**: a 12 px es una raya verde | sí | medio | sí | REDISEÑADO; legibilidad pendiente |
| ins_parasito | sí (cintura fina, ovipositor, patas largas) | **débil**: se lee como cruz | sí | medio | sí | REDISEÑADO; legibilidad pendiente |
| acu_abisal | sí (señuelo luminoso, boca con dientes) | sí (brillo del señuelo) | sí | sí | sí | REDISEÑADO (conserva el cuerpo azul profundo) |
| acu_arrecife | sí (franjas, aletas amarillas) | sí | sí | sí | sí | REDISEÑADO |
| acu_anfibio | sí (patas con dedos, cola, branquias) | sí | sí | sí | sí; patas algo rígidas | REDISEÑADO |
| ave_rapaz | sí (alas anchas con dedos, pico curvo) | medio (parecida a carroñera en tamaño) | sí | sí | sí | REDISEÑADO |
| ave_carronera | sí (cuello pelado, gorguera) | medio | sí | sí | sí | REDISEÑADO |
| ave_migratoria | sí (aerodinámica, cola en horquilla) | sí | sí | sí | sí | REDISEÑADO |

Pendiente de arte: pulir insectos a 12 px; aleteo de aves en reposo muy parecido entre rapaz y carroñera; los rasgos (TV) ahora se anclan a la anatomía de cada especie, pero no están pintados uno por uno como en la Era 1.
