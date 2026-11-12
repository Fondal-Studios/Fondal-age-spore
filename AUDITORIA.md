# Auditoría de Fondal Age Spore y plan de mejora

Fecha: 2026-11-12. Alcance: Era 1 jugada y medida en navegador real (Playwright); Eras 2 y 3 y la portada solo cargadas y vistas (sin errores de consola ni recursos rotos).

## Qué encontré
**Funciona bien**
- Las tres eras cargan sin errores. Un bot de 30 mutaciones al azar en Era 1 corre sin excepciones.
- La Era 1 ya tiene buenas ideas jugables: 4 ramas con piedra-papel-tijera (Depredador > Fotosintético > Parásito > Colonial > Depredador), híbridos por fusión, habilidades activas, ecología.
- La Era 2 es visualmente la más rica (mapa pintado, animales con sombras y barras).

**Problemas**
1. **El arte de la Era 1 era el punto flojo del juego.** La célula era un blob con degradado igual para todo el mundo; la rama solo cambiaba una ondulación del contorno y las mutaciones se veían como adornos sueltos de 2 px. No se notaba evolucionar.
2. Los dibujos vectoriales de orgánulos (`art/svg`) se encimaban sobre la célula al acercar el zoom: con muchas mutaciones el cuerpo quedaba ilegible.
3. Las variantes A/B se mostraban como puntos de color elegidos por hash (`vstyle`): no significan nada para quien juega.
4. Los rasgos viajan entre eras solo como "clase" por la URL; lo evolucionado en la Era 1 no se hereda (ya anotado en `AGENTS.md`).
5. Sin sonido ni música. Sin guardado de partida. Un solo archivo de 300 KB por era (difícil de mantener).
6. Cifras científicas "de manual" sin fuente primaria (ya anotado).
7. La auditoría de assets de La Horda sigue sin hacerse (necesita acceso a ese repo).

## Qué cambié en esta entrega (Era 1)
- **13 cuerpos celulares pintados con Runway** (`art/runway/cells`): 1 basal + 4 ramas × 3 niveles. El nivel sube con las mutaciones (1-3 / 4-7 / 8+) y cada salto **cambia la silueta**, no solo el detalle.
- **Cada nivel sale de biología real:**

| Rama | Nivel 1 | Nivel 2 | Nivel 3 |
| --- | --- | --- | --- |
| Depredador | fagocitosis, un pseudópodo | varios pseudópodos, vacuolas, flagelo | citoesqueleto de actina, tricocistos, metabolismo a pleno |
| Parásito | sondas de contacto | haustorios, vesículas de toxina | tendrículos, toxinas, antígenos cambiantes |
| Fotosintético | cloroplastos y pared celular | tilacoides apilados, vacuola central, almidón | pigmentos ampliados, "pétalos" de luz, burbujas de O₂ |
| Colonial | uniones celulares (2 células) | gemación y puentes de citoplasma | colonia esférica tipo *Volvox* |

- **Movimiento:** respiración, estiramiento en el sentido de la marcha, y vida propia por rama (colas ondulantes del parásito, pulso de luz y burbujas del fotosintético, satélites orbitando en la colonia, brasas en el depredador de nivel 3).
- **Salto de nivel visible:** pop de tamaño + onda expansiva + aviso "¡Evolución! …" que explica la base biológica.
- Anillo del color del equipo (se distingue de los rivales aunque la rama coincida); la célula basal toma el color del equipo; los híbridos muestran la mitad de cada rama; los organismos pluricelulares usan cuerpo pintado.
- Rendimiento: 27 fps contra 30 fps del original con 250 células en render por software (sin GPU), con mipmaps a mano para que no parpadee.

## Cómo lo mejoraría (en orden de impacto)
1. **Endosimbiosis como hito jugable** (Margulis): "capturar" una mitocondria y un cloroplasto como evento de dos opciones, con animación propia. Es el salto evolutivo real más espectacular y hoy falta.
2. **Presiones de selección con nombre real**: Gran Oxidación (el O₂ mata a los anaerobios), Tierra Bola de Nieve, explosión del Cámbrico. Premian ramas distintas y obligan a adaptarse en vez de acumular mutaciones.
3. **Rasgos que se vean uno por uno**: pintar con Runway los ~12 apéndices más importantes (flagelo, cilios, pseudópodo, haustorio, tricocisto…) como capas animadas que se acoplan al cuerpo. Hoy el nivel cambia el cuerpo, pero cada mutación individual todavía es un adorno vectorial.
4. **Variantes A/B con significado**: mostrar *qué* cambia (p. ej. flagelo largo = velocidad, corto = maniobra) en la tarjeta y en el cuerpo, en vez de color por hash.
5. **Herencia entre eras**: la rama y el nivel de la Era 1 definen el punto de partida de los animales de la Era 2 (rasgos, tamaño, dieta).
6. **Fondo y ambiente pintados** (agua con cáusticas, sedimento, corrientes) y partículas de nutrientes ilustradas, con parallax.
7. **Sonido**: burbujas, golpes membranosos, un tema que gane capas con cada nivel (música adaptativa).
8. **Partida guardada** (localStorage) y modo "génesis" con semilla compartible.
9. **Partir las eras en módulos JS** y sacar los SVG embebidos; con eso las pruebas automáticas pasan a ser unitarias.
10. **Verificar las cifras científicas** en fuentes primarias antes de mostrarlas dentro del juego.

## Para repetir o ampliar el arte
Ver `art/runway/LEEME.md`. Quedan ~100 créditos de Runway en la cuenta al día de hoy; cada sprite cuesta 2.
