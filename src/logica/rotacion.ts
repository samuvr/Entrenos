import type { Ejercicio, SesionRealizada } from '../db/types';

/**
 * Rotación en la que toca una sesión concreta: las veces que ya se ha hecho
 * esa letra en el bloque, más uno. Al llegar al tope se queda en la última.
 *
 * La rotación del ciclo A→B→C→D→E completo llega en el paso 3; aquí solo se
 * necesita saber en qué rotación va la sesión que se está empezando.
 */
export function rotacionDeSesion(
  realizadas: SesionRealizada[],
  sesionId: string,
  numeroRotaciones: number,
): number {
  const hechas = realizadas.filter((s) => s.sesionId === sesionId && s.finalizada).length;
  return Math.min(hechas + 1, numeroRotaciones);
}

/** La última rotación del bloque (la 6) es de descarga. */
export function esDescarga(rotacion: number, numeroRotaciones: number): boolean {
  return rotacion >= numeroRotaciones;
}

/** En descarga se hacen 2 series en lugar de las prescritas. */
export function seriesObjetivo(ejercicio: Ejercicio, descarga: boolean): number {
  return descarga ? Math.min(2, ejercicio.series) : ejercicio.series;
}
