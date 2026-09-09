/**
 * Registro de series: los criterios de aceptación del punto 10 de la spec.
 * Cuenta los toques que cuesta anotar y comprueba que nada se pierde.
 */
import { abrirNavegador, cerrar, comprobar, contarFilas, leerTabla, URL_BASE } from './navegador.mjs';

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
  (await pagina.locator('.serie.activa .control-valor').first().innerText()).startsWith('35'),
  'peso precargado 35 kg (peso inicial)',
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
  (await pagina.locator('.serie.registrada .serie-valor').first().innerText()).includes('35 kg × 10'),
  'queda anotada 35 kg × 10',
);

// Criterio: cambiar el peso cuesta como mucho tres toques.
toques = 0;
await tocar(pagina.locator('.serie.activa .boton-paso').first());
await tocar(pagina.locator('.serie.activa .boton-confirmar'));
comprobar(toques <= 3, `serie cambiando el peso: ${toques} toque(s) (criterio: ≤3)`);
comprobar(
  (await pagina.locator('.serie.registrada .serie-valor').nth(1).innerText()).includes('32,5 kg × 10'),
  'el peso bajado se guarda como 32,5 kg',
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

for (let i = 0; i < 2; i += 1) {
  await tocar(pagina.locator('.serie.activa .boton-confirmar'));
  await pagina.waitForTimeout(120);
}

// Cronómetro de las planchas.
await pagina.waitForSelector('.ejercicio.abierto');
comprobar(
  (await pagina.locator('.ejercicio.abierto .nombre').first().innerText()).includes('Plancha frontal'),
  'salta solo al ejercicio 2',
);
comprobar(
  (await pagina.locator('.boton-crono').innerText()).includes('30-45 s'),
  'el cronómetro marca el objetivo 30-45 s',
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

// Regla 5: avisar antes de saltarse el core.
await tocar(pagina.getByRole('button', { name: 'Saltar ejercicio' }));
await pagina.waitForSelector('.modal');
const aviso = await pagina.locator('.modal-aviso').innerText();
comprobar(aviso.includes('core'), `avisa al saltar el core: "${aviso}"`);
await tocar(pagina.getByRole('button', { name: 'Máquina ocupada' }));
await pagina.waitForTimeout(200);

const cabeceraCore = await pagina.locator('.ejercicio', { hasText: 'Plancha frontal' }).innerText();
comprobar(
  cabeceraCore.includes('1/3') && !cabeceraCore.includes('✓'),
  `el core con 2 series saltadas cuenta 1/3 y sin check: "${cabeceraCore.replace(/\n/g, ' ')}"`,
);
await tocar(pagina.locator('.ejercicio', { hasText: 'Plancha frontal' }).locator('.cabecera-ejercicio'));
await pagina.waitForTimeout(150);
const detalleCore = await pagina.locator('.ejercicio.abierto').innerText();
comprobar(
  (detalleCore.match(/Máquina ocupada/g) || []).length === 2,
  'las 2 series saltadas quedan con su motivo',
);
await tocar(
  pagina.locator('.ejercicio', { hasText: 'Extensión de tríceps' }).locator('.cabecera-ejercicio'),
);

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
  hecha.finalizada === true && hecha.duracionMin >= 1,
  `sesión guardada como finalizada (${hecha.duracionMin} min, rotación ${hecha.rotacion})`,
);
comprobar(
  (await pagina.locator('.hoy-titular').innerText()).includes('Sesión B'),
  'al terminar la A, Inicio pasa a la B',
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
comprobar(ultimaVez.includes('35x10, 32,5x10'), `muestra la última vez: ${ultimaVez.slice(0, 70)}`);
comprobar(
  (await pagina.locator('.serie.activa .control-valor').first().innerText()).startsWith('35'),
  'precarga el peso de la última vez',
);

await cerrar(navegador, errores);
