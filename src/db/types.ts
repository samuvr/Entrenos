/**
 * Modelo de datos de la app de entrenos.
 *
 * Convenciones:
 * - Los ids son strings estables. Los de plantilla (bloque, sesion, ejercicio)
 *   se escriben a mano en la semilla, para que el historial siga apuntando al
 *   mismo ejercicio aunque se regenere la semilla.
 * - Las fechas son strings ISO. Fecha sola: "AAAA-MM-DD". Instante: ISO completo.
 * - Los pesos van en kg. Los ejercicios en segundos usan `unidad: "segundos"` y
 *   guardan el tiempo en el campo `reps`.
 */

export type TipoCarga =
  | 'barra'
  | 'mancuerna'
  | 'pin'
  | 'discos'
  | 'polea'
  | 'corporal'
  | 'smith';

export type Unidad = 'kg' | 'segundos';

export type LetraSesion = 'A' | 'B' | 'C' | 'D' | 'E';

/** Motivos rápidos para una serie no completada o un ejercicio saltado. */
export type MotivoOmision = 'tiempo' | 'maquina-ocupada' | 'molestia' | 'otro';

export interface Bloque {
  id: string;
  nombre: string;
  numeroRotaciones: number;
  fechaInicio: string;
  fechaFin: string | null;
  activo: boolean;
}

export interface Sesion {
  id: string;
  bloqueId: string;
  letra: LetraSesion;
  nombre: string;
  /** RIR objetivo tal cual se muestra: "1-2" o "3-4". */
  rirObjetivo: string;
  notaCardio: string | null;
  /** Aviso destacado de la sesión (p. ej. el día ligero). */
  aviso: string | null;
  orden: number;
}

export interface Ejercicio {
  id: string;
  sesionId: string;
  orden: number;
  nombre: string;
  series: number;
  repsMin: number;
  repsMax: number;
  /** Peso de partida en kg. 0 en corporal o en barra sola. */
  pesoInicial: number;
  tipoCarga: TipoCarga;
  /** Kg (o segundos, en corporal) que se suman al progresar. */
  incremento: number;
  unidad: Unidad;
  esCore: boolean;
  esNuevo: boolean;
  /** Rango de reps largo para sortear el salto de 2 kg de las mancuernas. */
  rangoExtendido: boolean;
  notaTecnica: string | null;
  /** Matiz del rango de reps: "por brazo", "por pierna", "por lado". */
  notaReps: string | null;
}

export interface SesionRealizada {
  id: string;
  bloqueId: string;
  sesionId: string;
  /** 1-6. La 6 es la rotación de descarga. */
  rotacion: number;
  /** Fecha del entrenamiento, "AAAA-MM-DD". */
  fecha: string;
  /** Instante de inicio, ISO completo. Sirve para calcular la duración. */
  iniciadaEn: string;
  finalizadaEn: string | null;
  duracionMin: number | null;
  notas: string | null;
  /** false mientras la sesión está en curso. */
  finalizada: boolean;
}

export interface SerieRealizada {
  id: string;
  sesionRealizadaId: string;
  ejercicioId: string;
  numeroSerie: number;
  /** kg. 0 en los ejercicios corporales. */
  peso: number;
  /** Repeticiones, o segundos si el ejercicio va en segundos. */
  reps: number;
  completada: boolean;
  motivoOmision: MotivoOmision | null;
  registradaEn: string;
}

export interface PesoCorporal {
  id: string;
  /** "AAAA-MM-DD". */
  fecha: string;
  peso: number;
}

/** Tabla clave-valor para los ajustes y el estado interno de la app. */
export interface Ajuste {
  clave: string;
  valor: unknown;
}

export interface RangoPesoCorporal {
  min: number;
  max: number;
}

/**
 * Rastro de la última copia de seguridad guardada. Solo cuenta el JSON: el CSV
 * se puede leer pero no restaura nada.
 */
export interface RegistroCopia {
  /** "AAAA-MM-DD". */
  fecha: string;
  /** Sesiones terminadas que había en ese momento. */
  sesionesCompletadas: number;
}
