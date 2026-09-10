import type { VezAnterior } from '../db/registro';
import type { Ejercicio, SerieRealizada } from '../db/types';
import type { Progresion } from './progresion';

export interface Valores {
  peso: number;
  reps: number;
}

/**
 * Valores que salen ya puestos en una serie: los de esa misma serie la última
 * vez. Si el usuario repite lo mismo, confirmar es el único toque que necesita.
 *
 * Si toca subir (doble progresión), sale ya el peso nuevo. Y con el peso nuevo
 * salen las reps por abajo del rango, que es donde se cae de verdad al subir:
 * proponer el tope obligaría a bajarlas a mano cada vez.
 *
 * Sin historial se propone el peso inicial y el tope del rango, que es el
 * objetivo al que apunta la doble progresión.
 */
export function valoresPrecargados(
  ejercicio: Ejercicio,
  ultimaVez: VezAnterior | undefined,
  numeroSerie: number,
  progresion: Progresion | null = null,
): Valores {
  const base = valoresBase(ejercicio, ultimaVez, numeroSerie);
  if (!progresion) return base;
  return progresion.campo === 'peso'
    ? { peso: progresion.nuevo, reps: ejercicio.repsMin }
    : { peso: base.peso, reps: progresion.nuevo };
}

function valoresBase(
  ejercicio: Ejercicio,
  ultimaVez: VezAnterior | undefined,
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

/** "35x10, 35x10, 35x9" o "45 s, 40 s" para resumir un día de un ejercicio. */
export function resumirSeries(ejercicio: Ejercicio, series: SerieRealizada[]): string {
  return series
    .map((s) => {
      if (!s.completada) return '—';
      if (ejercicio.unidad === 'segundos') return `${s.reps} s`;
      if (s.peso === 0) return `${s.reps}`;
      return `${s.peso.toLocaleString('es-ES')}x${s.reps}`;
    })
    .join(', ');
}
