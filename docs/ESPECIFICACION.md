# App de registro de entrenamientos — Especificación

## 1. Objetivo

Sustituir un Excel de registro de entrenamientos por una webapp de uso personal, optimizada para móvil, que permita anotar series y repeticiones durante el entrenamiento con el mínimo número de toques posibles.

Un solo usuario. Sin registro, sin login, sin multiusuario.

## 2. Contexto de uso (esto condiciona todo el diseño)

- Se usa **en el gimnasio, a las 6:30 de la mañana**, entre serie y serie.
- **Con una mano**, el móvil en la otra, a veces con las manos sudadas.
- La cobertura en el gimnasio puede ser mala: **debe funcionar sin conexión**.
- El usuario está cansado y con prisa. Cualquier fricción hace que deje de registrar.

Consecuencias de diseño, no negociables:

- Anotar una serie no debe requerir más de **2 toques**.
- **Nada de teclado** para lo habitual: el peso y las repeticiones se introducen con botones +/- y con valores preseleccionados.
- Los valores de la sesión anterior aparecen **precargados** por defecto. Si el usuario repite lo mismo, con confirmar basta.
- Áreas de toque grandes (mínimo 48x48 px). Contraste alto.
- Todo lo importante debe verse sin hacer scroll horizontal.

## 3. Concepto clave: sesiones rotativas, no días de la semana

Este es el punto central de la aplicación y lo que la hace mejor que el Excel.

El plan tiene **5 sesiones** llamadas A, B, C, D y E. No están atadas a ningún día de la semana. Se hacen siempre en ese orden cíclico:

```
A → B → C → D → E → A → B → C → D → E → ...
```

El usuario entrena un número variable de días por semana (a veces 3, a veces 5). Cuando falta un día, no se salta la sesión: simplemente la hace la siguiente vez que va al gimnasio.

Por tanto:

- **La app determina automáticamente qué sesión toca**, en función de cuál fue la última completada. Al abrir la app, la pantalla principal dice "Hoy toca: Sesión C — Legs".
- Debe existir la opción de **saltar a otra sesión manualmente** (por si una máquina está ocupada o el usuario decide cambiar), pero es una acción secundaria, no la principal.
- Un **bloque** son 6 rotaciones completas = 30 sesiones. La app muestra el progreso ("Rotación 3 de 6, sesión 12 de 30").
- La **rotación 6 es de descarga**: mismos ejercicios y mismo peso que la rotación 5, pero **2 series en vez de 3-4** y sin llegar cerca del fallo. La app debe aplicar esto automáticamente al llegar a la rotación 6 y avisarlo visiblemente.

## 4. Modelo de datos

```
Bloque
  id, nombre, numeroRotaciones (6), fechaInicio, fechaFin, activo

Sesion (plantilla)
  id, bloqueId, letra (A-E), nombre ("Push (pecho, hombro, tríceps)"),
  rirObjetivo ("1-2" | "3-4"), notaCardio, orden

Ejercicio (plantilla)
  id, sesionId, orden, nombre,
  series, repsMin, repsMax,
  pesoInicial,
  tipoCarga: "barra" | "mancuerna" | "pin" | "discos" | "corporal" | "smith",
  incremento (kg que se suman al progresar: ver tabla del punto 7),
  unidad: "kg" | "segundos",
  esCore (bool), esNuevo (bool), notaTecnica (texto opcional)

SesionRealizada
  id, bloqueId, sesionId, rotacion (1-6), fecha, duracionMin, notas

SerieRealizada
  id, sesionRealizadaId, ejercicioId, numeroSerie, peso, reps, completada

PesoCorporal
  id, fecha, peso
```

Notas:

- `unidad: "segundos"` es para las planchas: ahí se registra tiempo, no repeticiones.
- Los ejercicios de peso corporal no piden peso, solo tiempo o repeticiones.

## 5. Pantallas

### 5.1 Inicio
- Titular grande: **"Hoy toca: Sesión B — Pull"**.
- Debajo: rotación actual, sesión X de 30, y la fecha de la última sesión hecha.
- Botón principal grande: **Empezar sesión**.
- Enlaces secundarios: Historial, Peso corporal, Elegir otra sesión, Ajustes.
- Si el usuario está en la rotación 6, aviso destacado: **"SEMANA DE DESCARGA: 2 series, sin acercarte al fallo"**.

### 5.2 Sesión en curso (la pantalla crítica)
- Lista de los ejercicios de la sesión en orden. El actual, expandido; los demás, colapsados.
- Para cada ejercicio se muestra:
  - Nombre y, si tiene, la nota técnica.
  - Objetivo: series x rango de reps (ej. "4 x 8-10").
  - **Lo que hiciste la última vez que hiciste este ejercicio**, con la fecha. Ej: "Última vez (12 mar): 35x10, 35x10, 35x9, 35x8".
  - Una fila por serie con: peso (botones -/+), reps (botones -/+) y un botón de confirmar la serie.
- Los valores vienen **precargados con los de la última sesión**. El usuario solo toca si algo cambia.
- Al confirmar una serie, marca visual clara (color, tachado, check) y salto automático a la siguiente serie.
- Para los ejercicios en segundos, un **cronómetro** con el objetivo marcado (ej. 30-45 s).
- Debe poder anotarse una serie como no completada o saltarse un ejercicio, indicando el motivo con opciones rápidas: "falta de tiempo", "máquina ocupada", "molestia", "otro".
- Botón para terminar la sesión, que guarda la fecha y avanza la rotación.

### 5.3 Aviso de progresión (la funcionalidad diferencial)
La regla que el usuario más incumple es la doble progresión: completa todas las series en el tope del rango de repeticiones y luego repite el mismo peso en vez de subir.

La app debe cerrar ese agujero:

- **Al terminar un ejercicio**: si todas las series se completaron en el **tope del rango** de repeticiones, mostrar un aviso claro: **"Objetivo cumplido. La próxima vez: 37,5 kg"**.
- **Al empezar ese ejercicio la siguiente vez**: el peso precargado ya es el nuevo, y aparece la etiqueta **"SUBE HOY"** hasta que se registre la primera serie.
- Si el usuario decide no subir, debe poder bajarlo, pero el aviso vuelve a aparecer la vez siguiente.
- Al contrario: si un ejercicio lleva **3 sesiones sin cambiar de peso y sin llegar al tope del rango**, marcarlo como "estancado" en el historial.

### 5.4 Historial
- Vista por ejercicio: gráfica simple de peso a lo largo de las rotaciones y tabla con las series de cada sesión.
- Vista por sesión: qué se hizo cada día.
- Indicador de adherencia: sesiones completadas de 30, y cuántas veces se hizo el ejercicio de core.

### 5.5 Peso corporal
- Un campo, una vez por semana. Gráfica simple.
- Rango de control configurable (por defecto 77,5 - 79,5 kg). Aviso solo si se sale del rango 3 semanas seguidas.

### 5.6 Exportar / importar
- **Exportar todo a JSON** (copia de seguridad completa, restaurable).
- **Exportar a CSV** con una fila por serie: `fecha, rotacion, sesion, ejercicio, numeroSerie, peso, reps`. Este CSV se usa para analizar el bloque al terminarlo, así que debe ser limpio y legible.
- **Importar JSON** para restaurar.
- El botón de exportar debe estar visible, no escondido en ajustes: es la única protección contra perder los datos.

## 6. Stack y arquitectura

Prioridad absoluta: **simplicidad y cero mantenimiento**. Es una app personal para una persona.

Propuesta:

- **React + Vite**, TypeScript.
- **PWA instalable** en la pantalla de inicio del móvil, con service worker para que funcione sin conexión.
- **Persistencia local con IndexedDB** (a través de `idb` o Dexie). Sin backend, sin base de datos remota, sin autenticación.
- Estilos con Tailwind o CSS plano. Sin librerías de componentes pesadas.
- Despliegue estático (Vercel, Netlify o GitHub Pages).

Riesgo conocido y cómo se mitiga: los datos viven solo en el navegador del móvil y se pueden perder si se borran los datos del sitio o se cambia de teléfono. Por eso la exportación a JSON es obligatoria en el MVP y la app debe **recordar exportar cada vez que se completa una rotación**.

Si en el futuro se quiere sincronización entre dispositivos, se añadiría un backend, pero **no forma parte de esta versión**.

El entorno de desarrollo es **Windows con CMD**, así que los comandos y scripts del proyecto deben funcionar ahí (nada de `touch`, `rm -rf` o rutas tipo Unix en los scripts de npm).

## 7. Datos iniciales — Bloque 3

La app debe arrancar con este bloque ya cargado como semilla.

**Reglas de incremento por tipo de carga:**

| Tipo | Incremento al progresar |
|---|---|
| Barra (press banca) | +2,5 kg |
| Discos (T-Bar) | +2,5 kg (1,25 por lado) |
| Máquina de pin | +2,5 kg (siguiente pin) |
| Polea | +2,5 kg |
| Mancuerna | +2 kg (las del gimnasio van de 2 en 2) |
| Smith | +2,5 kg |
| Corporal | +5 segundos |

**Rango extendido:** los tres ejercicios con mancuerna marcados abajo usan un rango de repeticiones largo. No se sube de mancuerna hasta completar todas las series en el tope de ese rango largo. Es la forma de sortear que las mancuernas salten de 2 en 2 kg, lo que supone incrementos del 25-33 %.

### Sesión A — Push (pecho, hombro, tríceps) · RIR 1-2

| Orden | Ejercicio | Series | Reps | Peso inicial | Tipo |
|---|---|---|---|---|---|
| 1 | Press banca (barra) | 4 | 8-10 | 35 kg | barra |
| 2 | CORE: Plancha frontal | 3 | 30-45 s | corporal | corporal |
| 3 | Press de hombros en máquina | 3 | 10-12 | 17,5 kg | pin |
| 4 | Aperturas / Pec Deck | 3 | 10-12 | 15 kg | pin |
| 5 | Elevaciones laterales (rango extendido) | 3 | 12-20 | 6 kg | mancuerna |
| 6 | Extensión de tríceps en polea (cuerda) | 3 | 10-12 | 15 kg | polea |

Cardio final: 15-20 min de caminata inclinada (15 %, ~4,8 km/h).

### Sesión B — Pull (espalda, bíceps, deltoide posterior) · RIR 1-2

| Orden | Ejercicio | Series | Reps | Peso inicial | Tipo |
|---|---|---|---|---|---|
| 1 | Remo con triángulo (polea baja) | 4 | 8-10 | 37,5 kg | polea |
| 2 | Jalón al pecho | 3 | 10-12 | 37,5 kg | polea |
| 3 | T-Bar row con apoyo pectoral (NUEVO) | 3 | 10-12 | 15 kg | discos |
| 4 | Pájaros / Reverse Pec Deck | 3 | 12-15 | 7,5 kg | pin |
| 5 | Curl de bíceps con mancuerna (rango extendido) | 3 | 10-16 | 8 kg | mancuerna |

Nota técnica de la T-Bar: apoyar bien el pecho en la almohadilla y no despegar los hombros para tirar.

Cardio final: 15-20 min de caminata inclinada.

### Sesión C — Legs (pesado) · RIR 1-2

| Orden | Ejercicio | Series | Reps | Peso inicial | Tipo |
|---|---|---|---|---|---|
| 1 | Prensa (Leg Press) | 4 | 10-12 | 65 kg | pin |
| 2 | CORE: Crunch en polea | 3 | 12-15 | 22,5 kg | polea |
| 3 | Hip thrust en máquina | 3 | 10-12 | 32,5 kg | pin |
| 4 | Extensión de cuádriceps | 3 | 12-15 | 22,5 kg | pin |
| 5 | Curl femoral sentado | 3 | 12-15 | 32,5 kg | pin |
| 6 | Gemelos de pie en máquina | 4 | 12-15 | 35 kg | pin |

Sin cardio.

### Sesión D — Upper ligero · RIR 3-4

| Orden | Ejercicio | Series | Reps | Peso inicial | Tipo |
|---|---|---|---|---|---|
| 1 | Press inclinado con mancuernas | 3 | 10-12 | 12 kg/mano | mancuerna |
| 2 | Remo unilateral con mancuerna | 3 | 10-12 por brazo | 20 kg | mancuerna |
| 3 | Jalón agarre neutro / estrecho | 3 | 10-12 | 40 kg | polea |
| 4 | Press francés con barra Z | 3 | 10-12 | 16 kg | barra |
| 5 | Curl martillo con mancuerna (rango extendido) | 3 | 10-16 | 8 kg | mancuerna |

Este día es deliberadamente ligero. La app debe mostrar un aviso: "Día ligero: RIR 3-4, no es para batir marcas".

Cardio final: 15-20 min de caminata inclinada.

### Sesión E — Lower ligero + core · RIR 3-4

| Orden | Ejercicio | Series | Reps | Peso inicial | Tipo |
|---|---|---|---|---|---|
| 1 | Sentadilla goblet con mancuerna | 3 | 10-12 | 18 kg | mancuerna |
| 2 | CORE: Plancha lateral | 3 | 20-30 s por lado | corporal | corporal |
| 3 | Peso muerto rumano en Smith (NUEVO) | 3 | 10-12 | barra sola | smith |
| 4 | Zancadas caminando con mancuernas | 3 | 10 por pierna | 8 kg/mano | mancuerna |
| 5 | Abductores en máquina | 3 | 15 | 30 kg | pin |
| 6 | Gemelos sentado en máquina | 3 | 15-20 | 27,5 kg | pin |

Nota técnica del rumano en Smith: empujar la cadera hacia atrás con la espalda plana, sin doblar apenas la rodilla, y bajar solo hasta donde se llegue sin que la lumbar se redondee.

Cardio final: 15-20 min de caminata inclinada. Si la fatiga es alta, 10-15 min.

## 8. Reglas de negocio a implementar

1. **Doble progresión.** Todas las series completadas en el tope del rango de repeticiones → subir el incremento correspondiente a su tipo de carga en la siguiente sesión de ese ejercicio.
2. **Rango extendido.** Los tres ejercicios marcados usan un rango largo. Misma regla, pero el tope es más alto (20 en laterales, 16 en los curls).
3. **Rotación 6 = descarga.** Mismo peso que la rotación 5, pero 2 series en lugar de las prescritas. La app lo aplica sola y lo avisa.
4. **Orden de sesiones.** La siguiente sesión es siempre la que sigue en el ciclo A→B→C→D→E a la última completada.
5. **Los dos primeros ejercicios de cada sesión son prioritarios.** Si el usuario intenta saltarse el ejercicio 1 o el 2 (el core), pedir confirmación. El core se saltaba sistemáticamente en el bloque anterior y por eso ahora va en segunda posición.
6. **Fin de bloque.** Al completar las 30 sesiones, ofrecer exportar el CSV completo y cerrar el bloque.

## 9. Fuera de alcance en esta versión

- Multiusuario, login, cuentas.
- Sincronización en la nube o backend.
- Registro de nutrición o calorías.
- Vídeos o imágenes de ejercicios.
- Cronómetro de descanso entre series (deseable en una fase 2, no ahora).
- Creación de bloques nuevos desde la interfaz. El bloque 3 va como semilla; el bloque 4 se cargará editando los datos de semilla.

## 10. Criterios de aceptación

- Registrar una serie completa (peso y repeticiones ya precargados y correctos) requiere **un solo toque**.
- Registrar una serie cambiando el peso requiere **como máximo tres toques**.
- La app funciona en modo avión de principio a fin de una sesión.
- Cerrar el navegador a mitad de sesión y volver a abrirlo conserva todo lo registrado.
- Después de completar un ejercicio en el tope del rango, la siguiente vez que aparece muestra el peso subido y la etiqueta de aviso.
- El CSV exportado se abre correctamente en Excel con los acentos bien (UTF-8 con BOM) y los decimales en el formato español.
- Es instalable en la pantalla de inicio de un iPhone o Android y se abre a pantalla completa.

## 11. Cómo abordarlo

Sugerencia de orden de trabajo, entregando algo usable cuanto antes:

1. Modelo de datos, persistencia en IndexedDB y carga de los datos semilla del bloque 3.
2. Pantalla de sesión en curso con registro de series. Es el 80 % del valor.
3. Lógica de rotación y pantalla de inicio.
4. Exportación a JSON y CSV.
5. Avisos de progresión.
6. Historial y peso corporal.
7. PWA, service worker e instalación en el móvil.

Empezar por el paso 2 hace que la app sea útil desde el primer día aunque el resto esté a medias.
