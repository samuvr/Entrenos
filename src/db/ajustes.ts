import { db } from './db';
import type { RangoPesoCorporal } from './types';

export const CLAVE_SEED_VERSION = 'seedVersion';
export const CLAVE_RANGO_PESO = 'rangoPesoCorporal';

export const RANGO_PESO_POR_DEFECTO: RangoPesoCorporal = { min: 77.5, max: 79.5 };

export async function leerAjuste<T>(clave: string, porDefecto: T): Promise<T> {
  const fila = await db.ajustes.get(clave);
  return fila === undefined ? porDefecto : (fila.valor as T);
}

export async function guardarAjuste(clave: string, valor: unknown): Promise<void> {
  await db.ajustes.put({ clave, valor });
}

export function leerRangoPesoCorporal(): Promise<RangoPesoCorporal> {
  return leerAjuste<RangoPesoCorporal>(CLAVE_RANGO_PESO, RANGO_PESO_POR_DEFECTO);
}
