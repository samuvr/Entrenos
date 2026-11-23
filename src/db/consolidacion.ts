import { guardarAjuste, leerAjuste } from './ajustes';
import type { ConsolidacionPorEjercicio, PeriodoConsolidacion } from './types';

/**
 * Botón "Consolidar técnica" por ejercicio. Se guarda en los ajustes (y por
 * tanto entra en la copia JSON) como tramos con principio y fin: así, al
 * desactivarlo, el contador de estancamiento sigue por donde iba.
 */
export const CLAVE_CONSOLIDACION = 'consolidacion';

export function leerConsolidacion(): Promise<ConsolidacionPorEjercicio> {
  return leerAjuste<ConsolidacionPorEjercicio>(CLAVE_CONSOLIDACION, {});
}

export function enConsolidacion(periodos: PeriodoConsolidacion[] | undefined): boolean {
  return (periodos ?? []).some((p) => p.hasta === null);
}

/** Si un instante cae dentro de algún tramo de consolidación. */
export function dentroDeConsolidacion(
  periodos: PeriodoConsolidacion[] | undefined,
  instante: string,
): boolean {
  return (periodos ?? []).some(
    (p) => instante >= p.desde && (p.hasta === null || instante < p.hasta),
  );
}

/** Activa o desactiva la consolidación de un ejercicio. */
export async function alternarConsolidacion(ejercicioId: string): Promise<boolean> {
  const todo = await leerConsolidacion();
  const periodos = [...(todo[ejercicioId] ?? [])];
  const ahora = new Date().toISOString();
  const abierto = periodos.findIndex((p) => p.hasta === null);
  if (abierto >= 0) periodos[abierto] = { ...periodos[abierto], hasta: ahora };
  else periodos.push({ desde: ahora, hasta: null });
  await guardarAjuste(CLAVE_CONSOLIDACION, { ...todo, [ejercicioId]: periodos });
  return abierto < 0;
}
