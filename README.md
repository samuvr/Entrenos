# Entrenos

Webapp personal para registrar entrenamientos, sustituyendo un Excel. Un solo
usuario, sin login, sin backend. Se usa en el gimnasio a las 6:30, con una mano
y sin cobertura: todo funciona en local sobre IndexedDB.

La especificación completa está en `docs/ESPECIFICACION.md`.

## Stack

- React 18 + Vite + TypeScript
- Dexie (IndexedDB) para la persistencia local
- CSS plano, sin librerías de componentes

## Comandos

Funcionan igual en Windows (CMD) y en Linux.

```
npm install       Instala las dependencias
npm run dev       Arranca el servidor de desarrollo
npm run build     Comprueba tipos y genera dist/
npm run preview   Sirve el dist/ ya generado
npm run typecheck Solo comprobación de tipos
```

## Estado

Hechos los pasos 1 y 2 del plan de trabajo (punto 11 de la spec):

- [x] 1. Modelo de datos, persistencia en IndexedDB y semilla del bloque 3
- [x] 2. Pantalla de sesión en curso con registro de series
- [ ] 3. Lógica de rotación y pantalla de inicio
- [ ] 4. Exportación a JSON y CSV
- [ ] 5. Avisos de progresión
- [ ] 6. Historial y peso corporal
- [ ] 7. PWA, service worker e instalación en el móvil

La pantalla de sesión ya está entera: precarga de valores, registro serie a
serie, cronómetro, saltos con motivo y descarga automática en la rotación 6.
La pantalla de arranque es todavía un selector manual de sesión; la sustituye
la de Inicio en el paso 3, que dirá sola qué sesión toca.

Sin conexión la app funciona una vez cargada, pero abrirla en modo avión desde
cero necesita el service worker del paso 7.

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

src/logica/modeloSesion.ts  Estado de la sesión en curso, reconstruido desde la base
src/logica/precarga.ts      Valores que salen ya puestos en cada serie
src/logica/rotacion.ts      Rotación de cada sesión y regla de descarga
src/logica/motivos.ts       Motivos rápidos de omisión

src/ui/PantallaSesion.tsx   Pantalla de sesión en curso
src/ui/TarjetaEjercicio.tsx Ejercicio expandido o colapsado, con sus series
src/ui/ControlNumerico.tsx  Peso y reps con -/+, sin teclado
src/ui/Cronometro.tsx       Cronómetro de las planchas
src/App.tsx                 Selector de sesión provisional y arranque
```

## Cuántos toques cuesta registrar

Los criterios de aceptación del punto 10 se comprueban en Chromium:

- Serie con los valores ya correctos: **1 toque**.
- Serie cambiando el peso: **2 toques**.
- Al confirmar salta solo a la serie siguiente, y al acabar un ejercicio, al
  siguiente ejercicio.
- Cerrar el navegador a mitad de sesión y volver: se conserva todo y se entra
  directamente a la sesión a medias.

## Cómo se cambia de bloque

Los bloques nuevos no se crean desde la interfaz: se editan los datos de
`src/db/seed.ts` y se sube `SEED_VERSION`. Al abrir la app, la semilla nueva
se aplica sobre las tablas de plantilla sin tocar el historial ya registrado.

## Copias de seguridad

Los datos viven solo en el navegador del móvil y se pierden si se borran los
datos del sitio o se cambia de teléfono. La exportación a JSON (paso 4) es la
única protección; hay que usarla al terminar cada rotación.
