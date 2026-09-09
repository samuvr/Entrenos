import { INCREMENTO_POR_TIPO } from './incrementos';
import type { Bloque, Ejercicio, LetraSesion, Sesion, TipoCarga, Unidad } from './types';

/**
 * Datos semilla del Bloque 3 (punto 7 de la spec).
 *
 * Cambiar de bloque (el 4, el 5...) se hace editando este archivo y subiendo
 * SEED_VERSION: la app carga la semilla nueva sin tocar el historial ya guardado.
 */
export const SEED_VERSION = 1;
export const BLOQUE_ID = 'bloque-3';

const CARDIO_CAMINATA = '15-20 min de caminata inclinada (15 %, ~4,8 km/h).';

/** Forma abreviada de un ejercicio en la semilla; el resto se completa solo. */
interface EjercicioSemilla {
  nombre: string;
  series: number;
  repsMin: number;
  repsMax: number;
  pesoInicial: number;
  tipoCarga: TipoCarga;
  unidad?: Unidad;
  esCore?: boolean;
  esNuevo?: boolean;
  rangoExtendido?: boolean;
  notaTecnica?: string;
  notaReps?: string;
}

interface SesionSemilla {
  letra: LetraSesion;
  nombre: string;
  rirObjetivo: string;
  notaCardio?: string;
  aviso?: string;
  ejercicios: EjercicioSemilla[];
}

const SESIONES: SesionSemilla[] = [
  {
    letra: 'A',
    nombre: 'Push (pecho, hombro, tríceps)',
    rirObjetivo: '1-2',
    notaCardio: CARDIO_CAMINATA,
    ejercicios: [
      { nombre: 'Press banca (barra)', series: 4, repsMin: 8, repsMax: 10, pesoInicial: 35, tipoCarga: 'barra' },
      {
        nombre: 'CORE: Plancha frontal',
        series: 3,
        repsMin: 30,
        repsMax: 45,
        pesoInicial: 0,
        tipoCarga: 'corporal',
        unidad: 'segundos',
        esCore: true,
      },
      { nombre: 'Press de hombros en máquina', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 17.5, tipoCarga: 'pin' },
      { nombre: 'Aperturas / Pec Deck', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 15, tipoCarga: 'pin' },
      {
        nombre: 'Elevaciones laterales',
        series: 3,
        repsMin: 12,
        repsMax: 20,
        pesoInicial: 6,
        tipoCarga: 'mancuerna',
        rangoExtendido: true,
      },
      { nombre: 'Extensión de tríceps en polea (cuerda)', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 15, tipoCarga: 'polea' },
    ],
  },
  {
    letra: 'B',
    nombre: 'Pull (espalda, bíceps, deltoide posterior)',
    rirObjetivo: '1-2',
    notaCardio: CARDIO_CAMINATA,
    ejercicios: [
      { nombre: 'Remo con triángulo (polea baja)', series: 4, repsMin: 8, repsMax: 10, pesoInicial: 37.5, tipoCarga: 'polea' },
      { nombre: 'Jalón al pecho', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 37.5, tipoCarga: 'polea' },
      {
        nombre: 'T-Bar row con apoyo pectoral',
        series: 3,
        repsMin: 10,
        repsMax: 12,
        pesoInicial: 15,
        tipoCarga: 'discos',
        esNuevo: true,
        notaTecnica:
          'Apoyar bien el pecho en la almohadilla y no despegar los hombros para tirar.',
      },
      { nombre: 'Pájaros / Reverse Pec Deck', series: 3, repsMin: 12, repsMax: 15, pesoInicial: 7.5, tipoCarga: 'pin' },
      {
        nombre: 'Curl de bíceps con mancuerna',
        series: 3,
        repsMin: 10,
        repsMax: 16,
        pesoInicial: 8,
        tipoCarga: 'mancuerna',
        rangoExtendido: true,
      },
    ],
  },
  {
    letra: 'C',
    nombre: 'Legs (pesado)',
    rirObjetivo: '1-2',
    ejercicios: [
      { nombre: 'Prensa (Leg Press)', series: 4, repsMin: 10, repsMax: 12, pesoInicial: 65, tipoCarga: 'pin' },
      { nombre: 'CORE: Crunch en polea', series: 3, repsMin: 12, repsMax: 15, pesoInicial: 22.5, tipoCarga: 'polea', esCore: true },
      { nombre: 'Hip thrust en máquina', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 32.5, tipoCarga: 'pin' },
      { nombre: 'Extensión de cuádriceps', series: 3, repsMin: 12, repsMax: 15, pesoInicial: 22.5, tipoCarga: 'pin' },
      { nombre: 'Curl femoral sentado', series: 3, repsMin: 12, repsMax: 15, pesoInicial: 32.5, tipoCarga: 'pin' },
      { nombre: 'Gemelos de pie en máquina', series: 4, repsMin: 12, repsMax: 15, pesoInicial: 35, tipoCarga: 'pin' },
    ],
  },
  {
    letra: 'D',
    nombre: 'Upper ligero',
    rirObjetivo: '3-4',
    notaCardio: CARDIO_CAMINATA,
    aviso: 'Día ligero: RIR 3-4, no es para batir marcas.',
    ejercicios: [
      { nombre: 'Press inclinado con mancuernas', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 12, tipoCarga: 'mancuerna', notaReps: 'por mano' },
      { nombre: 'Remo unilateral con mancuerna', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 20, tipoCarga: 'mancuerna', notaReps: 'por brazo' },
      { nombre: 'Jalón agarre neutro / estrecho', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 40, tipoCarga: 'polea' },
      { nombre: 'Press francés con barra Z', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 16, tipoCarga: 'barra' },
      {
        nombre: 'Curl martillo con mancuerna',
        series: 3,
        repsMin: 10,
        repsMax: 16,
        pesoInicial: 8,
        tipoCarga: 'mancuerna',
        rangoExtendido: true,
      },
    ],
  },
  {
    letra: 'E',
    nombre: 'Lower ligero + core',
    rirObjetivo: '3-4',
    notaCardio: `${CARDIO_CAMINATA} Si la fatiga es alta, 10-15 min.`,
    aviso: 'Día ligero: RIR 3-4, no es para batir marcas.',
    ejercicios: [
      { nombre: 'Sentadilla goblet con mancuerna', series: 3, repsMin: 10, repsMax: 12, pesoInicial: 18, tipoCarga: 'mancuerna' },
      {
        nombre: 'CORE: Plancha lateral',
        series: 3,
        repsMin: 20,
        repsMax: 30,
        pesoInicial: 0,
        tipoCarga: 'corporal',
        unidad: 'segundos',
        esCore: true,
        notaReps: 'por lado',
      },
      {
        nombre: 'Peso muerto rumano en Smith',
        series: 3,
        repsMin: 10,
        repsMax: 12,
        pesoInicial: 0,
        tipoCarga: 'smith',
        esNuevo: true,
        notaTecnica:
          'Empujar la cadera hacia atrás con la espalda plana, sin doblar apenas la rodilla, y bajar solo hasta donde se llegue sin que la lumbar se redondee. Se empieza con la barra sola.',
      },
      { nombre: 'Zancadas caminando con mancuernas', series: 3, repsMin: 10, repsMax: 10, pesoInicial: 8, tipoCarga: 'mancuerna', notaReps: 'por pierna' },
      { nombre: 'Abductores en máquina', series: 3, repsMin: 15, repsMax: 15, pesoInicial: 30, tipoCarga: 'pin' },
      { nombre: 'Gemelos sentado en máquina', series: 3, repsMin: 15, repsMax: 20, pesoInicial: 27.5, tipoCarga: 'pin' },
    ],
  },
];

export interface DatosSemilla {
  bloque: Bloque;
  sesiones: Sesion[];
  ejercicios: Ejercicio[];
}

/** Construye el bloque 3 completo con ids estables y derivados ya resueltos. */
export function construirSemilla(fechaInicio: string): DatosSemilla {
  const bloque: Bloque = {
    id: BLOQUE_ID,
    nombre: 'Bloque 3',
    numeroRotaciones: 6,
    fechaInicio,
    fechaFin: null,
    activo: true,
  };

  const sesiones: Sesion[] = [];
  const ejercicios: Ejercicio[] = [];

  SESIONES.forEach((s, indice) => {
    const sesionId = `${BLOQUE_ID}-${s.letra}`;
    sesiones.push({
      id: sesionId,
      bloqueId: BLOQUE_ID,
      letra: s.letra,
      nombre: s.nombre,
      rirObjetivo: s.rirObjetivo,
      notaCardio: s.notaCardio ?? null,
      aviso: s.aviso ?? null,
      orden: indice + 1,
    });

    s.ejercicios.forEach((e, i) => {
      const orden = i + 1;
      ejercicios.push({
        id: `${sesionId}-${orden}`,
        sesionId,
        orden,
        nombre: e.nombre,
        series: e.series,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        pesoInicial: e.pesoInicial,
        tipoCarga: e.tipoCarga,
        incremento: INCREMENTO_POR_TIPO[e.tipoCarga],
        unidad: e.unidad ?? 'kg',
        esCore: e.esCore ?? false,
        esNuevo: e.esNuevo ?? false,
        rangoExtendido: e.rangoExtendido ?? false,
        notaTecnica: e.notaTecnica ?? null,
        notaReps: e.notaReps ?? null,
      });
    });
  });

  return { bloque, sesiones, ejercicios };
}
