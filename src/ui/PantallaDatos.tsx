import { useRef, useState } from 'react';
import {
  construirCopia,
  construirFilasCSV,
  generarCSV,
  leerCopia,
  nombreFichero,
  restaurarCopia,
  resumirCopia,
  serializarCopia,
  type CopiaSeguridad,
  type ResumenCopia,
} from '../db/exportar';
import { guardarUltimaCopia } from '../db/ajustes';
import { fechaISO, fechaLarga } from '../db/fechas';
import type { Bloque } from '../db/types';
import type { EstadoCopia } from '../logica/copia';
import { Modal } from './Modal';
import { descargarCSV, descargarJSON } from './descargar';

interface Props {
  bloque: Bloque;
  /** Sesiones terminadas del bloque; queda apuntado en la copia. */
  completadas: number;
  haySesionEnCurso: boolean;
  estadoCopia: EstadoCopia;
  onCambio: () => Promise<void>;
  onVolver: () => void;
}

/**
 * Copia de seguridad y exportación.
 *
 * Es la única protección contra perder los datos: viven solo en este navegador
 * y desaparecen si se borran los datos del sitio o se cambia de móvil.
 */
export function PantallaDatos({
  bloque,
  completadas,
  haySesionEnCurso,
  estadoCopia,
  onCambio,
  onVolver,
}: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<{ copia: CopiaSeguridad; resumen: ResumenCopia } | null>(
    null,
  );
  const entradaFichero = useRef<HTMLInputElement>(null);

  const guardarJSON = async () => {
    setError(null);
    try {
      const copia = await construirCopia();
      descargarJSON(nombreFichero(bloque.id, 'json', fechaISO()), serializarCopia(copia));
      await guardarUltimaCopia({ fecha: fechaISO(), sesionesCompletadas: completadas });
      await onCambio();
      setMensaje('Copia guardada. Sácala del móvil: súbela a la nube o guárdala en el ordenador.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const exportarCSV = async () => {
    setError(null);
    try {
      const filas = await construirFilasCSV(bloque.id);
      descargarCSV(nombreFichero(bloque.id, 'csv', fechaISO()), generarCSV(filas));
      setMensaje(
        filas.length === 0
          ? 'Todavía no hay series que exportar.'
          : `CSV con ${filas.length} series. Se abre en Excel tal cual.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const elegirFichero = async (fichero: File) => {
    setMensaje(null);
    setError(null);
    try {
      const copia = leerCopia(await fichero.text());
      setPendiente({ copia, resumen: resumirCopia(copia) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const restaurar = async () => {
    if (!pendiente) return;
    try {
      await restaurarCopia(pendiente.copia);
      setPendiente(null);
      await onCambio();
      setMensaje('Datos restaurados desde la copia.');
    } catch (e) {
      setPendiente(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <main className="app">
      <header className="barra">
        <button type="button" className="boton-volver" onClick={onVolver} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>Copia de seguridad</h1>
          <p className="meta">Los entrenos viven solo en este móvil.</p>
        </div>
      </header>

      {mensaje && <p className="banner banner-ok">{mensaje}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <section className="tarjeta">
        <h2>Guardar copia (JSON)</h2>
        <p className="nota">
          Se lo lleva todo: entrenos, series y ajustes. Es lo único que devuelve los datos si
          cambias de móvil o se borran los datos del navegador.
        </p>
        <p className="meta">
          {estadoCopia.ultima
            ? `Última copia: ${fechaLarga(estadoCopia.ultima.fecha)} · ${estadoCopia.sesionesSinCopia} sesiones sin guardar desde entonces.`
            : 'Todavía no has guardado ninguna copia.'}
        </p>
        <button
          type="button"
          className="boton boton-principal"
          onClick={() => void guardarJSON()}
        >
          Guardar copia JSON
        </button>
      </section>

      <section className="tarjeta">
        <h2>Exportar a Excel (CSV)</h2>
        <p className="nota">
          Una fila por serie, para analizar el bloque al terminarlo. No sirve para restaurar: para
          eso está el JSON.
        </p>
        {haySesionEnCurso && (
          <p className="meta">La sesión que tienes a medias no entra hasta que la cierres.</p>
        )}
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => void exportarCSV()}
        >
          Exportar CSV del bloque
        </button>
      </section>

      <section className="tarjeta">
        <h2>Restaurar</h2>
        <p className="nota">
          Carga un JSON guardado antes. Reemplaza todo lo que hay ahora, así que guarda copia
          primero si tienes algo que no esté en el fichero.
        </p>
        <input
          ref={entradaFichero}
          type="file"
          accept="application/json,.json"
          className="entrada-fichero"
          onChange={(e) => {
            const fichero = e.target.files?.[0];
            // Se limpia para poder elegir el mismo fichero otra vez.
            e.target.value = '';
            if (fichero) void elegirFichero(fichero);
          }}
        />
        <button
          type="button"
          className="boton boton-plano"
          onClick={() => entradaFichero.current?.click()}
        >
          Elegir fichero JSON
        </button>
      </section>

      {pendiente && (
        <Modal
          titulo="Restaurar la copia"
          aviso="Se borra todo lo que hay ahora en el móvil y se reemplaza por lo del fichero."
          onCerrar={() => setPendiente(null)}
        >
          <ul className="ejercicios">
            <li>
              <span className="nombre">{pendiente.resumen.bloque ?? 'Sin bloque'}</span>
            </li>
            <li>
              <span className="nombre">{pendiente.resumen.sesionesRealizadas} sesiones</span>
              <span className="objetivo">{pendiente.resumen.seriesRealizadas} series</span>
            </li>
            {pendiente.resumen.exportadoEn && (
              <li>
                <span className="nombre">
                  Copia del {fechaLarga(pendiente.resumen.exportadoEn.slice(0, 10))}
                </span>
              </li>
            )}
          </ul>
          <div className="modal-opciones">
            <button
              type="button"
              className="boton boton-principal"
              onClick={() => void restaurar()}
            >
              Restaurar y reemplazar
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
