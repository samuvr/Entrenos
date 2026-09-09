import type { UltimaVez } from '../db/registro';
import type { Ejercicio } from '../db/types';

export interface Valores {
  peso: number;
  reps: number;
}

/**
 * Valores que salen ya puestos en una serie: los de esa misma serie la última
 * vez. Si el usuario repite lo mismo, confirmar es el único toque que necesita.
 *
 * Sin historial se propone el peso inicial y el tope del rango, que es el
 * objetivo al que apunta la doble progresión.
 */
export function valoresPrecargados(
  ejercicio: Ejercicio,
  ultimaVez: UltimaVez | undefined,
  numeroSerie: number,
): Valores {
  const utiles = ultimaVez?.series.filter((s) => s.completada) ?? [];
  const misma = utiles.find((s) => s.numeroSerie === numeroSerie);
  if (misma) return { peso: misma.peso, reps: misma.reps };

  // Series añadidas respecto a la última vez: se hereda la última que sí se hizo.
  const ultima = utiles[utiles.length - 1];
  if (ultima) return { peso: ultima.peso, reps: ultima.reps };

  return { peso: ejercicio.pesoInicial, reps: ejercicio.repsMax };
}

/** "35x10, 35x10, 35x9" o "45 s, 40 s" para el resumen de la última vez. */
export function resumirSeries(ejercicio: Ejercicio, ultimaVez: UltimaVez): string {
  return ultimaVez.series
    .map((s) => {
      if (!s.completada) return '—';
      if (ejercicio.unidad === 'segundos') return `${s.reps} s`;
      if (s.peso === 0) return `${s.reps}`;
      return `${s.peso.toLocaleString('es-ES')}x${s.reps}`;
    })
    .join(', ');
}
