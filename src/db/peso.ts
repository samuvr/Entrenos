import { db } from './db';
import type { PesoCorporal, RangoPesoCorporal } from './types';
import { CLAVE_RANGO_PESO, guardarAjuste } from './ajustes';

/**
 * Peso corporal (punto 5.5 de la spec). Se apunta una vez por semana.
 *
 * El id sale de la fecha: apuntarse dos veces el mismo día corrige el valor en
 * vez de dejar dos pesos distintos para ese día.
 */
export async function registrarPesoCorporal(fecha: string, peso: number): Promise<PesoCorporal> {
  const registro: PesoCorporal = { id: `peso-${fecha}`, fecha, peso };
  await db.pesosCorporales.put(registro);
  return registro;
}

export async function borrarPesoCorporal(id: string): Promise<void> {
  await db.pesosCorporales.delete(id);
}

export function guardarRangoPesoCorporal(rango: RangoPesoCorporal): Promise<void> {
  return guardarAjuste(CLAVE_RANGO_PESO, rango);
}
