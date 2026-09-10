# Pruebas de navegador

Comprueban en Chromium, sobre IndexedDB real, los criterios de aceptación del
punto 10 de la especificación: cuántos toques cuesta anotar una serie, que
nada se pierde al cerrar el navegador y que todo funciona sin conexión.

Playwright no está en `package.json` a propósito: la app no lo necesita y los
navegadores pesan mucho. Se instala aparte, una vez:

```
npm i -D playwright
npx playwright install chromium
```

Con el servidor de desarrollo arrancado en otra ventana (`npm run dev`):

```
npm run pruebas
```

O una suite suelta:

```
node pruebas/rotacion.mjs
```

Si el servidor escucha en otro sitio: `set URL_PRUEBAS=http://localhost:4173/`
en CMD antes de lanzarlas.

| Suite | Qué cubre |
|---|---|
| `semilla.mjs` | La semilla del bloque 3 se carga entera y no se duplica |
| `registro.mjs` | Toques por serie, precarga, cronómetro, saltos con motivo, persistencia |
| `rotacion.mjs` | Ciclo A→B→C→D→E, progreso del bloque, avisos, salto manual de sesión |
| `descarga.mjs` | Rotación 6 y funcionamiento sin conexión |
| `exportar.mjs` | Copia JSON, CSV para Excel, restaurar, aviso de copia y cierre de bloque |
| `progresion.mjs` | Doble progresión, SUBE HOY, objetivo cumplido y estancamiento |
| `pwa.mjs` | Manifest, iconos, service worker y arranque en modo avión |

Cada suite deja el estado de la anterior por medio, así que se lanzan en su
propio navegador y siembran lo que necesitan.

## La suite de la PWA va aparte

`pwa.mjs` no entra en `npm run pruebas`: necesita el build, no el servidor de
desarrollo, porque el service worker solo se registra en producción.

```
npm run build
npm run preview
npm run pruebas:pwa
```

Si el preview escucha en otro sitio: `set URL_PRUEBAS_PROD=http://localhost:5000/`.

Lo que no cubre y se comprobó a mano: que tras desplegar una versión nueva la
app coja el bundle nuevo al recargar con red, y que a partir de ahí arranque en
modo avión ya con esa versión. Automatizarlo pediría reconstruir a mitad de la
prueba, que es más lío del que ahorra.
