import { CLAVE_SEED_VERSION, guardarAjuste, leerAjuste } from './ajustes';
import { db } from './db';
import { aplicarPlan } from './plan';
import { duracionRealMin, LIMITE_SESION_MIN } from './registro';
import { planSembrado, SEED_VERSION } from './seed';

export interface ResultadoInicializacion {
  sembrado: boolean;
  versionAnterior: number;
  versionActual: number;
}

/**
 * Carga el plan sembrado si hace falta y repara lo que haya quedado mal.
 *
 * Es idempotente: el plan solo se escribe cuando la base está vacía o cuando
 * SEED_VERSION ha subido. Solo toca las tablas de plantilla (bloques, sesiones,
 * ejercicios); el historial de series y sesiones realizadas nunca se borra aquí.
 */
export async function inicializarDatos(): Promise<ResultadoInicializacion> {
  const versionAnterior = await leerAjuste<number>(CLAVE_SEED_VERSION, 0);
  const hayBloques = (await db.bloques.count()) > 0;
  let sembrado = false;

  if (!hayBloques || versionAnterior < SEED_VERSION) {
    await aplicarPlan(planSembrado());
    await guardarAjuste(CLAVE_SEED_VERSION, SEED_VERSION);
    sembrado = true;
  }

  await cerrarSesionesDeBloquesCerrados();
  await repararDuraciones();
  return { sembrado, versionAnterior, versionActual: SEED_VERSION };
}

/**
 * Una sesión a medias de un bloque que ya no está activo no se puede retomar
 * desde la app: si tiene series se cierra con su duración real, y si está
 * vacía se tira.
 */
async function cerrarSesionesDeBloquesCerrados(): Promise<void> {
  const activos = new Set((await db.bloques.toArray()).filter((b) => b.activo).map((b) => b.id));
  const abiertas = await db.sesionesRealizadas
    .filter((s) => !s.finalizada && !activos.has(s.bloqueId))
    .toArray();
  for (const sesion of abiertas) {
    const series = await db.seriesRealizadas.where('sesionRealizadaId').equals(sesion.id).toArray();
    if (series.length === 0) {
      await db.sesionesRealizadas.delete(sesion.id);
      continue;
    }
    const duracionMin = duracionRealMin(sesion.iniciadaEn, series, new Date());
    const fin = Date.parse(sesion.iniciadaEn) + (duracionMin ?? 0) * 60_000;
    await db.sesionesRealizadas.put({
      ...sesion,
      finalizada: true,
      finalizadaEn: new Date(fin).toISOString(),
      duracionMin,
    });
  }
}

/**
 * Sesiones que se quedaron abiertas horas o días (1.437-5.369 min en el bloque
 * 3): la duración se recalcula hasta la última serie registrada.
 */
async function repararDuraciones(): Promise<void> {
  const largas = await db.sesionesRealizadas
    .filter((s) => s.finalizada && (s.duracionMin ?? 0) > LIMITE_SESION_MIN)
    .toArray();
  for (const sesion of largas) {
    const series = await db.seriesRealizadas.where('sesionRealizadaId').equals(sesion.id).toArray();
    const fin = sesion.finalizadaEn ? new Date(sesion.finalizadaEn) : new Date();
    const duracion = duracionRealMin(sesion.iniciadaEn, series, fin);
    if (duracion !== sesion.duracionMin) {
      await db.sesionesRealizadas.update(sesion.id, { duracionMin: duracion });
    }
  }
}
