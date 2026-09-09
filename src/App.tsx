import { useEffect, useState } from 'react';
import {
  obtenerBloqueActivo,
  obtenerEjerciciosPorSesion,
  obtenerSesionesDeBloque,
} from './db/consultas';
import { fechaLarga } from './db/fechas';
import { formatearPeso, formatearRango } from './db/formato';
import { inicializarDatos } from './db/inicializar';
import type { Bloque, Ejercicio, Sesion } from './db/types';

interface Datos {
  bloque: Bloque;
  sesiones: Sesion[];
  ejerciciosPorSesion: Map<string, Ejercicio[]>;
}

/**
 * Paso 1: comprobación de que el modelo, IndexedDB y la semilla del bloque 3
 * funcionan. Esta pantalla la sustituye la de Inicio en el paso 3.
 */
export function App() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    (async () => {
      try {
        await inicializarDatos();
        const bloque = await obtenerBloqueActivo();
        if (!bloque) throw new Error('No hay ningún bloque cargado.');
        const sesiones = await obtenerSesionesDeBloque(bloque.id);
        const ejerciciosPorSesion = await obtenerEjerciciosPorSesion(bloque.id);
        if (vigente) setDatos({ bloque, sesiones, ejerciciosPorSesion });
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      vigente = false;
    };
  }, []);

  if (error) {
    return (
      <main className="app">
        <div className="tarjeta error">
          <h2>No se han podido cargar los datos</h2>
          <p className="nota">{error}</p>
        </div>
      </main>
    );
  }

  if (!datos) {
    return (
      <main className="app">
        <p className="estado">Cargando…</p>
      </main>
    );
  }

  const { bloque, sesiones, ejerciciosPorSesion } = datos;
  const totalSesiones = sesiones.length * bloque.numeroRotaciones;

  return (
    <main className="app">
      <header className="cabecera">
        <h1>{bloque.nombre}</h1>
        <p>
          {bloque.numeroRotaciones} rotaciones · {totalSesiones} sesiones · empezado el{' '}
          {fechaLarga(bloque.fechaInicio)}
        </p>
      </header>

      {sesiones.map((sesion) => (
        <section className="tarjeta" key={sesion.id}>
          <div className="sesion-titulo">
            <span className="letra">{sesion.letra}</span>
            <h2>{sesion.nombre}</h2>
          </div>
          <p className="meta">RIR objetivo {sesion.rirObjetivo}</p>

          <ul className="ejercicios">
            {(ejerciciosPorSesion.get(sesion.id) ?? []).map((ejercicio) => (
              <li key={ejercicio.id}>
                <span className="orden">{ejercicio.orden}</span>
                <span className="nombre">
                  {ejercicio.nombre}
                  {ejercicio.esCore && <span className="etiqueta etiqueta-core">core</span>}
                  {ejercicio.esNuevo && <span className="etiqueta etiqueta-nuevo">nuevo</span>}
                  {ejercicio.rangoExtendido && (
                    <span className="etiqueta etiqueta-rango">rango ext.</span>
                  )}
                  {ejercicio.notaReps && <span className="nota"> {ejercicio.notaReps}</span>}
                </span>
                <span className="objetivo">
                  {ejercicio.series} × {formatearRango(ejercicio.repsMin, ejercicio.repsMax)}
                  {ejercicio.unidad === 'segundos' ? ' s' : ''}
                  {ejercicio.tipoCarga !== 'corporal' && ejercicio.pesoInicial > 0 && (
                    <> · {formatearPeso(ejercicio.pesoInicial)}</>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {sesion.aviso && <p className="nota">⚠ {sesion.aviso}</p>}
          {sesion.notaCardio && <p className="nota">Cardio: {sesion.notaCardio}</p>}
        </section>
      ))}
    </main>
  );
}
