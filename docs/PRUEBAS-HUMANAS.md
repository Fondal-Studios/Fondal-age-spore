# Protocolo de pruebas humanas (Ciclo 4)

**Estado: PENDIENTE. No hay resultados.** Este documento solo define cómo hacerlas. Nadie debe completar la plantilla de resultados con suposiciones.

## Objetivo
Medir si un jugador nuevo comprende qué controla, qué necesita su especie o tribu, qué decisiones puede tomar y qué consecuencias tienen, y si quiere volver a jugar. Los bots no miden nada de esto.

## Participantes
- Mínimo 5 personas que **nunca vieron el juego**. Idealmente: 2 que juegan estrategia (tipo Age of Empires), 2 que juegan poco o casual, 1 en celular.
- No deben ser parte del equipo. No explicarles nada antes.
- Consentimiento verbal para grabar pantalla y voz (opcional) y anotar. No recolectar datos personales; usar un código (P1…P5).

## Preparación
- Navegador actualizado; escritorio 1280×800 o más y un celular real (Android o iOS, anotar modelo).
- Abrir `index.html`. Limpiar `localStorage` entre participantes (o ventana privada).
- Audio con auriculares o parlantes; anotar cuál. Si además se hace la prueba de escucha (`eras/escucha.html`, `docs/ESCUCHA.md`), hacerla **después**.
- Cronómetro, hoja de observación (abajo), grabación de pantalla si hay consentimiento.

## Sesión (30–40 min por persona)
1. **Sin consigna técnica** (2 min): «Jugá como quieras. Pensá en voz alta». Solo se responde «¿qué creés que pasa si…?» a preguntas. No guiar.
2. **Era 1 o Era 2 (10–15 min)**, a elección del participante desde la portada.
3. **Era 3 (10–15 min)** si llegó o se la ofrece.
4. **Entrevista (5 min)**.

## Qué anotar el observador (por participante)
| Medida | Cómo se toma |
| --- | --- |
| Tiempo hasta la primera decisión significativa | Cronómetro desde «Empezar» hasta la primera acción con intención (no clics de exploración) |
| Tiempo hasta entender qué controla | Cuándo dice, con sus palabras, qué es lo que dirige |
| Decisiones tomadas | Lista: prioridades, oficios, construcciones, habilidades, migración |
| Errores de comprensión | Frases tipo «no sé qué hace esto», clics repetidos sin efecto, botones ignorados |
| Momentos de espera / aburrimiento | Segundos sin acción relevante > 20 s |
| Frustraciones | Citas textuales |
| ¿Entendió por qué ganó o perdió? | Pedirle que lo explique |
| ¿Quiso seguir jugando? | Cuándo y por qué se detuvo |

## Preguntas de la entrevista (escala 1–5 + comentario)
1. ¿Entendiste qué estabas dirigiendo? (una especie, una tribu, un personaje)
2. ¿Sabías qué necesitaba tu especie/tribu en cada momento?
3. ¿Las consecuencias de tus decisiones fueron claras?
4. ¿La interfaz te tapó la pantalla o te faltó información? ¿Qué?
5. ¿Qué fue lo más divertido? ¿Y lo más aburrido o confuso?
6. ¿Cuánto te costó jugar en el celular (si aplica)?
7. ¿Volverías a jugar? ¿Qué tendría que tener para que vuelvas?
8. ¿Qué cambiarías primero?

## Criterios de aceptación propuestos (fijar ANTES de mirar resultados)
- Al menos 4 de 5 explican, con sus palabras y sin ayuda, que dirigen una especie/tribu y no un personaje.
- Mediana de tiempo hasta la primera decisión significativa < 90 s.
- Ninguna frustración repetida por ≥3 personas sin plan de corrección.
- Al menos 3 de 5 dicen que volverían a jugar.

## Plantilla de resultados (vacía)
| Código | Dispositivo | T. primera decisión | Entendió qué controla | Decisiones | Confusión | Frustración | ¿Volvería? | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | | | | | | | | |
| P2 | | | | | | | | |
| P3 | | | | | | | | |
| P4 | | | | | | | | |
| P5 | | | | | | | | |

## Cómo se usan los resultados
Cada hallazgo repetido en ≥2 personas se convierte en un problema con evidencia (cita + código de participante) en `docs/DEVOLUCION_CHATGPT.md`. Los tiempos y comprensión se informan con N=5 como indicio, nunca como estadística.
