/**
 * Rotación de descarga (regla 3) y funcionamiento sin conexión.
 */
import { abrirNavegador, cerrar, comprobar, contarFilas, sembrarHistorial, URL_BASE } from './navegador.mjs';

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
comprobar(
  (await pagina.locator('.banner-descarga').innerText()).includes('2 series'),
  'Inicio avisa de la descarga',
);

await pagina.getByRole('button', { name: 'Empezar sesión A' }).click();
await pagina.waitForSelector('.serie.activa');
comprobar(await pagina.locator('.banner-descarga').isVisible(), 'la sesión repite el aviso de descarga');
const series = await pagina.locator('.ejercicio.abierto .serie').count();
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
