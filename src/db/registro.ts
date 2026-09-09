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

export interface UltimaVez {
  fecha: string;
  series: SerieRealizada[];
}

/**
 * Lo que se hizo la última vez de cada ejercicio, para precargar los valores y
 * mostrarlo en pantalla. Ignora la sesión en curso.
 */
export async function obtenerUltimaVezPorEjercicio(
  ejercicioIds: string[],
  excluirSesionRealizadaId: string,
): Promise<Map<string, UltimaVez>> {
  const [series, sesiones] = await Promise.all([
    db.seriesRealizadas.where('ejercicioId').anyOf(ejercicioIds).toArray(),
    db.sesionesRealizadas.toArray(),
  ]);
  const fechaDeSesion = new Map(sesiones.map((s) => [s.id, s.fecha]));

  const resultado = new Map<string, UltimaVez>();
  for (const ejercicioId of ejercicioIds) {
    const suyas = series.filter(
      (s) => s.ejercicioId === ejercicioId && s.sesionRealizadaId !== excluirSesionRealizadaId,
    );
    if (suyas.length === 0) continue;

    const ultima = suyas.reduce((a, b) => (a.registradaEn >= b.registradaEn ? a : b));
    const deEsaSesion = suyas
      .filter((s) => s.sesionRealizadaId === ultima.sesionRealizadaId)
      .sort((a, b) => a.numeroSerie - b.numeroSerie);

    resultado.set(ejercicioId, {
      fecha: fechaDeSesion.get(ultima.sesionRealizadaId) ?? '',
      series: deEsaSesion,
    });
  }
  return resultado;
}

/** Sesiones ya terminadas del bloque; atajo para calcular la rotación. */
export function obtenerHistorialBloque(bloqueId: string): Promise<SesionRealizada[]> {
  return obtenerSesionesRealizadas(bloqueId);
}
