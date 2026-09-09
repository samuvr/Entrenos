import { formatearPeso, formatearRango } from '../db/formato';
import type { Bloque, Ejercicio, Sesion, SesionRealizada } from '../db/types';
import { esDescarga, rotacionDeSesion, seriesObjetivo } from '../logica/rotacion';

interface Props {
  bloque: Bloque;
  sesiones: Sesion[];
  ejerciciosPorSesion: Map<string, Ejercicio[]>;
  realizadas: SesionRealizada[];
  /** La que tocaría por orden; se marca para no perderla de vista. */
  sesionQueTocaId: string;
  onElegir: (sesion: Sesion) => void;
  onVolver: () => void;
}

/**
 * Acción secundaria: saltar a otra sesión porque la máquina está ocupada o
 * porque toca cambiar. Muestra los ejercicios de cada una para poder decidir.
 */
export function PantallaElegirSesion({
  bloque,
  sesiones,
  ejerciciosPorSesion,
  realizadas,
  sesionQueTocaId,
  onElegir,
  onVolver,
}: Props) {
  return (
    <main className="app">
      <header className="barra">
        <button type="button" className="boton-volver" onClick={onVolver} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>Elegir otra sesión</h1>
          <p className="meta">Se sigue el ciclo A→B→C→D→E desde la que hagas.</p>
        </div>
      </header>

      {sesiones.map((sesion) => {
        const rotacion = rotacionDeSesion(realizadas, sesion.id, bloque.numeroRotaciones);
        const descarga = esDescarga(rotacion, bloque.numeroRotaciones);
        const ejercicios = ejerciciosPorSesion.get(sesion.id) ?? [];
        const esLaQueToca = sesion.id === sesionQueTocaId;

        return (
          <section className={`tarjeta${esLaQueToca ? ' destacada' : ''}`} key={sesion.id}>
            <div className="sesion-titulo">
              <span className="letra">{sesion.letra}</span>
              <h2>{sesion.nombre}</h2>
            </div>
            <p className="meta">
              Rotación {rotacion} de {bloque.numeroRotaciones} · RIR {sesion.rirObjetivo}
              {descarga && ' · descarga'}
              {esLaQueToca && ' · es la que toca'}
            </p>

            <ul className="ejercicios">
              {ejercicios.map((ejercicio) => (
                <li key={ejercicio.id}>
                  <span className="orden">{ejercicio.orden}</span>
                  <span className="nombre">
                    {ejercicio.nombre}
                    {ejercicio.esCore && <span className="etiqueta etiqueta-core">core</span>}
                    {ejercicio.esNuevo && <span className="etiqueta etiqueta-nuevo">nuevo</span>}
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

            <button
              type="button"
              className={`boton ${esLaQueToca ? 'boton-principal' : 'boton-secundario'}`}
              onClick={() => onElegir(sesion)}
            >
              Empezar sesión {sesion.letra}
            </button>
          </section>
        );
      })}
    </main>
  );
}
