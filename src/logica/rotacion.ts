import type { Bloque, Ejercicio, Sesion, SesionRealizada } from '../db/types';

/**
 * Rotación en la que toca una sesión concreta: las veces que ya se ha hecho
 * esa letra en el bloque, más uno. Al llegar al tope se queda en la última.
 *
 * En una sesión opcional es simplemente la vez que se hace.
 */
export function rotacionDeSesion(
  realizadas: SesionRealizada[],
  sesionId: string,
  numeroRotaciones: number,
): number {
  const hechas = realizadas.filter((s) => s.sesionId === sesionId && s.finalizada).length;
  return Math.min(hechas + 1, numeroRotaciones);
}

/**
 * La rotación de descarga del bloque: la última (la 6), o ninguna si el bloque
 * va sin descarga.
 */
export function rotacionDeDescarga(
  bloque: Pick<Bloque, 'numeroRotaciones' | 'conDescarga'>,
): number | null {
  return bloque.conDescarga === false ? null : bloque.numeroRotaciones;
}

/** Si una rotación es de descarga, dada la rotación de descarga del bloque. */
export function esDescarga(rotacion: number, rotacionDescarga: number | null): boolean {
  return rotacionDescarga !== null && rotacion >= rotacionDescarga;
}

/** En descarga se hacen 2 series en lugar de las prescritas. */
export function seriesObjetivo(ejercicio: Ejercicio, descarga: boolean): number {
  return descarga ? Math.min(2, ejercicio.series) : ejercicio.series;
}

/** Las sesiones que forman el ciclo: todas menos las opcionales. */
export function sesionesDelCiclo(sesiones: Sesion[]): Sesion[] {
  const ciclo = sesiones.filter((s) => !s.opcional);
  return ciclo.length > 0 ? ciclo : sesiones;
}

/** Sesiones realizadas que cuentan para el ciclo (las opcionales no). */
export function realizadasDelCiclo(
  sesiones: Sesion[],
  realizadas: SesionRealizada[],
): SesionRealizada[] {
  const opcionales = new Set(sesiones.filter((s) => s.opcional).map((s) => s.id));
  return realizadas.filter((r) => !opcionales.has(r.sesionId));
}

/**
 * La sesión que toca: la siguiente del ciclo A→B→C→D a la última completada
 * (regla 4). No depende del día de la semana; si se falta un día, la sesión
 * pendiente simplemente se hace la siguiente vez que se va al gimnasio.
 *
 * Las sesiones opcionales no entran en el ciclo: hacerlas no mueve la que toca.
 */
export function siguienteSesion(sesiones: Sesion[], realizadas: SesionRealizada[]): Sesion {
  const ciclo = sesionesDelCiclo(sesiones);
  const delCiclo = realizadasDelCiclo(sesiones, realizadas);
  const ultima = delCiclo[delCiclo.length - 1];
  if (!ultima) return ciclo[0];

  const indice = ciclo.findIndex((s) => s.id === ultima.sesionId);
  if (indice === -1) return ciclo[0];
  return ciclo[(indice + 1) % ciclo.length];
}

/**
 * Las primeras `sesionesTecnicaInicio` veces que se hace cada sesión del
 * bloque son de técnica: no se sube peso. `vez` es la rotación de la sesión.
 */
export function esSesionTecnica(bloque: Pick<Bloque, 'sesionesTecnicaInicio'>, vez: number): boolean {
  return vez <= (bloque.sesionesTecnicaInicio ?? 0);
}

export interface EstadoBloque {
  /** La sesión que toca hoy. */
  siguiente: Sesion;
  /** Rotación en la que va esa sesión (1-6). Es la que dispara la descarga. */
  rotacion: number;
  /** Posición en el bloque: "sesión 12 de 24". Las opcionales no cuentan. */
  numeroSesion: number;
  totalSesiones: number;
  completadas: number;
  descarga: boolean;
  /** La sesión que toca es de técnica: no se sube peso. */
  tecnica: boolean;
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
  const totalSesiones = sesionesDelCiclo(sesiones).length * bloque.numeroRotaciones;
  const completadas = realizadasDelCiclo(sesiones, realizadas).length;
  const siguiente = siguienteSesion(sesiones, realizadas);
  const rotacion = rotacionDeSesion(realizadas, siguiente.id, bloque.numeroRotaciones);

  return {
    siguiente,
    rotacion,
    numeroSesion: Math.min(completadas + 1, totalSesiones),
    totalSesiones,
    completadas,
    descarga: esDescarga(rotacion, rotacionDeDescarga(bloque)),
    tecnica: esSesionTecnica(bloque, rotacion),
    bloqueTerminado: completadas >= totalSesiones,
    ultimaRealizada: realizadas[realizadas.length - 1],
  };
}
