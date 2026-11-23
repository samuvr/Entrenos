/**
 * Registro de series: los criterios de aceptación del punto 10 de la spec.
 * Cuenta los toques que cuesta anotar y comprueba que nada se pierde.
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  contarFilas,
  leerTabla,
  saltarDescanso,
  URL_BASE,
} from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();

let toques = 0;
const tocar = async (loc) => {
  toques += 1;
  await loc.click();
  await pagina.waitForTimeout(60);
};

await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

await tocar(pagina.getByRole('button', { name: 'Empezar sesión A' }));
await pagina.waitForSelector('.serie.activa');
comprobar((await pagina.locator('h1').innerText()).includes('Sesión A'), 'entra en la sesión A');
comprobar(
  await pagina.locator('.banner-tecnica').isVisible(),
  'la primera vez del bloque es sesión de técnica',
);
comprobar(
  (await pagina.locator('.serie.activa .control-valor').first().innerText()).startsWith('40'),
  'peso precargado 40 kg (peso inicial)',
);
comprobar(
  (await pagina.locator('.serie.activa .control-valor').nth(1).innerText()).startsWith('10'),
  'reps precargadas al tope del rango (10)',
);

// Criterio: una serie con los valores ya correctos cuesta un solo toque.
toques = 0;
await tocar(pagina.locator('.serie.activa .boton-confirmar'));
await pagina.waitForSelector('.serie.registrada');
comprobar(toques === 1, `serie con valores correctos: ${toques} toque(s) (criterio: 1)`);
comprobar(
  (await pagina.locator('.serie.registrada .serie-valor').first().innerText()).includes('40 kg × 10'),
  'queda anotada 40 kg × 10',
);

// Al confirmar arranca el descanso del ejercicio (3 min en el press banca).
const descanso = pagina.locator('.descanso');
comprobar(await descanso.isVisible(), 'al confirmar la serie arranca el descanso');
comprobar(
  /^(3:00|2:5\d)$/.test(await descanso.locator('.descanso-tiempo').innerText()),
  `el descanso del press banca es de 3 min (${await descanso.locator('.descanso-tiempo').innerText()})`,
);
comprobar(
  (await descanso.innerText()).includes('Siguiente: Press banca (barra) · serie 2'),
  'el descanso dice qué viene después',
);
await saltarDescanso(pagina);
comprobar((await descanso.count()) === 0, 'el descanso se puede saltar');

// Criterio: cambiar el peso cuesta como mucho tres toques.
toques = 0;
await tocar(pagina.locator('.serie.activa .boton-paso').first());
await tocar(pagina.locator('.serie.activa .boton-confirmar'));
comprobar(toques <= 3, `serie cambiando el peso: ${toques} toque(s) (criterio: ≤3)`);
comprobar(
  (await pagina.locator('.serie.registrada .serie-valor').nth(1).innerText()).includes('37,5 kg × 10'),
  'el peso bajado se guarda como 37,5 kg',
);
comprobar(
  (await pagina.locator('.serie.activa .serie-cabecera').innerText()).includes('Serie 3'),
  'salta solo a la serie 3',
);

// Criterio: cerrar el navegador a mitad no pierde nada.
const antes = await contarFilas(pagina, 'seriesRealizadas');
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.serie.activa');
const despues = await contarFilas(pagina, 'seriesRealizadas');
comprobar(antes === 2 && despues === 2, `recargar a mitad conserva las ${despues} series`);
comprobar(
  (await pagina.locator('h1').innerText()).includes('Sesión A'),
  'al recargar vuelve directo a la sesión en curso',
);
comprobar(await descanso.isVisible(), 'el descanso en marcha sobrevive a la recarga');
await saltarDescanso(pagina);

await tocar(pagina.locator('.serie.activa .boton-confirmar'));
await pagina.waitForTimeout(120);
await saltarDescanso(pagina);

await pagina.waitForSelector('.ejercicio.abierto');
comprobar(
  (await pagina.locator('.ejercicio.abierto .nombre').first().innerText()).includes('Remo con triángulo'),
  'salta solo al ejercicio 2',
);

// Regla 5: avisar antes de saltarse uno de los dos ejercicios prioritarios.
await tocar(pagina.locator('.serie.activa .boton-confirmar'));
await pagina.waitForTimeout(120);
await saltarDescanso(pagina);
await tocar(pagina.getByRole('button', { name: 'Saltar ejercicio' }));
await pagina.waitForSelector('.modal');
const aviso = await pagina.locator('.modal-aviso').innerText();
comprobar(aviso.includes('prioritarios'), `avisa al saltar un ejercicio prioritario: "${aviso}"`);
await tocar(pagina.getByRole('button', { name: 'Máquina ocupada' }));
await pagina.waitForTimeout(200);

const cabeceraRemo = await pagina.locator('.ejercicio', { hasText: 'Remo con triángulo' }).innerText();
comprobar(
  cabeceraRemo.includes('1/3') && !cabeceraRemo.includes('✓'),
  `el remo con 2 series saltadas cuenta 1/3 y sin check: "${cabeceraRemo.replace(/\n/g, ' ')}"`,
);
await tocar(pagina.locator('.ejercicio', { hasText: 'Remo con triángulo' }).locator('.cabecera-ejercicio'));
await pagina.waitForTimeout(150);
const detalleRemo = await pagina.locator('.ejercicio.abierto').innerText();
comprobar(
  (detalleRemo.match(/Máquina ocupada/g) || []).length === 2,
  'las 2 series saltadas quedan con su motivo',
);

// Superserie: tras las elevaciones van los pájaros, y vuelta a las elevaciones.
const abierto = async () => pagina.locator('.ejercicio.abierto .nombre').first().innerText();
await tocar(
  pagina.locator('.ejercicio', { hasText: 'Elevaciones laterales' }).locator('.cabecera-ejercicio'),
);
await pagina.waitForTimeout(150);
comprobar(
  (await pagina.locator('.ejercicio.abierto .nota-superserie').innerText()).includes('Pájaros'),
  'las elevaciones avisan de que van en superserie con los pájaros',
);
await tocar(pagina.locator('.serie.activa .boton-confirmar'));
await pagina.waitForTimeout(150);
comprobar((await abierto()).includes('Pájaros'), 'en superserie, tras A1 se abre A2');
comprobar(
  (await descanso.innerText()).includes('Siguiente: Pájaros / Reverse Pec Deck · serie 1'),
  'el descanso anuncia el otro ejercicio de la superserie',
);
await saltarDescanso(pagina);
await tocar(pagina.locator('.serie.activa .boton-confirmar'));
await pagina.waitForTimeout(150);
comprobar((await abierto()).includes('Elevaciones laterales'), 'y tras A2 se vuelve a A1');
await saltarDescanso(pagina);

// Terminar con series pendientes.
await tocar(pagina.getByRole('button', { name: 'Terminar sesión' }));
await pagina.waitForSelector('.modal');
comprobar(
  (await pagina.locator('.modal-aviso').innerText()).includes('sin registrar'),
  'avisa de las series pendientes al terminar',
);
await tocar(pagina.getByRole('button', { name: 'Terminar igual' }));
await pagina.waitForSelector('.hoy-titular');

const [hecha] = await leerTabla(pagina, 'sesionesRealizadas');
comprobar(
  hecha.finalizada === true && hecha.duracionMin >= 1 && hecha.duracionMin <= 10,
  `sesión guardada como finalizada (${hecha.duracionMin} min, rotación ${hecha.rotacion})`,
);
comprobar(
  (await pagina.locator('.hoy-titular').innerText()).includes('Sesión B'),
  'al terminar la A, Inicio pasa a la B',
);
comprobar(
  (await pagina.locator('.descanso').count()) === 0,
  'al terminar no queda ningún descanso colgando',
);

// ---------- Día opcional (E): cronómetro y aviso del core ----------

await tocar(pagina.getByRole('button', { name: /^Día opcional: E/ }));
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await pagina.locator('.barra .meta').innerText()).includes('no cuenta para la rotación'),
  'la sesión E se presenta como opcional',
);
comprobar(
  (await pagina.locator('.ejercicio.abierto .nombre').first().innerText()).includes('Plancha RKC'),
  'la E empieza por la plancha',
);
comprobar(
  (await pagina.locator('.boton-crono').innerText()).includes('20-30 s'),
  'el cronómetro marca el objetivo 20-30 s',
);
await tocar(pagina.locator('.boton-crono'));
await pagina.waitForTimeout(1300);
await tocar(pagina.locator('.boton-crono'));
await pagina.waitForSelector('.ejercicio.abierto .serie.registrada');
comprobar(
  /^[12] s$/.test(
    await pagina.locator('.ejercicio.abierto .serie.registrada .serie-valor').first().innerText(),
  ),
  'el cronómetro anota los segundos medidos',
);
await saltarDescanso(pagina);

// Regla 5: avisar antes de saltarse el core.
await tocar(pagina.getByRole('button', { name: 'Saltar ejercicio' }));
await pagina.waitForSelector('.modal');
const avisoCore = await pagina.locator('.modal-aviso').innerText();
comprobar(avisoCore.includes('core'), `avisa al saltar el core: "${avisoCore}"`);
await tocar(pagina.getByRole('button', { name: 'Máquina ocupada' }));
await pagina.waitForTimeout(200);
const cabeceraCore = await pagina.locator('.ejercicio', { hasText: 'Plancha RKC' }).innerText();
comprobar(
  cabeceraCore.includes('1/3') && !cabeceraCore.includes('✓'),
  `el core con 2 series saltadas cuenta 1/3 y sin check: "${cabeceraCore.replace(/\n/g, ' ')}"`,
);

await tocar(pagina.getByRole('button', { name: 'Terminar sesión' }));
await pagina.waitForSelector('.modal');
await tocar(pagina.getByRole('button', { name: 'Terminar igual' }));
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await pagina.locator('.hoy-titular').innerText()).includes('Sesión B'),
  'la sesión opcional no mueve el ciclo: sigue tocando la B',
);
comprobar(
  (await pagina.locator('.hoy-meta').first().innerText()).includes('sesión 2 de 24'),
  'ni cuenta para el progreso del bloque',
);

// La siguiente vez, los valores salen precargados con los de la sesión anterior.
await tocar(pagina.getByRole('button', { name: 'Elegir otra sesión' }));
await pagina.waitForSelector('.tarjeta');
comprobar(
  (await pagina.locator('.tarjeta').first().innerText()).includes('Rotación 2 de 6'),
  'la sesión A pasa a la rotación 2',
);
await tocar(pagina.getByRole('button', { name: 'Empezar sesión A' }));
await pagina.waitForSelector('.serie.activa');
const ultimaVez = await pagina.locator('.ultima-vez').first().innerText();
comprobar(ultimaVez.includes('40x10, 37,5x10'), `muestra la última vez: ${ultimaVez.slice(0, 70)}`);
comprobar(
  (await pagina.locator('.serie.activa .control-valor').first().innerText()).startsWith('40'),
  'precarga el peso de la última vez',
);

// Máquina ocupada: se deja el press banca para luego y se abre otro ejercicio.
// Cada serie del nuevo no puede volver a abrir el que quedó atrás.
await tocar(
  pagina.locator('.ejercicio', { hasText: 'Jalón agarre neutro' }).locator('.cabecera-ejercicio'),
);
await pagina.waitForTimeout(150);
for (let i = 1; i <= 2; i += 1) {
  await tocar(pagina.locator('.serie.activa .boton-confirmar'));
  await pagina.waitForTimeout(150);
  await saltarDescanso(pagina);
  comprobar(
    (await abierto()).includes('Jalón agarre neutro'),
    `tras la serie ${i} sigue abierto el jalón, no el ejercicio dejado atrás`,
  );
}
await tocar(pagina.locator('.serie.activa .boton-confirmar'));
await pagina.waitForTimeout(150);
comprobar(
  (await abierto()).includes('Aperturas'),
  'al acabarlo pasa al siguiente (aperturas), no vuelve al press banca',
);

await cerrar(navegador, errores);
