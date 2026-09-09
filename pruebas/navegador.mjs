/**
 * Arranca Chromium para las pruebas de navegador.
 *
 * Playwright no está en package.json a propósito: la app no lo necesita para
 * nada y bajarse los navegadores pesa mucho. Se instala aparte cuando se
 * quieren pasar las pruebas (ver pruebas/LEEME.md).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

async function cargarPlaywright() {
  const candidatos = [
    'playwright',
    'playwright-core',
    // Instalación global, que es como suele estar en Linux/CI.
    '/opt/node22/lib/node_modules/playwright/index.mjs',
  ];
  for (const candidato of candidatos) {
    try {
      return candidato.startsWith('/')
        ? await import(candidato)
        : require(candidato);
    } catch {
      // Se prueba el siguiente.
    }
  }
  throw new Error(
    'No se encuentra Playwright. Instálalo con: npm i -D playwright && npx playwright install chromium',
  );
}

export const URL_BASE = process.env.URL_PRUEBAS ?? 'http://localhost:5173/';

/** Móvil de 390x844, que es el tamaño para el que está pensada la app. */
export async function abrirNavegador() {
  const { chromium } = await cargarPlaywright();
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const pagina = await contexto.newPage();

  const errores = [];
  pagina.on('pageerror', (e) => errores.push(String(e)));
  pagina.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });

  return { navegador, contexto, pagina, errores };
}

let fallos = 0;

export function comprobar(condicion, mensaje) {
  console.log(`${condicion ? 'OK  ' : 'FALLO'} ${mensaje}`);
  if (!condicion) fallos += 1;
}

/** Cierra el navegador y sale con código 1 si algo ha fallado. */
export async function cerrar(navegador, errores) {
  console.log(`\nerrores de consola: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
  await navegador.close();
  if (errores.length > 0) fallos += 1;
  if (fallos > 0) {
    console.log(`\n${fallos} comprobación(es) fallida(s)`);
    process.exit(1);
  }
  console.log('\ntodo correcto');
}

/** Escribe N sesiones ya terminadas siguiendo el ciclo A→B→C→D→E. */
export function sembrarHistorial(pagina, cantidad) {
  return pagina.evaluate(async (n) => {
    const letras = ['A', 'B', 'C', 'D', 'E'];
    const bd = await new Promise((r) => {
      const q = indexedDB.open('entrenos');
      q.onsuccess = () => r(q.result);
    });
    const tx = bd.transaction('sesionesRealizadas', 'readwrite');
    const almacen = tx.objectStore('sesionesRealizadas');
    almacen.clear();
    for (let i = 0; i < n; i += 1) {
      const dia = String((i % 27) + 1).padStart(2, '0');
      const mes = Math.floor(i / 27) + 7;
      almacen.put({
        id: `h-${i}`,
        bloqueId: 'bloque-3',
        sesionId: `bloque-3-${letras[i % 5]}`,
        rotacion: Math.floor(i / 5) + 1,
        fecha: `2026-0${mes}-${dia}`,
        iniciadaEn: `2026-0${mes}-${dia}T06:30:00.000Z`,
        finalizadaEn: `2026-0${mes}-${dia}T07:30:00.000Z`,
        duracionMin: 60,
        notas: null,
        finalizada: true,
      });
    }
    await new Promise((r) => {
      tx.oncomplete = r;
    });
  }, cantidad);
}

/** Cuenta filas de una tabla de IndexedDB. */
export function contarFilas(pagina, tabla) {
  return pagina.evaluate(async (nombre) => {
    const bd = await new Promise((r) => {
      const q = indexedDB.open('entrenos');
      q.onsuccess = () => r(q.result);
    });
    return new Promise((r) => {
      const q = bd.transaction(nombre).objectStore(nombre).count();
      q.onsuccess = () => r(q.result);
    });
  }, tabla);
}

/** Lee todas las filas de una tabla de IndexedDB. */
export function leerTabla(pagina, tabla) {
  return pagina.evaluate(async (nombre) => {
    const bd = await new Promise((r) => {
      const q = indexedDB.open('entrenos');
      q.onsuccess = () => r(q.result);
    });
    return new Promise((r) => {
      const q = bd.transaction(nombre).objectStore(nombre).getAll();
      q.onsuccess = () => r(q.result);
    });
  }, tabla);
}

/** Escribe filas sueltas en una tabla de IndexedDB, sin borrar lo que hubiera. */
export function escribirFilas(pagina, tabla, filas) {
  return pagina.evaluate(async ({ nombre, datos }) => {
    const bd = await new Promise((r) => {
      const q = indexedDB.open('entrenos');
      q.onsuccess = () => r(q.result);
    });
    const tx = bd.transaction(nombre, 'readwrite');
    for (const fila of datos) tx.objectStore(nombre).put(fila);
    await new Promise((r) => {
      tx.oncomplete = r;
    });
  }, { nombre: tabla, datos: filas });
}

/** Vacía una tabla de IndexedDB. */
export function vaciarTabla(pagina, tabla) {
  return pagina.evaluate(async (nombre) => {
    const bd = await new Promise((r) => {
      const q = indexedDB.open('entrenos');
      q.onsuccess = () => r(q.result);
    });
    const tx = bd.transaction(nombre, 'readwrite');
    tx.objectStore(nombre).clear();
    await new Promise((r) => {
      tx.oncomplete = r;
    });
  }, tabla);
}
