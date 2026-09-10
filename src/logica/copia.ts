import type { RegistroCopia } from '../db/types';

/**
 * Cuándo hay que recordar la copia de seguridad.
 *
 * Los datos solo viven en el navegador del móvil, así que la app avisa cada vez
 * que se completa una rotación entera sin haber guardado copia. Solo cuenta el
 * JSON: el CSV no restaura nada.
 */
export interface EstadoCopia {
  ultima: RegistroCopia | null;
  /** Sesiones terminadas desde la última copia. */
  sesionesSinCopia: number;
  /** Rotaciones enteras completadas desde la última copia. */
  rotacionesSinCopia: number;
  toca: boolean;
}

export function calcularEstadoCopia(
  completadas: number,
  sesionesPorRotacion: number,
  ultima: RegistroCopia | null,
): EstadoCopia {
  const copiadas = ultima?.sesionesCompletadas ?? 0;
  const sesionesSinCopia = Math.max(0, completadas - copiadas);
  // Se compara por rotación cerrada, no por número de sesiones: así el aviso
  // aparece justo al terminar la rotación y no a mitad de la siguiente.
  const rotacionesSinCopia =
    Math.floor(completadas / sesionesPorRotacion) - Math.floor(copiadas / sesionesPorRotacion);

  return {
    ultima,
    sesionesSinCopia,
    rotacionesSinCopia: Math.max(0, rotacionesSinCopia),
    toca: rotacionesSinCopia > 0,
  };
}
