import { useEffect, useRef, useState } from 'react';

interface Props {
  objetivoMin: number;
  objetivoMax: number;
  /** Se llama al parar, con los segundos transcurridos. */
  onParar: (segundos: number) => void;
}

/** Cronómetro para las planchas: un toque para arrancar, otro para anotar. */
export function Cronometro({ objetivoMin, objetivoMax, onParar }: Props) {
  const [enMarcha, setEnMarcha] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const inicioRef = useRef(0);

  useEffect(() => {
    if (!enMarcha) return;
    // Se mide contra el reloj, no contando ticks: el móvil apaga los timers
    // cuando se bloquea la pantalla y el conteo se quedaría corto.
    const id = window.setInterval(() => {
      setSegundos(Math.round((Date.now() - inicioRef.current) / 1000));
    }, 200);
    return () => window.clearInterval(id);
  }, [enMarcha]);

  const arrancar = () => {
    inicioRef.current = Date.now();
    setSegundos(0);
    setEnMarcha(true);
  };

  const parar = () => {
    setEnMarcha(false);
    onParar(Math.max(1, Math.round((Date.now() - inicioRef.current) / 1000)));
    setSegundos(0);
  };

  const dentroDelObjetivo = segundos >= objetivoMin && segundos <= objetivoMax;

  if (!enMarcha) {
    return (
      <button type="button" className="boton boton-crono" onClick={arrancar}>
        Cronómetro · objetivo {objetivoMin}-{objetivoMax} s
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`boton boton-crono en-marcha${dentroDelObjetivo ? ' objetivo' : ''}`}
      onClick={parar}
    >
      <span className="crono-tiempo">{segundos} s</span>
      <span className="crono-pie">
        {segundos < objetivoMin ? `faltan ${objetivoMin - segundos} s` : 'objetivo cumplido'} · tocar
        para anotar
      </span>
    </button>
  );
}
