import { useCallback, useEffect, useState } from 'react';
import { leerPantallaEncendida } from '../db/ajustes';
import { alternarConsolidacion } from '../db/consolidacion';
import {
  borrarSerie,
  deshacerSaltoEjercicio,
  registrarSerie,
  saltarEjercicio,
  saltarSuperserie,
  terminarSesion,
} from '../db/registro';
import type { Bloque, Ejercicio, MotivoOmision, Sesion, SesionRealizada } from '../db/types';
import { cargarModeloSesion, type ModeloSesion } from '../logica/modeloSesion';
import type { Valores } from '../logica/precarga';
import {
  cancelarAviso,
  notificarDesdeLaPagina,
  pitar,
  prepararAudio,
  programarAviso,
  vibrar,
} from './descanso';
import { Modal } from './Modal';
import { usePantallaEncendida } from './pantallaEncendida';
import { SelectorMotivo } from './SelectorMotivo';
import { TarjetaEjercicio } from './TarjetaEjercicio';
import { TemporizadorDescanso } from './TemporizadorDescanso';

interface Props {
  bloque: Bloque;
  sesion: Sesion;
  sesionRealizada: SesionRealizada;
  onTerminada: () => void;
  onSalir: () => void;
}

/** Modal abierto ahora mismo, si hay alguno. */
type Peticion =
  | { tipo: 'serie-no-completada'; ejercicio: Ejercicio; numeroSerie: number; valores: Valores }
  | { tipo: 'saltar-ejercicio'; ejercicio: Ejercicio; total: number }
  | { tipo: 'terminar'; pendientes: number };

function clave(ejercicioId: string, numeroSerie: number): string {
  return `${ejercicioId}#${numeroSerie}`;
}

/**
 * Ejercicio que queda abierto después de anotar algo en `desdeId`.
 *
 * Si le quedan series, sigue abierto. Si no, el siguiente pendiente que venga
 * detrás, y solo al final se vuelve a los que quedaron atrás: si un ejercicio
 * se dejó para luego porque la máquina estaba ocupada, no puede reabrirse a
 * cada serie del que se está haciendo.
 */
function siguienteFoco(modelo: ModeloSesion, desdeId: string): string | null {
  const lista = modelo.ejercicios;
  const desde = lista.findIndex((e) => e.ejercicio.id === desdeId);
  if (desde === -1) return modelo.ejercicioActualId;

  // En superserie se alterna: tras A1 va A2, tras A2 vuelve A1, mientras a
  // alguno le queden series. Al acabar el grupo se sigue después de él.
  const grupo = lista[desde].ejercicio.superserie;
  let ultimo = desde;
  if (grupo) {
    const indices = lista
      .map((e, i) => (e.ejercicio.superserie === grupo ? i : -1))
      .filter((i) => i >= 0);
    const posicion = indices.indexOf(desde);
    const rueda = [...indices.slice(posicion + 1), ...indices.slice(0, posicion + 1)];
    const siguiente = rueda.find((i) => !lista[i].terminado);
    if (siguiente !== undefined) return lista[siguiente].ejercicio.id;
    ultimo = Math.max(...indices);
  } else if (!lista[desde].terminado) {
    return desdeId;
  }

  const ordenados = [...lista.slice(ultimo + 1), ...lista.slice(0, desde)];
  return ordenados.find((e) => !e.terminado)?.ejercicio.id ?? null;
}

/** Descanso en marcha. Se guarda para sobrevivir a una recarga de la página. */
interface Descanso {
  finEn: number;
  duracion: number;
  siguiente: string | null;
}

function claveDescanso(sesionRealizadaId: string): string {
  return `entrenos:descanso:${sesionRealizadaId}`;
}

function leerDescanso(sesionRealizadaId: string): Descanso | null {
  try {
    const crudo = localStorage.getItem(claveDescanso(sesionRealizadaId));
    return crudo ? (JSON.parse(crudo) as Descanso) : null;
  } catch {
    return null;
  }
}

function guardarDescanso(sesionRealizadaId: string, descanso: Descanso | null): void {
  try {
    if (descanso) localStorage.setItem(claveDescanso(sesionRealizadaId), JSON.stringify(descanso));
    else localStorage.removeItem(claveDescanso(sesionRealizadaId));
  } catch {
    // Sin almacenamiento el descanso funciona igual; solo no sobrevive a recargar.
  }
}

/** "Pájaros / Reverse Pec Deck · serie 2" para el ejercicio que viene. */
function textoSiguiente(modelo: ModeloSesion, ejercicioId: string | null): string | null {
  const estado = modelo.ejercicios.find((e) => e.ejercicio.id === ejercicioId);
  const serie = estado?.series.find((s) => !s.registrada);
  if (!estado || !serie) return null;
  return `${estado.ejercicio.nombre} · serie ${serie.numeroSerie}`;
}

/** Si al terminar el descanso han pasado más de estos ms, ya no se pita. */
const TOLERANCIA_PITIDO_MS = 4000;

/**
 * Pantalla de sesión en curso. Cada confirmación se guarda al momento, así que
 * cerrar el navegador a mitad no pierde nada.
 */
export function PantallaSesion({ bloque, sesion, sesionRealizada, onTerminada, onSalir }: Props) {
  const [modelo, setModelo] = useState<ModeloSesion | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Valores>>({});
  const [expandidoManual, setExpandidoManual] = useState<string | null>(null);
  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const [descanso, setDescansoEstado] = useState<Descanso | null>(() =>
    leerDescanso(sesionRealizada.id),
  );
  const [pantallaEncendida, setPantallaEncendida] = useState(false);
  usePantallaEncendida(pantallaEncendida);

  useEffect(() => {
    void leerPantallaEncendida().then(setPantallaEncendida);
  }, []);

  const setDescanso = useCallback(
    (nuevo: Descanso | null) => {
      setDescansoEstado(nuevo);
      guardarDescanso(sesionRealizada.id, nuevo);
      if (nuevo) {
        programarAviso({
          finEn: nuevo.finEn,
          titulo: 'Descanso terminado',
          cuerpo: nuevo.siguiente ? `Siguiente: ${nuevo.siguiente}` : 'A por la siguiente serie.',
        });
      } else {
        cancelarAviso();
      }
    },
    [sesionRealizada.id],
  );

  const recargar = useCallback(async () => {
    const nuevo = await cargarModeloSesion(bloque, sesion, sesionRealizada);
    setModelo(nuevo);
    return nuevo;
  }, [bloque, sesion, sesionRealizada]);

  /** Recarga y deja abierto el ejercicio que toca tras anotar en `ejercicioId`. */
  const recargarDesde = async (ejercicioId: string) => {
    const nuevo = await recargar();
    const foco = siguienteFoco(nuevo, ejercicioId);
    setExpandidoManual(foco);
    return { modelo: nuevo, foco };
  };

  useEffect(() => {
    void recargar();
  }, [recargar]);

  if (!modelo) {
    return (
      <main className="app">
        <p className="estado">Cargando sesión…</p>
      </main>
    );
  }

  const expandidoId = expandidoManual ?? modelo.ejercicioActualId;

  const olvidarBorrador = (ejercicioId: string, numeroSerie: number) =>
    setBorradores((previos) => {
      const copia = { ...previos };
      delete copia[clave(ejercicioId, numeroSerie)];
      return copia;
    });

  const confirmar = async (ejercicio: Ejercicio, numeroSerie: number, valores: Valores) => {
    // Dentro del toque: es lo que deja sonar el pitido al acabar el descanso.
    prepararAudio();
    await registrarSerie({
      sesionRealizadaId: sesionRealizada.id,
      ejercicioId: ejercicio.id,
      numeroSerie,
      peso: valores.peso,
      reps: valores.reps,
      completada: true,
    });
    olvidarBorrador(ejercicio.id, numeroSerie);
    const { modelo: nuevo, foco } = await recargarDesde(ejercicio.id);

    // Descanso con el tiempo del ejercicio que se acaba de hacer. Si ya no
    // queda nada en la sesión, no hay nada que esperar.
    const duracion = ejercicio.descansoSeg ?? 0;
    if (duracion > 0 && foco !== null) {
      setDescanso({
        finEn: Date.now() + duracion * 1000,
        duracion,
        siguiente: textoSiguiente(nuevo, foco),
      });
    } else {
      setDescanso(null);
    }
  };

  const ajustarDescanso = (segundos: number) => {
    if (!descanso) return;
    const finEn = descanso.finEn + segundos * 1000;
    if (finEn <= Date.now()) setDescanso(null);
    else setDescanso({ ...descanso, finEn, duracion: Math.max(1, descanso.duracion + segundos) });
  };

  const descansoTerminado = () => {
    if (!descanso) return;
    // Si la app estaba en segundo plano ya avisó la notificación: al volver
    // no se pita tarde.
    if (Date.now() - descanso.finEn < TOLERANCIA_PITIDO_MS && document.visibilityState === 'visible') {
      pitar();
      vibrar();
    } else {
      notificarDesdeLaPagina(
        'Descanso terminado',
        descanso.siguiente ? `Siguiente: ${descanso.siguiente}` : 'A por la siguiente serie.',
      );
    }
    setDescansoEstado(null);
    guardarDescanso(sesionRealizada.id, null);
  };

  const anotarNoCompletada = async (peticionActual: Peticion, motivo: MotivoOmision) => {
    if (peticionActual.tipo !== 'serie-no-completada') return;
    await registrarSerie({
      sesionRealizadaId: sesionRealizada.id,
      ejercicioId: peticionActual.ejercicio.id,
      numeroSerie: peticionActual.numeroSerie,
      peso: peticionActual.valores.peso,
      reps: peticionActual.valores.reps,
      completada: false,
      motivoOmision: motivo,
    });
    olvidarBorrador(peticionActual.ejercicio.id, peticionActual.numeroSerie);
    await recargarDesde(peticionActual.ejercicio.id);
  };

  const saltar = async (peticionActual: Peticion, motivo: MotivoOmision) => {
    if (peticionActual.tipo !== 'saltar-ejercicio') return;
    await saltarEjercicio(
      sesionRealizada.id,
      peticionActual.ejercicio,
      peticionActual.total,
      motivo,
    );
    await recargarDesde(peticionActual.ejercicio.id);
  };

  const saltarGrupo = async (ejercicioId: string) => {
    const estado = modelo.ejercicios.find((e) => e.ejercicio.id === ejercicioId);
    const grupo = estado?.ejercicio.superserie;
    if (!grupo) return;
    const miembros = modelo.ejercicios.filter((e) => e.ejercicio.superserie === grupo);
    await saltarSuperserie(
      sesionRealizada.id,
      miembros.map((e) => ({ ejercicio: e.ejercicio, total: e.total })),
      'tiempo',
    );
    setDescanso(null);
    const ultimo = miembros[miembros.length - 1].ejercicio.id;
    await recargarDesde(ultimo);
  };

  const terminar = async () => {
    setDescanso(null);
    await terminarSesion(sesionRealizada);
    onTerminada();
  };

  return (
    <main className={`app${descanso ? ' con-descanso' : ''}`}>
      <header className="barra">
        <button type="button" className="boton-volver" onClick={onSalir} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>
            Sesión {sesion.letra} — {sesion.nombre}
          </h1>
          <p className="meta">
            {sesion.opcional
              ? 'Sesión opcional · no cuenta para la rotación'
              : `Rotación ${modelo.rotacion} de ${modelo.numeroRotaciones}`}
            {sesion.rirObjetivo && ` · RIR ${sesion.rirObjetivo}`}
          </p>
        </div>
      </header>

      {modelo.descarga && (
        <p className="banner banner-descarga">
          SEMANA DE DESCARGA: 2 series, sin acercarte al fallo
        </p>
      )}
      {modelo.tecnica && (
        <p className="banner banner-tecnica">Sesión de técnica: no subas peso</p>
      )}
      {sesion.aviso && <p className="banner banner-aviso">{sesion.aviso}</p>}

      {modelo.ejercicios.map((estado) => (
        <TarjetaEjercicio
          key={estado.ejercicio.id}
          estado={estado}
          expandido={estado.ejercicio.id === expandidoId}
          borrador={
            borradores[clave(estado.ejercicio.id, estado.series.find((s) => !s.registrada)?.numeroSerie ?? 0)] ??
            null
          }
          onExpandir={() => setExpandidoManual(estado.ejercicio.id)}
          onCambiarBorrador={(valores) => {
            const activa = estado.series.find((s) => !s.registrada);
            if (!activa) return;
            setBorradores((previos) => ({
              ...previos,
              [clave(estado.ejercicio.id, activa.numeroSerie)]: valores,
            }));
          }}
          onConfirmar={(numeroSerie, valores) => void confirmar(estado.ejercicio, numeroSerie, valores)}
          onNoCompletada={(numeroSerie, valores) =>
            setPeticion({ tipo: 'serie-no-completada', ejercicio: estado.ejercicio, numeroSerie, valores })
          }
          onDeshacer={async (numeroSerie) => {
            await borrarSerie(sesionRealizada.id, estado.ejercicio.id, numeroSerie);
            setExpandidoManual(estado.ejercicio.id);
            await recargar();
          }}
          onSaltar={() =>
            setPeticion({ tipo: 'saltar-ejercicio', ejercicio: estado.ejercicio, total: estado.total })
          }
          onReanudar={async () => {
            await deshacerSaltoEjercicio(sesionRealizada.id, estado.ejercicio.id);
            setExpandidoManual(estado.ejercicio.id);
            await recargar();
          }}
          onSaltarSuperserie={() => void saltarGrupo(estado.ejercicio.id)}
          onConsolidar={async () => {
            await alternarConsolidacion(estado.ejercicio.id);
            setExpandidoManual(estado.ejercicio.id);
            await recargar();
          }}
        />
      ))}

      {sesion.notaCardio && <p className="nota nota-cardio">Cardio: {sesion.notaCardio}</p>}

      <button
        type="button"
        className="boton boton-principal"
        onClick={() =>
          modelo.seriesPendientes > 0
            ? setPeticion({ tipo: 'terminar', pendientes: modelo.seriesPendientes })
            : void terminar()
        }
      >
        Terminar sesión
      </button>

      {descanso && (
        <TemporizadorDescanso
          finEn={descanso.finEn}
          duracion={descanso.duracion}
          siguiente={descanso.siguiente}
          onAjustar={ajustarDescanso}
          onSaltar={() => setDescanso(null)}
          onTerminado={descansoTerminado}
        />
      )}

      {peticion?.tipo === 'serie-no-completada' && (
        <SelectorMotivo
          titulo={`Serie ${peticion.numeroSerie} no completada`}
          onElegir={(motivo) => {
            const actual = peticion;
            setPeticion(null);
            void anotarNoCompletada(actual, motivo);
          }}
          onCancelar={() => setPeticion(null)}
        />
      )}

      {peticion?.tipo === 'saltar-ejercicio' && (
        <SelectorMotivo
          titulo={`Saltar ${peticion.ejercicio.nombre}`}
          // Regla 5: los dos primeros ejercicios son los que no hay que saltarse.
          aviso={
            peticion.ejercicio.orden <= 2
              ? peticion.ejercicio.esCore
                ? 'Es el ejercicio de core, y es el que más se saltó el bloque pasado. ¿Seguro?'
                : 'Es uno de los dos ejercicios prioritarios de la sesión. ¿Seguro?'
              : null
          }
          onElegir={(motivo) => {
            const actual = peticion;
            setPeticion(null);
            void saltar(actual, motivo);
          }}
          onCancelar={() => setPeticion(null)}
        />
      )}

      {peticion?.tipo === 'terminar' && (
        <Modal
          titulo="Terminar sesión"
          aviso={`Quedan ${peticion.pendientes} series sin registrar.`}
          onCerrar={() => setPeticion(null)}
        >
          <div className="modal-opciones">
            <button type="button" className="boton boton-principal" onClick={() => void terminar()}>
              Terminar igual
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
