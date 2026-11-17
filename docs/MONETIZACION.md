# Propuesta: cómo lanzar y monetizar Fondal Age Spore como juego multijugador abierto

Es una propuesta de trabajo, no un plan validado. **No hice investigación de mercado ni tengo datos de jugadores**: las cifras de costos son órdenes de magnitud para ordenar el trabajo, y hay que medirlas. Lo que sí es firme es el estado técnico del juego (ver `docs/CICLO3.md`).

## 1. Qué tenemos y qué no, hoy
- **Tenemos:** un juego de navegador sin instalación, en español, con IP original; Era 1 con multijugador lockstep hasta 8 colonias (relay `server/relay.js`, hash de estado cada 50 turnos, reemplazo por bot al desconectarse); Era 2 jugable con tutorial; guardado, semilla compartible y linaje entre eras; CI en verde.
- **No tenemos todavía (bloquea un lanzamiento masivo):**
  - Servidor de producción: el relay no tiene cuentas, autenticación, matchmaking, persistencia ni observabilidad; las salas viven en memoria.
  - Multijugador en Eras 2 a 4 (hoy solo Era 1).
  - Validación humana de audio, táctil real y diversión (todo se midió con bots).
  - Era 3 sin pulir (plan listo, sin implementar); Eras 5 y 6 sin construir.
  - Política de privacidad, términos, moderación de nombres y chat, edad mínima.
  - Verificar los derechos comerciales de los assets generados con Runway y el resto (fuentes de Google, licencias) antes de cobrar.

## 2. Principios de monetización (para no romper lo que hace bueno al juego)
1. **Nada que dé ventaja jugable se vende.** El juego es una simulación con base científica y balance medido con bots; vender mutaciones, recursos o habilidades rompe el balance, el determinismo online y la confianza. Todo lo pago es cosmético, de conveniencia social o de acceso a contenido nuevo.
2. **Gratis para entrar:** el navegador es el embudo. Sin registro obligatorio para jugar solo.
3. **Sin cajas de botín ni mecánicas de azar pagas.** Sin publicidad intrusiva; es un juego de estrategia con sesiones largas y público que se irrita fácil.
4. **Transparencia sobre datos:** analítica anónima, con consentimiento, sin vender datos.

## 3. Fuentes de ingreso, de menor a mayor esfuerzo
| # | Qué | Cómo | Cuándo | Riesgo |
| --- | --- | --- | --- | --- |
| 1 | **Pack Fundador** (pago único, por ejemplo en itch.io o Patreon) | Acceso anticipado, nombre en créditos, cosméticos exclusivos de fundador, voto en la hoja de ruta | Alfa cerrada | Bajo; sirve para validar si alguien paga |
| 2 | **Cosméticos** | Pieles de células y animales, estelas, paletas de colonia, marcos de perfil, packs de música lo-fi | Beta abierta | Medio: hay que producir arte constante; los cosméticos no deben alterar la lectura de siluetas ni el hash |
| 3 | **Salas privadas / servidor de clan** (suscripción chica) | Salas persistentes, semillas fijas, torneos, partidas con más de 8 | Beta | Medio: cuesta infraestructura; se cobra para cubrirla |
| 4 | **Versión de escritorio / Steam** (pago único, precio a definir según prueba de mercado) | Mismo juego empaquetado, Eras completas, logros, salas con amigos | Después de Eras 3 y 4 sólidas | Alto: Steam cobra comisión y exige pulido; hacerlo con la página de «deseados» abierta con meses de anticipación |
| 5 | **Licencias educativas** | Paquete para escuelas: modo aula (una semilla para toda la clase), guías docentes con la base biológica (célula, ecología, evolución), sin chat | Paralelo | Medio: venta lenta, pero encaja con el diseño y no depende de picos virales; requiere validar los contenidos científicos en fuentes primarias (hoy son aproximaciones de manual) |
| 6 | **Pase de temporada** | Solo cuando haya contenido regular que justifique | Más adelante | Alto: obliga a producir sin parar; no antes de tener base de jugadores |

Recomendación: empezar por 1 y 5 (validan interés con poco costo y sin tocar el balance), sumar 2 y 3 en la beta, y dejar 4 para cuando las Eras 3 y 4 estén al nivel de la Era 2. Publicidad: no.

## 4. Cómo lanzarlo, por fases con criterios de salida
**Fase 0: requisitos técnicos y legales (antes de mostrarlo a desconocidos)**
- Hardening del relay: cuentas o identificadores anónimos firmados, límites por IP, reconexión a la misma partida, métricas y alarmas, despliegue con reinicio automático; pruebas de carga de N salas de 8.
- Prueba de escucha humana (`eras/escucha.html`, protocolo en `docs/ESCUCHA.md`), prueba en celulares reales (gama baja incluida) y sesiones con jugadores nuevos sin explicación.
- Política de privacidad, términos de uso, edad mínima, moderación de nombres; revisión de licencias de todo el arte y fuentes.
- Salida: cero bloqueantes abiertos y las tres pruebas humanas hechas con resultados escritos.

**Fase 1: alfa cerrada (50–200 jugadores)**
- Canal: Discord propio, itch.io, comunidades hispanohablantes de estrategia y de divulgación científica. Pack Fundador abierto.
- Qué medir: tutorial completado, partidas por jugador, retención a 1 y 7 días, salas multijugador iniciadas y terminadas, abandonos por causa, errores de red.
- Salida: retención y finalización de tutorial aceptables (fijar umbrales antes de medir, no después), sin pérdidas de partida ni desincronizaciones sistemáticas.

**Fase 2: beta abierta en web**
- Página de lanzamiento, PWA instalable, torneos semanales por semilla compartida, ranking por semilla (el determinismo ya permite verificar replays).
- Abrir cosméticos y salas privadas.
- Creadores de contenido: la mecánica «misma semilla, cada uno evoluciona distinto» es fácil de mostrar en video corto.

**Fase 3: Steam y escritorio**
- Abrir la página de Steam con tráiler y demo temprano, acumular deseados, y recién entonces salir en Acceso Anticipado con Eras 1–3 firmes.

**Fase 4: contenido y comunidad**
- Eras 4–6, temporadas de eventos, herramientas de modding (semillas y reglas), modo aula.

## 5. Costos y números a validar (supuestos, no datos)
- Infraestructura: el multijugador es de baja banda (se intercambian órdenes, no estados), así que el relay debería caber en un servidor pequeño al inicio. **Hay que medirlo con la prueba de carga de la Fase 0**; no afirmo cifras de dólares por jugador.
- Procesamiento de pagos: usar un proveedor que actúe como comerciante de registro (maneja IVA/impuestos por país) o la tienda de la plataforma; las comisiones varían y hay que cotizarlas.
- Conversión y precio: no hay datos propios. Se decide con la alfa (Pack Fundador a dos precios, por ejemplo) y no con una suposición.
- Arte: los cosméticos requieren un flujo de producción; el sistema de arte procedural ya hecho para la Era 2 abarata las variantes de color, pero el arte pintado cuesta tiempo y, si se usa Runway, créditos (hoy quedan pocos y se descontaron sin explicación).

## 6. Riesgos principales
1. **Lanzar multijugador sin servidor endurecido:** un mal primer día define la reputación. Mitigación: Fase 0 y alfa cerrada.
2. **Diversión no validada con personas:** si el juego no engancha, ninguna monetización lo salva. Mitigación: sesiones de juego antes de cualquier campaña.
3. **Balance:** solo medido con bots; clases desparejas (aves +25 puntos), desierto 13 %. Mitigación: telemetría anónima de victorias por especie, bioma y dificultad en la alfa.
4. **Trampa:** lockstep con hash detecta desincronización, pero no impide que un cliente modificado juegue distinto. Mitigación: ranking verificable por replay desde la semilla y sala/servidor de torneo.
5. **Derechos del arte generado y licencias:** verificar términos comerciales antes de cobrar.
6. **Contenido científico:** las cifras son aproximaciones de manual; antes de venderlo como educativo hay que verificarlas en fuentes primarias.
7. **Alcance:** pretender Eras 1 a 6 y multijugador en todas antes de salir. Mitigación: salir con Era 1 multijugador + Era 2 pulida y crecer con contenido.

## 7. Próximos pasos concretos (en orden)
1. Mergear el PR #1 cuando lo revises.
2. Hacer la prueba de escucha y una sesión de juego con 5 personas nuevas (una en celular).
3. Implementar la Fase 0 del relay y la prueba de carga.
4. Abrir la alfa cerrada con Pack Fundador.
5. Con los datos de la alfa, decidir precios y orden de la hoja de ruta.
