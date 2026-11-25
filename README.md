# Fondal Age Spore

Repositorio: https://github.com/Fondal-Studios/Fondal-age-spore

Juego de estrategia evolutiva en el navegador, en español: **de la célula a las estrellas en seis eras**. Cada era es un juego completo y lo que hacés en una viaja a la siguiente (el *linaje*).

## Cómo jugarlo
Abrí `index.html` en el navegador (no hace falta servidor) o publicá la rama principal en GitHub Pages (`.github/workflows/pages.yml`). Se puede instalar como app (PWA) y jugar sin conexión.

## Las seis eras
| Era | Archivo | Qué es |
| --- | --- | --- |
| 1 · Célula | `eras/era1-celula.html` | orgánulos, 42 mutaciones en 4 ramas, habilidades, decisiones evolutivas; **en línea hasta 8** |
| 2 · Especie | `eras/era2-animales.html` | 12 especies, 36 rasgos con capacidades, 5 biomas, salir del agua |
| 3 · Civilización | `eras/era3-tribus.html` | constructor por Edades, una civilización por clase, Maravilla |
| 4 · Guerra | `eras/era4-civilizaciones.html` | terreno, espías, provisiones y la ley de Lanchester; asedio y rendición |
| 5 · Industria | `eras/era5-industria.html` | vías férreas, energía (Kardashev), clima compartido, carrera espacial; **en línea hasta 4** |
| 6 · Estrellas | `eras/era6-estrellas.html` | flotas entre estrellas, enjambres de Dyson, Tipo II; epílogo del recorrido; **en línea hasta 4** |

## En línea
`cd server && npm install && npm start` levanta el relay (ws://localhost:8787). Para publicarlo: `render.yaml` (Render), `server/fly.toml` (Fly.io) o `server/Dockerfile`. Detalles y reconexión: `MULTIJUGADOR.md`.

## Apoyo y monetización
Gratis para siempre; el **Pase Fundador** es solo cosmético (`apoyar.html`, `eras/fondal-plus.js`). Plan y riesgos (incluido el del nombre): `docs/MONETIZACION.md` y `docs/CICLO6.md`.

## Pruebas
`npm test` (Era 1 y relay), `npm run test:era56` (Eras 5 y 6 + en línea), `npm run test:era3`, etc. Necesitan Playwright (`npx playwright install chromium`) y `cd server && npm install`. CI: `.github/workflows/tests.yml`.

## Documentos
`docs/CICLO6.md` (estado actual y comparación con otros juegos), `docs/ERA5.md`, `docs/ERA6.md`, `docs/ERA4.md`, `docs/ERA3-CIVILIZACIONES.md`, `docs/ERA2-EVOLUCION.md`, `docs/MONETIZACION.md`, `docs/PRUEBAS-HUMANAS.md`. Para seguir el desarrollo en otra sesión: `AGENTS.md`.
