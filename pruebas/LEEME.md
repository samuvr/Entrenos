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

Cada suite deja el estado de la anterior por medio, así que se lanzan en su
propio navegador y siembran lo que necesitan.
