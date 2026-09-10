import { diasEntre } from '../db/fechas';
import type { PesoCorporal, RangoPesoCorporal } from '../db/types';

/**
 * Control del peso corporal: se pesa una vez por semana y solo se avisa si se
 * sale del rango tres semanas seguidas (punto 5.5 de la spec).
 *
 * Lo de las tres semanas es lo importante: una pesada alta un martes no
 * significa nada, y avisar por ella sería ruido que acabaría ignorándose.
 */

export interface SemanaDePeso {
  /** Lunes de esa semana, "AAAA-MM-DD". Es la clave de la semana. */
  lunes: string;
  registro: PesoCorporal;
  fuera: 'arriba' | 'abajo' | null;
}

/** Lunes de la semana de una fecha "AAAA-MM-DD". */
export function lunesDe(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  // getDay() da 0 el domingo; se quiere que el domingo cierre la semana.
  const desplazamiento = (fecha.getDay() + 6) % 7;
  fecha.setDate(fecha.getDate() - desplazamiento);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function fueraDelRango(peso: number, rango: RangoPesoCorporal): 'arriba' | 'abajo' | null {
  if (peso > rango.max) return 'arriba';
  if (peso < rango.min) return 'abajo';
  return null;
}

/**
 * Una pesada por semana, de la más antigua a la más reciente. Si hay varias en
 * la misma semana vale la última: es la que refleja dónde se acabó.
 */
export function porSemanas(pesos: PesoCorporal[], rango: RangoPesoCorporal): SemanaDePeso[] {
  const ultimaDeCadaSemana = new Map<string, PesoCorporal>();
  for (const registro of [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    ultimaDeCadaSemana.set(lunesDe(registro.fecha), registro);
  }

  return [...ultimaDeCadaSemana.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([lunes, registro]) => ({
      lunes,
      registro,
      fuera: fueraDelRango(registro.peso, rango),
    }));
}

export interface AvisoPeso {
  direccion: 'arriba' | 'abajo';
  semanas: SemanaDePeso[];
}

/**
 * Aviso solo con tres semanas seguidas fuera y hacia el mismo lado. Seguidas de
 * verdad: si falta la pesada de una semana, la racha se rompe, porque no se
 * sabe qué pasó esa semana.
 */
export function calcularAvisoPeso(semanas: SemanaDePeso[]): AvisoPeso | null {
  const ultimas = semanas.slice(-3);
  if (ultimas.length < 3) return null;

  const direccion = ultimas[0].fuera;
  if (!direccion) return null;
  if (!ultimas.every((s) => s.fuera === direccion)) return null;
  // Consecutivas: siete días exactos entre lunes.
  if (diasEntre(ultimas[0].lunes, ultimas[1].lunes) !== 7) return null;
  if (diasEntre(ultimas[1].lunes, ultimas[2].lunes) !== 7) return null;

  return { direccion, semanas: ultimas };
}
