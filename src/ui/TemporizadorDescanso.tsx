import { useEffect, useState } from 'react';

interface Props {
  /** Instante (ms desde epoch) en que termina el descanso. */
  finEn: number;
  /** Duración total, para la barra de progreso. */
  duracion: number;
  /** "Remo con triángulo · serie 2", o null si no queda nada. */
  siguiente: string | null;
  onAjustar: (segundos: number) => void;
  onSaltar: () => void;
  /** Se llama una vez, cuando la cuenta llega a cero. */
  onTerminado: () => void;
}

function formatear(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Cuenta atrás del descanso, fija abajo de la pantalla.
 *
 * Se calcula siempre contra la hora de fin, no contando ticks: con la pantalla
 * bloqueada o la pestaña en segundo plano los intervalos se paran o se
 * ralentizan, y al volver el tiempo tiene que ser el real.
 */
export function TemporizadorDescanso({
  finEn,
  duracion,
  siguiente,
  onAjustar,
  onSaltar,
  onTerminado,
}: Props) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const actualizar = () => setAhora(Date.now());
    const id = window.setInterval(actualizar, 250);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, []);

  const restante = Math.max(0, Math.ceil((finEn - ahora) / 1000));

  useEffect(() => {
    if (restante === 0) onTerminado();
    // Solo al llegar a cero: `onTerminado` cambia en cada render del padre.
  }, [restante === 0]);

  const fraccion = duracion > 0 ? Math.min(1, restante / duracion) : 0;

  return (
    <aside className="descanso" role="timer" aria-live="off" aria-label="Descanso">
      <div className="descanso-barra">
        <span style={{ width: `${fraccion * 100}%` }} />
      </div>
      <div className="descanso-fila">
        <div className="descanso-info">
          <span className="descanso-tiempo">{formatear(restante)}</span>
          <span className="descanso-siguiente">
            {siguiente ? `Siguiente: ${siguiente}` : 'Descanso'}
          </span>
        </div>
        <div className="descanso-botones">
          <button type="button" className="boton-descanso" onClick={() => onAjustar(-15)}>
            −15 s
          </button>
          <button type="button" className="boton-descanso" onClick={() => onAjustar(15)}>
            +15 s
          </button>
          <button type="button" className="boton-descanso saltar" onClick={onSaltar}>
            Saltar
          </button>
        </div>
      </div>
    </aside>
  );
}
