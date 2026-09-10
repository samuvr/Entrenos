/**
 * Historial y peso corporal (puntos 5.4 y 5.5 de la especificación).
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  escribirFilas,
  leerTabla,
  sembrarHistorial,
  vaciarTabla,
  URL_BASE,
} from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

const PRESS = 'bloque-3-A-1';
const CORE_A = 'bloque-3-A-2';

function serie(sesion, ejercicioId, numeroSerie, peso, reps, completada = true) {
  return {
    id: `${sesion}__${ejercicioId}__${numeroSerie}`,
    sesionRealizadaId: sesion,
    ejercicioId,
    numeroSerie,
    peso,
    reps,
    completada,
    motivoOmision: completada ? null : 'tiempo',
    registradaEn: `2026-07-01T06:${String(30 + numeroSerie).padStart(2, '0')}:00.000Z`,
  };
}

function pressBanca(sesion, peso, reps) {
  return [1, 2, 3, 4].map((n) => serie(sesion, PRESS, n, peso, reps));
}

// Tres rotaciones hechas. El press banca sube de 35 a 40; el core se hizo en la
// primera A y se saltó en la tercera.
await sembrarHistorial(pagina, 11);
await escribirFilas(pagina, 'seriesRealizadas', [
  ...pressBanca('h-0', 35, 10),
  ...pressBanca('h-5', 37.5, 9),
  ...pressBanca('h-10', 40, 8),
  ...[1, 2, 3].map((n) => serie('h-0', CORE_A, n, 0, 45)),
  ...[1, 2, 3].map((n) => serie('h-10', CORE_A, n, 0, 0, false)),
]);
await pagina.reload({ waitUntil: 'networkidle' });

await pagina.getByRole('button', { name: 'Historial' }).click();
await pagina.waitForSelector('.barra h1');

// ---------- Adherencia ----------

const adherencia = await pagina.locator('.tarjeta').first().innerText();
comprobar(adherencia.includes('11 de 30 sesiones'), 'cuenta las sesiones hechas');
// De las 11 sesiones, 7 llevaban core (las A, C y E). Solo en una se hizo.
comprobar(
  adherencia.includes('Core: 1 de 7 veces que tocaba'),
  `y el core aparte, contando solo las sesiones que lo llevan: ${adherencia.replace(/\n/g, ' · ')}`,
);

// ---------- Por sesión ----------

const dias = pagina.locator('.tarjeta.ejercicio');
comprobar((await dias.count()) === 11, `lista los 11 días (${await dias.count()})`);

const primero = await dias.first().innerText();
comprobar(primero.includes('rotación 3'), `el más reciente va primero: ${primero.split('\n')[1]}`);

await dias.first().locator('.cabecera-ejercicio').click();
await pagina.waitForSelector('.tarjeta.ejercicio.abierto .ejercicios');
const detalle = await pagina.locator('.tarjeta.ejercicio.abierto').innerText();
comprobar(detalle.includes('40x8'), `enseña las series de ese día: ${detalle.includes('40x8')}`);
comprobar(
  detalle.includes('saltado') && detalle.includes('Falta de tiempo'),
  'y el ejercicio saltado con su motivo',
);

// ---------- Por ejercicio ----------

await pagina.getByRole('tab', { name: 'Por ejercicio' }).click();
await pagina.waitForSelector('.tarjeta.ejercicio');
comprobar(
  (await pagina.locator('.tarjeta.ejercicio').count()) === 28,
  'la vista por ejercicio lista los 28 del bloque',
);

const tarjetaPress = pagina.locator('.tarjeta.ejercicio').first();
comprobar(
  (await tarjetaPress.innerText()).includes('40 kg'),
  'cada ejercicio enseña su último peso',
);

await tarjetaPress.locator('.cabecera-ejercicio').click();
await pagina.waitForSelector('.grafica');
const puntos = await pagina.locator('.grafica-punto').count();
comprobar(puntos === 3, `la gráfica pinta un punto por sesión hecha (${puntos})`);
comprobar(
  (await pagina.locator('.grafica').getAttribute('aria-label')).includes('Press banca'),
  'la gráfica se describe para quien no la ve',
);
const abiertaPress = pagina.locator('.tarjeta.ejercicio.abierto').first();
const tabla = await abiertaPress.locator('.ejercicios').innerText();
comprobar(
  tabla.includes('35x10') && tabla.includes('40x8'),
  'y debajo la tabla con las series de cada sesión',
);
comprobar(
  (await abiertaPress.locator('.objetivo.al-tope').count()) === 1,
  'marca el día que se completó en el tope del rango',
);
// innerText no vale en SVG: <text> no es un HTMLElement.
const tope = await pagina.locator('.grafica-escala').first().textContent();
comprobar(tope === '41 kg', `el eje va en números redondos: ${tope}`);

// Un ejercicio sin hacer no inventa una gráfica a cero.
await pagina.getByRole('button', { name: /Jalón al pecho/ }).first().click();
await pagina.waitForTimeout(200);
const sinHacer = await pagina
  .locator('.tarjeta.ejercicio.abierto')
  .filter({ hasText: 'Jalón al pecho' })
  .innerText();
comprobar(sinHacer.includes('Todavía no has hecho este ejercicio'), 'un ejercicio sin hacer lo dice');

// ---------- Estancado ----------

await vaciarTabla(pagina, 'seriesRealizadas');
await escribirFilas(pagina, 'seriesRealizadas', [
  ...pressBanca('h-0', 35, 9),
  ...pressBanca('h-5', 35, 9),
  ...pressBanca('h-10', 35, 9),
]);
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.getByRole('button', { name: 'Historial' }).click();
await pagina.getByRole('tab', { name: 'Por ejercicio' }).click();
await pagina.waitForSelector('.tarjeta.ejercicio');
comprobar(
  (await pagina.locator('.etiqueta-estancado').count()) === 1,
  'el historial marca el ejercicio estancado (punto 5.3)',
);

// ---------- Peso corporal ----------

await pagina.getByRole('button', { name: 'Volver' }).click();
await pagina.getByRole('button', { name: 'Peso corporal' }).click();
await pagina.waitForSelector('.barra h1');
comprobar(
  (await pagina.locator('.barra .meta').innerText()).includes('77,5–79,5 kg'),
  'el rango por defecto es 77,5-79,5',
);

// Apuntar la pesada de hoy: parte del centro del rango y se ajusta a toques.
await pagina.getByRole('button', { name: 'Subir Peso' }).click();
await pagina.getByRole('button', { name: /^Guardar 78,6 kg$/ }).click();
await pagina.waitForSelector('.grafica');
const pesos = await leerTabla(pagina, 'pesosCorporales');
comprobar(pesos.length === 1 && pesos[0].peso === 78.6, `guarda 78,6 kg (${pesos[0]?.peso})`);

// Volver a pesarse el mismo día corrige, no duplica.
await pagina.getByRole('button', { name: 'Subir Peso' }).click();
await pagina.getByRole('button', { name: /^Guardar 78,7 kg$/ }).click();
await pagina.waitForTimeout(200);
const corregido = await leerTabla(pagina, 'pesosCorporales');
comprobar(
  corregido.length === 1 && corregido[0].peso === 78.7,
  `pesarse dos veces el mismo día corrige el valor (${corregido.length} fila)`,
);

// Tres semanas seguidas por encima: ahí sí se avisa.
await vaciarTabla(pagina, 'pesosCorporales');
await escribirFilas(pagina, 'pesosCorporales', [
  { id: 'peso-2026-08-24', fecha: '2026-08-24', peso: 80.2 },
  { id: 'peso-2026-08-31', fecha: '2026-08-31', peso: 80.4 },
  { id: 'peso-2026-09-07', fecha: '2026-09-07', peso: 80.1 },
]);
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.getByRole('button', { name: 'Peso corporal' }).click();
await pagina.waitForSelector('.grafica');
comprobar(
  (await pagina.locator('.banner-aviso').innerText()).includes('Tres semanas seguidas por encima'),
  'tres semanas seguidas fuera del rango avisan',
);
comprobar(
  (await pagina.locator('.grafica-punto.fuera').count()) === 3,
  'y las tres pesadas salen marcadas fuera de la banda',
);
comprobar(
  (await pagina.locator('.objetivo.fuera-rango').count()) === 3,
  'la lista lo dice con texto, no solo con color',
);

// Con una semana de por medio sin pesarse, la racha se rompe.
await vaciarTabla(pagina, 'pesosCorporales');
await escribirFilas(pagina, 'pesosCorporales', [
  { id: 'peso-2026-08-24', fecha: '2026-08-24', peso: 80.2 },
  { id: 'peso-2026-09-07', fecha: '2026-09-07', peso: 80.4 },
  { id: 'peso-2026-09-14', fecha: '2026-09-14', peso: 80.1 },
]);
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.getByRole('button', { name: 'Peso corporal' }).click();
await pagina.waitForSelector('.grafica');
comprobar(
  (await pagina.locator('.banner-aviso').count()) === 0,
  'si falta la pesada de una semana no se avisa: no se sabe qué pasó',
);

await cerrar(navegador, errores);
