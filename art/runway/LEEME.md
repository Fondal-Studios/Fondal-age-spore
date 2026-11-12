# Cuerpos celulares pintados (Runway)

`raw/`: salidas originales de Runway (1024×1024, fondo blanco). `cells/`: sprites finales 256×256 con alfa que usa `eras/era1-celula.html`.

| ID | Rama | Nivel |
| --- | --- | --- |
| basal | sin rama / sin mutaciones | 0 (se tiñe del color del equipo) |
| pred1-3 | Depredador | 1-3 |
| para1-3 | Parásito | 1-3 |
| foto1-3 | Fotosintético | 1-3 |
| colo1-3 | Colonial | 1-3 |

Nivel = mutaciones del equipo: 1-3 → 1, 4-7 → 2, 8 o más → 3.

## Regenerar
1. Editar el prompt en `tools/cells_spec.py` (cada entrada usa un dibujo de `art/png` como referencia de estilo).
2. `python3 tools/runway_gen.py pred2` → escribe `art/runway/raw/pred2.png` (modelo `gen4_image_turbo`, 2 créditos).
3. `python3 tools/runway_process.py` → recorta el fondo y escribe `art/runway/cells/`. Necesita `pillow`, `numpy` y `scipy`.

Notas: `colo1` tuvo que reformularse porque el moderador de Runway rechazó "células pegadas". `para3` y `foto3` pueden traer manchas pequeñas; `runway_process.py` descarta las motas sueltas.
