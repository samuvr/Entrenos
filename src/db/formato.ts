/** Formato español de números: coma decimal y sin ceros de más. */
export function formatearNumero(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

/** "35 kg", "37,5 kg". */
export function formatearPeso(kg: number): string {
  return `${formatearNumero(kg)} kg`;
}

/** "8-10", o "12" si el rango es un valor fijo. */
export function formatearRango(min: number, max: number): string {
  return min === max ? String(min) : `${min}-${max}`;
}
