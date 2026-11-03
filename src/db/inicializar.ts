import { CLAVE_SEED_VERSION, guardarAjuste, leerAjuste } from './ajustes';
import { db } from './db';
import { fechaISO } from './fechas';
import { construirSemilla, SEED_VERSION } from './seed';

export interface ResultadoInicializacion {
  sembrado: boolean;
  versionAnterior: number;
  versionActual: number;
}

/**
 * Carga la semilla del bloque activo si hace falta.
 *
 * Es idempotente: solo escribe cuando la base está vacía o cuando SEED_VERSION
 * ha subido. Solo toca las tablas de plantilla (bloques, sesiones, ejercicios);
 * el historial de series y sesiones realizadas nunca se borra aquí.
 */
export async function inicializarDatos(): Promise<ResultadoInicializacion> {
  const versionAnterior = await leerAjuste<number>(CLAVE_SEED_VERSION, 0);
  const hayBloques = (await db.bloques.count()) > 0;

  if (hayBloques && versionAnterior >= SEED_VERSION) {
    return { sembrado: false, versionAnterior, versionActual: SEED_VERSION };
  }

  const { bloque, sesiones, ejercicios } = construirSemilla(fechaISO());

  await db.transaction('rw', db.bloques, db.sesiones, db.ejercicios, db.ajustes, async () => {
    // `bulkPut` respeta los ids estables de la semilla: actualiza la plantilla
    // sin duplicar filas ni romper las referencias del historial.
    // Si el bloque ya existe se respetan su fecha de inicio y si está cerrado:
    // la semilla solo cambia la plantilla, no cuándo empezó el bloque.
    const existente = await db.bloques.get(bloque.id);
    await db.bloques.put(
      existente
        ? { ...bloque, fechaInicio: existente.fechaInicio, fechaFin: existente.fechaFin, activo: existente.activo }
        : bloque,
    );
    await db.sesiones.bulkPut(sesiones);

    // Los ejercicios que ya no están en la semilla salen de la plantilla. Sus
    // series se quedan en el historial (y en el CSV, con su id).
    const idsNuevos = new Set(ejercicios.map((e) => e.id));
    const retirados = await db.ejercicios
      .where('sesionId')
      .anyOf(sesiones.map((s) => s.id))
      .filter((e) => !idsNuevos.has(e.id))
      .primaryKeys();
    await db.ejercicios.bulkDelete(retirados);
    await db.ejercicios.bulkPut(ejercicios);
    await guardarAjuste(CLAVE_SEED_VERSION, SEED_VERSION);
  });

  return { sembrado: true, versionAnterior, versionActual: SEED_VERSION };
}
