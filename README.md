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

Hechos los pasos 1 a 5 y el 7 del plan de trabajo (punto 11 de la spec):

- [x] 1. Modelo de datos, persistencia en IndexedDB y semilla del bloque 3
- [x] 2. Pantalla de sesión en curso con registro de series
- [x] 3. Lógica de rotación y pantalla de inicio
- [x] 4. Exportación a JSON y CSV
- [x] 5. Avisos de progresión
- [ ] 6. Historial y peso corporal
- [x] 7. PWA, service worker e instalación en el móvil

La app ya se usa de principio a fin de una sesión: al abrirla dice qué toca,
se arranca de un toque, se registra serie a serie y al terminar avanza sola en
el ciclo. Los datos ya se pueden sacar del móvil y volver a meter, la doble
progresión se aplica y se avisa sola, y la app se instala en la pantalla de
inicio del móvil y arranca en modo avión desde cero.

Queda el paso 6. Los enlaces a Historial y Peso corporal llegan con él; de
momento no aparecen en Inicio para no dejar botones muertos.

## Estructura

```
src/db/types.ts        Modelo de datos (punto 4 de la spec)
src/db/db.ts           Esquema de Dexie e ids
src/db/seed.ts         Datos del bloque 3 (punto 7 de la spec)
src/db/inicializar.ts  Carga idempotente de la semilla
src/db/consultas.ts    Lecturas de uso común
src/db/registro.ts     Escrituras del entrenamiento (series, sesiones, saltos)
src/db/incrementos.ts  Incrementos por tipo de carga
src/db/ajustes.ts      Tabla clave-valor de ajustes
src/db/fechas.ts       Fechas en formato local
src/db/formato.ts      Números en formato español
src/db/exportar.ts     Copia JSON, CSV para Excel y restauración
src/db/bloques.ts      Cerrar y reabrir el bloque (regla 6)

src/logica/modeloSesion.ts  Estado de la sesión en curso, reconstruido desde la base
src/logica/precarga.ts      Valores que salen ya puestos en cada serie
src/logica/rotacion.ts      Ciclo A→B→C→D→E, rotación, descarga y estado del bloque
src/logica/motivos.ts       Motivos rápidos de omisión
src/logica/copia.ts         Cuándo recordar la copia de seguridad
src/logica/progresion.ts    Doble progresión, aviso de subir y estancamiento

src/ui/PantallaInicio.tsx   Qué sesión toca hoy y progreso del bloque
src/ui/PantallaElegirSesion.tsx  Salto manual a otra sesión
src/ui/PantallaSesion.tsx   Pantalla de sesión en curso
src/ui/TarjetaEjercicio.tsx Ejercicio expandido o colapsado, con sus series
src/ui/ControlNumerico.tsx  Peso y reps con -/+, sin teclado
src/ui/Cronometro.tsx       Cronómetro de las planchas
src/ui/PantallaDatos.tsx    Copia de seguridad, exportar CSV y restaurar
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

130 comprobaciones en Chromium sobre IndexedDB real, incluidos todos los
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

`npm run build` deja en `dist/` ficheros estáticos, sin backend. Vale cualquier
alojamiento estático (GitHub Pages, Netlify, Vercel). Las rutas son relativas
(`base: './'`), así que también funciona servido desde una subcarpeta.

Tiene que servirse por **HTTPS** (o localhost): sin eso el navegador no
registra el service worker ni ofrece instalar la app.

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
- **En la rotación de descarga no se sube**, ni se progresa desde ella: repite
  el peso de la rotación 5 con menos series, así que llegar al tope ahí no
  cuenta como haberlo ganado.
- Tres sesiones seguidas al mismo peso sin llegar al tope marcan el ejercicio
  como **estancado**. Las descargas no cuentan para eso, que darían un
  estancamiento falso. La vista de historial llega con el paso 6; de momento el
  aviso sale en la propia tarjeta del ejercicio.

## Cómo se cambia de bloque

Los bloques nuevos no se crean desde la interfaz: se editan los datos de
`src/db/seed.ts` y se sube `SEED_VERSION`. Al abrir la app, la semilla nueva
se aplica sobre las tablas de plantilla sin tocar el historial ya registrado.

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

Al llegar a las 30 sesiones, Inicio ofrece exportar el CSV y cerrar el bloque
(regla 6). Cerrar solo pone la fecha de fin y lo marca inactivo; no borra nada
y se puede reabrir.
