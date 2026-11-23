# Cambios en la app de entrenos para el Bloque 4

Instrucciones para Claude Code. Acompaña a `bloque-4-plan.json`.

## 1. Importar el Bloque 4 sin perder el historial
- `bloque-4-plan.json` trae solo `bloques`, `sesiones` y `ejercicios` (formato `entrenos-plan`, versión 2).
- Al importarlo: añadir el bloque 4, marcar `bloque-3` con `activo: false` y `fechaFin: "2026-11-23"`. **No borrar** `sesionesRealizadas`, `seriesRealizadas` ni `pesosCorporales`.
- Si el plan va sembrado en el código (`seedVersion`), subir a `seedVersion: 4` con estos datos.

## 2. Campos nuevos en los datos
- `ejercicio.descansoSeg` (número): segundos de descanso tras cada serie de ese ejercicio.
- `ejercicio.superserie` (string o null): los ejercicios con el mismo valor se alternan (A1 → A2 → A1…).
- `sesion.opcional` (bool): sesión que se puede elegir en cualquier momento y que **no cuenta** para completar rotaciones ni desplaza la siguiente sesión.
- `sesion.rirObjetivo` puede ser null (día de cardio y core).
- `bloque.sesionesTecnicaInicio` (número): las primeras N veces que se hace cada sesión del bloque se muestra el aviso "Sesión de técnica: no subas peso" y no se sugiere subir carga.

## 3. Temporizador de descanso
- Al marcar una serie como completada, arranca una cuenta atrás con el `descansoSeg` del ejercicio.
- En superserie, al terminar la serie de A1 se muestra A2 como siguiente; tras la serie de A2, A1. Cada uno con su propio `descansoSeg`.
- Botones: −15 s, +15 s y saltar.
- **Calcular sobre la hora de fin** (`Date.now()` + duración), no contando ticks de `setInterval`, para que el tiempo sea correcto aunque el móvil bloquee la pantalla o la pestaña pase a segundo plano.
- Al terminar: pitido generado con Web Audio API (sin archivo de audio) + vibración (`navigator.vibrate([300, 150, 300])`, funciona en Android/Chrome).
- Si la app está en segundo plano: notificación del sistema (Notification API vía service worker). Para que sea fiable en Android, la app tiene que estar instalada como PWA.
- Opcional en ajustes: Wake Lock API para mantener la pantalla encendida durante la sesión.

## 4. Nueva regla de "Estancado"
- Una serie solo cuenta si es limpia. Se puede seguir registrando sin llegar al rango.
- Un ejercicio está **estancado** solo si lleva 3 sesiones seguidas con el mismo peso **sin aumentar las repeticiones totales** (suma de todas las series). Pasar de 30 a 32 repeticiones totales ya es progresar.
- Botón por ejercicio **"Consolidar técnica"**: mientras está activo, el contador de estancamiento se congela, no se sugiere subir peso y el ejercicio muestra una etiqueta "En consolidación". Se desactiva a mano.
- La sugerencia de subir peso sigue siendo la de siempre: todas las series en el tope del rango.

## 5. Recorte por falta de tiempo
- Las sesiones de torso traen en `aviso` qué superserie saltar si se empieza a las 6:45. Mostrarlo al iniciar la sesión.
- Si una superserie se salta entera, registrarla como omitida con `motivoOmision: "tiempo"` (nuevo motivo junto a "molestia") para que no cuente como estancamiento.

## 6. Arreglo: duraciones imposibles
- En el bloque 3 hay sesiones de 1.437-5.369 minutos porque se quedaron abiertas.
- Al finalizar, calcular `duracionMin` desde el inicio hasta la última serie registrada (más un margen de 5 min), o cerrar automáticamente las sesiones abiertas más de 3 horas.
