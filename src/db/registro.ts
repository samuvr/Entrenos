import { db, nuevoId } from './db';
import { obtenerSesionEnCurso, obtenerSesionesRealizadas } from './consultas';
import { fechaISO } from './fechas';
import type { Ejercicio, MotivoOmision, SerieRealizada, SesionRealizada } from './types';

/**
 * Escrituras del registro de entrenamiento.
 *
 * Todo se guarda en cuanto ocurre, no al terminar: si el móvil se bloquea o el
 * navegador se cierra a mitad de sesión, al volver está todo lo registrado.
 */

/** Id determinista: reconfirmar una serie la sobrescribe en vez de duplicarla. */
function idSerie(sesionRealizadaId: string, ejercicioId: string, numeroSerie: number): string {
  return `${sesionRealizadaId}__${ejercicioId}__${numeroSerie}`;
}

/**
 * Abre la sesión del día, o reanuda la que hubiera a medias de esa misma sesión.
 *
 * Si lo que está a medias es otra sesión distinta, solo se tira cuando está
 * vacía o cuando el usuario lo ha confirmado: cambiar de sesión no puede
 * llevarse por delante series ya registradas sin avisar.
 */
export async function iniciarOReanudarSesion(
  bloqueId: string,
  sesionId: string,
  rotacion: number,
  descartarLaOtra = false,
): Promise<SesionRealizada> {
  const enCurso = await obtenerSesionEnCurso(bloqueId);
  if (enCurso && enCurso.sesionId === sesionId) return enCurso;
  if (enCurso) {
    const registradas = await db.seriesRealizadas
      .where('sesionRealizadaId')
      .equals(enCurso.id)
      .count();
    if (registradas > 0 && !descartarLaOtra) {
      throw new Error('Hay otra sesión a medias con series registradas.');
    }
    await descartarSesion(enCurso.id);
  }

  const ahora = new Date();
  const sesionRealizada: SesionRealizada = {
    id: nuevoId('ses'),
    bloqueId,
    sesionId,
    rotacion,
    fecha: fechaISO(ahora),
    iniciadaEn: ahora.toISOString(),
    finalizadaEn: null,
    duracionMin: null,
    notas: null,
    finalizada: false,
  };
  await db.sesionesRealizadas.put(sesionRealizada);
  return sesionRealizada;
}

export interface DatosSerie {
  sesionRealizadaId: string;
  ejercicioId: string;
  numeroSerie: number;
  peso: number;
  reps: number;
  completada: boolean;
  motivoOmision?: MotivoOmision | null;
}

export async function registrarSerie(datos: DatosSerie): Promise<SerieRealizada> {
  const serie: SerieRealizada = {
    id: idSerie(datos.sesionRealizadaId, datos.ejercicioId, datos.numeroSerie),
    sesionRealizadaId: datos.sesionRealizadaId,
    ejercicioId: datos.ejercicioId,
    numeroSerie: datos.numeroSerie,
    peso: datos.peso,
    reps: datos.reps,
    completada: datos.completada,
    motivoOmision: datos.motivoOmision ?? null,
    registradaEn: new Date().toISOString(),
  };
  await db.seriesRealizadas.put(serie);
  return serie;
}

/** Deshacer una serie confirmada por error. */
export async function borrarSerie(
  sesionRealizadaId: string,
  ejercicioId: string,
  numeroSerie: number,
): Promise<void> {
  await db.seriesRealizadas.delete(idSerie(sesionRealizadaId, ejercicioId, numeroSerie));
}

/**
 * Salta un ejercicio: deja anotadas como no completadas las series que
 * quedaban, con el motivo. Así el historial y el CSV cuentan la verdad.
 */
export async function saltarEjercicio(
  sesionRealizadaId: string,
  ejercicio: Ejercicio,
  totalSeries: number,
  motivo: MotivoOmision,
): Promise<void> {
  const yaHechas = await db.seriesRealizadas
    .where('[sesionRealizadaId+ejercicioId]')
    .equals([sesionRealizadaId, ejercicio.id])
    .toArray();
  const numerosHechos = new Set(yaHechas.map((s) => s.numeroSerie));

  const pendientes: SerieRealizada[] = [];
  const ahora = new Date().toISOString();
  for (let n = 1; n <= totalSeries; n += 1) {
    if (numerosHechos.has(n)) continue;
    pendientes.push({
      id: idSerie(sesionRealizadaId, ejercicio.id, n),
      sesionRealizadaId,
      ejercicioId: ejercicio.id,
      numeroSerie: n,
      peso: 0,
      reps: 0,
      completada: false,
      motivoOmision: motivo,
      registradaEn: ahora,
    });
  }
  await db.seriesRealizadas.bulkPut(pendientes);
}

/** Reabre un ejercicio saltado borrando las series vacías que lo marcaban. */
export async function deshacerSaltoEjercicio(
  sesionRealizadaId: string,
  ejercicioId: string,
): Promise<void> {
  const series = await db.seriesRealizadas
    .where('[sesionRealizadaId+ejercicioId]')
    .equals([sesionRealizadaId, ejercicioId])
    .toArray();
  const vacias = series.filter((s) => !s.completada && s.reps === 0);
  await db.seriesRealizadas.bulkDelete(vacias.map((s) => s.id));
}

export async function terminarSesion(
  sesionRealizada: SesionRealizada,
  notas: string | null = null,
): Promise<SesionRealizada> {
  const fin = new Date();
  const duracionMin = Math.max(
    1,
    Math.round((fin.getTime() - Date.parse(sesionRealizada.iniciadaEn)) / 60_000),
  );
  const finalizada: SesionRealizada = {
    ...sesionRealizada,
    finalizadaEn: fin.toISOString(),
    duracionMin,
    notas,
    finalizada: true,
  };
  await db.sesionesRealizadas.put(finalizada);
  return finalizada;
}

/** Tira una sesión a medias y todo lo que se hubiera registrado en ella. */
export async function descartarSesion(sesionRealizadaId: string): Promise<void> {
  await db.transaction('rw', db.sesionesRealizadas, db.seriesRealizadas, async () => {
    await db.seriesRealizadas.where('sesionRealizadaId').equals(sesionRealizadaId).delete();
    await db.sesionesRealizadas.delete(sesionRealizadaId);
  });
}

export interface VezAnterior {
  sesionRealizadaId: string;
  fecha: string;
  /** Rotación de aquella sesión: la 6 es descarga y no cuenta para progresar. */
  rotacion: number;
  /** Series de ese día, ordenadas. */
  series: SerieRealizada[];
}

/**
 * Las últimas veces que se hizo cada ejercicio, de la más reciente a la más
 * antigua. Con una basta para precargar valores; hacen falta tres para detectar
 * un ejercicio estancado. Ignora la sesión en curso y las que no se cerraron.
 */
export async function obtenerHistorialPorEjercicio(
  ejercicioIds: string[],
  excluirSesionRealizadaId: string,
  cuantas = 3,
): Promise<Map<string, VezAnterior[]>> {
  const [series, sesiones] = await Promise.all([
    db.seriesRealizadas.where('ejercicioId').anyOf(ejercicioIds).toArray(),
    db.sesionesRealizadas.toArray(),
  ]);
  const porId = new Map(sesiones.filter((s) => s.finalizada).map((s) => [s.id, s]));

  const resultado = new Map<string, VezAnterior[]>();
  for (const ejercicioId of ejercicioIds) {
    const suyas = series.filter(
      (s) => s.ejercicioId === ejercicioId && s.sesionRealizadaId !== excluirSesionRealizadaId,
    );

    const porSesion = new Map<string, SerieRealizada[]>();
    for (const serie of suyas) {
      if (!porId.has(serie.sesionRealizadaId)) continue;
      const lista = porSesion.get(serie.sesionRealizadaId);
      if (lista) lista.push(serie);
      else porSesion.set(serie.sesionRealizadaId, [serie]);
    }
    if (porSesion.size === 0) continue;

    const veces: VezAnterior[] = [];
    for (const [sesionRealizadaId, propias] of porSesion) {
      const sesion = porId.get(sesionRealizadaId)!;
      veces.push({
        sesionRealizadaId,
        fecha: sesion.fecha,
        rotacion: sesion.rotacion,
        series: propias.sort((a, b) => a.numeroSerie - b.numeroSerie),
      });
    }
    veces.sort((a, b) => {
      const sa = porId.get(a.sesionRealizadaId)!.iniciadaEn;
      const sb = porId.get(b.sesionRealizadaId)!.iniciadaEn;
      return sb.localeCompare(sa);
    });
    resultado.set(ejercicioId, veces.slice(0, cuantas));
  }
  return resultado;
}

/** Sesiones ya terminadas del bloque; atajo para calcular la rotación. */
export function obtenerHistorialBloque(bloqueId: string): Promise<SesionRealizada[]> {
  return obtenerSesionesRealizadas(bloqueId);
}
