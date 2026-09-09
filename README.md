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
npm run pruebas   Pruebas de navegador (requieren el dev server arrancado)
```

## Estado

Hechos los pasos 1, 2 y 3 del plan de trabajo (punto 11 de la spec):

- [x] 1. Modelo de datos, persistencia en IndexedDB y semilla del bloque 3
- [x] 2. Pantalla de sesión en curso con registro de series
- [x] 3. Lógica de rotación y pantalla de inicio
- [ ] 4. Exportación a JSON y CSV
- [ ] 5. Avisos de progresión
- [ ] 6. Historial y peso corporal
- [ ] 7. PWA, service worker e instalación en el móvil

La app ya se usa de principio a fin de una sesión: al abrirla dice qué toca,
se arranca de un toque, se registra serie a serie y al terminar avanza sola en
el ciclo. Los enlaces a Historial, Peso corporal y Ajustes llegan con sus
pasos (4 y 6); de momento no aparecen en Inicio para no dejar botones muertos.

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
src/logica/rotacion.ts      Ciclo A→B→C→D→E, rotación, descarga y estado del bloque
src/logica/motivos.ts       Motivos rápidos de omisión

src/ui/PantallaInicio.tsx   Qué sesión toca hoy y progreso del bloque
src/ui/PantallaElegirSesion.tsx  Salto manual a otra sesión
src/ui/PantallaSesion.tsx   Pantalla de sesión en curso
src/ui/TarjetaEjercicio.tsx Ejercicio expandido o colapsado, con sus series
src/ui/ControlNumerico.tsx  Peso y reps con -/+, sin teclado
src/ui/Cronometro.tsx       Cronómetro de las planchas
src/App.tsx                 Navegación entre las tres pantallas

pruebas/                    Pruebas de navegador (ver pruebas/LEEME.md)
```

## Pruebas

68 comprobaciones en Chromium sobre IndexedDB real, incluidos los criterios de
aceptación del punto 10:

- Serie con los valores ya correctos: **1 toque**.
- Serie cambiando el peso: **2 toques**.
- Cerrar el navegador a mitad de sesión y volver: se conserva todo y se entra
  directamente a la sesión a medias.
- La sesión entera funciona con la red cortada.

Con el servidor arrancado en otra ventana:

```
npm run pruebas
```

Necesitan Playwright, que se instala aparte porque la app no lo usa. Los
detalles están en `pruebas/LEEME.md`.

## Cómo se cambia de bloque

Los bloques nuevos no se crean desde la interfaz: se editan los datos de
`src/db/seed.ts` y se sube `SEED_VERSION`. Al abrir la app, la semilla nueva
se aplica sobre las tablas de plantilla sin tocar el historial ya registrado.

## Copias de seguridad

Los datos viven solo en el navegador del móvil y se pierden si se borran los
datos del sitio o se cambia de teléfono. La exportación a JSON (paso 4) es la
única protección; hay que usarla al terminar cada rotación.
