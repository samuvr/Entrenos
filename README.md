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

Hechos los pasos 1 a 4 del plan de trabajo (punto 11 de la spec):

- [x] 1. Modelo de datos, persistencia en IndexedDB y semilla del bloque 3
- [x] 2. Pantalla de sesión en curso con registro de series
- [x] 3. Lógica de rotación y pantalla de inicio
- [x] 4. Exportación a JSON y CSV
- [ ] 5. Avisos de progresión
- [ ] 6. Historial y peso corporal
- [ ] 7. PWA, service worker e instalación en el móvil

La app ya se usa de principio a fin de una sesión: al abrirla dice qué toca,
se arranca de un toque, se registra serie a serie y al terminar avanza sola en
el ciclo. Los datos ya se pueden sacar del móvil y volver a meter. Los enlaces
a Historial y Peso corporal llegan con el paso 6; de momento no aparecen en
Inicio para no dejar botones muertos.

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
src/db/exportar.ts     Copia JSON, CSV para Excel y restauración
src/db/bloques.ts      Cerrar y reabrir el bloque (regla 6)

src/logica/modeloSesion.ts  Estado de la sesión en curso, reconstruido desde la base
src/logica/precarga.ts      Valores que salen ya puestos en cada serie
src/logica/rotacion.ts      Ciclo A→B→C→D→E, rotación, descarga y estado del bloque
src/logica/motivos.ts       Motivos rápidos de omisión
src/logica/copia.ts         Cuándo recordar la copia de seguridad

src/ui/PantallaInicio.tsx   Qué sesión toca hoy y progreso del bloque
src/ui/PantallaElegirSesion.tsx  Salto manual a otra sesión
src/ui/PantallaSesion.tsx   Pantalla de sesión en curso
src/ui/TarjetaEjercicio.tsx Ejercicio expandido o colapsado, con sus series
src/ui/ControlNumerico.tsx  Peso y reps con -/+, sin teclado
src/ui/Cronometro.tsx       Cronómetro de las planchas
src/ui/PantallaDatos.tsx    Copia de seguridad, exportar CSV y restaurar
src/ui/descargar.ts         Descarga de ficheros desde el navegador
src/App.tsx                 Navegación entre pantallas

pruebas/                    Pruebas de navegador (ver pruebas/LEEME.md)
```

## Pruebas

97 comprobaciones en Chromium sobre IndexedDB real, incluidos los criterios de
aceptación del punto 10:

- Serie con los valores ya correctos: **1 toque**.
- Serie cambiando el peso: **2 toques**.
- Cerrar el navegador a mitad de sesión y volver: se conserva todo y se entra
  directamente a la sesión a medias.
- La sesión entera funciona con la red cortada.
- El CSV sale con BOM, punto y coma y coma decimal, que es lo que Excel en
  español necesita para abrirlo bien.

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
