/** Utilidades de fecha. Todo en local, sin librerías. */

/** Devuelve "AAAA-MM-DD" de una fecha local (no UTC, que desplaza el día). */
export function fechaISO(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** "2026-03-12" -> "12 mar". */
export function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1]}`;
}

/** "2026-03-12" -> "12 mar 2026". */
export function fechaLarga(iso: string): string {
  const [anio] = iso.split('-');
  return `${fechaCorta(iso)} ${anio}`;
}

/** Días completos entre dos fechas "AAAA-MM-DD". */
export function diasEntre(desdeISO: string, hastaISO: string): number {
  const ms = Date.parse(`${hastaISO}T00:00:00`) - Date.parse(`${desdeISO}T00:00:00`);
  return Math.round(ms / 86_400_000);
}
