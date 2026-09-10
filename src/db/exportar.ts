import { db } from './db';
import { obtenerEjerciciosPorSesion, obtenerSesionesDeBloque, obtenerSesionesRealizadas } from './consultas';
import { formatearDecimal } from './formato';
import { ETIQUETA_MOTIVO } from '../logica/motivos';
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
 * Exportar e importar.
 *
 * Los datos viven solo en el navegador del móvil: si se borran los datos del
 * sitio o se cambia de teléfono, no hay nada más. El JSON es la copia de
 * seguridad de verdad (se puede restaurar); el CSV es para analizar el bloque
 * en Excel al terminarlo y no sirve para restaurar nada.
 */

export const FORMATO_COPIA = 'entrenos';
export const VERSION_COPIA = 1;

export interface DatosCopia {
  bloques: Bloque[];
  sesiones: Sesion[];
  ejercicios: Ejercicio[];
  sesionesRealizadas: SesionRealizada[];
  seriesRealizadas: SerieRealizada[];
  pesosCorporales: PesoCorporal[];
  ajustes: Ajuste[];
}

export interface CopiaSeguridad {
  formato: string;
  version: number;
  exportadoEn: string;
  datos: DatosCopia;
}

/** Copia completa de la base: todas las tablas, tal cual están. */
export async function construirCopia(): Promise<CopiaSeguridad> {
  const [
    bloques,
    sesiones,
    ejercicios,
    sesionesRealizadas,
    seriesRealizadas,
    pesosCorporales,
    ajustes,
  ] = await Promise.all([
    db.bloques.toArray(),
    db.sesiones.toArray(),
    db.ejercicios.toArray(),
    db.sesionesRealizadas.toArray(),
    db.seriesRealizadas.toArray(),
    db.pesosCorporales.toArray(),
    db.ajustes.toArray(),
  ]);

  return {
    formato: FORMATO_COPIA,
    version: VERSION_COPIA,
    exportadoEn: new Date().toISOString(),
    datos: {
      bloques,
      sesiones,
      ejercicios,
      sesionesRealizadas,
      seriesRealizadas,
      pesosCorporales,
      ajustes,
    },
  };
}

export function serializarCopia(copia: CopiaSeguridad): string {
  return JSON.stringify(copia, null, 2);
}

const TABLAS: (keyof DatosCopia)[] = [
  'bloques',
  'sesiones',
  'ejercicios',
  'sesionesRealizadas',
  'seriesRealizadas',
  'pesosCorporales',
  'ajustes',
];

/**
 * Valida un fichero de copia antes de tocar nada. Restaurar borra la base
 * entera, así que un fichero que no sea exactamente lo que se espera se
 * rechaza en vez de dejar los datos a medias.
 */
export function leerCopia(texto: string): CopiaSeguridad {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new Error('El fichero no es un JSON válido.');
  }

  if (typeof crudo !== 'object' || crudo === null) {
    throw new Error('El fichero no tiene el formato de una copia de entrenos.');
  }
  const copia = crudo as Partial<CopiaSeguridad>;

  if (copia.formato !== FORMATO_COPIA) {
    throw new Error('El fichero no es una copia de esta app.');
  }
  if (typeof copia.version !== 'number' || copia.version > VERSION_COPIA) {
    throw new Error(
      `La copia es de una versión más nueva (${String(copia.version)}). Actualiza la app antes de restaurarla.`,
    );
  }
  if (typeof copia.datos !== 'object' || copia.datos === null) {
    throw new Error('La copia no lleva datos.');
  }
  for (const tabla of TABLAS) {
    if (!Array.isArray(copia.datos[tabla])) {
      throw new Error(`A la copia le falta la tabla "${tabla}".`);
    }
  }

  return copia as CopiaSeguridad;
}

export interface ResumenCopia {
  exportadoEn: string | null;
  bloque: string | null;
  sesionesRealizadas: number;
  seriesRealizadas: number;
  pesosCorporales: number;
}

/** Lo que se enseña antes de confirmar una restauración. */
export function resumirCopia(copia: CopiaSeguridad): ResumenCopia {
  const bloque = copia.datos.bloques.find((b) => b.activo) ?? copia.datos.bloques[0];
  return {
    exportadoEn: copia.exportadoEn ?? null,
    bloque: bloque?.nombre ?? null,
    sesionesRealizadas: copia.datos.sesionesRealizadas.filter((s) => s.finalizada).length,
    seriesRealizadas: copia.datos.seriesRealizadas.length,
    pesosCorporales: copia.datos.pesosCorporales.length,
  };
}

/**
 * Reemplaza la base entera por la de la copia. Va en una sola transacción:
 * o entra todo o no entra nada, nunca queda un historial a medias.
 */
export async function restaurarCopia(copia: CopiaSeguridad): Promise<void> {
  await db.transaction(
    'rw',
    TABLAS.map((tabla) => db[tabla]),
    async () => {
      await Promise.all(TABLAS.map((tabla) => db[tabla].clear()));
      await db.bloques.bulkPut(copia.datos.bloques);
      await db.sesiones.bulkPut(copia.datos.sesiones);
      await db.ejercicios.bulkPut(copia.datos.ejercicios);
      await db.sesionesRealizadas.bulkPut(copia.datos.sesionesRealizadas);
      await db.seriesRealizadas.bulkPut(copia.datos.seriesRealizadas);
      await db.pesosCorporales.bulkPut(copia.datos.pesosCorporales);
      await db.ajustes.bulkPut(copia.datos.ajustes);
    },
  );
}

export interface FilaCSV {
  fecha: string;
  rotacion: number;
  sesion: string;
  ejercicio: string;
  numeroSerie: number;
  peso: number;
  reps: number;
  unidad: string;
  completada: boolean;
  motivo: string;
}

/**
 * Una fila por serie, en el orden en que se hicieron.
 *
 * Solo entran las sesiones cerradas: la que está en curso todavía puede
 * cambiar y contaría dos veces al analizar el bloque.
 */
export async function construirFilasCSV(bloqueId: string): Promise<FilaCSV[]> {
  const [sesiones, ejerciciosPorSesion, realizadas] = await Promise.all([
    obtenerSesionesDeBloque(bloqueId),
    obtenerEjerciciosPorSesion(bloqueId),
    obtenerSesionesRealizadas(bloqueId),
  ]);

  const sesionPorId = new Map(sesiones.map((s) => [s.id, s]));
  const ejercicioPorId = new Map<string, Ejercicio>();
  for (const lista of ejerciciosPorSesion.values()) {
    for (const e of lista) ejercicioPorId.set(e.id, e);
  }

  const ids = realizadas.map((r) => r.id);
  const series = await db.seriesRealizadas.where('sesionRealizadaId').anyOf(ids).toArray();
  const porSesionRealizada = new Map<string, SerieRealizada[]>(ids.map((id) => [id, []]));
  for (const s of series) porSesionRealizada.get(s.sesionRealizadaId)?.push(s);

  const filas: FilaCSV[] = [];
  for (const realizada of realizadas) {
    const sesion = sesionPorId.get(realizada.sesionId);
    const suyas = porSesionRealizada.get(realizada.id) ?? [];
    suyas.sort((a, b) => {
      const ordenA = ejercicioPorId.get(a.ejercicioId)?.orden ?? 0;
      const ordenB = ejercicioPorId.get(b.ejercicioId)?.orden ?? 0;
      return ordenA - ordenB || a.numeroSerie - b.numeroSerie;
    });

    for (const serie of suyas) {
      const ejercicio = ejercicioPorId.get(serie.ejercicioId);
      filas.push({
        fecha: realizada.fecha,
        rotacion: realizada.rotacion,
        sesion: sesion?.letra ?? realizada.sesionId,
        // Si la semilla cambió y el ejercicio ya no existe, se saca el id
        // antes que perder la fila.
        ejercicio: ejercicio?.nombre ?? serie.ejercicioId,
        numeroSerie: serie.numeroSerie,
        peso: serie.peso,
        reps: serie.reps,
        unidad: ejercicio?.unidad ?? 'kg',
        completada: serie.completada,
        motivo: serie.motivoOmision ? ETIQUETA_MOTIVO[serie.motivoOmision] : '',
      });
    }
  }
  return filas;
}

/**
 * Las siete columnas que pide la especificación, más tres que hacen falta para
 * que el análisis no mienta: `unidad` (la plancha va en segundos, no en
 * repeticiones) y `completada`/`motivo` (una serie saltada no es una serie
 * hecha con 0 kg).
 */
const COLUMNAS = [
  'fecha',
  'rotacion',
  'sesion',
  'ejercicio',
  'numeroSerie',
  'peso',
  'reps',
  'unidad',
  'completada',
  'motivo',
];

/** Separador punto y coma: con decimales españoles la coma ya está ocupada. */
const SEPARADOR = ';';

/** Marca de orden de bytes: sin ella Excel se come los acentos. */
const BOM = '\uFEFF';

function escapar(valor: string): string {
  return /[";\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/**
 * CSV listo para abrir en Excel en español: BOM para que los acentos salgan
 * bien, punto y coma como separador, coma decimal y saltos CRLF.
 */
export function generarCSV(filas: FilaCSV[]): string {
  const lineas = [COLUMNAS.join(SEPARADOR)];
  for (const f of filas) {
    lineas.push(
      [
        f.fecha,
        String(f.rotacion),
        f.sesion,
        f.ejercicio,
        String(f.numeroSerie),
        formatearDecimal(f.peso),
        formatearDecimal(f.reps),
        f.unidad,
        f.completada ? 'si' : 'no',
        f.motivo,
      ]
        .map(escapar)
        .join(SEPARADOR),
    );
  }
  return `${BOM}${lineas.join('\r\n')}\r\n`;
}

export async function exportarCSV(bloqueId: string): Promise<string> {
  return generarCSV(await construirFilasCSV(bloqueId));
}

/** "entrenos-bloque-3-2026-09-09.csv" */
export function nombreFichero(bloqueId: string, extension: string, fecha: string): string {
  return `entrenos-${bloqueId}-${fecha}.${extension}`;
}
