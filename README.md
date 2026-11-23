# Entrenos

Webapp personal para registrar entrenamientos, sustituyendo un Excel. Un solo
usuario, sin login, sin backend. Se usa en el gimnasio a las 6:30, con una mano
y sin cobertura: todo funciona en local sobre IndexedDB.

La especificación completa está en `docs/ESPECIFICACION.md`.

## Stack

- React 18 + Vite + TypeScript
- Dexie (IndexedDB) para la persistencia local
- CSS plano, sin librerías de componentes
- PWA instalable, con service worker propio (sin plugin)

## Comandos

Funcionan igual en Windows (CMD) y en Linux.

```
npm install          Instala las dependencias
npm run dev          Arranca el servidor de desarrollo
npm run build        Comprueba tipos y genera dist/
npm run preview      Sirve el dist/ ya generado
npm run typecheck    Solo comprobación de tipos
npm run pruebas      Pruebas de navegador (requieren el dev server arrancado)
npm run pruebas:pwa  Pruebas de la PWA (requieren build + preview arrancado)
```

## Estado

Hechos los siete pasos del plan de trabajo (punto 11 de la spec):

- [x] 1. Modelo de datos, persistencia en IndexedDB y semilla del bloque 3
- [x] 2. Pantalla de sesión en curso con registro de series
- [x] 3. Lógica de rotación y pantalla de inicio
- [x] 4. Exportación a JSON y CSV
- [x] 5. Avisos de progresión
- [x] 6. Historial y peso corporal
- [x] 7. PWA, service worker e instalación en el móvil

La app ya se usa de principio a fin de una sesión: al abrirla dice qué toca,
se arranca de un toque, se registra serie a serie y al terminar avanza sola en
el ciclo. Los datos ya se pueden sacar del móvil y volver a meter, la doble
progresión se aplica y se avisa sola, y la app se instala en la pantalla de
inicio del móvil y arranca en modo avión desde cero.

El bloque en curso es el **Bloque 4** (desde el 24-11-2026). Ver «Bloque 4» más
abajo para lo que cambió con él: temporizador de descanso, superseries, día
opcional, sesiones de técnica, consolidación y la nueva regla de estancamiento.

## Estructura

```
src/db/types.ts        Modelo de datos (punto 4 de la spec)
src/db/db.ts           Esquema de Dexie e ids
src/db/seed.ts         Plan sembrado (SEED_VERSION) y de dónde sale
src/db/planes/         Planes de bloque en formato entrenos-plan (bloque-4-plan.json)
src/db/plan.ts         Validar y cargar un plan sin tocar el historial
src/db/inicializar.ts  Carga idempotente de la semilla y reparación de duraciones
src/db/consolidacion.ts  Tramos de «Consolidar técnica» por ejercicio
src/db/consultas.ts    Lecturas de uso común
src/db/registro.ts     Escrituras del entrenamiento (series, sesiones, saltos)
src/db/incrementos.ts  Incrementos por tipo de carga
src/db/ajustes.ts      Tabla clave-valor de ajustes
src/db/fechas.ts       Fechas en formato local
src/db/formato.ts      Números en formato español
src/db/exportar.ts     Copia JSON, CSV para Excel y restauración
src/db/bloques.ts      Cerrar y reabrir el bloque (regla 6)
src/db/peso.ts         Pesadas y rango de control

src/logica/modeloSesion.ts  Estado de la sesión en curso, reconstruido desde la base
src/logica/precarga.ts      Valores que salen ya puestos en cada serie
src/logica/rotacion.ts      Ciclo de sesiones, opcionales, técnica, descarga y estado del bloque
src/logica/motivos.ts       Motivos rápidos de omisión
src/logica/copia.ts         Cuándo recordar la copia de seguridad
src/logica/progresion.ts    Doble progresión, aviso de subir y estancamiento
src/logica/historial.ts     Historial por sesión y por ejercicio, y adherencia
src/logica/pesoCorporal.ts  Semanas de peso y aviso de tres seguidas fuera

src/ui/PantallaInicio.tsx   Qué sesión toca hoy y progreso del bloque
src/ui/PantallaElegirSesion.tsx  Salto manual a otra sesión
src/ui/PantallaSesion.tsx   Pantalla de sesión en curso
src/ui/TemporizadorDescanso.tsx  Cuenta atrás del descanso entre series
src/ui/descanso.ts          Pitido (Web Audio), vibración y notificación del descanso
src/ui/pantallaEncendida.ts Wake Lock durante la sesión
src/ui/PantallaAjustes.tsx  Notificaciones y pantalla encendida
src/ui/TarjetaEjercicio.tsx Ejercicio expandido o colapsado, con sus series
src/ui/ControlNumerico.tsx  Peso y reps con -/+, sin teclado
src/ui/Cronometro.tsx       Cronómetro de las planchas
src/ui/PantallaDatos.tsx    Copia de seguridad, exportar CSV y restaurar
src/ui/PantallaHistorial.tsx     Historial por sesión y por ejercicio
src/ui/PantallaPesoCorporal.tsx  Pesadas semanales y rango de control
src/ui/Grafica.tsx          Gráfica de línea en SVG, sin librerías
src/ui/descargar.ts         Descarga de ficheros desde el navegador
src/pwa.ts                  Registro del service worker
src/App.tsx                 Navegación entre pantallas

public/manifest.webmanifest Manifest de la PWA
public/sw.js                Service worker: arranque sin conexión
public/icono.svg            Icono, del que salen los PNG
herramientas/               Utilidades sueltas (generar los PNG del icono)

pruebas/                    Pruebas de navegador (ver pruebas/LEEME.md)
```

## Pruebas

152 comprobaciones en Chromium sobre IndexedDB real, incluidos todos los
criterios de aceptación del punto 10:

- Serie con los valores ya correctos: **1 toque**.
- Serie cambiando el peso: **2 toques**.
- Cerrar el navegador a mitad de sesión y volver: se conserva todo y se entra
  directamente a la sesión a medias.
- La sesión entera funciona con la red cortada.
- El CSV sale con BOM, punto y coma y coma decimal, que es lo que Excel en
  español necesita para abrirlo bien.
- Tras completar un ejercicio en el tope del rango, la vez siguiente sale el
  peso ya subido y la etiqueta de aviso.
- Con la red cortada y sin nada abierto, la app arranca igual y deja entrenar.

Con el servidor arrancado en otra ventana:

```
npm run pruebas
```

Las de la PWA van aparte porque el service worker solo se registra en el build:

```
npm run build
npm run preview
npm run pruebas:pwa
```

Necesitan Playwright, que se instala aparte porque la app no lo usa. Los
detalles están en `pruebas/LEEME.md`.

## Historial y peso corporal

El historial son los mismos datos mirados de dos formas: **por sesión** (qué se
hizo cada día, con las series y los motivos de lo que se saltó) y **por
ejercicio** (gráfica del peso a lo largo de las rotaciones y la tabla de cada
día). Arriba, la adherencia: sesiones hechas de 30 y las veces que se hizo el
core, contando aparte porque es lo que más se saltaba el bloque pasado. Un
ejercicio saltado no pinta un punto a cero en la gráfica: eso haría creer que se
levantaron 0 kg, y se ve en la vista por sesión, que es donde toca.

El peso corporal se apunta una vez por semana. Si hay varias pesadas en la misma
semana vale la última. Solo se avisa con **tres semanas seguidas fuera del rango
y hacia el mismo lado**: una pesada alta un martes no significa nada, y avisar
por ella sería ruido. Seguidas de verdad: si falta la pesada de una semana la
racha se rompe, porque no se sabe qué pasó esa semana.

Las gráficas son SVG escrito a mano, sin librerías. Una sola serie, así que no
llevan leyenda ni paleta de colores; y no llevan tooltip a propósito, porque
esto se usa con el dedo y el hover no existe: el detalle está en la tabla de
debajo, que además es lo que sirve para leerlo sin ver la gráfica. En la del
peso corporal, lo que dice que una pesada está fuera de rango es que **cae fuera
de la banda sombreada** y que la lista lo pone con texto; el color solo lo
refuerza, porque el verde y el ámbar no se distinguen bien con daltonismo protán.

## Instalar en el móvil

La app es una PWA: se abre en el navegador del móvil y se añade a la pantalla
de inicio (en iPhone, Compartir → Añadir a pantalla de inicio; en Android, el
menú del navegador → Instalar). Desde ahí arranca a pantalla completa, sin
barra del navegador, y con su icono.

Una vez abierta con cobertura al menos una vez, arranca sin conexión: el
service worker guarda el HTML, el JS y el CSS, y los entrenos ya vivían en
IndexedDB. En el gimnasio no hace falta señal para nada.

Sobre el service worker (`public/sw.js`), que es lo único con algo de truco:

- Las navegaciones van a la red primero, así que al desplegar una versión nueva
  se coge sola; si no hay red, tira de la copia guardada.
- El resto de ficheros, copia guardada primero. Vite pone un hash en cada
  nombre, así que un fichero guardado nunca es la versión equivocada.
- Solo se registra en producción. En desarrollo se desregistra al arrancar, que
  si no sirve ficheros viejos y parece que los cambios no se aplican.
- Para tirar todo lo guardado y empezar de cero, subir `CACHE` de versión. Es lo
  único que hay que tocar ahí.

## Despliegue

Está en GitHub Pages: **https://samuvr.github.io/Entrenos/**

Cada push a `main` lo redespliega solo, con el workflow
`.github/workflows/desplegar.yml`. Como `npm run build` es `tsc -b && vite
build`, un error de tipos tumba el despliegue en vez de publicar algo roto. No
pasa las pruebas de navegador: necesitan Chromium y un servidor levantado, y se
lanzan en local (ver `pruebas/LEEME.md`).

En GitHub hace falta tenerlo activado una vez: Settings → Pages → Source →
**GitHub Actions**.

Detalles que conviene no romper:

- **`base: './'` en `vite.config.ts`.** Pages sirve el repo desde la subcarpeta
  `/Entrenos/`; con rutas relativas funcionan los assets, el manifest, el
  service worker y los iconos. Con rutas absolutas, ninguno.
- **HTTPS** (o localhost). Sin eso el navegador ni registra el service worker ni
  ofrece instalar la app, así que no habría ni PWA ni arranque sin conexión.
  Pages lo da de serie.

`npm run build` deja en `dist/` ficheros estáticos y sin backend, así que
cualquier otro alojamiento estático (Netlify, Vercel) vale igual.

## Progresión

La regla que más se incumple es la doble progresión: completar todas las series
en el tope del rango y luego repetir el mismo peso. La app la cierra sola.

- Al terminar un ejercicio con **todas** las series completadas en el tope del
  rango y al mismo peso: **"Objetivo cumplido. La próxima vez: 37,5 kg"**.
- La vez siguiente el peso ya sale subido, con la etiqueta **SUBE HOY**, que se
  apaga en cuanto se registra la primera serie. Con el peso nuevo las reps salen
  por abajo del rango, que es donde se cae de verdad al subir.
- Si esa vez no se sube, el aviso vuelve a salir la siguiente.
- En los ejercicios corporales no hay peso que subir: ahí se progresa alargando
  el tiempo (+5 s), que es lo que dice la tabla de incrementos.
- El **bloque 3 va sin descarga** (`conDescarga: false` en la semilla): su
  rotación 6 es normal. En los bloques que sí la tengan:
- **En la rotación de descarga no se sube**, ni se progresa desde ella: repite
  el peso de la rotación 5 con menos series, así que llegar al tope ahí no
  cuenta como haberlo ganado.
- Un ejercicio está **estancado** si lleva tres sesiones seguidas con el mismo
  peso **sin aumentar las repeticiones totales** (la suma de las series
  limpias): pasar de 30 a 32 reps totales ya es progresar. No cuentan las
  descargas, los días en que se saltó el ejercicio o alguna serie por falta de
  tiempo o molestia, ni los días en consolidación.

## Bloque 4

- **Día opcional (E, cardio + core)**: se empieza desde Inicio cuando se
  consigue un 5.º día. No cuenta para las rotaciones ni mueve la sesión que
  toca: el bloque son 4 × 6 = 24 sesiones.
- **Sesiones de técnica**: las 2 primeras veces de cada sesión
  (`sesionesTecnicaInicio`) avisan «Sesión de técnica: no subas peso» y no
  proponen subir carga.
- **Temporizador de descanso**: al confirmar una serie arranca la cuenta atrás
  con el `descansoSeg` del ejercicio (−15 s, +15 s, saltar). Se calcula sobre la
  hora de fin, así que es correcto aunque se bloquee el móvil, y sobrevive a una
  recarga. Al acabar pita (Web Audio) y vibra. Con la app en segundo plano avisa
  una notificación lanzada por el service worker: hay que activarla en
  **Ajustes** y, en Android, tener la app instalada en la pantalla de inicio.
  En Ajustes también se puede mantener la pantalla encendida (Wake Lock).
- **Superseries**: los ejercicios con el mismo `superserie` se alternan solos
  (A1 → A2 → A1…), cada uno con su descanso. «Saltar la superserie (falta de
  tiempo)» deja sus series omitidas con motivo «Falta de tiempo», que no cuenta
  para el estancamiento. Las sesiones de torso avisan al empezar qué superserie
  saltar si se empieza a las 6:45.
- **Consolidar técnica**: botón por ejercicio. Mientras está activo sale «en
  consolidación», no se propone subir y el contador de estancamiento se congela.
  Se desactiva a mano.
- **Duraciones**: al terminar, la duración va del inicio a la última serie más
  5 minutos. Al arrancar, la app recalcula así las sesiones de más de 3 horas
  que quedaron abiertas (las del bloque 3).

## Cómo se cambia de bloque

Dos formas, y ninguna toca el historial:

- **Desde la app**: «Copia de seguridad y exportar» → «Cargar plan de bloque»,
  con un fichero `entrenos-plan` (como `src/db/planes/bloque-4-plan.json`).
  Añade el bloque y cierra el que estaba activo el día antes de que empiece.
- **En el código**: se deja el plan en `src/db/planes/`, se apunta en
  `src/db/seed.ts` y se sube `SEED_VERSION`. Al abrir la app se aplica igual.

## Copias de seguridad

Los datos viven solo en el navegador del móvil y se pierden si se borran los
datos del sitio o se cambia de teléfono. La copia en JSON es la única
protección, así que Inicio la recuerda cada vez que se cierra una rotación
sin haberla guardado, y el botón está a la vista, no escondido en ajustes.

- **JSON**: se lo lleva todo (plantilla, historial y ajustes) y se puede
  restaurar tal cual. Es la copia de seguridad de verdad. Al restaurar se
  reemplaza lo que hubiera, previa confirmación y enseñando qué trae el
  fichero.
- **CSV**: una fila por serie, para analizar el bloque en Excel al terminarlo.
  No restaura nada. Lleva BOM (acentos), punto y coma como separador y coma
  decimal, que es lo que espera el Excel en español. Además de las siete
  columnas de la spec añade `unidad`, `completada` y `motivo`: sin ellas una
  plancha de 45 segundos parecería 45 repeticiones y una serie saltada
  parecería una serie hecha con 0 kg.

Al completar todas las sesiones del bloque (24 en el bloque 4), Inicio ofrece exportar el CSV y cerrar el bloque
(regla 6). Cerrar solo pone la fecha de fin y lo marca inactivo; no borra nada
y se puede reabrir.
