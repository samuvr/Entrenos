import { db } from './db';
import type { Bloque, Ejercicio, Sesion } from './types';

/**
 * Planes de bloque (formato `entrenos-plan`).
 *
 * Un plan trae solo la plantilla: bloques, sesiones y ejercicios. Cargarlo
 * añade el bloque nuevo y cierra el que estuviera activo, sin tocar nunca el
 * historial (sesiones y series realizadas, peso corporal).
 */

export const FORMATO_PLAN = 'entrenos-plan';
export const VERSION_PLAN = 2;

export interface DatosPlan {
  bloques: Bloque[];
  sesiones: Sesion[];
  ejercicios: Ejercicio[];
}

export interface PlanEntrenos {
  formato: string;
  version: number;
  datos: DatosPlan;
}

/** Valida un plan antes de tocar la base. */
export function leerPlan(crudo: unknown): PlanEntrenos {
  if (typeof crudo !== 'object' || crudo === null) {
    throw new Error('El fichero no tiene el formato de un plan de entrenos.');
  }
  const plan = crudo as Partial<PlanEntrenos>;
  if (plan.formato !== FORMATO_PLAN) throw new Error('El fichero no es un plan de bloque.');
  if (typeof plan.version !== 'number' || plan.version > VERSION_PLAN) {
    throw new Error(
      `El plan es de una versión más nueva (${String(plan.version)}). Actualiza la app antes de cargarlo.`,
    );
  }
  const datos = plan.datos;
  if (
    typeof datos !== 'object' ||
    datos === null ||
    !Array.isArray(datos.bloques) ||
    !Array.isArray(datos.sesiones) ||
    !Array.isArray(datos.ejercicios)
  ) {
    throw new Error('Al plan le faltan bloques, sesiones o ejercicios.');
  }
  if (datos.bloques.length === 0) throw new Error('El plan no trae ningún bloque.');

  const idsBloque = new Set(datos.bloques.map((b) => b.id));
  const idsSesion = new Set(datos.sesiones.map((s) => s.id));
  if (datos.sesiones.some((s) => !idsBloque.has(s.bloqueId))) {
    throw new Error('Hay sesiones del plan que no son de ninguno de sus bloques.');
  }
  if (datos.ejercicios.some((e) => !idsSesion.has(e.sesionId))) {
    throw new Error('Hay ejercicios del plan que no son de ninguna de sus sesiones.');
  }
  return plan as PlanEntrenos;
}

/** El día anterior a una fecha "AAAA-MM-DD". */
function diaAnterior(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d - 1));
  return dia.toISOString().slice(0, 10);
}

/**
 * Carga un plan en la base.
 *
 * - Si un bloque del plan ya existía se respetan su fecha de inicio, su fecha
 *   de fin y si está activo: volver a cargar el plan solo cambia la plantilla.
 * - Si el bloque es nuevo y viene activo, los demás bloques activos se cierran
 *   el día antes de que empiece.
 * - Los ejercicios que desaparecen de una sesión del plan salen de la
 *   plantilla; sus series se quedan en el historial.
 */
export async function aplicarPlan(plan: PlanEntrenos): Promise<void> {
  const { bloques, sesiones, ejercicios } = plan.datos;

  await db.transaction('rw', db.bloques, db.sesiones, db.ejercicios, async () => {
    const idsPlan = new Set(bloques.map((b) => b.id));
    for (const bloque of bloques) {
      const existente = await db.bloques.get(bloque.id);
      if (existente) {
        await db.bloques.put({
          ...bloque,
          fechaInicio: existente.fechaInicio,
          fechaFin: existente.fechaFin,
          activo: existente.activo,
        });
        continue;
      }

      if (bloque.activo) {
        const otros = await db.bloques.filter((b) => b.activo && !idsPlan.has(b.id)).toArray();
        for (const otro of otros) {
          await db.bloques.update(otro.id, {
            activo: false,
            fechaFin: otro.fechaFin ?? diaAnterior(bloque.fechaInicio),
          });
        }
      }
      await db.bloques.put(bloque);
    }

    await db.sesiones.bulkPut(sesiones);

    const idsNuevos = new Set(ejercicios.map((e) => e.id));
    const retirados = await db.ejercicios
      .where('sesionId')
      .anyOf(sesiones.map((s) => s.id))
      .filter((e) => !idsNuevos.has(e.id))
      .primaryKeys();
    await db.ejercicios.bulkDelete(retirados);
    await db.ejercicios.bulkPut(ejercicios);
  });
}
