/**
 * Exportar a JSON y CSV, restaurar desde JSON, recordatorio de copia y cierre
 * de bloque (regla 6). Cubre el criterio del punto 10: el CSV se abre en Excel
 * con los acentos bien y los decimales en formato español.
 */
import { readFile } from 'node:fs/promises';
import {
  abrirNavegador,
  cerrar,
  comprobar,
  contarFilas,
  escribirFilas,
  leerTabla,
  sembrarHistorial,
  vaciarTabla,
  URL_BASE,
} from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

// Una rotación entera hecha (A B C D), series de la primera A y la plancha
// de la primera D.
await sembrarHistorial(pagina, 4);
await escribirFilas(pagina, 'seriesRealizadas', [
  serie('bloque-4-A-1', 1, 42.5, 10),
  serie('bloque-4-A-1', 2, 42.5, 10),
  serie('bloque-4-A-1', 3, 40, 9),
  { ...serie('bloque-4-A-3', 1, 0, 0), completada: false, motivoOmision: 'maquina-ocupada' },
  // La plancha va en segundos, no en repeticiones.
  serie('bloque-4-D-6', 1, 0, 30, 'h-3'),
]);
await pagina.reload({ waitUntil: 'networkidle' });

function serie(ejercicioId, numeroSerie, peso, reps, sesion = 'h-0') {
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

// ---------- Recordatorio de copia ----------

const aviso = pagina.locator('.banner-copia');
comprobar(await aviso.isVisible(), 'al cerrar una rotación sin copia, Inicio lo recuerda');
comprobar(
  (await aviso.innerText()).includes('una rotación'),
  'el aviso dice cuántas rotaciones lleva sin copia',
);

await aviso.click();
await pagina.waitForSelector('.barra h1');
comprobar(
  (await pagina.locator('.barra h1').innerText()).includes('Copia de seguridad'),
  'el aviso lleva directo a la pantalla de copia',
);

// ---------- CSV ----------

const [descargaCSV] = await Promise.all([
  pagina.waitForEvent('download'),
  pagina.getByRole('button', { name: 'Exportar CSV del bloque' }).click(),
]);
const csv = await readFile(await descargaCSV.path(), 'utf8');

comprobar(
  descargaCSV.suggestedFilename().startsWith('entrenos-bloque-4-'),
  `el CSV se llama ${descargaCSV.suggestedFilename()}`,
);
comprobar(csv.charCodeAt(0) === 0xfeff, 'el CSV lleva BOM (Excel respeta los acentos)');
comprobar(csv.includes('\r\n'), 'el CSV usa saltos CRLF');

const lineas = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
comprobar(
  lineas[0] === 'fecha;rotacion;sesion;ejercicio;numeroSerie;peso;reps;unidad;completada;motivo',
  'la cabecera lleva las columnas de la especificación',
);
comprobar(lineas.length === 6, `una fila por serie: ${lineas.length - 1} filas para 5 series`);
comprobar(
  lineas[1] === '2026-07-01;1;A;Press banca (barra);1;42,5;10;kg;si;',
  `la primera fila sale con decimales españoles: ${lineas[1]}`,
);
comprobar(
  lineas[4].endsWith(';no;Máquina ocupada'),
  'la serie saltada sale marcada y con su motivo',
);
comprobar(
  lineas[5].startsWith('2026-07-04;1;D;CORE: Plancha RKC;') && lineas[5].includes(';30;segundos;'),
  `la plancha se exporta en segundos, no como repeticiones: ${lineas[5]}`,
);
comprobar(
  lineas.every((l) => l.split(';').length === 10),
  'ninguna fila se descuadra de columnas',
);

// ---------- Copia JSON ----------

const [descargaJSON] = await Promise.all([
  pagina.waitForEvent('download'),
  pagina.getByRole('button', { name: 'Guardar copia JSON' }).click(),
]);
const rutaJSON = await descargaJSON.path();
const copia = JSON.parse(await readFile(rutaJSON, 'utf8'));

comprobar(copia.formato === 'entrenos' && copia.version === 1, 'la copia se identifica');
comprobar(copia.datos.ejercicios.length === 30, 'la copia se lleva los 30 ejercicios del bloque');
comprobar(copia.datos.sesionesRealizadas.length === 4, 'la copia se lleva las 4 sesiones hechas');
comprobar(copia.datos.seriesRealizadas.length === 5, 'la copia se lleva las series');

await pagina.getByRole('button', { name: 'Volver' }).click();
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await pagina.locator('.banner-copia').count()) === 0,
  'una vez guardada la copia, el aviso desaparece',
);

// ---------- Restaurar ----------

await vaciarTabla(pagina, 'sesionesRealizadas');
await vaciarTabla(pagina, 'seriesRealizadas');
await pagina.reload({ waitUntil: 'networkidle' });
comprobar((await contarFilas(pagina, 'sesionesRealizadas')) === 0, 'se borra el historial a mano');

await pagina.getByRole('button', { name: 'Copia de seguridad y exportar' }).click();
// Hay dos selectores de fichero: el de restaurar copia y, debajo, el de cargar
// un plan de bloque.
const entradaCopia = pagina.locator('.entrada-fichero').first();
const entradaPlan = pagina.locator('.entrada-fichero').nth(1);
await entradaCopia.setInputFiles(rutaJSON);
await pagina.waitForSelector('.modal');
comprobar(
  (await pagina.locator('.modal').innerText()).includes('4 sesiones'),
  'antes de restaurar se enseña lo que trae el fichero',
);

await pagina.getByRole('button', { name: 'Restaurar y reemplazar' }).click();
await pagina.waitForSelector('.banner-ok');
comprobar(
  (await contarFilas(pagina, 'sesionesRealizadas')) === 4,
  'restaurar devuelve las 4 sesiones',
);
comprobar((await contarFilas(pagina, 'seriesRealizadas')) === 5, 'restaurar devuelve las series');

// Un fichero que no es una copia no puede tocar nada.
await entradaCopia.setInputFiles({
  name: 'cualquiera.json',
  mimeType: 'application/json',
  buffer: Buffer.from('{"algo":1}'),
});
await pagina.waitForSelector('.banner-error');
comprobar(
  (await pagina.locator('.modal').count()) === 0,
  'un fichero que no es copia se rechaza sin preguntar',
);
comprobar(
  (await contarFilas(pagina, 'sesionesRealizadas')) === 4,
  'y deja el historial intacto',
);

// Una copia no es un plan: el selector de plan la rechaza sin tocar nada.
await entradaPlan.setInputFiles(rutaJSON);
await pagina.waitForFunction(() =>
  document.querySelector('.banner-error')?.textContent?.includes('no es un plan'),
);
comprobar(
  (await pagina.locator('.modal').count()) === 0,
  'una copia metida como plan de bloque se rechaza sin preguntar',
);
comprobar(
  (await contarFilas(pagina, 'bloques')) === 1 && (await contarFilas(pagina, 'ejercicios')) === 30,
  'y la plantilla del bloque sigue igual',
);

// ---------- Fin de bloque (regla 6) ----------

await pagina.getByRole('button', { name: 'Volver' }).click();
await sembrarHistorial(pagina, 24);
await pagina.reload({ waitUntil: 'networkidle' });

comprobar(
  (await pagina.locator('.tarjeta.destacada h2').innerText()).includes('Bloque completo'),
  'al llegar a 24 sesiones se ofrece cerrar el bloque',
);

await pagina.getByRole('button', { name: 'Cerrar bloque' }).click();
await pagina.waitForSelector('.modal');
comprobar(
  (await pagina.locator('.modal-aviso').innerText()).includes('Exporta'),
  'antes de cerrar recuerda exportar',
);
await pagina.getByRole('button', { name: 'Cerrar el bloque' }).click();
await pagina.getByRole('button', { name: 'Reabrir bloque' }).waitFor();

comprobar(
  (await pagina.locator('.tarjeta.destacada h2').innerText()).includes('Bloque cerrado'),
  'el bloque queda cerrado',
);
const bloques = await leerTabla(pagina, 'bloques');
comprobar(bloques[0].activo === false && bloques[0].fechaFin !== null, 'y con fecha de fin');
comprobar(
  (await pagina.getByRole('button', { name: /^Empezar sesión/ }).count()) === 0,
  'con el bloque cerrado ya no se empieza otra sesión',
);
comprobar(
  (await pagina.getByRole('button', { name: /^Día opcional/ }).count()) === 0,
  'ni tampoco el día opcional',
);

await pagina.getByRole('button', { name: 'Reabrir bloque' }).click();
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await pagina.getByRole('button', { name: /^Empezar sesión/ }).count()) === 1,
  'reabrir el bloque lo deja como estaba',
);

await cerrar(navegador, errores);
