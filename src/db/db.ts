import Dexie, { type Table } from 'dexie';
import type {
  Ajuste,
  Bloque,
  Ejercicio,
  PesoCorporal,
  SerieRealizada,
  Sesion,
  SesionRealizada,
} from './types';

/**
 * Base de datos local (IndexedDB). No hay backend: todo vive en el navegador
 * del móvil, por eso la exportación a JSON es obligatoria.
 */
export class EntrenosDB extends Dexie {
  bloques!: Table<Bloque, string>;
  sesiones!: Table<Sesion, string>;
  ejercicios!: Table<Ejercicio, string>;
  sesionesRealizadas!: Table<SesionRealizada, string>;
  seriesRealizadas!: Table<SerieRealizada, string>;
  pesosCorporales!: Table<PesoCorporal, string>;
  ajustes!: Table<Ajuste, string>;

  constructor() {
    super('entrenos');
    this.version(1).stores({
      bloques: 'id, activo',
      sesiones: 'id, bloqueId, letra, orden, [bloqueId+letra]',
      ejercicios: 'id, sesionId, orden, [sesionId+orden]',
      sesionesRealizadas: 'id, bloqueId, sesionId, fecha, rotacion, finalizada',
      seriesRealizadas:
        'id, sesionRealizadaId, ejercicioId, [sesionRealizadaId+ejercicioId], [ejercicioId+numeroSerie]',
      pesosCorporales: 'id, fecha',
      ajustes: 'clave',
    });
  }
}

export const db = new EntrenosDB();

/** Genera un id único sin depender de crypto.randomUUID (Safari antiguo). */
export function nuevoId(prefijo: string): string {
  const aleatorio = Math.random().toString(36).slice(2, 10);
  return `${prefijo}_${Date.now().toString(36)}_${aleatorio}`;
}
