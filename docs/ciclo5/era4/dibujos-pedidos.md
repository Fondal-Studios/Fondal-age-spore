# Era 4 · dibujos pedidos para el motor de Anakin

Mismo estilo y tamaño que `art/era3/` (256 px, fondo transparente salvo el suelo, sin texto). Hasta que existan, la Era 4 usa el dibujo procedural (`art()` devuelve `null`).

## Faltan en art/era3 (ids que la Era 4 ya pide: basta con sumarlos a `art/era3/manifest.js`)
| id | qué es | uso en la Era 4 |
| --- | --- | --- |
| `ins.terreno.suelo` | suelo de la Colmena (tierra con hojarasca y galerías), mosaico que se repite | patrón del mapa para Insectos |
| `ter.terreno.arbusto` | arbusto de bayas | decorado suelto en la llanura (Terrestres) |
| `ave.terreno.veta` | barrial / veta de barro | decorado de acantilados (Aves) |

## Nuevos (necesitan una línea de código para usarse)
| id propuesto | qué es | dónde iría |
| --- | --- | --- |
| `<civ>.unidad.guerrero`, `<civ>.unidad.tirador`, `<civ>.unidad.campeon` (12) | la especie con equipo de infantería, de tiro y de choque, de costado | `drawArmy`: una figura por rol según la composición (hoy: el habitante `hab.<especie>` y una mini-torta) |
| `<civ>.e4.campamento` (4) | campamento de asedio / ejército acampado | debajo de los sitiadores cuando baja la barra `sg` |
| `<civ>.terreno.rio` (4, mosaico) y `<civ>.terreno.vado` (4) | agua del río/arroyo/fosa y banco de piedras | patrón dentro de la curva del río y vados en `buildBg` |
| `gen.e4.tributo` | estandarte de rendición / ofrenda | sobre una capital tributaria (hoy: aro dorado) |
| `gen.dano.humo` | humo de incendio (ya estaba en la lista de la Era 3) | capital sitiada |
