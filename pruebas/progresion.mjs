/**
 * Avisos de progresión (punto 5.3 y reglas 1 y 2): doble progresión, etiqueta
 * SUBE HOY, aviso al cumplir el objetivo y detección de estancamiento.
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  escribirFilas,
  sembrarHistorial,
  vaciarTabla,
  URL_BASE,
} from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

const PRESS = 'bloque-3-A-1';

function serie(sesion, ejercicioId, numeroSerie, peso, reps) {
  return {
    id: `${sesion}__${ejercicioId}__${numeroSerie}`,
    sesionRealizadaId: sesion,
    ejercicioId,
    numeroSerie,
    peso,
    reps,
    completada: true,
    motivoOmision: null,
    registradaEn: `2026-07-01T06:${String(30 + numeroSerie).padStart(2, '0')}:00.000Z`,
  };
}

/** Las 4 series del press banca de una sesión, todas al mismo peso y reps. */
function pressBanca(sesion, peso, reps) {
  return [1, 2, 3, 4].map((n) => serie(sesion, PRESS, n, peso, reps));
}

/** Deja el historial que se quiera y vuelve a Inicio. */
async function preparar(sesionesHechas, series = []) {
  await vaciarTabla(pagina, 'seriesRealizadas');
  await sembrarHistorial(pagina, sesionesHechas);
  if (series.length > 0) await escribirFilas(pagina, 'seriesRealizadas', series);
  await pagina.reload({ waitUntil: 'networkidle' });
}

const abierto = pagina.locator('.ejercicio.abierto');

// ---------- Objetivo cumplido, en directo ----------

// Sin historial, la precarga es el peso inicial y el tope del rango: cuatro
// toques bastan para completar las 4 series a 35x10 y ganarse la subida.
await preparar(0);
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
for (let i = 0; i < 4; i += 1) {
  await pagina.locator('.serie.activa .boton-confirmar').first().click();
  await pagina.waitForTimeout(150);
}

const logro = pagina.locator('.logro-compacto').first();
comprobar(
  (await logro.innerText()).includes('Objetivo cumplido. La próxima vez: 37,5 kg'),
  `al completar las 4 series a 10 reps avisa: "${(await logro.innerText()).trim()}"`,
);
comprobar(
  (await abierto.locator('.nombre').first().innerText()).includes('Plancha'),
  'y el aviso no estorba el salto al ejercicio siguiente',
);

// ---------- SUBE HOY la vez siguiente ----------

await preparar(5, pressBanca('h-0', 35, 10));
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');

const sube = abierto.locator('.banner-sube');
comprobar((await sube.innerText()).includes('SUBE HOY: 37,5 kg'), 'la vez siguiente sale SUBE HOY');
comprobar(
  (await abierto.locator('.control-valor').first().innerText()).includes('37,5'),
  'con el peso nuevo ya precargado',
);
comprobar(
  (await abierto.locator('.control-valor').nth(1).innerText()).trim().startsWith('8'),
  'y las reps por abajo del rango, que es donde se cae al subir',
);

// Un peso de cuatro cifras no puede comerse el «+»: con 37,5 kg los controles
// se quedaron cortos una vez y el botón de subir quedaba fuera de la caja.
const desbordan = await pagina.$$eval('.serie.activa .control-fila', (filas) =>
  filas.filter((f) => f.scrollWidth > f.clientWidth).length,
);
comprobar(desbordan === 0, 'los controles caben con el peso de cuatro cifras');

await pagina.locator('.serie.activa .boton-confirmar').first().click();
await pagina.waitForSelector('.serie.registrada');
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'al registrar la primera serie el aviso se apaga',
);

// ---------- Si no subes, el aviso vuelve ----------

await preparar(10, [...pressBanca('h-0', 35, 10), ...pressBanca('h-5', 35, 10)]);
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await abierto.locator('.banner-sube').innerText()).includes('37,5 kg'),
  'si la vez pasada no subiste, el aviso vuelve a salir',
);

// ---------- Sin el tope no se sube ----------

await preparar(5, pressBanca('h-0', 35, 9));
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'a 9 reps no se llega al tope y no se propone subir',
);
comprobar(
  (await abierto.locator('.control-valor').first().innerText()).includes('35'),
  'y se repite el peso de la última vez',
);

// Una sola serie corta tumba la subida: son *todas* las series al tope.
await preparar(5, [...pressBanca('h-0', 35, 10).slice(0, 3), serie('h-0', PRESS, 4, 35, 9)]);
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'con 3 series al tope y una a 9 reps tampoco se sube',
);

// ---------- En descarga no se sube ----------

// 25 sesiones: la siguiente A cae en la rotación 6, y la A anterior (h-20) se
// completó entera al tope. Aun así no toca subir: la descarga repite peso.
await preparar(25, pressBanca('h-20', 35, 10));
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'en la rotación de descarga no se propone subir',
);
comprobar(
  (await abierto.locator('.control-valor').first().innerText()).includes('35'),
  'la descarga repite el peso de la rotación anterior',
);

// ---------- Estancado ----------

await preparar(15, [
  ...pressBanca('h-0', 35, 9),
  ...pressBanca('h-5', 35, 9),
  ...pressBanca('h-10', 35, 9),
]);
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await abierto.locator('.etiqueta-estancado').count()) === 1,
  'tres sesiones al mismo peso sin llegar al tope marcan el ejercicio como estancado',
);

// Cambiar de peso rompe el estancamiento.
await preparar(15, [
  ...pressBanca('h-0', 35, 9),
  ...pressBanca('h-5', 32.5, 9),
  ...pressBanca('h-10', 35, 9),
]);
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await abierto.locator('.etiqueta-estancado').count()) === 0,
  'si el peso cambió por medio, no está estancado',
);

await cerrar(navegador, errores);
