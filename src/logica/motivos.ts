import type { MotivoOmision } from '../db/types';

export const MOTIVOS: { valor: MotivoOmision; etiqueta: string }[] = [
  { valor: 'tiempo', etiqueta: 'Falta de tiempo' },
  { valor: 'maquina-ocupada', etiqueta: 'Máquina ocupada' },
  { valor: 'molestia', etiqueta: 'Molestia' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const ETIQUETA_MOTIVO: Record<MotivoOmision, string> = {
  tiempo: 'Falta de tiempo',
  'maquina-ocupada': 'Máquina ocupada',
  molestia: 'Molestia',
  otro: 'Otro',
};
