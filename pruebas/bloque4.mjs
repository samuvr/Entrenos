/**
 * Bloque 4: paso desde el bloque 3 sin perder historial, día opcional,
 * sesiones de técnica, temporizador de descanso, superseries, consolidación,
 * nueva regla de estancamiento y duraciones imposibles.
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  escribirFilas,
  leerTabla,
  URL_BASE,
  vaciarTabla,
} from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();

// La vibración no se puede notar en Chromium de escritorio: se apunta.
await pagina.addInitScript(() => {
  window.__vibraciones = [];
  navigator.vibrate = (patron) => {
    window.__vibraciones.push(patron);
    return true;
  };
});

const esperar = (ms) => pagina.waitForTimeout(ms);
const abrirEjercicio = async (nombre) => {
  await pagina.locator('.cabecera-ejercicio', { hasText: nombre }).first().click();
  await esperar(150);
};
const nombreAbierto = () => pagina.locator('.ejercicio.abierto .nombre').first().innerText();
const saltarDescanso = async () => {
  if (await pagina.locator('.descanso').count()) {
    await pagina.locator('.descanso').getByRole('button', { name: 'Saltar' }).click();
    await esperar(100);
  }
};
const confirmarSerie = async () => {
  await pagina.locator('.serie.activa .boton-confirmar').click();
  await esperar(250);
};
const segundosDescanso = async () => {
  const [m, s] = (await pagina.locator('.descanso-tiempo').innerText()).split(':').map(Number);
  return m * 60 + s;
};

// ---------- 1. Paso del bloque 3 al 4 ----------

await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');

// Se monta una base como la del móvil antes de actualizar: bloque 3 activo,
// semilla 3, historial con una duración imposible.
for (const tabla of ['bloques', 'sesiones', 'ejercicios', 'sesionesRealizadas', 'seriesRealizadas']) {
  await vaciarTabla(pagina, tabla);
}
await escribirFilas(pagina, 'bloques', [
  {
    id: 'bloque-3',
    nombre: 'Bloque 3',
    numeroRotaciones: 6,
    conDescarga: false,
    fechaInicio: '2026-09-01',
    fechaFin: null,
    activo: true,
  },
]);
await escribirFilas(pagina, 'sesiones', [
  {
    id: 'bloque-3-A',
    bloqueId: 'bloque-3',
    letra: 'A',
    nombre: 'Push',
    rirObjetivo: '1-2',
    notaCardio: null,
    aviso: null,
    orden: 1,
  },
]);
await escribirFilas(pagina, 'ejercicios', [
  {
    id: 'bloque-3-A-1',
    sesionId: 'bloque-3-A',
    orden: 1,
    nombre: 'Press banca (barra)',
    series: 4,
    repsMin: 8,
    repsMax: 10,
    pesoInicial: 35,
    tipoCarga: 'barra',
    incremento: 2.5,
    unidad: 'kg',
    esCore: false,
    esNuevo: false,
    rangoExtendido: false,
    notaTecnica: null,
    notaReps: null,
  },
]);
await escribirFilas(pagina, 'sesionesRealizadas', [
  {
    id: 'b3-larga',
    bloqueId: 'bloque-3',
    sesionId: 'bloque-3-A',
    rotacion: 1,
    fecha: '2026-11-10',
    iniciadaEn: '2026-11-10T06:30:00.000Z',
    finalizadaEn: '2026-11-11T06:27:00.000Z',
    duracionMin: 1437,
    notas: null,
    finalizada: true,
  },
  {
    id: 'b3-abierta',
    bloqueId: 'bloque-3',
    sesionId: 'bloque-3-A',
    rotacion: 2,
    fecha: '2026-11-20',
    iniciadaEn: '2026-11-20T06:30:00.000Z',
    finalizadaEn: null,
    duracionMin: null,
    notas: null,
    finalizada: false,
  },
]);
await escribirFilas(pagina, 'seriesRealizadas', [
  ['b3-larga', '2026-11-10T07:20:00.000Z'],
  ['b3-abierta', '2026-11-20T07:00:00.000Z'],
].map(([sesion, cuando]) => ({
  id: `${sesion}__bloque-3-A-1__1`,
  sesionRealizadaId: sesion,
  ejercicioId: 'bloque-3-A-1',
  numeroSerie: 1,
  peso: 37.5,
  reps: 10,
  completada: true,
  motivoOmision: null,
  registradaEn: cuando,
})));
await escribirFilas(pagina, 'pesosCorporales', [{ id: 'p1', fecha: '2026-11-20', peso: 78.4 }]);
await escribirFilas(pagina, 'ajustes', [{ clave: 'seedVersion', valor: 3 }]);

await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');

const bloques = await leerTabla(pagina, 'bloques');
const b3 = bloques.find((b) => b.id === 'bloque-3');
const b4 = bloques.find((b) => b.id === 'bloque-4');
comprobar(b3?.activo === false && b3.fechaFin === '2026-11-23', 'el bloque 3 queda cerrado el 23-11-2026');
comprobar(
  b4?.activo === true && b4.fechaInicio === '2026-11-24' && b4.sesionesTecnicaInicio === 2,
  'el bloque 4 entra activo desde el 24-11-2026',
);
const realizadas = await leerTabla(pagina, 'sesionesRealizadas');
const larga = realizadas.find((r) => r.id === 'b3-larga');
comprobar(larga?.duracionMin === 55, `la sesión de 1.437 min pasa a ${larga?.duracionMin} min (hasta la última serie + 5)`);
const abierta = realizadas.find((r) => r.id === 'b3-abierta');
comprobar(
  abierta?.finalizada === true && abierta.duracionMin === 35,
  'la sesión del bloque 3 que quedó abierta se cierra con su duración real',
);
comprobar((await leerTabla(pagina, 'seriesRealizadas')).length === 2, 'las series del bloque 3 siguen ahí');
comprobar((await leerTabla(pagina, 'pesosCorporales')).length === 1, 'el peso corporal sigue ahí');
comprobar(
  (await leerTabla(pagina, 'ejercicios')).some((e) => e.id === 'bloque-3-A-1'),
  'la plantilla del bloque 3 se conserva para su historial',
);
const ajustes = await leerTabla(pagina, 'ajustes');
comprobar(ajustes.find((a) => a.clave === 'seedVersion')?.valor === 5, 'seedVersion pasa a 5');

// Un móvil que ya estaba en el bloque 4 (seedVersion 4) recoge la plantilla
// nueva de Torso 1 sin perder la fecha de inicio ni el historial.
await escribirFilas(pagina, 'bloques', [{ ...b4, fechaInicio: '2026-11-20' }]);
await escribirFilas(pagina, 'ejercicios', [
  { ...(await leerTabla(pagina, 'ejercicios')).find((e) => e.id === 'bloque-4-A-6'), nombre: 'Pájaros / Reverse Pec Deck' },
]);
await escribirFilas(pagina, 'ajustes', [{ clave: 'seedVersion', valor: 4 }]);
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');
const ejerciciosA = await leerTabla(pagina, 'ejercicios');
comprobar(
  ejerciciosA.find((e) => e.id === 'bloque-4-A-6')?.nombre === 'Curl en banco Scott con barra Z' &&
    ejerciciosA.find((e) => e.id === 'bloque-4-A-5')?.series === 3,
  'desde seedVersion 4 se recarga la plantilla de Torso 1',
);
comprobar(
  (await leerTabla(pagina, 'bloques')).find((b) => b.id === 'bloque-4')?.fechaInicio === '2026-11-20',
  'al recargar se respeta la fecha de inicio del bloque 4',
);
comprobar((await leerTabla(pagina, 'seriesRealizadas')).length === 2, 'y el historial sigue ahí');
await escribirFilas(pagina, 'bloques', [b4]);
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');

// ---------- 2. Inicio: técnica y día opcional ----------

const titular = await pagina.locator('.hoy-titular').innerText();
comprobar(titular.includes('Sesión A — Torso 1'), `hoy toca la A del bloque 4 (${titular})`);
const metaHoy = await pagina.locator('.hoy-meta').first().innerText();
comprobar(metaHoy.includes('sesión 1 de 24'), `el bloque son 24 sesiones sin contar la opcional (${metaHoy})`);
comprobar(
  (await pagina.locator('.banner-tecnica').innerText()).includes('no subas peso'),
  'avisa de que es sesión de técnica',
);

await pagina.getByRole('button', { name: /Día opcional: E/ }).click();
await pagina.waitForSelector('.ejercicio.abierto');
const metaE = await pagina.locator('.barra .meta').innerText();
comprobar(metaE.includes('opcional') && !metaE.includes('RIR'), `la E es opcional y sin RIR (${metaE})`);
await pagina.getByRole('button', { name: 'Terminar sesión' }).click();
await pagina.getByRole('button', { name: 'Terminar igual' }).click();
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await pagina.locator('.hoy-titular').innerText()).includes('Sesión A'),
  'hacer la E no mueve la sesión que toca',
);
comprobar(
  (await pagina.locator('.hoy-meta').first().innerText()).includes('sesión 1 de 24'),
  'la E no cuenta para el progreso del bloque',
);

// ---------- 3. Temporizador de descanso ----------

// El remo descansa 2 s en esta prueba, para ver el final sin esperar 150.
const ejercicios = await leerTabla(pagina, 'ejercicios');
const remo = ejercicios.find((e) => e.id === 'bloque-4-A-2');
await escribirFilas(pagina, 'ejercicios', [{ ...remo, descansoSeg: 2 }]);

await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar((await pagina.locator('.banner-tecnica').count()) === 1, 'la sesión muestra el aviso de técnica');
comprobar(
  (await pagina.locator('.banner-aviso').innerText()).includes('pájaros + tríceps'),
  'la sesión avisa de qué saltar si se va justo de tiempo',
);
comprobar((await pagina.locator('.banner-sube').count()) === 0, 'en técnica no se propone subir');

await confirmarSerie();
comprobar((await pagina.locator('.descanso').count()) === 1, 'al confirmar la serie arranca el descanso');
const inicial = await segundosDescanso();
comprobar(inicial >= 178 && inicial <= 180, `el press banca descansa 3:00 (${inicial} s)`);
comprobar(
  (await pagina.locator('.descanso-siguiente').innerText()).includes('Press banca (barra) · serie 2'),
  'el descanso dice qué viene después',
);
await pagina.locator('.descanso').getByRole('button', { name: '+15 s' }).click();
const mas = await segundosDescanso();
comprobar(mas >= inicial + 14, `+15 s alarga el descanso (${mas} s)`);
await pagina.locator('.descanso').getByRole('button', { name: '−15 s' }).click();
await pagina.locator('.descanso').getByRole('button', { name: '−15 s' }).click();
const menos = await segundosDescanso();
comprobar(menos <= inicial - 14, `−15 s lo acorta (${menos} s)`);
const guardado = await pagina.evaluate(() =>
  Object.keys(localStorage).some((k) => k.startsWith('entrenos:descanso:')),
);
comprobar(guardado, 'el descanso se guarda para sobrevivir a una recarga');
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.descanso');
const trasRecargar = await segundosDescanso();
comprobar(
  trasRecargar <= menos && trasRecargar >= menos - 5,
  `al recargar sigue la misma cuenta, calculada sobre la hora de fin (${trasRecargar} s)`,
);
await saltarDescanso();
comprobar((await pagina.locator('.descanso').count()) === 0, 'Saltar quita el descanso');

await abrirEjercicio('Remo con triángulo');
await confirmarSerie();
comprobar((await pagina.locator('.descanso').count()) === 1, 'el remo arranca su propio descanso');
await esperar(3000);
comprobar((await pagina.locator('.descanso').count()) === 0, 'al llegar a cero el descanso desaparece');
const vibraciones = await pagina.evaluate(() => window.__vibraciones);
comprobar(
  vibraciones.length === 1 && JSON.stringify(vibraciones[0]) === '[300,150,300]',
  `al terminar vibra con [300, 150, 300] (${JSON.stringify(vibraciones)})`,
);

// ---------- 4. Superserie ----------

await abrirEjercicio('Elevaciones laterales');
comprobar(
  (await pagina.locator('.ejercicio.abierto .nota-superserie').innerText()).includes('Curl en banco Scott'),
  'la tarjeta dice con qué se alterna',
);
await confirmarSerie();
comprobar((await nombreAbierto()).includes('Curl en banco Scott'), 'tras A1 se abre A2');
comprobar(
  (await pagina.locator('.descanso-siguiente').innerText()).includes('Curl en banco Scott con barra Z · serie 1'),
  'el descanso anuncia A2',
);
const descansoA1 = await segundosDescanso();
comprobar(descansoA1 >= 58 && descansoA1 <= 60, `A1 descansa su propio tiempo, 60 s (${descansoA1})`);
await saltarDescanso();
await confirmarSerie();
comprobar((await nombreAbierto()).includes('Elevaciones laterales'), 'tras A2 vuelve A1');
await saltarDescanso();

// ---------- 5. Saltar una superserie por tiempo ----------

await abrirEjercicio('Pájaros');
await pagina.getByRole('button', { name: 'Saltar la superserie (falta de tiempo)' }).click();
await esperar(300);
const series = await leerTabla(pagina, 'seriesRealizadas');
const omitidas = series.filter((s) => ['bloque-4-A-7', 'bloque-4-A-8'].includes(s.ejercicioId));
comprobar(
  omitidas.length === 6 && omitidas.every((s) => !s.completada && s.motivoOmision === 'tiempo'),
  `la superserie entera queda omitida por tiempo (${omitidas.length} series)`,
);

// ---------- 6. Consolidar técnica ----------

await abrirEjercicio('Press banca');
await pagina.getByRole('button', { name: 'Consolidar técnica' }).click();
await esperar(200);
comprobar(
  (await pagina.locator('.ejercicio.abierto .etiqueta-consolidacion').count()) === 1,
  'el ejercicio muestra «en consolidación»',
);
let consolidacion = (await leerTabla(pagina, 'ajustes')).find((a) => a.clave === 'consolidacion')?.valor;
comprobar(consolidacion?.['bloque-4-A-1']?.[0]?.hasta === null, 'queda guardado un tramo abierto');
await pagina.getByRole('button', { name: 'Terminar la consolidación' }).click();
await esperar(200);
consolidacion = (await leerTabla(pagina, 'ajustes')).find((a) => a.clave === 'consolidacion')?.valor;
comprobar(
  typeof consolidacion?.['bloque-4-A-1']?.[0]?.hasta === 'string',
  'desactivarlo cierra el tramo',
);

// ---------- 7. Duración al terminar ----------

// La sesión se empezó "hace 6 horas": la duración tiene que ir hasta la
// última serie, no hasta ahora.
const [enCurso] = (await leerTabla(pagina, 'sesionesRealizadas')).filter((r) => !r.finalizada);
await escribirFilas(pagina, 'sesionesRealizadas', [
  { ...enCurso, iniciadaEn: new Date(Date.now() - 6 * 3600_000).toISOString() },
]);
const seriesHoy = (await leerTabla(pagina, 'seriesRealizadas')).filter(
  (s) => s.sesionRealizadaId === enCurso.id,
);
await escribirFilas(
  pagina,
  'seriesRealizadas',
  seriesHoy.map((s) => ({ ...s, registradaEn: new Date(Date.now() - 5 * 3600_000).toISOString() })),
);
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.ejercicio.abierto');
await saltarDescanso();
await pagina.getByRole('button', { name: 'Terminar sesión' }).click();
await pagina.getByRole('button', { name: 'Terminar igual' }).click();
await pagina.waitForSelector('.hoy-titular');
const terminada = (await leerTabla(pagina, 'sesionesRealizadas')).find((r) => r.id === enCurso.id);
comprobar(terminada?.duracionMin === 65, `duración hasta la última serie + 5 min (${terminada?.duracionMin})`);

// ---------- 8. Estancamiento ----------

/** Tres sesiones A anteriores con el press banca a 40 kg y estos totales. */
async function sembrarPress(repsPorDia, extra = {}) {
  await vaciarTabla(pagina, 'sesionesRealizadas');
  await vaciarTabla(pagina, 'seriesRealizadas');
  const filas = [];
  const seriesFilas = [];
  repsPorDia.forEach((reps, i) => {
    const dia = String(i + 1).padStart(2, '0');
    const id = `est-${i}`;
    filas.push({
      id,
      bloqueId: 'bloque-4',
      sesionId: 'bloque-4-A',
      rotacion: i + 1,
      fecha: `2026-12-${dia}`,
      iniciadaEn: `2026-12-${dia}T06:30:00.000Z`,
      finalizadaEn: `2026-12-${dia}T07:30:00.000Z`,
      duracionMin: 60,
      notas: null,
      finalizada: true,
    });
    reps.forEach((r, n) => {
      const omitida = extra.omitida?.[i] === n;
      seriesFilas.push({
        id: `${id}__bloque-4-A-1__${n + 1}`,
        sesionRealizadaId: id,
        ejercicioId: 'bloque-4-A-1',
        numeroSerie: n + 1,
        peso: omitida ? 0 : 40,
        reps: omitida ? 0 : r,
        completada: !omitida,
        motivoOmision: omitida ? 'tiempo' : null,
        registradaEn: `2026-12-${dia}T06:40:00.000Z`,
      });
    });
  });
  await escribirFilas(pagina, 'sesionesRealizadas', filas);
  await escribirFilas(pagina, 'seriesRealizadas', seriesFilas);
  await escribirFilas(pagina, 'ajustes', [{ clave: 'consolidacion', valor: extra.consolidacion ?? {} }]);
  await pagina.reload({ waitUntil: 'networkidle' });
  await pagina.waitForSelector('.hoy-titular');
  await pagina.getByRole('button', { name: 'Elegir otra sesión' }).click();
  await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
  await pagina.waitForSelector('.ejercicio.abierto');
  return (await pagina.locator('.ejercicio.abierto .etiqueta-estancado').count()) === 1;
}

comprobar(
  await sembrarPress([[10, 9, 8], [9, 9, 8], [10, 9, 8]]),
  'mismo peso y 27 → 26 → 27 reps totales: estancado',
);
comprobar(
  (await pagina.locator('.banner-tecnica').count()) === 0,
  'a la cuarta vez la sesión ya no es de técnica',
);
comprobar(
  !(await sembrarPress([[10, 9, 8], [9, 9, 8], [10, 9, 9]])),
  'pasar de 27 a 28 reps totales ya es progresar',
);
comprobar(
  !(await sembrarPress([[10, 9, 8], [9, 9, 8], [10, 9, 8]], { omitida: { 1: 2 } })),
  'un día con una serie omitida por tiempo no cuenta',
);
comprobar(
  !(await sembrarPress([[10, 9, 8], [9, 9, 8], [10, 9, 8]], {
    consolidacion: {
      'bloque-4-A-1': [{ desde: '2026-12-02T00:00:00.000Z', hasta: '2026-12-03T00:00:00.000Z' }],
    },
  })),
  'un día en consolidación no cuenta (el contador se congela)',
);
comprobar(
  !(await sembrarPress([[10, 9, 8], [9, 9, 8], [10, 9, 8]], {
    consolidacion: { 'bloque-4-A-1': [{ desde: '2026-12-10T00:00:00.000Z', hasta: null }] },
  })),
  'en consolidación no se marca estancado',
);

// ---------- 9. Cargar un plan a mano ----------

await pagina.getByRole('button', { name: 'Volver' }).click();
await pagina.waitForSelector('.hoy-titular');
await pagina.getByRole('button', { name: 'Copia de seguridad y exportar' }).click();
const plan = {
  formato: 'entrenos-plan',
  version: 2,
  datos: {
    bloques: [
      {
        id: 'bloque-5',
        nombre: 'Bloque 5',
        numeroRotaciones: 6,
        conDescarga: false,
        fechaInicio: '2027-02-01',
        fechaFin: null,
        activo: true,
        sesionesTecnicaInicio: 0,
      },
    ],
    sesiones: [
      {
        id: 'bloque-5-A',
        bloqueId: 'bloque-5',
        letra: 'A',
        nombre: 'Prueba',
        rirObjetivo: '2',
        notaCardio: null,
        aviso: null,
        orden: 1,
        opcional: false,
      },
    ],
    ejercicios: [{ ...remo, id: 'bloque-5-A-1', sesionId: 'bloque-5-A', orden: 1 }],
  },
};
const [selector] = await Promise.all([
  pagina.waitForEvent('filechooser'),
  pagina.getByRole('button', { name: 'Elegir plan JSON' }).click(),
]);
await selector.setFiles({
  name: 'bloque-5-plan.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(plan)),
});
await pagina.getByRole('button', { name: 'Cargar el plan' }).click();
await pagina.waitForSelector('.banner-ok');
const trasPlan = await leerTabla(pagina, 'bloques');
comprobar(
  trasPlan.find((b) => b.id === 'bloque-5')?.activo === true &&
    trasPlan.find((b) => b.id === 'bloque-4')?.fechaFin === '2027-01-31' &&
    trasPlan.find((b) => b.id === 'bloque-4')?.activo === false,
  'cargar un plan abre su bloque y cierra el anterior el día antes',
);
comprobar(
  (await leerTabla(pagina, 'sesionesRealizadas')).length === 3,
  'cargar un plan no toca el historial (la sesión vacía a medias del bloque 4 se tira)',
);

// ---------- 10. Ajustes ----------

await pagina.getByRole('button', { name: 'Volver' }).click();
await pagina.getByRole('button', { name: 'Ajustes' }).click();
await pagina.waitForSelector('h1:has-text("Ajustes")');
await pagina.locator('.interruptor input').check();
await esperar(150);
comprobar(
  (await leerTabla(pagina, 'ajustes')).find((a) => a.clave === 'pantallaEncendida')?.valor === true,
  'el ajuste de pantalla encendida se guarda',
);

await cerrar(navegador, errores);
