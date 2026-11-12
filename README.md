# Fondal Age Spore

Repositorio: https://github.com/Fondal-Studios/Fondal-age-spore

Juego de estrategia 2D estilo Age of Empires con reglas de la naturaleza: de la célula a los animales, las tribus y las civilizaciones.

## Cómo jugarlo
Abrí `index.html` en el navegador (no hace falta servidor) o activá GitHub Pages sobre la rama principal.

## Estado
- **Era 1 (célula):** cuerpos pintados con Runway que evolucionan en 3 niveles por rama (con movimiento), 48 orgánulos con dibujo propio, 14 habilidades activas, estructuras, fusión de ramas.
- **Era 2 (animales):** 5 ecosistemas, rasgos con variantes, nidos y civilización inicial.
- **Era 3 (tribus):** oficios, tecnologías, otra tribu y fundación de la ciudad.
- Eras 4 a 6: por construir.

## Carpetas
- `eras/`: cada era es un HTML autocontenido (canvas, sin dependencias; solo tipografías de Google Fonts).
- `art/`: dibujos vectoriales de los orgánulos (SVG y PNG), hoja de contactos y `art/runway/` (cuerpos celulares pintados; la Era 1 los carga desde ahí, así que hay que servir la carpeta completa).
- `AUDITORIA.md`: auditoría del juego y plan de mejora.

Los archivos de `art/` son la base visual para que el agente pintor los refine.

Para continuar el desarrollo en otra sesión leé `AGENTS.md`.
