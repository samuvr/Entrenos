import {
  obtenerEjerciciosPorSesion,
  obtenerSesionesDeBloque,
  obtenerSesionesRealizadas,
} from '../db/consultas';
import { db } from '../db/db';
import type { VezAnterior } from '../db/registro';
import type { Bloque, Ejercicio, SerieRealizada, Sesion, SesionRealizada } from '../db/types';
import { cumplioObjetivo, estaEstancado, valorDeTrabajo } from './progresion';

/**
 * Historial del bloque (punto 5.4 de la spec), en dos cortes: qué se hizo cada
 * día y cómo va cada ejercicio a lo largo de las rotaciones.
 *
 * Se lee todo de una vez y se derivan las dos vistas: son los mismos datos
 * mirados por sesión o por ejercicio, y traerlos dos veces sería tonto.
 */

export interface EjercicioDeSesion {
  ejercicio: Ejercicio;
  series: SerieRealizada[];
  completadas: number;
  saltado: boolean;
}

export interface DiaDelHistorial {
  realizada: SesionRealizada;
  sesion: Sesion | undefined;
  ejercicios: EjercicioDeSesion[];
  seriesCompletadas: number;
  seriesAnotadas: number;
}

export interface PuntoEjercicio {
  sesionRealizadaId: string;
  fecha: string;
  rotacion: number;
  /** Peso de trabajo del día, o segundos en los ejercicios corporales. */
  valor: number;
  series: SerieRealizada[];
  cumplio: boolean;
}

export interface HistorialEjercicio {
  ejercicio: Ejercicio;
  sesion: Sesion | undefined;
  /** De la sesión más antigua a la más reciente. */
  puntos: PuntoEjercicio[];
  estancado: boolean;
}

export interface Adherencia {
  completadas: number;
  total: number;
  /** Sesiones hechas en las que se completó alguna serie de core. */
  coreHechas: number;
  /** Sesiones hechas cuya plantilla llevaba core. Solo la A, la C y la E. */
  coreOportunidades: number;
}

export interface Historial {
  dias: DiaDelHistorial[];
  ejercicios: HistorialEjercicio[];
  adherencia: Adherencia;
}

export async function cargarHistorial(bloque: Bloque): Promise<Historial> {
  const [sesiones, ejerciciosPorSesion, realizadas] = await Promise.all([
    obtenerSesionesDeBloque(bloque.id),
    obtenerEjerciciosPorSesion(bloque.id),
    obtenerSesionesRealizadas(bloque.id),
  ]);

  const sesionPorId = new Map(sesiones.map((s) => [s.id, s]));
  const ejerciciosOrdenados = sesiones.flatMap((s) => ejerciciosPorSesion.get(s.id) ?? []);
  const sesionDeEjercicio = new Map(ejerciciosOrdenados.map((e) => [e.id, sesionPorId.get(e.sesionId)]));

  const ids = realizadas.map((r) => r.id);
  const series = await db.seriesRealizadas.where('sesionRealizadaId').anyOf(ids).toArray();

  const porDia = new Map<string, SerieRealizada[]>(ids.map((id) => [id, []]));
  for (const serie of series) porDia.get(serie.sesionRealizadaId)?.push(serie);

  // Más reciente primero: es el orden en que se quiere mirar "qué hice".
  const dias = [...realizadas].reverse().map((realizada) =>
    construirDia(realizada, sesionPorId.get(realizada.sesionId), ejerciciosPorSesion, porDia),
  );

  return {
    dias,
    ejercicios: ejerciciosOrdenados.map((ejercicio) =>
      construirEjercicio(ejercicio, sesionDeEjercicio.get(ejercicio.id), realizadas, series, bloque),
    ),
    adherencia: calcularAdherencia(bloque, sesiones, ejerciciosPorSesion, dias),
  };
}

function construirDia(
  realizada: SesionRealizada,
  sesion: Sesion | undefined,
  ejerciciosPorSesion: Map<string, Ejercicio[]>,
  porDia: Map<string, SerieRealizada[]>,
): DiaDelHistorial {
  const suyas = porDia.get(realizada.id) ?? [];
  const plantilla = ejerciciosPorSesion.get(realizada.sesionId) ?? [];

  const ejercicios: EjercicioDeSesion[] = [];
  for (const ejercicio of plantilla) {
    const series = suyas
      .filter((s) => s.ejercicioId === ejercicio.id)
      .sort((a, b) => a.numeroSerie - b.numeroSerie);
    if (series.length === 0) continue;

    const completadas = series.filter((s) => s.completada).length;
    ejercicios.push({
      ejercicio,
      series,
      completadas,
      saltado: completadas === 0 && series.every((s) => s.reps === 0),
    });
  }

  return {
    realizada,
    sesion,
    ejercicios,
    seriesCompletadas: suyas.filter((s) => s.completada).length,
    seriesAnotadas: suyas.length,
  };
}

function construirEjercicio(
  ejercicio: Ejercicio,
  sesion: Sesion | undefined,
  realizadas: SesionRealizada[],
  series: SerieRealizada[],
  bloque: Bloque,
): HistorialEjercicio {
  const suyas = series.filter((s) => s.ejercicioId === ejercicio.id);

  const puntos: PuntoEjercicio[] = [];
  for (const realizada of realizadas) {
    const deEseDia = suyas
      .filter((s) => s.sesionRealizadaId === realizada.id)
      .sort((a, b) => a.numeroSerie - b.numeroSerie);
    const valor = valorDeTrabajo(ejercicio, deEseDia);
    // Un día saltado no es un punto de la gráfica: dibujarlo a 0 haría creer
    // que se levantó 0 kg. Se ve en la vista por sesión, que es donde toca.
    if (valor === null) continue;

    puntos.push({
      sesionRealizadaId: realizada.id,
      fecha: realizada.fecha,
      rotacion: realizada.rotacion,
      valor,
      series: deEseDia,
      cumplio: cumplioObjetivo(ejercicio, deEseDia),
    });
  }

  // `estaEstancado` mira las tres últimas veces, de la más reciente hacia atrás.
  const comoVeces: VezAnterior[] = [...puntos].reverse().map((p) => ({
    sesionRealizadaId: p.sesionRealizadaId,
    fecha: p.fecha,
    rotacion: p.rotacion,
    series: p.series,
  }));

  return {
    ejercicio,
    sesion,
    puntos,
    estancado: estaEstancado(ejercicio, comoVeces, bloque.numeroRotaciones),
  };
}

function calcularAdherencia(
  bloque: Bloque,
  sesiones: Sesion[],
  ejerciciosPorSesion: Map<string, Ejercicio[]>,
  dias: DiaDelHistorial[],
): Adherencia {
  const conCore = new Set(
    sesiones
      .filter((s) => (ejerciciosPorSesion.get(s.id) ?? []).some((e) => e.esCore))
      .map((s) => s.id),
  );

  let coreHechas = 0;
  let coreOportunidades = 0;
  for (const dia of dias) {
    if (!conCore.has(dia.realizada.sesionId)) continue;
    coreOportunidades += 1;
    if (dia.ejercicios.some((e) => e.ejercicio.esCore && e.completadas > 0)) coreHechas += 1;
  }

  return {
    completadas: dias.length,
    total: sesiones.length * bloque.numeroRotaciones,
    coreHechas,
    coreOportunidades,
  };
}
