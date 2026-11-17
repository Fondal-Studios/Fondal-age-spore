# Era 2: habilidades activas (Ciclo 4, módulo balance/simulación)

Las cinco habilidades (teclas 1 a 5) cuestan **energía de cada animal que participa** (nunca Instinto), tienen enfriamiento y nivel 1 a 3 (`abilityInfo(id)`; el nivel sale de la especie, de los rasgos afines y del linaje, ver `ABL`). Este documento es la tabla vigente, el criterio de uso, el resultado visible que emite cada una y qué se midió. Los números son los de `ABD` en `eras/era2-animales.html`.

## Contrato de eventos (Bus)

| Evento | Argumentos | Cuándo |
| --- | --- | --- |
| `ability` | `(id, animales, nivel, P)` | al usarla. `P` conserva los números del nivel (`cd`, `en`, `r`, `t`, ...) y suma `{ id, nivel, costo, duracion, afectados, resultado }` (`resultado` = lo que se espera, en una frase) |
| `abilityEnd` | `(id, res, nivel)` | cuando termina el efecto, con lo **medido**. `res = { id, nivel, costo, duracion, afectados, danoRecibido, bajas, texto, ...propios }`; `texto` es la frase lista para mostrar |

Campos propios de `res`: Rugido `aturdidos`, `expulsados`; Camuflaje `golpes`; Excavar `hambreAhorrada` (por animal), `danoEvitado`; Alarma `retirados`, `enPeligro`, `vivos`; Migrar `llegaron`, `riqueza`, `hambreGanada`, `energiaGanada`, `energiaAhorrada`. Todo vive en `G.x2` (`run`, `zones`, `dm`, `kl`, `sv`, `avd`, `cmh`, `esv`, `zex`) y se guarda con la partida: una habilidad activa al guardar termina bien al cargar. Si la partida es vieja (sin esos campos) todo parte de 0.

## Qué decía la medición y qué se rediseñó

Antes (Ciclo 3 y 4, `tests/era2-balance.md` §5, §6, §11): en partidas completas solo Camuflaje y el conjunto rendían; Alarma, Excavar y Migrar no se distinguían de cero (±6 puntos) y Rugido no sumaba. Causa común: **las muertes de una partida son hambre (≈ 17), rivales (≈ 8) y depredadores (≈ 2)**; las habilidades que solo tocaban el combate contra depredadores o curaban no tocaban lo que mata. Las rediseñadas atacan lo que sí mata: la comida (Excavar, Migrar), la competencia de los rivales (Rugido) y las bajas de crías y heridos (Alarma).

| Habilidad | Qué hace (nivel 1 / 2 / 3) | Costo (energía/animal) · enfriamiento | Qué comportamiento cambia | Decisión estratégica | Resultado visible |
| --- | --- | --- | --- | --- | --- |
| **Rugido** | aturde 3/4/5 s y empuja 26/34/42 a los enemigos hasta 120/150/180; **zona de dominio** 12/16/20 s: los rivales y depredadores salvajes dentro de la zona huyen de ella (no cazan ni compiten); nivel 3: los deja asustados 5 s (−30 % de ataque) | 5/6/7, solo pagan los que tienen un enemigo a alcance · 25/24/22 s | `think()` de los no propios: dentro de una zona activa huyen (estado `flee`) | dónde y cuándo marcar territorio (la zona queda donde estaba la manada; si te vas, la dejás); se usa con 2 o más enemigos, jefe o rival comiendo tus plantas | anillo en el mapa; `abilityEnd`: aturdidos, rivales/depredadores mantenidos fuera, daño recibido y bajas durante la zona |
| **Camuflaje** | 10/14/18 s sin ser objetivo; niveles 2 y 3: los golpes camuflados pegan +25 % / +40 % (emboscada) | 12/12/14 · 40/38/35 s | `canEat` (los depredadores no te eligen) y `matchup` (emboscada) | emboscar o evadir; sirve para cazar y para pasar de largo un jefe | `abilityEnd`: golpes camuflados dados, daño recibido, bajas |
| **Excavar** (hibernar) | **6/9/12 s** bajo tierra: sin daño (frío, fuego, enemigos, ni siquiera el de hambre), **hambre −50 %**, curan 12/15/18 % de vida por s y 3 de energía por s; no comen ni se mueven | 8/8/10 · 35/32/30 s | `dmg` (inmunidad), `hr` (hambre) | aguantar invierno, sequía, incendio o escasez sin perder animales; cuesta 8-16 s sin comer ni reproducirse | `abilityEnd`: hambre ahorrada por animal, daño evitado |
| **Alarma** | los aliados a 210/260/320 quedan 8/10/12 s en alerta (reaccionan antes al depredador que caza, huyen ×1,15/1,25/1,35 sin gastar más energía, −15/20/25 % de daño, sin emboscada contra ellos); **con un peligro a la vista, los que tienen un nido, refugio o fogata a menos de 260 corren ahí y esperan mientras dura la alerta (nadie ataca a un animal junto al nido, pero tampoco comen)** | 4/4/5 solo en el radio · 35/32/28 s | `think()` (`a.alr`: destino de retirada), `canEat` + `safeNear` (nadie los ataca en el nido) | exige tener nido, refugio o fogata (sin ellos solo hay aviso); cuesta el tiempo de comer: hay que usarla cuando el peligro vale más que el hambre | `abilityEnd`: cuántos se retiraron, cuántos tenían un enemigo a menos de 200, cuántos siguen vivos |
| **Migrar** | el grupo corre ×1,6/1,9/2,2 durante 5/6/8 s sin gastar energía; al llegar a un lugar con plantas gana hasta 12/20/28 de energía y **30/45/60 de hambre** (× riqueza de plantas a 80 del punto) | 6 · 30/28/26 s | convoy: ignora forrajeo y energía de movimiento | cuándo abandonar una zona agotada y adónde (se elige el punto en el mapa) | `abilityEnd`: animales que llegaron, riqueza del destino, hambre y energía ganadas, energía ahorrada |

## Interacciones

- **Alarma + Excavar**: los heridos se refugian en el nido (Alarma) y el resto hiberna (Excavar): el grupo aguanta un cerco o una sequía sin perder animales; la manada no come mientras tanto.
- **Rugido + Camuflaje**: el rugido deja una zona sin enemigos; el camuflaje permite cazar dentro de ella sin que los de afuera vean.
- **Migrar + Rugido**: migrar a plantas ricas y marcar territorio ahí asegura la comida del destino frente a un rival; los dos se pagan en energía.
- **Migrar y Excavar** no se superponen: bajo tierra no se corre.
- Las prioridades (`G.x2.prio`, `docs/ERA2-PRIORIDADES.md`) no cambian los números de las habilidades; sí cambian cuándo conviene usarlas: con exploración alta la manada ve más lejos pero gasta más energía (más caro pagar 6 de Migrar), con defensa alta la formación ya reduce daño (Alarma pesa menos).

## Medición

Ver `tests/era2-balance.md` §12 (resultados con intervalos, incluidos los que no mejoraron). Reproducir: `tests/era2-habilidades-bot.sh` (todas / ninguna / sin una, perfil `habil`; el bot usa Excavar al escasear la comida) y `tests/era2-alarma.js`.
