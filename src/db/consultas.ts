import { db } from './db';
import type {
  Bloque,
  Ejercicio,
  PesoCorporal,
  SerieRealizada,
  Sesion,
  SesionRealizada,
} from './types';

export async function obtenerBloqueActivo(): Promise<Bloque | undefined> {
  const bloques = await db.bloques.toArray();
  return bloques.find((b) => b.activo) ?? bloques[0];
}

export async function obtenerSesionesDeBloque(bloqueId: string): Promise<Sesion[]> {
  const sesiones = await db.sesiones.where('bloqueId').equals(bloqueId).toArray();
  return sesiones.sort((a, b) => a.orden - b.orden);
}

export async function obtenerEjerciciosDeSesion(sesionId: string): Promise<Ejercicio[]> {
  const ejercicios = await db.ejercicios.where('sesionId').equals(sesionId).toArray();
  return ejercicios.sort((a, b) => a.orden - b.orden);
}

/** Todos los ejercicios del bloque, agrupados por sesión. */
export async function obtenerEjerciciosPorSesion(
  bloqueId: string,
): Promise<Map<string, Ejercicio[]>> {
  const sesiones = await obtenerSesionesDeBloque(bloqueId);
  const ids = sesiones.map((s) => s.id);
  const ejercicios = await db.ejercicios.where('sesionId').anyOf(ids).toArray();

  const mapa = new Map<string, Ejercicio[]>(ids.map((id) => [id, []]));
  for (const e of ejercicios) mapa.get(e.sesionId)?.push(e);
  for (const lista of mapa.values()) lista.sort((a, b) => a.orden - b.orden);
  return mapa;
}

/** Sesiones ya terminadas del bloque, de la más antigua a la más reciente. */
export async function obtenerSesionesRealizadas(bloqueId: string): Promise<SesionRealizada[]> {
  const hechas = await db.sesionesRealizadas.where('bloqueId').equals(bloqueId).toArray();
  return hechas
    .filter((s) => s.finalizada)
    .sort((a, b) => a.iniciadaEn.localeCompare(b.iniciadaEn));
}

/** La última sesión terminada del bloque, si la hay. */
export async function obtenerUltimaSesionRealizada(
  bloqueId: string,
): Promise<SesionRealizada | undefined> {
  const hechas = await obtenerSesionesRealizadas(bloqueId);
  return hechas[hechas.length - 1];
}

/** La sesión abierta a medias, si el usuario cerró el navegador durante una. */
export async function obtenerSesionEnCurso(
  bloqueId: string,
): Promise<SesionRealizada | undefined> {
  const abiertas = await db.sesionesRealizadas.where('bloqueId').equals(bloqueId).toArray();
  return abiertas
    .filter((s) => !s.finalizada)
    .sort((a, b) => b.iniciadaEn.localeCompare(a.iniciadaEn))[0];
}

export async function obtenerSeriesDeSesionRealizada(
  sesionRealizadaId: string,
): Promise<SerieRealizada[]> {
  const series = await db.seriesRealizadas
    .where('sesionRealizadaId')
    .equals(sesionRealizadaId)
    .toArray();
  return series.sort((a, b) => a.numeroSerie - b.numeroSerie);
}

/** Series de un ejercicio en todo el historial, de la más antigua a la última. */
export async function obtenerSeriesDeEjercicio(ejercicioId: string): Promise<SerieRealizada[]> {
  const series = await db.seriesRealizadas.where('ejercicioId').equals(ejercicioId).toArray();
  return series.sort(
    (a, b) => a.registradaEn.localeCompare(b.registradaEn) || a.numeroSerie - b.numeroSerie,
  );
}

export async function obtenerPesosCorporales(): Promise<PesoCorporal[]> {
  const pesos = await db.pesosCorporales.toArray();
  return pesos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
