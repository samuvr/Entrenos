/**
 * PWA: manifest, iconos, service worker y arranque en modo avión.
 *
 * Cubre los dos últimos criterios de aceptación del punto 10: que la app se
 * instale en la pantalla de inicio y se abra a pantalla completa, y que
 * funcione sin conexión de principio a fin.
 *
 * ESTA SUITE NECESITA EL BUILD, no el servidor de desarrollo: el service worker
 * solo se registra en producción. En otra ventana:
 *
 *   npm run build
 *   npm run preview
 */
import { abrirNavegador, cerrar, comprobar, leerTabla } from './navegador.mjs';

const URL_PROD = process.env.URL_PRUEBAS_PROD ?? 'http://localhost:4173/';

const { navegador, contexto, pagina, errores } = await abrirNavegador();
await pagina.goto(URL_PROD, { waitUntil: 'networkidle' });

// ---------- Manifest ----------

const manifestHref = await pagina.getAttribute('link[rel="manifest"]', 'href');
comprobar(manifestHref === './manifest.webmanifest', `la página enlaza el manifest (${manifestHref})`);

const manifest = await (await pagina.request.get(new URL(manifestHref, URL_PROD).href)).json();
comprobar(manifest.name === 'Entrenos', 'el manifest se llama Entrenos');
comprobar(manifest.display === 'standalone', 'se abre a pantalla completa (display standalone)');
comprobar(manifest.start_url === './', 'arranca en la raíz de la app');
comprobar(manifest.theme_color === '#0b0f14', 'el color de tema es el fondo de la app');

const tamanos = manifest.icons.map((i) => i.sizes);
comprobar(tamanos.includes('192x192') && tamanos.includes('512x512'), 'lleva iconos de 192 y 512');
comprobar(
  manifest.icons.some((i) => i.purpose === 'maskable'),
  'y uno maskable, para que Android no lo recorte mal',
);

// ---------- Iconos ----------

const apple = await pagina.getAttribute('link[rel="apple-touch-icon"]', 'href');
comprobar(apple === './apple-touch-icon.png', 'iOS tiene su apple-touch-icon');
comprobar(
  (await pagina.getAttribute('meta[name="apple-mobile-web-app-capable"]', 'content')) === 'yes',
  'y la etiqueta que lo abre a pantalla completa en iPhone',
);

for (const fichero of ['apple-touch-icon.png', 'icono-192.png', 'icono-512.png']) {
  const respuesta = await pagina.request.get(new URL(`./${fichero}`, URL_PROD).href);
  comprobar(
    respuesta.status() === 200 && respuesta.headers()['content-type'].includes('image/png'),
    `${fichero} se sirve como PNG`,
  );
}

// ---------- Service worker ----------

const activo = await pagina.evaluate(async () => {
  const registro = await navigator.serviceWorker.ready;
  return registro.active?.state ?? 'sin activar';
});
comprobar(activo === 'activated', `el service worker queda activado (${activo})`);

// Al recargar ya manda el service worker, y es cuando guarda el JS y el CSS:
// en la primera visita esas peticiones salieron antes de que existiera.
await pagina.reload({ waitUntil: 'networkidle' });
comprobar(
  await pagina.evaluate(() => navigator.serviceWorker.controller !== null),
  'y controla la página al recargar',
);

const guardados = await pagina.evaluate(async () => {
  const cache = await caches.open('entrenos-v1');
  return (await cache.keys()).map((p) => new URL(p.url).pathname);
});
comprobar(
  guardados.some((r) => r.endsWith('.js')) && guardados.some((r) => r.endsWith('.css')),
  `guarda el JS y el CSS (${guardados.length} ficheros)`,
);

// ---------- Modo avión, desde cero ----------

// Se corta la red y se abre la app en una pestaña nueva: es lo que pasa al
// tocar el icono de la pantalla de inicio con el móvil sin cobertura.
await contexto.setOffline(true);
const enAvion = await contexto.newPage();
const fallos = [];
enAvion.on('pageerror', (e) => fallos.push(String(e)));
await enAvion.goto(URL_PROD, { waitUntil: 'domcontentloaded' });
await enAvion.waitForSelector('.hoy-titular', { timeout: 10_000 });

comprobar(
  (await enAvion.locator('.hoy-titular').innerText()).includes('Sesión A'),
  'en modo avión y desde cero, la app arranca y dice qué toca',
);

// Y se puede entrenar: sin red no cambia nada, todo es local.
await enAvion.getByRole('button', { name: 'Empezar sesión A' }).click();
await enAvion.waitForSelector('.serie.activa');
await enAvion.locator('.serie.activa .boton-confirmar').first().click();
await enAvion.waitForSelector('.serie.registrada');

const series = await leerTabla(enAvion, 'seriesRealizadas');
comprobar(series.length === 1, 'y se registra una serie sin conexión');
comprobar(fallos.length === 0, `sin errores en la pestaña offline${fallos.length ? `: ${fallos[0]}` : ''}`);

await contexto.setOffline(false);
await cerrar(navegador, errores);
