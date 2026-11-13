# Era 4: Civilizaciones (El arte de la guerra) — diseño y estado del bosquejo

Archivo jugable: `eras/era4-civilizaciones.html` (prototipo). Pruebas: `tests/era4-guardado.js`, `tests/era4-bot.js`.
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
