import type { VezAnterior } from '../db/registro';
import { dentroDeConsolidacion } from '../db/consolidacion';
import type { Ejercicio, PeriodoConsolidacion, SerieRealizada } from '../db/types';
import { esDescarga } from './rotacion';

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
  rotacionDescarga: number | null,
  descargaHoy: boolean,
): Progresion | null {
  if (descargaHoy || !ultimaVez) return null;
  if (esDescarga(ultimaVez.rotacion, rotacionDescarga)) return null;
  return progresionDesde(ejercicio, ultimaVez.series);
}

/** Repeticiones (o segundos) totales del día: la suma de las series limpias. */
export function repsTotales(series: SerieRealizada[]): number {
  return series.filter((s) => s.completada).reduce((n, s) => n + s.reps, 0);
}

/**
 * Si un día sirve para juzgar el estancamiento. No sirven:
 * - las descargas, que repiten peso y no se acercan al fallo por diseño;
 * - los días sin ninguna serie limpia (ejercicio o superserie saltada);
 * - los días en que alguna serie se quedó sin hacer por falta de tiempo o por
 *   una molestia: el total de reps saldría bajo sin que el ejercicio se haya
 *   atascado;
 * - los días en que el ejercicio estaba consolidando técnica.
 */
export function cuentaParaEstancamiento(
  vez: VezAnterior,
  rotacionDescarga: number | null,
  consolidacion: PeriodoConsolidacion[] | undefined,
): boolean {
  if (esDescarga(vez.rotacion, rotacionDescarga)) return false;
  if (!vez.series.some((s) => s.completada)) return false;
  if (
    vez.series.some(
      (s) => !s.completada && (s.motivoOmision === 'tiempo' || s.motivoOmision === 'molestia'),
    )
  ) {
    return false;
  }
  return !dentroDeConsolidacion(consolidacion, vez.iniciadaEn);
}

/**
 * Estancado: tres sesiones seguidas con el mismo peso sin aumentar las
 * repeticiones totales (la suma de todas las series). Pasar de 30 a 32 reps
 * totales ya es progresar, aunque ninguna serie llegue al tope del rango.
 *
 * No es un error, es información: o toca bajar el peso, o revisar la técnica,
 * o el ejercicio no está progresando y hay que cambiarlo. Si las tres llegaron
 * al tope no está estancado: lo que toca es subir (y eso lo avisa SUBE HOY).
 *
 * `historial` va de la más reciente a la más antigua.
 */
export function estaEstancado(
  ejercicio: Ejercicio,
  historial: VezAnterior[],
  rotacionDescarga: number | null,
  consolidacion?: PeriodoConsolidacion[],
): boolean {
  const utiles = historial
    .filter((v) => cuentaParaEstancamiento(v, rotacionDescarga, consolidacion))
    .slice(0, 3);
  if (utiles.length < 3) return false;

  if (progresaEnPeso(ejercicio)) {
    const pesos = utiles.map((v) => valorDeTrabajo(ejercicio, v.series));
    if (!pesos.every((p) => p === pesos[0])) return false;
  }
  if (utiles.some((v) => cumplioObjetivo(ejercicio, v.series))) return false;

  // De la más antigua a la más reciente: ninguna mejora el total de la primera.
  const [primera, ...siguientes] = [...utiles].reverse().map((v) => repsTotales(v.series));
  return siguientes.every((total) => total <= primera);
}
