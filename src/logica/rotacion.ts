import type { Bloque, Ejercicio, Sesion, SesionRealizada } from '../db/types';

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

/**
 * La sesión que toca: la siguiente del ciclo A→B→C→D→E a la última completada
 * (regla 4). No depende del día de la semana; si se falta un día, la sesión
 * pendiente simplemente se hace la siguiente vez que se va al gimnasio.
 */
export function siguienteSesion(sesiones: Sesion[], realizadas: SesionRealizada[]): Sesion {
  const ultima = realizadas[realizadas.length - 1];
  if (!ultima) return sesiones[0];

  const indice = sesiones.findIndex((s) => s.id === ultima.sesionId);
  if (indice === -1) return sesiones[0];
  return sesiones[(indice + 1) % sesiones.length];
}

export interface EstadoBloque {
  /** La sesión que toca hoy. */
  siguiente: Sesion;
  /** Rotación en la que va esa sesión (1-6). Es la que dispara la descarga. */
  rotacion: number;
  /** Posición en el bloque: "sesión 12 de 30". */
  numeroSesion: number;
  totalSesiones: number;
  completadas: number;
  descarga: boolean;
  bloqueTerminado: boolean;
  ultimaRealizada: SesionRealizada | undefined;
}

/**
 * Todo lo que la pantalla de inicio necesita saber.
 *
 * La rotación que se muestra es la de la sesión que toca, no la del bloque:
 * es la que decide si hoy es descarga. Siguiendo el ciclo coinciden siempre;
 * solo se separan si se salta el orden a mano.
 */
export function calcularEstadoBloque(
  bloque: Bloque,
  sesiones: Sesion[],
  realizadas: SesionRealizada[],
): EstadoBloque {
  const totalSesiones = sesiones.length * bloque.numeroRotaciones;
  const completadas = realizadas.length;
  const siguiente = siguienteSesion(sesiones, realizadas);
  const rotacion = rotacionDeSesion(realizadas, siguiente.id, bloque.numeroRotaciones);

  return {
    siguiente,
    rotacion,
    numeroSesion: Math.min(completadas + 1, totalSesiones),
    totalSesiones,
    completadas,
    descarga: esDescarga(rotacion, bloque.numeroRotaciones),
    bloqueTerminado: completadas >= totalSesiones,
    ultimaRealizada: realizadas[realizadas.length - 1],
  };
}
