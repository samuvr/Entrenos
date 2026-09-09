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
comprobar(ejercicios.length === 28, `los 28 ejercicios del bloque 3 (${ejercicios.length})`);

const porSesion = { A: 6, B: 5, C: 6, D: 5, E: 6 };
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
comprobar(ejercicios.filter((e) => e.esNuevo).length === 2, 'hay 2 ejercicios nuevos');
comprobar(
  ejercicios.filter((e) => e.unidad === 'segundos').length === 2,
  'las 2 planchas se miden en segundos',
);

// Recargar no puede duplicar la semilla.
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForSelector('.hoy-titular');
comprobar(
  (await contarFilas(pagina, 'ejercicios')) === 28,
  'recargar no duplica la semilla',
);

await cerrar(navegador, errores);
