import type { TipoCarga } from './types';

/**
 * Kg que se suman al progresar, según el tipo de carga (punto 7 de la spec).
 * En corporal el "incremento" son segundos.
 */
export const INCREMENTO_POR_TIPO: Record<TipoCarga, number> = {
  barra: 2.5,
  discos: 2.5, // T-Bar: 1,25 por lado
  pin: 2.5, // siguiente pin
  polea: 2.5,
  mancuerna: 2, // las del gimnasio van de 2 en 2
  smith: 2.5,
  corporal: 5, // segundos
};

export const ETIQUETA_TIPO_CARGA: Record<TipoCarga, string> = {
  barra: 'Barra',
  discos: 'Discos',
  pin: 'Máquina de pin',
  polea: 'Polea',
  mancuerna: 'Mancuerna',
  smith: 'Smith',
  corporal: 'Peso corporal',
};
