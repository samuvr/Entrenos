/**
 * Semilla del bloque 3: que se carga entera en IndexedDB y no se duplica.
 */
import { abrirNavegador, cerrar, comprobar, contarFilas, leerTabla, URL_BASE } from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');

const bloques = await leerTabla(pagina, 'bloques');
const sesiones = await leerTabla(pagina, 'sesiones');
const ejercicios = await leerTabla(pagina, 'ejercicios');

comprobar(bloques.length === 1 && bloques[0].numeroRotaciones === 6, 'un bloque con 6 rotaciones');
comprobar(
  sesiones.map((s) => s.letra).sort().join('') === 'ABCDE',
  'las cinco sesiones A-E',
);
comprobar(ejercicios.length === 26, `los 26 ejercicios del bloque 3 (${ejercicios.length})`);

const porSesion = { A: 6, B: 5, C: 7, D: 5, E: 3 };
for (const sesion of sesiones) {
  const suyos = ejercicios.filter((e) => e.sesionId === sesion.id);
  comprobar(
    suyos.length === porSesion[sesion.letra],
    `la sesión ${sesion.letra} tiene ${suyos.length} ejercicios`,
  );
}

// El incremento sale del tipo de carga, no se escribe a mano.
const incrementos = { barra: 2.5, discos: 2.5, pin: 2.5, polea: 2.5, mancuerna: 2, smith: 2.5, corporal: 5 };
comprobar(
  ejercicios.every((e) => e.incremento === incrementos[e.tipoCarga]),
  'cada ejercicio lleva el incremento de su tipo de carga',
);
comprobar(
  ejercicios.filter((e) => e.esCore).length === 3,
  'hay 3 ejercicios de core, y todos en segunda posición',
);
comprobar(
  ejercicios.filter((e) => e.esCore).every((e) => e.orden === 2),
  'los ejercicios de core van en la posición 2',
);
comprobar(ejercicios.filter((e) => e.rangoExtendido).length === 3, 'hay 3 ejercicios de rango extendido');
comprobar(ejercicios.filter((e) => e.esNuevo).length === 3, 'hay 3 ejercicios nuevos');
comprobar(
  ejercicios.filter((e) => e.unidad === 'segundos').length === 2,
  'las 2 planchas se miden en segundos',
);

// Los abductores pasaron de la E a la C con su id de siempre.
const abductores = ejercicios.find((e) => e.id === 'bloque-3-E-5');
comprobar(
  abductores?.sesionId === 'bloque-3-C' && abductores.orden === 6,
  'los abductores van en la C y conservan su id',
);

// Recargar no puede duplicar la semilla.
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await contarFilas(pagina, 'ejercicios')) === 26,
  'recargar no duplica la semilla',
);

// Paso de la semilla 1 a la 2 sobre un móvil con el bloque ya empezado: se
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
    bloques.get('bloque-3').onsuccess = (e) => r(e.target.result);
  });
  bloques.put({ ...bloque, fechaInicio: '2026-09-11' });
  tx.objectStore('ejercicios').put({
    id: 'bloque-3-E-6', sesionId: 'bloque-3-E', orden: 6, nombre: 'Gemelos sentado en máquina',
    series: 3, repsMin: 15, repsMax: 20, pesoInicial: 27.5, tipoCarga: 'pin', incremento: 2.5,
    unidad: 'kg', esCore: false, esNuevo: false, rangoExtendido: false, notaTecnica: null, notaReps: null,
  });
  tx.objectStore('seriesRealizadas').put({
    id: 'serie-vieja', sesionRealizadaId: 'x', ejercicioId: 'bloque-3-E-6', numeroSerie: 1,
    peso: 27.5, reps: 15, completada: true, motivoOmision: null, registradaEn: '2026-09-20T07:00:00Z',
  });
  tx.objectStore('ajustes').put({ clave: 'seedVersion', valor: 1 });
  await new Promise((r) => (tx.oncomplete = r));
  bd.close();
});
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');
const trasSubir = await leerTabla(pagina, 'ejercicios');
comprobar(
  trasSubir.length === 26 && !trasSubir.some((e) => e.id === 'bloque-3-E-6'),
  'al subir de semilla, los ejercicios retirados salen de la plantilla',
);
comprobar(
  (await leerTabla(pagina, 'bloques'))[0].fechaInicio === '2026-09-11',
  'al subir de semilla se conserva la fecha de inicio del bloque',
);
comprobar(
  (await leerTabla(pagina, 'seriesRealizadas')).some((s) => s.id === 'serie-vieja'),
  'las series del ejercicio retirado se conservan',
);

await cerrar(navegador, errores);
