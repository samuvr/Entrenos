import { useCallback, useEffect, useState } from 'react';
import {
  borrarSerie,
  deshacerSaltoEjercicio,
  registrarSerie,
  saltarEjercicio,
  terminarSesion,
} from '../db/registro';
import type { Bloque, Ejercicio, MotivoOmision, Sesion, SesionRealizada } from '../db/types';
import { cargarModeloSesion, type ModeloSesion } from '../logica/modeloSesion';
import type { Valores } from '../logica/precarga';
import { Modal } from './Modal';
import { SelectorMotivo } from './SelectorMotivo';
import { TarjetaEjercicio } from './TarjetaEjercicio';

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
 * Pantalla de sesión en curso. Cada confirmación se guarda al momento, así que
 * cerrar el navegador a mitad no pierde nada.
 */
export function PantallaSesion({ bloque, sesion, sesionRealizada, onTerminada, onSalir }: Props) {
  const [modelo, setModelo] = useState<ModeloSesion | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Valores>>({});
  const [expandidoManual, setExpandidoManual] = useState<string | null>(null);
  const [peticion, setPeticion] = useState<Peticion | null>(null);

  const recargar = useCallback(async () => {
    setModelo(await cargarModeloSesion(bloque, sesion, sesionRealizada));
  }, [bloque, sesion, sesionRealizada]);

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
    await registrarSerie({
      sesionRealizadaId: sesionRealizada.id,
      ejercicioId: ejercicio.id,
      numeroSerie,
      peso: valores.peso,
      reps: valores.reps,
      completada: true,
    });
    olvidarBorrador(ejercicio.id, numeroSerie);
    // Se suelta el ejercicio fijado a mano para que el salto al siguiente
    // ejercicio sea automático en cuanto se acaba el actual.
    setExpandidoManual(null);
    await recargar();
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
    setExpandidoManual(null);
    await recargar();
  };

  const saltar = async (peticionActual: Peticion, motivo: MotivoOmision) => {
    if (peticionActual.tipo !== 'saltar-ejercicio') return;
    await saltarEjercicio(
      sesionRealizada.id,
      peticionActual.ejercicio,
      peticionActual.total,
      motivo,
    );
    setExpandidoManual(null);
    await recargar();
  };

  const terminar = async () => {
    await terminarSesion(sesionRealizada);
    onTerminada();
  };

  return (
    <main className="app">
      <header className="barra">
        <button type="button" className="boton-volver" onClick={onSalir} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>
            Sesión {sesion.letra} — {sesion.nombre}
          </h1>
          <p className="meta">
            Rotación {modelo.rotacion} de {modelo.numeroRotaciones} · RIR {sesion.rirObjetivo}
          </p>
        </div>
      </header>

      {modelo.descarga && (
        <p className="banner banner-descarga">
          SEMANA DE DESCARGA: 2 series, sin acercarte al fallo
        </p>
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
