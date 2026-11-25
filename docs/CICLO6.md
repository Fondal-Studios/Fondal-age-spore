# Ciclo 6: las seis eras completas, en línea y con un camino para cobrar

Fecha: 2026-11-25. Rama `claude/ciclo6-eras-multijugador` (sale de `claude/arte-anakin-era3`, PR #3, que trae el arte de las Eras 3 y 4).
Todo lo medido es con **bots** en Chrome; **ninguna persona jugó** las Eras 5 y 6 todavía.

## 1. Qué se hizo
| Pieza | Antes | Ahora |
| --- | --- | --- |
| Era 5 | no existía | **La Industria** jugable: continente por regiones, vías férreas, 9 edificios, 14 tecnologías, clima compartido con Cumbre climática, eventos, IA con 3 personalidades, carrera espacial (Satélite → Misión tripulada → Arca). `docs/ERA5.md` |
| Era 6 | no existía | **Las Estrellas** jugable: galaxia en espiral, flotas con la ley cuadrática de Lanchester, enjambres de Dyson, Kardashev Tipo II, habitabilidad por clase, epílogo «tu recorrido». `docs/ERA6.md` |
| Recorrido | la Era 4 decía «las Eras 5 y 6 no existen»; la Era 3 no ofrecía seguir | 1 → 2 → 3 → 4 → 5 → 6 encadenadas: cada final ofrece «Seguir a la Era N» y cada era lee el linaje y da un bono chico y explicado |
| En línea | solo la Era 1, sin reconexión | Eras 1, 5 y 6. Módulo compartido `eras/net-lockstep.js` (sala, código, bots, hash). **Reconexión**: el relay guarda la historia de órdenes y quien vuelve re-simula y retoma el mando |
| Relay | sin desplegar | listo para Render (`render.yaml`), Fly.io (`server/fly.toml`) o Docker (`server/Dockerfile`); chequeo de salud HTTP, tope de conexiones por IP, salas por era |
| Portada | describía la Era 3 como «Tribus» y la 4 como bosquejo | portada nueva con las 6 eras (ilustraciones pintadas por Anakin), «seguir donde quedaste», tu recorrido, en línea, apoyo; instalable (PWA) y jugable sin conexión |
| Monetización | solo un documento | **Pase Fundador** cosmético (`eras/fondal-plus.js`, `apoyar.html`, generador de códigos `tools/codigos-fundador.js`) |
| Pruebas | Eras 1 a 4 | + `tests/era56.js` (14 comprobaciones), `tests/online56.js` (relay + 3 navegadores, desconexión, reconexión, hash), balance de las Eras 5 y 6; nuevo trabajo de CI `era56` |

## 2. Comparación con otros juegos (y qué tomamos de cada uno)
Comparación de diseño hecha de memoria sobre juegos conocidos, **sin investigación de mercado ni cifras de ventas verificadas**. Dentro del juego no se nombran marcas (regla del repo).

| Juego (género) | Qué hace bien | Qué tomamos / qué evitamos |
| --- | --- | --- |
| *Spore* (de la célula al espacio, 2008) | La promesa «toda la vida en un juego» | Su crítica más repetida fue que cada etapa era poco profunda. Acá cada era es un juego de estrategia completo y la herencia entre eras tiene efecto visible. **Ojo con el nombre** (ver §4). |
| *The Battle of Polytopia* (4X corto, celular) | Partidas de 20–30 min, legibles en el celular; multijugador por turnos; se cobra por **tribus** y cosméticos | Partidas cortas (Eras 5 y 6: 10–14 min), interfaz táctil, en línea con bots en los lugares vacíos. Para cobrar, cosmético primero (Pase Fundador); vender clases nuevas como «paralelas» (distintas, no más fuertes) es una opción futura. |
| *Galcon* (mandar flotas entre planetas) | Mecánica de un toque, ideal para jugar en línea | Base de la Era 6, con dos capas propias: Lanchester explicado y la carrera al Tipo II con enjambres de Dyson. |
| *Plague Inc.* (simulación con base científica) | Ciencia simple y verosímil que se vende también como educativa | Kardashev, Lanchester, calentamiento por CO₂ acumulado, endosimbiosis: siempre con la cuenta a la vista y la marca de «cifras de juego». Abre el **modo aula**. |
| *Cell to Singularity* (inactivo, célula → espacio) | Muestra que el tema «de la célula a las estrellas» atrae a mucha gente | Mismo tema, pero estrategia activa; sin publicidad ni cajas de botín. |
| *Frostpunk* (supervivencia con dilemas) | Decisiones morales con costo | La Era 5: el carbón te adelanta, pero el clima es de todos; la Cumbre climática es un dilema real. |
| *Age of Empires*, *Civilization* | Profundidad de estrategia, eras | Eras 3 y 4 (constructor por Edades, ejércitos con terreno); la Era 5 toma el árbol de tecnologías por edades. |
| *Factorio*, *Anno* | Logística y cadenas | Vías férreas: una región sin tren rinde la mitad. |

**Lo que tenemos y casi nadie tiene junto:** seis juegos encadenados por una misma vida, base científica explicada en pantalla, en español rioplatense, gratis en el navegador y con juego en línea. Lo que falta para competir: validación con personas, pulido de arte homogéneo y una comunidad.

## 3. Monetización implementada
Principio intacto (`docs/MONETIZACION.md`): **nada pago da ventaja**.
- **Pase Fundador** (pago único, precio a definir con la alfa): estelas de flota en la Era 6, insignia en la portada, nombre en créditos, voto en la hoja de ruta. Se canjea con un código `FND-XXXX-XXXX-C` en `apoyar.html`. Los códigos se generan con `node tools/codigos-fundador.js 100` para cargarlos como «claves externas» en la tienda.
  - **Límite honesto:** el código se comprueba en el navegador (dígito de control). Evita tipeos, no falsificaciones: es un sistema de honor para la alfa. Para algo serio, validar en el relay o en un servidor (§5).
- **Modo aula** (licencia para escuelas): presentado en `apoyar.html`; falta construirlo (semilla única por clase, guía docente).
- **La tienda no está abierta**: `apoyar.html` tiene `STORE_URL = ''`. Al publicar la página en itch.io o Ko-fi se completa esa línea.

## 4. Riesgo importante antes de cobrar: el nombre
«Spore» es una marca de Electronic Arts (el juego de 2008) y «Age» evoca a *Age of Empires* (Microsoft). Para un proyecto gratis el riesgo es bajo; **para vender** conviene cambiar el nombre comercial (por ejemplo «Fondal: de la célula a las estrellas» o «Fondal Evolución») y consultar a alguien que sepa de marcas. No lo cambié: es una decisión del dueño.

## 5. Próximos pasos sugeridos (en orden)
1. Revisar y mergear el PR #3 y esta rama; publicar en GitHub Pages.
2. Publicar el relay (Render: «New → Blueprint» con `render.yaml`) y poner su dirección `wss://…` en `DEFAULT_RELAY` de `eras/net-lockstep.js`.
3. Sesión con 5 personas (protocolo `docs/PRUEBAS-HUMANAS.md`), una en celular, jugando la Era 6 en línea entre ellas.
4. Decidir el nombre comercial; abrir la página en itch.io con «pagá lo que quieras» + Pase Fundador; completar `STORE_URL`.
5. Validar códigos en el servidor (el relay ya tiene HTTP: sumar `POST /canje` con una lista de códigos hasheados).
6. Modo aula y guía docente; verificar las cifras científicas en fuentes primarias.

## 6. Límites conocidos
- Las Eras 5 y 6 solo se midieron con bots; el balance para personas puede ser otro.
- En línea: lockstep (todos esperan al más lento); probado solo en Chrome/Chromium; entre motores distintos podría desincronizarse (el hash lo detecta, no lo arregla); sin cuentas.
- El arte de las Eras 5 y 6 es vectorial dibujado por código; las ilustraciones de la portada las pintó Anakin (la de la Era 4 salió sin ejércitos).
- El audio de las Eras 5 y 6 reutiliza el motor lo-fi; nadie lo escuchó.
