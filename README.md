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

Hecho el paso 1 del plan de trabajo (punto 11 de la spec):

- [x] 1. Modelo de datos, persistencia en IndexedDB y semilla del bloque 3
- [ ] 2. Pantalla de sesión en curso con registro de series
- [ ] 3. Lógica de rotación y pantalla de inicio
- [ ] 4. Exportación a JSON y CSV
- [ ] 5. Avisos de progresión
- [ ] 6. Historial y peso corporal
- [ ] 7. PWA, service worker e instalación en el móvil

La pantalla actual solo lista el bloque sembrado; sirve para comprobar que la
base de datos carga bien y la sustituye la pantalla de Inicio en el paso 3.

## Estructura

```
src/db/types.ts        Modelo de datos (punto 4 de la spec)
src/db/db.ts           Esquema de Dexie e ids
src/db/seed.ts         Datos del bloque 3 (punto 7 de la spec)
src/db/inicializar.ts  Carga idempotente de la semilla
src/db/consultas.ts    Lecturas de uso común
src/db/incrementos.ts  Incrementos por tipo de carga
src/db/ajustes.ts      Tabla clave-valor de ajustes
src/db/fechas.ts       Fechas en formato local
src/db/formato.ts      Números en formato español
src/App.tsx            Pantalla temporal de verificación
```

## Cómo se cambia de bloque

Los bloques nuevos no se crean desde la interfaz: se editan los datos de
`src/db/seed.ts` y se sube `SEED_VERSION`. Al abrir la app, la semilla nueva
se aplica sobre las tablas de plantilla sin tocar el historial ya registrado.

## Copias de seguridad

Los datos viven solo en el navegador del móvil y se pierden si se borran los
datos del sitio o se cambia de teléfono. La exportación a JSON (paso 4) es la
única protección; hay que usarla al terminar cada rotación.
