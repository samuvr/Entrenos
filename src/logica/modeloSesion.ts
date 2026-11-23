import { enConsolidacion, leerConsolidacion } from '../db/consolidacion';
import { obtenerEjerciciosDeSesion, obtenerSeriesDeSesionRealizada } from '../db/consultas';
import { obtenerHistorialPorEjercicio, type VezAnterior } from '../db/registro';
import type {
  Bloque,
  Ejercicio,
  PeriodoConsolidacion,
  SerieRealizada,
  Sesion,
  SesionRealizada,
} from '../db/types';
import { valoresPrecargados, type Valores } from './precarga';
import { estaEstancado, progresionDeHoy, progresionDesde, type Progresion } from './progresion';
import { esDescarga, esSesionTecnica, rotacionDeDescarga, seriesObjetivo } from './rotacion';

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
  /** Tres sesiones con el mismo peso sin aumentar las reps totales. */
  estancado: boolean;
  /** "Consolidar técnica" activado: ni se sube ni cuenta para estancamiento. */
  consolidando: boolean;
  /** Los otros ejercicios de su superserie, en orden. Vacío si va suelto. */
  companeros: Ejercicio[];
}

export interface ModeloSesion {
  sesion: Sesion;
  sesionRealizada: SesionRealizada;
  rotacion: number;
  numeroRotaciones: number;
  descarga: boolean;
  /** Una de las primeras sesiones del bloque: técnica, sin subir peso. */
  tecnica: boolean;
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
  const [historialPorEjercicio, consolidacion] = await Promise.all([
    obtenerHistorialPorEjercicio(
      ejercicios.map((e) => e.id),
      sesionRealizada.id,
    ),
    leerConsolidacion(),
  ]);

  const rotacionDescarga = rotacionDeDescarga(bloque);
  const contexto: Contexto = {
    descarga: esDescarga(sesionRealizada.rotacion, rotacionDescarga),
    rotacionDescarga,
    tecnica: esSesionTecnica(bloque, sesionRealizada.rotacion),
    // Si la próxima vez que se haga esta sesión también es de técnica, no tiene
    // sentido anunciar ya la subida.
    tecnicaLaProxima: esSesionTecnica(bloque, sesionRealizada.rotacion + 1),
  };
  const enCurso = ejercicios.map((ejercicio) =>
    construirEjercicio(
      ejercicio,
      ejercicios,
      contexto,
      registradas,
      historialPorEjercicio.get(ejercicio.id) ?? [],
      consolidacion[ejercicio.id],
    ),
  );
  const { descarga, tecnica } = contexto;

  return {
    sesion,
    sesionRealizada,
    rotacion: sesionRealizada.rotacion,
    numeroRotaciones: bloque.numeroRotaciones,
    descarga,
    tecnica,
    ejercicios: enCurso,
    ejercicioActualId: enCurso.find((e) => !e.terminado)?.ejercicio.id ?? null,
    seriesPendientes: enCurso.reduce((n, e) => n + e.series.filter((s) => !s.registrada).length, 0),
  };
}

interface Contexto {
  descarga: boolean;
  rotacionDescarga: number | null;
  tecnica: boolean;
  tecnicaLaProxima: boolean;
}

function construirEjercicio(
  ejercicio: Ejercicio,
  todos: Ejercicio[],
  { descarga, rotacionDescarga, tecnica, tecnicaLaProxima }: Contexto,
  registradas: SerieRealizada[],
  historial: VezAnterior[],
  consolidacion: PeriodoConsolidacion[] | undefined,
): EjercicioEnCurso {
  const suyas = registradas.filter((s) => s.ejercicioId === ejercicio.id);
  const ultimaVez = historial[0];
  const consolidando = enConsolidacion(consolidacion);
  // En técnica o consolidando no se propone subir: se repite el peso.
  const progresion =
    tecnica || consolidando
      ? null
      : progresionDeHoy(ejercicio, ultimaVez, rotacionDescarga, descarga);

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
    logrado:
      terminado && !descarga && !consolidando && !tecnicaLaProxima
        ? progresionDesde(ejercicio, suyas)
        : null,
    estancado: !consolidando && estaEstancado(ejercicio, historial, rotacionDescarga, consolidacion),
    consolidando,
    companeros: ejercicio.superserie
      ? todos.filter((e) => e.superserie === ejercicio.superserie && e.id !== ejercicio.id)
      : [],
  };
}
