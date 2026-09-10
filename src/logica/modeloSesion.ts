import { obtenerEjerciciosDeSesion, obtenerSeriesDeSesionRealizada } from '../db/consultas';
import { obtenerHistorialPorEjercicio, type VezAnterior } from '../db/registro';
import type { Bloque, Ejercicio, SerieRealizada, Sesion, SesionRealizada } from '../db/types';
import { valoresPrecargados, type Valores } from './precarga';
import { estaEstancado, progresionDeHoy, progresionDesde, type Progresion } from './progresion';
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
  ultimaVez: VezAnterior | undefined;
  series: SerieEnCurso[];
  completadas: number;
  terminado: boolean;
  saltado: boolean;
  /** Subida que toca hoy; se apaga en cuanto se registra la primera serie. */
  subeHoy: Progresion | null;
  /** Objetivo cumplido con lo de hoy: la próxima vez toca subir. */
  logrado: Progresion | null;
  /** Tres sesiones con el mismo peso sin llegar al tope. */
  estancado: boolean;
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
  const historialPorEjercicio = await obtenerHistorialPorEjercicio(
    ejercicios.map((e) => e.id),
    sesionRealizada.id,
  );

  const descarga = esDescarga(sesionRealizada.rotacion, bloque.numeroRotaciones);
  const enCurso = ejercicios.map((ejercicio) =>
    construirEjercicio(
      ejercicio,
      descarga,
      bloque.numeroRotaciones,
      registradas,
      historialPorEjercicio.get(ejercicio.id) ?? [],
    ),
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
  numeroRotaciones: number,
  registradas: SerieRealizada[],
  historial: VezAnterior[],
): EjercicioEnCurso {
  const suyas = registradas.filter((s) => s.ejercicioId === ejercicio.id);
  const ultimaVez = historial[0];
  const progresion = progresionDeHoy(ejercicio, ultimaVez, numeroRotaciones, descarga);

  // Si se registraron más series de las previstas (p. ej. venía de descarga),
  // se muestran todas para no esconder nada de lo ya hecho.
  const total = Math.max(seriesObjetivo(ejercicio, descarga), ...suyas.map((s) => s.numeroSerie), 0);

  const series: SerieEnCurso[] = [];
  for (let n = 1; n <= total; n += 1) {
    series.push({
      numeroSerie: n,
      registrada: suyas.find((s) => s.numeroSerie === n) ?? null,
      precarga: valoresPrecargados(ejercicio, ultimaVez, n, progresion),
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
    // El aviso de subir es para antes de empezar: en cuanto hay una serie
    // registrada, la decisión ya está tomada y el aviso estorba.
    subeHoy: suyas.length === 0 ? progresion : null,
    // Lo de hoy solo se juzga cuando el ejercicio está cerrado; a mitad de
    // ejercicio todavía no se sabe si se cumple el objetivo.
    logrado: terminado && !descarga ? progresionDesde(ejercicio, suyas) : null,
    estancado: estaEstancado(ejercicio, historial, numeroRotaciones),
  };
}
