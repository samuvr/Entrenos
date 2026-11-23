/**
 * Rotación de descarga (regla 3) y funcionamiento sin conexión.
 *
 * El bloque 4 va sin descarga final (`conDescarga: false`): su rotación 6 es
 * normal. La regla se sigue probando activándola a mano.
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  contarFilas,
  ponerDescarga,
  saltarDescanso,
  sembrarHistorial,
  URL_BASE,
} from './navegador.mjs';

const { navegador, contexto, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

// 20 sesiones del ciclo ya hechas: la siguiente es la A de la rotación 6.
await sembrarHistorial(pagina, 20);
await pagina.reload({ waitUntil: 'networkidle' });

comprobar((await pagina.locator('.hoy-titular').innerText()).includes('Sesión A'), 'tras 20 sesiones toca la A');
comprobar(
  (await pagina.locator('.hoy-meta').first().innerText()).includes('Rotación 6 de 6'),
  'esa A cae en la rotación 6',
);

// ---------- Bloque 4: sin descarga ----------

comprobar((await pagina.locator('.banner-descarga').count()) === 0, 'el bloque 4 no avisa de descarga');
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar((await pagina.locator('.banner-descarga').count()) === 0, 'la sesión tampoco es de descarga');
let series = await pagina.locator('.ejercicio.abierto .serie').count();
comprobar(series === 3, `el press banca mantiene sus 3 series en la rotación 6 (${series})`);

// ---------- Con descarga: la sesión ya empezada pasa a 2 series ----------

await ponerDescarga(pagina, true);
await pagina.reload({ waitUntil: 'networkidle' });
// Al recargar con una sesión a medias, la app vuelve directa a ella.
await pagina.waitForSelector('.serie.activa');
comprobar(await pagina.locator('.banner-descarga').isVisible(), 'con descarga la sesión avisa');
series = await pagina.locator('.ejercicio.abierto .serie').count();
comprobar(series === 2, `el press banca (3 series) pasa a ${series} series en descarga`);

// Criterio: la sesión funciona de principio a fin sin conexión.
await contexto.setOffline(true);
await pagina.locator('.serie.activa .boton-confirmar').click();
await pagina.waitForSelector('.serie.registrada');
await saltarDescanso(pagina);
await pagina.locator('.serie.activa .boton-confirmar').click();
await pagina.waitForTimeout(200);
comprobar(
  (await contarFilas(pagina, 'seriesRealizadas')) === 2,
  'sin red se registran las series igual',
);
comprobar(
  (await pagina.locator('.ejercicio.abierto .nombre').first().innerText()).includes('Remo con triángulo'),
  'sin red sigue avanzando de ejercicio',
);
await contexto.setOffline(false);

await cerrar(navegador, errores);
