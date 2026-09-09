import { useCallback, useEffect, useState } from 'react';
import {
  obtenerBloqueActivo,
  obtenerEjerciciosPorSesion,
  obtenerSesionEnCurso,
  obtenerSesionesDeBloque,
  obtenerSesionesRealizadas,
} from './db/consultas';
import { fechaLarga } from './db/fechas';
import { formatearPeso, formatearRango } from './db/formato';
import { inicializarDatos } from './db/inicializar';
import { iniciarOReanudarSesion } from './db/registro';
import type { Bloque, Ejercicio, Sesion, SesionRealizada } from './db/types';
import { esDescarga, rotacionDeSesion, seriesObjetivo } from './logica/rotacion';
import { PantallaSesion } from './ui/PantallaSesion';

interface Datos {
  bloque: Bloque;
  sesiones: Sesion[];
  ejerciciosPorSesion: Map<string, Ejercicio[]>;
  realizadas: SesionRealizada[];
  enCurso: SesionRealizada | undefined;
}

export function App() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    await inicializarDatos();
    const bloque = await obtenerBloqueActivo();
    if (!bloque) throw new Error('No hay ningún bloque cargado.');
    const [sesiones, ejerciciosPorSesion, realizadas, enCurso] = await Promise.all([
      obtenerSesionesDeBloque(bloque.id),
      obtenerEjerciciosPorSesion(bloque.id),
      obtenerSesionesRealizadas(bloque.id),
      obtenerSesionEnCurso(bloque.id),
    ]);
    setDatos({ bloque, sesiones, ejerciciosPorSesion, realizadas, enCurso });
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [cargar]);

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

  // Al volver a abrir la app se entra directamente en la sesión a medias.
  if (datos.enCurso) {
    const sesion = datos.sesiones.find((s) => s.id === datos.enCurso?.sesionId);
    if (sesion) {
      return (
        <PantallaSesion
          bloque={datos.bloque}
          sesion={sesion}
          sesionRealizada={datos.enCurso}
          onTerminada={() => void cargar()}
          onSalir={() => void cargar()}
        />
      );
    }
  }

  return <ElegirSesion datos={datos} onEmpezada={() => void cargar()} />;
}

/**
 * Selector provisional de sesión. En el paso 3 lo sustituye la pantalla de
 * Inicio, que ya dirá sola qué sesión toca según el ciclo A→B→C→D→E.
 */
function ElegirSesion({ datos, onEmpezada }: { datos: Datos; onEmpezada: () => void }) {
  const { bloque, sesiones, ejerciciosPorSesion, realizadas } = datos;
  const hechas = realizadas.length;
  const totalSesiones = sesiones.length * bloque.numeroRotaciones;

  const empezar = async (sesion: Sesion) => {
    const rotacion = rotacionDeSesion(realizadas, sesion.id, bloque.numeroRotaciones);
    await iniciarOReanudarSesion(bloque.id, sesion.id, rotacion);
    onEmpezada();
  };

  return (
    <main className="app">
      <header className="cabecera">
        <h1>{bloque.nombre}</h1>
        <p>
          Sesión {hechas} de {totalSesiones}
          {realizadas.length > 0 && <> · última el {fechaLarga(realizadas[realizadas.length - 1].fecha)}</>}
        </p>
      </header>

      {sesiones.map((sesion) => {
        const rotacion = rotacionDeSesion(realizadas, sesion.id, bloque.numeroRotaciones);
        const descarga = esDescarga(rotacion, bloque.numeroRotaciones);
        const ejercicios = ejerciciosPorSesion.get(sesion.id) ?? [];

        return (
          <section className="tarjeta" key={sesion.id}>
            <div className="sesion-titulo">
              <span className="letra">{sesion.letra}</span>
              <h2>{sesion.nombre}</h2>
            </div>
            <p className="meta">
              Rotación {rotacion} de {bloque.numeroRotaciones} · RIR {sesion.rirObjetivo}
              {descarga && ' · descarga'}
            </p>

            <ul className="ejercicios">
              {ejercicios.map((ejercicio) => (
                <li key={ejercicio.id}>
                  <span className="orden">{ejercicio.orden}</span>
                  <span className="nombre">
                    {ejercicio.nombre}
                    {ejercicio.esCore && <span className="etiqueta etiqueta-core">core</span>}
                    {ejercicio.esNuevo && <span className="etiqueta etiqueta-nuevo">nuevo</span>}
                    {ejercicio.rangoExtendido && (
                      <span className="etiqueta etiqueta-rango">rango ext.</span>
                    )}
                  </span>
                  <span className="objetivo">
                    {seriesObjetivo(ejercicio, descarga)} ×{' '}
                    {formatearRango(ejercicio.repsMin, ejercicio.repsMax)}
                    {ejercicio.unidad === 'segundos' ? ' s' : ''}
                    {ejercicio.pesoInicial > 0 && <> · {formatearPeso(ejercicio.pesoInicial)}</>}
                  </span>
                </li>
              ))}
            </ul>

            <button type="button" className="boton boton-principal" onClick={() => void empezar(sesion)}>
              Empezar sesión {sesion.letra}
            </button>
          </section>
        );
      })}
    </main>
  );
}
