/**
 * Rotación A→B→C→D→E, pantalla de inicio y salto manual de sesión
 * (reglas 3, 4 y 6 de la spec).
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  contarFilas,
  sembrarHistorial,
  URL_BASE,
} from './navegador.mjs';

const { navegador, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

comprobar(
  (await pagina.locator('.hoy-titular').innerText()).includes('Sesión A'),
  'sin historial, toca la sesión A',
);
comprobar(
  (await pagina.locator('.hoy-meta').first().innerText()).includes('Rotación 1 de 6 · sesión 1 de 30'),
  'muestra rotación 1 de 6 y sesión 1 de 30',
);
comprobar(
  (await pagina.locator('.hoy').innerText()).includes('Todavía no has hecho ninguna'),
  'dice que no hay sesiones previas',
);

// El ciclo completo, y que vuelve a empezar por la A.
const esperado = [
  ['A', 'Push'], ['B', 'Pull'], ['C', 'Legs'], ['D', 'Upper'], ['E', 'Lower'], ['A', 'Push'],
];
for (let n = 0; n < esperado.length; n += 1) {
  await sembrarHistorial(pagina, n);
  await pagina.reload({ waitUntil: 'networkidle' });
  const titular = await pagina.locator('.hoy-titular').innerText();
  const [letra, nombre] = esperado[n];
  comprobar(
    titular.includes(`Sesión ${letra}`) && titular.includes(nombre),
    `con ${n} sesiones hechas toca la ${letra}`,
  );
}

// Progreso a mitad de bloque: tras A B C D E A B C D E A toca la B.
await sembrarHistorial(pagina, 11);
await pagina.reload({ waitUntil: 'networkidle' });
comprobar(
  (await pagina.locator('.hoy-titular').innerText()).includes('Sesión B'),
  'tras 11 sesiones (…D E A) toca la B',
);
const meta = await pagina.locator('.hoy-meta').first().innerText();
comprobar(
  meta.includes('Rotación 3 de 6') && meta.includes('sesión 12 de 30'),
  `progreso correcto: "${meta}"`,
);
comprobar(
  (await pagina.locator('.hoy').innerText()).includes('Última sesión:'),
  'muestra la fecha de la última sesión',
);

// Regla 3: la rotación 6 es de descarga.
await sembrarHistorial(pagina, 25);
await pagina.reload({ waitUntil: 'networkidle' });
comprobar(
  (await pagina.locator('.hoy-meta').first().innerText()).includes('Rotación 6 de 6'),
  'tras 25 sesiones entra en la rotación 6',
);
comprobar(await pagina.locator('.banner-descarga').isVisible(), 'avisa de la descarga en Inicio');

// El día ligero (sesión D) lleva su propio aviso.
await sembrarHistorial(pagina, 3);
await pagina.reload({ waitUntil: 'networkidle' });
comprobar(
  (await pagina.locator('.banner-aviso').innerText()).includes('Día ligero'),
  'avisa del día ligero en la sesión D',
);

// Regla 6: fin de bloque.
await sembrarHistorial(pagina, 30);
await pagina.reload({ waitUntil: 'networkidle' });
comprobar(
  (await pagina.locator('.banner-aviso').innerText()).includes('Bloque completo'),
  'avisa del fin de bloque a las 30 sesiones',
);
comprobar(
  (await pagina.locator('.hoy-meta').first().innerText()).includes('sesión 30 de 30'),
  'el contador no se pasa de 30',
);

// Empezar la sesión que toca, con un toque.
await sembrarHistorial(pagina, 1);
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.getByRole('button', { name: 'Empezar sesión B' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await pagina.locator('h1').innerText()).includes('Sesión B'),
  'un toque en Inicio abre la sesión que toca',
);

await pagina.locator('.boton-volver').click();
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await pagina.locator('.pendiente-otro-dia').innerText()).includes('Continuar sesión B'),
  'al volver a Inicio ofrece continuar la sesión abierta',
);

// Saltar a otra sesión a mano, que es acción secundaria.
await pagina.getByRole('button', { name: 'Elegir otra sesión' }).click();
await pagina.waitForSelector('.tarjeta.destacada');
comprobar(
  (await pagina.locator('.tarjeta.destacada').innerText()).includes('es la que toca'),
  'el selector marca cuál es la que toca',
);
await pagina.getByRole('button', { name: 'Empezar sesión D' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await pagina.locator('h1').innerText()).includes('Sesión D'),
  'puede saltar a otra sesión a mano',
);

// Cambiar de sesión no puede llevarse por delante series ya registradas.
await pagina.locator('.serie.activa .boton-confirmar').click();
await pagina.waitForSelector('.serie.registrada');
await pagina.locator('.boton-volver').click();
await pagina.getByRole('button', { name: 'Elegir otra sesión' }).click();
await pagina.getByRole('button', { name: 'Empezar sesión E' }).click();
await pagina.waitForSelector('.modal');
comprobar(
  (await pagina.locator('.modal-aviso').innerText()).includes('se pierden'),
  'avisa antes de tirar una sesión con series registradas',
);
await pagina.getByRole('button', { name: 'Cancelar' }).click();
await pagina.waitForTimeout(150);
const vivas = await contarFilas(pagina, 'seriesRealizadas');
comprobar(vivas === 1, `cancelar conserva la serie registrada (${vivas})`);

await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });
await pagina.waitForSelector('.serie.activa');
comprobar(
  (await pagina.locator('h1').innerText()).includes('Sesión D'),
  'al reabrir la app entra directa en la sesión a medias',
);

await cerrar(navegador, errores);
