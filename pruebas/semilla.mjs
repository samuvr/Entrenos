/**
 * Semilla del bloque 4: que se carga entera en IndexedDB, no se duplica y que
 * al pasar del bloque 3 al 4 se cierra el anterior sin tocar su historial.
 */
import { abrirNavegador, cerrar, comprobar, contarFilas, leerTabla, URL_BASE } from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');

const bloques = await leerTabla(pagina, 'bloques');
const sesiones = await leerTabla(pagina, 'sesiones');
const ejercicios = await leerTabla(pagina, 'ejercicios');

comprobar(
  bloques.length === 1 && bloques[0].id === 'bloque-4' && bloques[0].numeroRotaciones === 6,
  'un bloque, el 4, con 6 rotaciones',
);
comprobar(bloques[0].conDescarga === false, 'el bloque 4 va sin descarga final');
comprobar(bloques[0].sesionesTecnicaInicio === 2, 'las 2 primeras veces de cada sesión son de técnica');
comprobar(
  sesiones.map((s) => s.letra).sort().join('') === 'ABCDE',
  'las cinco sesiones A-E',
);
comprobar(
  sesiones.filter((s) => s.opcional).map((s) => s.letra).join('') === 'E',
  'solo la E es opcional',
);
comprobar(
  sesiones.find((s) => s.letra === 'E')?.rirObjetivo === null,
  'la E (cardio y core) no lleva RIR objetivo',
);
comprobar(ejercicios.length === 30, `los 30 ejercicios del bloque 4 (${ejercicios.length})`);

const porSesion = { A: 8, B: 6, C: 7, D: 6, E: 3 };
for (const sesion of sesiones) {
  const suyos = ejercicios.filter((e) => e.sesionId === sesion.id);
  comprobar(
    suyos.length === porSesion[sesion.letra],
    `la sesión ${sesion.letra} tiene ${suyos.length} ejercicios`,
  );
}

// El incremento sale del tipo de carga. La excepción es el dead bug: corporal
// pero contado en repeticiones, sube de una en una.
const incrementos = { barra: 2.5, discos: 2.5, pin: 2.5, polea: 2.5, mancuerna: 2, smith: 2.5, corporal: 5 };
comprobar(
  ejercicios
    .filter((e) => e.id !== 'bloque-4-E-3')
    .every((e) => e.incremento === incrementos[e.tipoCarga]),
  'cada ejercicio lleva el incremento de su tipo de carga',
);
comprobar(
  ejercicios.find((e) => e.id === 'bloque-4-E-3')?.incremento === 1,
  'el dead bug progresa de repetición en repetición',
);

const core = ejercicios.filter((e) => e.esCore);
comprobar(core.length === 5, `hay 5 ejercicios de core (${core.length})`);
const ultimoDe = (sesionId) =>
  Math.max(...ejercicios.filter((e) => e.sesionId === sesionId).map((e) => e.orden));
comprobar(
  core
    .filter((e) => e.sesionId !== 'bloque-4-E')
    .every((e) => e.orden === ultimoDe(e.sesionId)),
  'en las de pierna (B y D) el core va el último',
);
comprobar(
  ejercicios.filter((e) => e.sesionId === 'bloque-4-E').every((e) => e.esCore),
  'la E es entera de core',
);
comprobar(ejercicios.filter((e) => e.rangoExtendido).length === 1, 'hay 1 ejercicio de rango extendido');
comprobar(ejercicios.filter((e) => e.esNuevo).length === 5, 'hay 5 ejercicios nuevos');
comprobar(
  ejercicios.filter((e) => e.unidad === 'segundos').length === 3,
  'las 3 planchas se miden en segundos',
);
comprobar(
  ejercicios.every((e) => e.descansoSeg > 0),
  'todos los ejercicios llevan su descanso',
);

// Superseries: grupos de dos ejercicios seguidos de la misma sesión.
const grupos = new Map();
for (const e of ejercicios.filter((x) => x.superserie)) {
  grupos.set(e.superserie, [...(grupos.get(e.superserie) ?? []), e]);
}
comprobar(
  [...grupos.keys()].sort().join(',') === 'A-SS1,A-SS2,B-SS1,C-SS1',
  `las superseries son A-SS1, A-SS2, B-SS1 y C-SS1 (${[...grupos.keys()].join(', ')})`,
);
comprobar(
  [...grupos.values()].every(
    (g) =>
      g.length === 2 &&
      g[0].sesionId === g[1].sesionId &&
      Math.abs(g[0].orden - g[1].orden) === 1,
  ),
  'cada superserie junta dos ejercicios seguidos de la misma sesión',
);

// Recargar no puede duplicar la semilla.
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await contarFilas(pagina, 'ejercicios')) === 30,
  'recargar no duplica la semilla',
);

// Volver a cargar la semilla sobre un móvil con el bloque ya empezado: se
// conserva la fecha de inicio, los ejercicios retirados salen de la plantilla y
// sus series se quedan.
await pagina.evaluate(async () => {
  const bd = await new Promise((r) => {
    const q = indexedDB.open('entrenos');
    q.onsuccess = () => r(q.result);
  });
  const tx = bd.transaction(['bloques', 'ejercicios', 'ajustes', 'seriesRealizadas'], 'readwrite');
  const bloques = tx.objectStore('bloques');
  const bloque = await new Promise((r) => {
    bloques.get('bloque-4').onsuccess = (e) => r(e.target.result);
  });
  bloques.put({ ...bloque, fechaInicio: '2026-11-30' });
  tx.objectStore('ejercicios').put({
    id: 'bloque-4-E-4', sesionId: 'bloque-4-E', orden: 4, nombre: 'Rueda abdominal',
    series: 3, repsMin: 8, repsMax: 12, pesoInicial: 0, tipoCarga: 'corporal', incremento: 1,
    unidad: 'kg', esCore: true, esNuevo: false, rangoExtendido: false, notaTecnica: null,
    notaReps: null, descansoSeg: 45, superserie: null,
  });
  tx.objectStore('seriesRealizadas').put({
    id: 'serie-vieja', sesionRealizadaId: 'x', ejercicioId: 'bloque-4-E-4', numeroSerie: 1,
    peso: 0, reps: 10, completada: true, motivoOmision: null, registradaEn: '2026-12-01T07:00:00Z',
  });
  tx.objectStore('ajustes').put({ clave: 'seedVersion', valor: 3 });
  await new Promise((r) => (tx.oncomplete = r));
  bd.close();
});
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');
const trasSubir = await leerTabla(pagina, 'ejercicios');
comprobar(
  trasSubir.length === 30 && !trasSubir.some((e) => e.id === 'bloque-4-E-4'),
  'al subir de semilla, los ejercicios retirados salen de la plantilla',
);
comprobar(
  (await leerTabla(pagina, 'bloques'))[0].fechaInicio === '2026-11-30',
  'al subir de semilla se conserva la fecha de inicio del bloque',
);
comprobar(
  (await leerTabla(pagina, 'seriesRealizadas')).some((s) => s.id === 'serie-vieja'),
  'las series del ejercicio retirado se conservan',
);

// Paso del bloque 3 al 4 en un móvil que solo tenía el 3: el 4 entra activo,
// el 3 se cierra el día antes de que empiece el 4 y su historial se queda.
await pagina.evaluate(async () => {
  const bd = await new Promise((r) => {
    const q = indexedDB.open('entrenos');
    q.onsuccess = () => r(q.result);
  });
  const tablas = ['bloques', 'sesiones', 'ejercicios', 'ajustes', 'sesionesRealizadas', 'seriesRealizadas'];
  const tx = bd.transaction(tablas, 'readwrite');
  for (const t of ['bloques', 'sesiones', 'ejercicios', 'sesionesRealizadas', 'seriesRealizadas']) {
    tx.objectStore(t).clear();
  }
  tx.objectStore('bloques').put({
    id: 'bloque-3', nombre: 'Bloque 3', numeroRotaciones: 6, conDescarga: false,
    fechaInicio: '2026-09-11', fechaFin: null, activo: true,
  });
  tx.objectStore('sesiones').put({
    id: 'bloque-3-A', bloqueId: 'bloque-3', letra: 'A', nombre: 'Push (pecho, hombro, tríceps)',
    rirObjetivo: '1-2', notaCardio: null, aviso: null, orden: 1,
  });
  tx.objectStore('ejercicios').put({
    id: 'bloque-3-A-1', sesionId: 'bloque-3-A', orden: 1, nombre: 'Press banca (barra)',
    series: 4, repsMin: 8, repsMax: 10, pesoInicial: 35, tipoCarga: 'barra', incremento: 2.5,
    unidad: 'kg', esCore: false, esNuevo: false, rangoExtendido: false, notaTecnica: null, notaReps: null,
  });
  tx.objectStore('sesionesRealizadas').put({
    id: 'b3-0', bloqueId: 'bloque-3', sesionId: 'bloque-3-A', rotacion: 1, fecha: '2026-09-11',
    iniciadaEn: '2026-09-11T06:30:00.000Z', finalizadaEn: '2026-09-11T07:30:00.000Z',
    duracionMin: 60, notas: null, finalizada: true,
  });
  tx.objectStore('seriesRealizadas').put({
    id: 'b3-0__bloque-3-A-1__1', sesionRealizadaId: 'b3-0', ejercicioId: 'bloque-3-A-1',
    numeroSerie: 1, peso: 35, reps: 10, completada: true, motivoOmision: null,
    registradaEn: '2026-09-11T06:40:00.000Z',
  });
  tx.objectStore('ajustes').put({ clave: 'seedVersion', valor: 3 });
  await new Promise((r) => (tx.oncomplete = r));
  bd.close();
});
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');
const trasCambio = await leerTabla(pagina, 'bloques');
const b3 = trasCambio.find((b) => b.id === 'bloque-3');
const b4 = trasCambio.find((b) => b.id === 'bloque-4');
comprobar(b4?.activo === true, 'el bloque 4 entra activo');
comprobar(
  b3?.activo === false && b3.fechaFin === '2026-11-23',
  `el bloque 3 se cierra el día antes del 4 (${b3?.fechaFin})`,
);
comprobar(
  (await contarFilas(pagina, 'sesionesRealizadas')) === 1 &&
    (await contarFilas(pagina, 'seriesRealizadas')) === 1,
  'el historial del bloque 3 se conserva entero',
);
comprobar(
  (await contarFilas(pagina, 'ejercicios')) === 31,
  'la plantilla del bloque 3 se queda junto a los 30 del 4',
);
const meta = await pagina.locator('.hoy-meta').first().innerText();
comprobar(
  (await pagina.locator('.hoy-titular').innerText()).includes('Sesión A') &&
    meta.includes('sesión 1 de 24'),
  `Inicio arranca el bloque 4 desde cero: "${meta}"`,
);

await cerrar(navegador, errores);
