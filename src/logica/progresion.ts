import type { VezAnterior } from '../db/registro';
import type { Ejercicio, SerieRealizada } from '../db/types';

/**
 * Doble progresión (reglas 1 y 2), que es la regla que más se incumple:
 * completar todas las series en el tope del rango y luego repetir el mismo peso
 * en vez de subir. La app lo calcula sola y lo avisa.
 *
 * En los ejercicios corporales no hay peso que subir: ahí se progresa alargando
 * el tiempo, que es lo que dice la tabla de incrementos ("corporal: +5 s").
 */

export interface Progresion {
  /** Qué sube: el peso, o el tiempo/reps de los ejercicios corporales. */
  campo: 'peso' | 'reps';
  anterior: number;
  nuevo: number;
  /** Series que se completaron en el tope para ganárselo. */
  seriesEnTope: number;
}

/** Los ejercicios con peso suben kilos; los corporales, segundos o reps. */
export function progresaEnPeso(ejercicio: Ejercicio): boolean {
  return ejercicio.unidad !== 'segundos' && ejercicio.tipoCarga !== 'corporal';
}

/**
 * Peso (o tiempo) de trabajo de un día: el mayor de las series completadas.
 * Es lo que se compara de una sesión a otra.
 */
export function valorDeTrabajo(ejercicio: Ejercicio, series: SerieRealizada[]): number | null {
  const hechas = series.filter((s) => s.completada);
  if (hechas.length === 0) return null;
  const campo = progresaEnPeso(ejercicio) ? 'peso' : 'reps';
  return Math.max(...hechas.map((s) => s[campo]));
}

/**
 * ¿Se cumplió el objetivo aquel día? Todas las series prescritas completadas,
 * todas en el tope del rango y todas con el mismo peso.
 *
 * Lo del mismo peso importa: si las series se hicieron con pesos distintos, el
 * usuario ya estaba ajustando y no hay un "siguiente peso" que proponer.
 */
export function cumplioObjetivo(ejercicio: Ejercicio, series: SerieRealizada[]): boolean {
  if (series.length < ejercicio.series) return false;
  if (!series.every((s) => s.completada)) return false;
  if (!series.every((s) => s.reps >= ejercicio.repsMax)) return false;
  if (!progresaEnPeso(ejercicio)) return true;
  return series.every((s) => s.peso === series[0].peso);
}

/** El salto que toca si se cumplió el objetivo, o null si no toca. */
export function progresionDesde(
  ejercicio: Ejercicio,
  series: SerieRealizada[],
): Progresion | null {
  if (!cumplioObjetivo(ejercicio, series)) return null;
  const campo = progresaEnPeso(ejercicio) ? 'peso' : 'reps';
  const anterior = campo === 'peso' ? series[0].peso : ejercicio.repsMax;
  // Los decimales se redondean a dos: 35 + 2,5 no puede salir 37,499999.
  const nuevo = Math.round((anterior + ejercicio.incremento) * 100) / 100;
  return { campo, anterior, nuevo, seriesEnTope: series.length };
}

/**
 * Lo que toca subir hoy, mirando la última vez que se hizo el ejercicio.
 *
 * En la rotación de descarga no se sube: por definición se repite el peso de la
 * rotación 5 con menos series (regla 3). Tampoco se progresa *desde* una
 * descarga, porque llegar al tope con 2 series flojas no es haberlo ganado.
 */
export function progresionDeHoy(
  ejercicio: Ejercicio,
  ultimaVez: VezAnterior | undefined,
  numeroRotaciones: number,
  descargaHoy: boolean,
): Progresion | null {
  if (descargaHoy || !ultimaVez) return null;
  if (ultimaVez.rotacion >= numeroRotaciones) return null;
  return progresionDesde(ejercicio, ultimaVez.series);
}

/**
 * Estancado: tres sesiones seguidas con el mismo peso sin llegar al tope del
 * rango. No es un error, es información: o toca bajar el peso, o revisar la
 * técnica, o el ejercicio no está progresando y hay que cambiarlo.
 *
 * Las descargas no cuentan: repiten peso y no se acercan al fallo por diseño,
 * así que darían un estancamiento falso.
 */
export function estaEstancado(
  ejercicio: Ejercicio,
  historial: VezAnterior[],
  numeroRotaciones: number,
): boolean {
  const utiles = historial.filter((v) => v.rotacion < numeroRotaciones).slice(0, 3);
  if (utiles.length < 3) return false;

  const valores = utiles.map((v) => valorDeTrabajo(ejercicio, v.series));
  if (valores.some((v) => v === null)) return false;
  if (!valores.every((v) => v === valores[0])) return false;
  return utiles.every((v) => !cumplioObjetivo(ejercicio, v.series));
}
