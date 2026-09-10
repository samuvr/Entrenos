/**
 * Genera los PNG del icono a partir de public/icono.svg.
 *
 * Se lanza a mano cuando cambia el icono, no en cada build: los PNG están en el
 * repositorio y la app no depende de nada para construirse. Usa el Chromium de
 * las pruebas, que ya está instalado (ver pruebas/LEEME.md).
 *
 *   node herramientas/generar-iconos.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { abrirNavegador } from '../pruebas/navegador.mjs';

const TAMANOS = [
  { tamano: 192, nombre: 'icono-192.png' },
  { tamano: 512, nombre: 'icono-512.png' },
  // iOS no mira el manifest para el icono de la pantalla de inicio: usa el
  // apple-touch-icon, y lo quiere de 180.
  { tamano: 180, nombre: 'apple-touch-icon.png' },
];

const publico = fileURLToPath(new URL('../public/', import.meta.url));
const svg = await readFile(new URL('../public/icono.svg', import.meta.url), 'utf8');

const { navegador, pagina } = await abrirNavegador();
for (const { tamano, nombre } of TAMANOS) {
  await pagina.setViewportSize({ width: tamano, height: tamano });
  await pagina.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${tamano}px;height:${tamano}px}</style>${svg}`,
  );
  const png = await pagina.screenshot({ omitBackground: false });
  await writeFile(`${publico}${nombre}`, png);
  console.log(`${nombre} (${tamano}x${tamano}, ${png.length} bytes)`);
}
await navegador.close();
