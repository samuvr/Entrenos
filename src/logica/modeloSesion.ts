import { obtenerEjerciciosDeSesion, obtenerSeriesDeSesionRealizada } from '../db/consultas';
import { obtenerUltimaVezPorEjercicio, type UltimaVez } from '../db/registro';
import type { Bloque, Ejercicio, SerieRealizada, Sesion, SesionRealizada } from '../db/types';
import { valoresPrecargados, type Valores } from './precarga';
import { esDescarga, seriesObjetivo } from './rotacion';

export interface SerieEnCurso {
  numeroSerie: number;
  registrada: SerieRealizada | null;
  precarga: Valores;
}

export interface EjercicioEnCurso {
  ejercicio: Ejercicio;
  /** Series a hacer hoy; en descarga son 2. */
  total: number;
  ultimaVez: UltimaVez | undefined;
  series: SerieEnCurso[];
  completadas: number;
  terminado: boolean;
  saltado: boolean;
}

export interface ModeloSesion {
  sesion: Sesion;
  sesionRealizada: SesionRealizada;
  rotacion: number;
  numeroRotaciones: number;
  descarga: boolean;
  ejercicios: EjercicioEnCurso[];
  /** Primer ejercicio con series pendientes; null si ya está todo. */
  ejercicioActualId: string | null;
  seriesPendientes: number;
}

/** Reconstruye el estado de la sesión desde la base: es la única fuente de verdad. */
export async function cargarModeloSesion(
  bloque: Bloque,
  sesion: Sesion,
  sesionRealizada: SesionRealizada,
): Promise<ModeloSesion> {
  const ejercicios = await obtenerEjerciciosDeSesion(sesion.id);
  const registradas = await obtenerSeriesDeSesionRealizada(sesionRealizada.id);
  const ultimaVezPorEjercicio = await obtenerUltimaVezPorEjercicio(
    ejercicios.map((e) => e.id),
    sesionRealizada.id,
  );

  const descarga = esDescarga(sesionRealizada.rotacion, bloque.numeroRotaciones);
  const enCurso = ejercicios.map((ejercicio) =>
    construirEjercicio(ejercicio, descarga, registradas, ultimaVezPorEjercicio.get(ejercicio.id)),
  );

  return {
    sesion,
    sesionRealizada,
    rotacion: sesionRealizada.rotacion,
    numeroRotaciones: bloque.numeroRotaciones,
    descarga,
    ejercicios: enCurso,
    ejercicioActualId: enCurso.find((e) => !e.terminado)?.ejercicio.id ?? null,
    seriesPendientes: enCurso.reduce((n, e) => n + e.series.filter((s) => !s.registrada).length, 0),
  };
}

function construirEjercicio(
  ejercicio: Ejercicio,
  descarga: boolean,
  registradas: SerieRealizada[],
  ultimaVez: UltimaVez | undefined,
): EjercicioEnCurso {
  const suyas = registradas.filter((s) => s.ejercicioId === ejercicio.id);
  // Si se registraron más series de las previstas (p. ej. venía de descarga),
  // se muestran todas para no esconder nada de lo ya hecho.
  const total = Math.max(seriesObjetivo(ejercicio, descarga), ...suyas.map((s) => s.numeroSerie), 0);

  const series: SerieEnCurso[] = [];
  for (let n = 1; n <= total; n += 1) {
    series.push({
      numeroSerie: n,
      registrada: suyas.find((s) => s.numeroSerie === n) ?? null,
      precarga: valoresPrecargados(ejercicio, ultimaVez, n),
    });
  }

  const completadas = suyas.filter((s) => s.completada).length;
  const terminado = series.every((s) => s.registrada !== null);
  return {
    ejercicio,
    total,
    ultimaVez,
    series,
    completadas,
    terminado,
    // Saltado: todas anotadas sin completar y sin ningún valor registrado.
    saltado: terminado && completadas === 0 && suyas.every((s) => s.reps === 0),
  };
}
