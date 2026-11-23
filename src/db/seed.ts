import { leerPlan, type PlanEntrenos } from './plan';
import planBloque4 from './planes/bloque-4-plan.json';

/**
 * Plan sembrado en el código: el del bloque en curso.
 *
 * Cambiar de bloque se hace dejando el plan nuevo en `planes/` y subiendo
 * SEED_VERSION: al abrir la app se carga, se cierra el bloque anterior y el
 * historial se queda como estaba. También se puede cargar un plan a mano desde
 * la pantalla de copia de seguridad.
 *
 * Versiones: 3 = bloque 3, 4 = bloque 4.
 */
export const SEED_VERSION = 4;
export const BLOQUE_ID = 'bloque-4';

export function planSembrado(): PlanEntrenos {
  return leerPlan(planBloque4);
}
