/**
 * Avisos de progresión (punto 5.3 y reglas 1 y 2): doble progresión, etiqueta
 * SUBE HOY, aviso al cumplir el objetivo, sesiones de técnica y detección de
 * estancamiento.
 *
 * En el bloque 4 las 2 primeras veces de cada sesión son de técnica: no se
 * sube peso. Por eso casi todo se prueba con la A ya hecha dos veces (8
 * sesiones del ciclo), que es cuando SUBE HOY puede salir.
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  escribirFilas,
  ponerDescarga,
  saltarDescanso,
  sembrarHistorial,
  vaciarTabla,
  URL_BASE,
} from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

const PRESS = 'bloque-4-A-1';

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

/** Las 3 series del press banca de una sesión, todas al mismo peso y reps. */
function pressBanca(sesion, peso, reps) {
  return [1, 2, 3].map((n) => serie(sesion, PRESS, n, peso, reps));
}

/** Press banca con unas reps concretas por serie, al mismo peso. */
function pressConReps(sesion, peso, reps) {
  return reps.map((r, i) => serie(sesion, PRESS, i + 1, peso, r));
}

/** Deja el historial que se quiera y vuelve a Inicio. */
async function preparar(sesionesHechas, series = []) {
  await vaciarTabla(pagina, 'seriesRealizadas');
  await sembrarHistorial(pagina, sesionesHechas);
  if (series.length > 0) await escribirFilas(pagina, 'seriesRealizadas', series);
  await pagina.reload({ waitUntil: 'networkidle' });
}

async function empezarA() {
  await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
  await pagina.waitForSelector('.serie.activa');
}

/** Confirma las series del ejercicio abierto, saltando cada descanso. */
async function confirmarSeries(cuantas) {
  for (let i = 0; i < cuantas; i += 1) {
    await pagina.locator('.serie.activa .boton-confirmar').first().click();
    await pagina.waitForTimeout(150);
    await saltarDescanso(pagina);
  }
}

const abierto = pagina.locator('.ejercicio.abierto');

// ---------- Técnica: la primera vez no se anuncia subida ----------

// Sin historial, la precarga es el peso inicial y el tope del rango. Se
// completan las 3 series a 40x10, pero la próxima vez sigue siendo de técnica:
// no se anuncia la subida.
await preparar(0);
await empezarA();
comprobar(await pagina.locator('.banner-tecnica').isVisible(), 'la primera A es de técnica');
await confirmarSeries(3);
comprobar(
  (await pagina.locator('.logro-compacto').count()) === 0,
  'si la próxima vez también es de técnica, no se anuncia el objetivo cumplido',
);

// ---------- Objetivo cumplido, en directo ----------

// La segunda A (técnica todavía) ya anuncia la subida, porque la tercera no
// será de técnica.
await preparar(4);
await empezarA();
comprobar(await pagina.locator('.banner-tecnica').isVisible(), 'la segunda A también es de técnica');
await confirmarSeries(3);

const logro = pagina.locator('.logro-compacto').first();
comprobar(
  (await logro.innerText()).includes('Objetivo cumplido. La próxima vez: 42,5 kg'),
  `al completar las 3 series a 10 reps avisa: "${(await logro.innerText()).trim()}"`,
);
comprobar(
  (await abierto.locator('.nombre').first().innerText()).includes('Remo con triángulo'),
  'y el aviso no estorba el salto al ejercicio siguiente',
);

// ---------- En técnica no se sube ----------

await preparar(4, pressBanca('h-0', 40, 10));
await empezarA();
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'en una sesión de técnica no sale SUBE HOY aunque la vez anterior se llegara al tope',
);
comprobar(
  (await abierto.locator('.control-valor').first().innerText()).includes('40'),
  'y se repite el peso de la última vez',
);

// ---------- SUBE HOY la vez siguiente ----------

await preparar(8, pressBanca('h-4', 40, 10));
await empezarA();
comprobar((await pagina.locator('.banner-tecnica').count()) === 0, 'la tercera A ya no es de técnica');

const sube = abierto.locator('.banner-sube');
comprobar((await sube.innerText()).includes('SUBE HOY: 42,5 kg'), 'la vez siguiente sale SUBE HOY');
comprobar(
  (await abierto.locator('.control-valor').first().innerText()).includes('42,5'),
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
await saltarDescanso(pagina);

// ---------- Si no subes, el aviso vuelve ----------

await preparar(12, [...pressBanca('h-4', 40, 10), ...pressBanca('h-8', 40, 10)]);
await empezarA();
comprobar(
  (await abierto.locator('.banner-sube').innerText()).includes('42,5 kg'),
  'si la vez pasada no subiste, el aviso vuelve a salir',
);

// ---------- Sin el tope no se sube ----------

await preparar(8, pressBanca('h-4', 40, 9));
await empezarA();
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'a 9 reps no se llega al tope y no se propone subir',
);
comprobar(
  (await abierto.locator('.control-valor').first().innerText()).includes('40'),
  'y se repite el peso de la última vez',
);

// Una sola serie corta tumba la subida: son *todas* las series al tope.
await preparar(8, pressConReps('h-4', 40, [10, 10, 9]));
await empezarA();
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'con 2 series al tope y una a 9 reps tampoco se sube',
);

// ---------- Rotación 6 sin descarga: se sube como siempre ----------

// 20 sesiones: la siguiente A cae en la rotación 6, y la A anterior (h-16) se
// completó entera al tope. El bloque 4 no tiene descarga: toca subir.
await preparar(20, pressBanca('h-16', 40, 10));
await empezarA();
comprobar(
  (await abierto.locator('.banner-sube').count()) === 1,
  'sin descarga, en la rotación 6 se propone subir',
);

// ---------- En descarga no se sube ----------

// Mismo caso con la descarga activada: la descarga repite peso.
await ponerDescarga(pagina, true);
await preparar(20, pressBanca('h-16', 40, 10));
await empezarA();
comprobar(
  (await abierto.locator('.banner-sube').count()) === 0,
  'en la rotación de descarga no se propone subir',
);
comprobar(
  (await abierto.locator('.control-valor').first().innerText()).includes('40'),
  'la descarga repite el peso de la rotación anterior',
);
await ponerDescarga(pagina, false);

// ---------- Estancado ----------

const estancado = () => abierto.locator('.etiqueta-estancado').count();

// Tres sesiones al mismo peso sin pasar del total de reps de la primera
// (27, 26 y 27).
await preparar(12, [
  ...pressBanca('h-0', 40, 9),
  ...pressConReps('h-4', 40, [9, 9, 8]),
  ...pressBanca('h-8', 40, 9),
]);
await empezarA();
comprobar(
  (await estancado()) === 1,
  'tres sesiones al mismo peso sin sumar reps totales marcan el ejercicio como estancado',
);

// «Consolidar técnica» lo quita: se repite el peso a propósito.
await abierto.getByRole('button', { name: 'Consolidar técnica' }).click();
await pagina.waitForTimeout(200);
comprobar(
  (await estancado()) === 0 &&
    (await abierto.locator('.etiqueta-consolidacion').count()) === 1,
  'al consolidar técnica deja de marcarse como estancado',
);
await abierto.getByRole('button', { name: 'Terminar la consolidación' }).click();
await pagina.waitForTimeout(200);

// Sumar reps totales ya es progresar, aunque ninguna serie llegue al tope.
await preparar(12, [
  ...pressBanca('h-0', 40, 9),
  ...pressConReps('h-4', 40, [10, 9, 9]),
  ...pressBanca('h-8', 40, 9),
]);
await empezarA();
comprobar(
  (await estancado()) === 0,
  'si un día se suman reps totales (28 frente a 27), no está estancado',
);

// Cambiar de peso rompe el estancamiento.
await preparar(12, [
  ...pressBanca('h-0', 40, 9),
  ...pressBanca('h-4', 37.5, 9),
  ...pressBanca('h-8', 40, 9),
]);
await empezarA();
comprobar(
  (await estancado()) === 0,
  'si el peso cambió por medio, no está estancado',
);

// Un día con series sin hacer por falta de tiempo no cuenta: ni suma ni rompe.
const sinTiempo = [
  ...pressBanca('h-8', 40, 9).slice(0, 2),
  { ...serie('h-8', PRESS, 3, 40, 0), completada: false, motivoOmision: 'tiempo' },
];
await preparar(12, [...pressBanca('h-0', 40, 9), ...pressBanca('h-4', 40, 9), ...sinTiempo]);
await empezarA();
comprobar(
  (await estancado()) === 0,
  'un día con una serie saltada por falta de tiempo no cuenta para el estancamiento',
);
await preparar(16, [
  ...pressBanca('h-0', 40, 9),
  ...pressBanca('h-4', 40, 9),
  ...sinTiempo,
  ...pressBanca('h-12', 40, 9),
]);
await empezarA();
comprobar(
  (await estancado()) === 1,
  'se lo salta y sigue contando con los días de antes',
);

// Los días dentro de un tramo de «Consolidar técnica» tampoco cuentan.
await escribirFilas(pagina, 'ajustes', [
  {
    clave: 'consolidacion',
    valor: { [PRESS]: [{ desde: '2026-07-04T00:00:00.000Z', hasta: '2026-07-06T00:00:00.000Z' }] },
  },
]);
await preparar(12, [
  ...pressBanca('h-0', 40, 9),
  ...pressBanca('h-4', 40, 9),
  ...pressBanca('h-8', 40, 9),
]);
await empezarA();
comprobar(
  (await estancado()) === 0,
  'un día que cayó en consolidación no cuenta para el estancamiento',
);

await cerrar(navegador, errores);
