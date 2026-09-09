import { db } from './db';
import { fechaISO } from './fechas';
import type { Bloque } from './types';

/**
 * Cierre del bloque (regla 6). Al completar las 30 sesiones se ofrece exportar
 * el CSV y cerrar; cerrar solo pone la fecha de fin y lo marca inactivo, no
 * borra nada. El bloque 4 se carga editando la semilla, no desde la interfaz.
 */
export async function cerrarBloque(bloqueId: string): Promise<void> {
  await db.bloques.update(bloqueId, { activo: false, fechaFin: fechaISO() });
}

/** Por si se cierra sin querer: reabrir lo deja como estaba. */
export async function reabrirBloque(bloqueId: string): Promise<void> {
  await db.bloques.update(bloqueId, { activo: true, fechaFin: null });
}

export function estaCerrado(bloque: Bloque): boolean {
  return !bloque.activo;
}
