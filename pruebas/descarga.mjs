/**
 * Rotación de descarga (regla 3) y funcionamiento sin conexión.
 *
 * El bloque 3 va sin descarga final (hubo semanas de descanso por medio): su
 * rotación 6 es normal. La regla se sigue probando activándola a mano.
 */
import {
  abrirNavegador,
  cerrar,
  comprobar,
  contarFilas,
  ponerDescarga,
  sembrarHistorial,
  URL_BASE,
} from './navegador.mjs';

const { navegador, contexto, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

// 25 sesiones del ciclo ya hechas: la siguiente es la A de la rotación 6.
await sembrarHistorial(pagina, 25);
await pagina.reload({ waitUntil: 'networkidle' });

comprobar((await pagina.locator('.hoy-titular').innerText()).includes('Sesión A'), 'tras 25 sesiones toca la A');
comprobar(
  (await pagina.locator('.hoy-meta').first().innerText()).includes('Rotación 6 de 6'),
  'esa A cae en la rotación 6',
);

// ---------- Bloque 3: sin descarga ----------

comprobar((await pagina.locator('.banner-descarga').count()) === 0, 'el bloque 3 no avisa de descarga');
await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar((await pagina.locator('.banner-descarga').count()) === 0, 'la sesión tampoco es de descarga');
let series = await pagina.locator('.ejercicio.abierto .serie').count();
comprobar(series === 4, `el press banca mantiene sus 4 series en la rotación 6 (${series})`);

// ---------- Con descarga: la sesión ya empezada pasa a 2 series ----------

await ponerDescarga(pagina, true);
await pagina.reload({ waitUntil: 'networkidle' });
// Al recargar con una sesión a medias, la app vuelve directa a ella.
await pagina.waitForSelector('.serie.activa');
comprobar(await pagina.locator('.banner-descarga').isVisible(), 'con descarga la sesión avisa');
series = await pagina.locator('.ejercicio.abierto .serie').count();
comprobar(series === 2, `el press banca (4 series) pasa a ${series} series en descarga`);

// Criterio: la sesión funciona de principio a fin sin conexión.
await contexto.setOffline(true);
await pagina.locator('.serie.activa .boton-confirmar').click();
await pagina.waitForSelector('.serie.registrada');
await pagina.locator('.serie.activa .boton-confirmar').click();
await pagina.waitForTimeout(200);
comprobar(
  (await contarFilas(pagina, 'seriesRealizadas')) === 2,
  'sin red se registran las series igual',
);
comprobar(
  (await pagina.locator('.ejercicio.abierto .nombre').first().innerText()).includes('Plancha'),
  'sin red sigue avanzando de ejercicio',
);
await contexto.setOffline(false);

await cerrar(navegador, errores);
