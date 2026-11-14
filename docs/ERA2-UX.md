# Era 2 · Interfaz y UX (Calidad 2.0)

Módulo INTERFAZ del rework. Archivo: `eras/era2-animales.html`, bloque `=== INTERFAZ ===` (JS) y `=== INTERFAZ ... ===` (CSS). Prueba: `tests/era2-ui.js`.

## Qué hay
- **Panel biológico** (`#bio`): nombre/especie, vida (verde→rojo), hambre (ámbar, barra llena = comió), energía (azul, solo si `bioInfo().en` existe), reproducción (rosa, con motivo), estado, orden, amenaza cercana, edad/cría, efectos con tiempo y habilidades (lista / enfría N s). Con varios seleccionados resume el grupo (cantidad, composición, promedios, más herido). Lee solo `bioInfo(a)`; si falta un dato oculta la barra.
- **Mapa**: solo indicadores mínimos (aro del seleccionado, barras de vida/hambre de seleccionados, heridos o bajo el mouse, etiqueta al pasar el mouse, marcador de destino, recuadro de selección, cruz de baja). Se quitó la barra permanente sobre todos los animales propios.
- **Selección**: clic, Shift/Ctrl suma o quita, arrastre = recuadro (mouse), doble clic = misma especie visible, Ctrl+A = todos los tuyos, Esc = cancelar (primero modo, luego líder, luego órdenes, luego selección). Táctil: «Seleccionar» activa el recuadro con el dedo y el toque suma/quita. Estado de interfaz (`selIds`), no se guarda; emite `Bus 'select'` (animal principal, ids).
- **Órdenes**: clic derecho / «Ordenar»+toque: suelo = `move {x,y}`, no propio = `attack {tid}`; «Detener» = `forage`. Todas por `issueOrder`. Marcador con línea punteada, pulso de confirmación; desaparece cuando ningún animal conserva la orden (o con Esc).
- **Combate legible**: «Últimos combates» (quién → a quién, daño, golpes, motivo por tamaño/aliados/nido/herida, resultado: murió, huyó herido, vida %) y «¿Por qué murió?» para bajas propias (causa + contexto). Usa `G.x2.combat` y `G.x2.casualties` si la jugabilidad los llena; mientras no, arma su propio anillo escuchando `Bus` (`dmg`, `state`, `kill`).
- **Tutorial** de 6 pasos, no bloqueante, detecta por `Bus`/estado, se salta y se recuerda en `localStorage` (`evo_tut2` = `done`/`skip`). Para repetirlo: borrar esa clave.

## Decisión sobre el líder controlable
**Queda DETRÁS del botón «Líder» (apagado por defecto).** No reemplaza lo estratégico.

Datos del prototipo (Chromium headless, sin GPU, simulación ×1 a 20 Hz):
- Tecla → `issueOrder`: síncrono (0 ms medidos, dentro del mismo cuadro).
- Tecla → primer desplazamiento visible: ≈140 ms (50 ms de paso de simulación + cuadro + sondeo de la prueba). Se siente directo; con ×2/×4 baja, en pausa no se mueve.
- Avance: ≈75 px/s del animal (órdenes `move` cortas de 60 px cada 0,1 s con vencimiento 0,6 s: al soltar se detiene solo). Seguidores: `move` al líder cada 0,4 s, solo los que están a más de 40 px.
- Móvil: joystick virtual de 112 px (≥44 px de zona táctil), la cámara sigue al líder.

Motivos: (1) funciona y es fácil, pero con 40+ animales manejar uno a mano compite con la atención que pide la estrategia (comer, anidar, evolucionar); (2) cada orden emite `Bus 'order'`, y a 10 Hz es ruido si audio/arte se suscriben a todo; (3) no hay disparo ni esquiva directa (la jugabilidad no expone ataque manual), así que el líder solo posiciona. Activarlo por defecto sería microgestión sin recompensa propia. Si la jugabilidad agrega una acción de líder (esquiva/embestida por orden), se puede promover a modo principal.

## Contrato con otros módulos
- Lee: `bioInfo(a)` (`hp,mhp,hunger,en,rep,st,stLabel,ord,threats,effects,abilities,juv,age`), `G.x2.combat`, `G.x2.casualties`.
- Escribe: solo `issueOrder(ids, ord)` con `move`/`attack`/`forage`.
- Tocó fuera de su bloque (ojo al integrar con arte): en `render()`, la condición de las barras de vida/hambre sobre los animales (`uiBars(a)`, `UIs.selSet`) y una llamada `uiOverlay(ctx, tt)` antes del marco final; `layout()` (touchAction), `setMode` (texto del modo `ord`), `loop` (`uiTick`), `hud` (`uiHud()` reemplaza el bloque `selInfo`) y los ganchos `__e2.ui`.
