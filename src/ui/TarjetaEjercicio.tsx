import { fechaCorta } from '../db/fechas';
import { formatearNumero, formatearRango } from '../db/formato';
import type { EjercicioEnCurso } from '../logica/modeloSesion';
import { ETIQUETA_MOTIVO } from '../logica/motivos';
import { resumirSeries, type Valores } from '../logica/precarga';
import { ControlNumerico } from './ControlNumerico';
import { Cronometro } from './Cronometro';

interface Props {
  estado: EjercicioEnCurso;
  expandido: boolean;
  /** Valores que el usuario está tocando ahora mismo, si ha tocado algo. */
  borrador: Valores | null;
  onExpandir: () => void;
  onCambiarBorrador: (valores: Valores) => void;
  onConfirmar: (numeroSerie: number, valores: Valores) => void;
  onNoCompletada: (numeroSerie: number, valores: Valores) => void;
  onDeshacer: (numeroSerie: number) => void;
  onSaltar: () => void;
  onReanudar: () => void;
}

export function TarjetaEjercicio({
  estado,
  expandido,
  borrador,
  onExpandir,
  onCambiarBorrador,
  onConfirmar,
  onNoCompletada,
  onDeshacer,
  onSaltar,
  onReanudar,
}: Props) {
  const { ejercicio, series, total, ultimaVez } = estado;
  const enSegundos = ejercicio.unidad === 'segundos';
  const activa = series.find((s) => !s.registrada) ?? null;
  const valores = borrador ?? activa?.precarga ?? { peso: ejercicio.pesoInicial, reps: ejercicio.repsMax };

  const objetivo = `${total} × ${formatearRango(ejercicio.repsMin, ejercicio.repsMax)}${enSegundos ? ' s' : ''}`;

  if (!expandido) {
    // El contador cuenta series completadas, no anotadas: un ejercicio con
    // series saltadas no puede lucir el mismo check que uno entero.
    const completo = estado.completadas === total;
    return (
      <section className={`tarjeta ejercicio${estado.terminado ? ' hecho' : ''}`}>
        <button type="button" className="cabecera-ejercicio" onClick={onExpandir}>
          <span className="orden">{ejercicio.orden}</span>
          <span className="nombre">
            {ejercicio.nombre}
            {ejercicio.esCore && <span className="etiqueta etiqueta-core">core</span>}
          </span>
          <span className={`progreso${estado.terminado && !completo ? ' parcial' : ''}`}>
            {estado.saltado ? 'saltado' : `${estado.completadas}/${total}`}
            {completo ? ' ✓' : ''}
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className={`tarjeta ejercicio abierto${estado.terminado ? ' hecho' : ''}`}>
      <div className="cabecera-ejercicio estatica">
        <span className="orden">{ejercicio.orden}</span>
        <span className="nombre">
          {ejercicio.nombre}
          {ejercicio.esCore && <span className="etiqueta etiqueta-core">core</span>}
          {ejercicio.esNuevo && <span className="etiqueta etiqueta-nuevo">nuevo</span>}
        </span>
        <span className="progreso">{objetivo}</span>
      </div>

      {ejercicio.notaReps && <p className="nota">{ejercicio.notaReps}</p>}
      {ejercicio.notaTecnica && <p className="nota nota-tecnica">{ejercicio.notaTecnica}</p>}

      <p className="ultima-vez">
        {ultimaVez ? (
          <>
            <strong>Última vez ({fechaCorta(ultimaVez.fecha)}):</strong>{' '}
            {resumirSeries(ejercicio, ultimaVez)}
          </>
        ) : (
          <>Primera vez con este ejercicio.</>
        )}
      </p>

      <ol className="series">
        {series.map((serie) => {
          const registrada = serie.registrada;
          if (registrada) {
            return (
              <li key={serie.numeroSerie} className={`serie registrada${registrada.completada ? '' : ' fallida'}`}>
                <span className="serie-num">{serie.numeroSerie}</span>
                <span className="serie-valor">
                  {registrada.completada ? (
                    <>
                      {!enSegundos && registrada.peso > 0 && `${formatearNumero(registrada.peso)} kg × `}
                      {registrada.reps}
                      {enSegundos ? ' s' : !enSegundos && registrada.peso === 0 ? ' reps' : ''}
                    </>
                  ) : (
                    <>No completada · {ETIQUETA_MOTIVO[registrada.motivoOmision ?? 'otro']}</>
                  )}
                </span>
                <button
                  type="button"
                  className="boton-deshacer"
                  onClick={() => onDeshacer(serie.numeroSerie)}
                  aria-label={`Deshacer serie ${serie.numeroSerie}`}
                >
                  ✕
                </button>
              </li>
            );
          }

          if (serie !== activa) {
            return (
              <li key={serie.numeroSerie} className="serie pendiente">
                <span className="serie-num">{serie.numeroSerie}</span>
                <span className="serie-valor">
                  {!enSegundos && serie.precarga.peso > 0 && `${formatearNumero(serie.precarga.peso)} kg × `}
                  {serie.precarga.reps}
                  {enSegundos ? ' s' : ''}
                </span>
              </li>
            );
          }

          return (
            <li key={serie.numeroSerie} className="serie activa">
              <div className="serie-cabecera">
                <span className="serie-num">Serie {serie.numeroSerie}</span>
              </div>
              <div className="controles">
                {!enSegundos && ejercicio.tipoCarga !== 'corporal' && (
                  <ControlNumerico
                    etiqueta="Peso"
                    valor={valores.peso}
                    paso={ejercicio.incremento}
                    min={0}
                    sufijo=" kg"
                    onCambio={(peso) => onCambiarBorrador({ ...valores, peso })}
                  />
                )}
                <ControlNumerico
                  etiqueta={enSegundos ? 'Tiempo' : 'Reps'}
                  valor={valores.reps}
                  paso={enSegundos ? 5 : 1}
                  min={0}
                  sufijo={enSegundos ? ' s' : ''}
                  onCambio={(reps) => onCambiarBorrador({ ...valores, reps })}
                />
                <button
                  type="button"
                  className="boton boton-confirmar"
                  onClick={() => onConfirmar(serie.numeroSerie, valores)}
                  aria-label={`Confirmar serie ${serie.numeroSerie}`}
                >
                  ✓
                </button>
              </div>

              {enSegundos && (
                <Cronometro
                  objetivoMin={ejercicio.repsMin}
                  objetivoMax={ejercicio.repsMax}
                  onParar={(segundos) =>
                    onConfirmar(serie.numeroSerie, { peso: valores.peso, reps: segundos })
                  }
                />
              )}

              <button
                type="button"
                className="boton boton-plano"
                onClick={() => onNoCompletada(serie.numeroSerie, valores)}
              >
                Marcar como no completada
              </button>
            </li>
          );
        })}
      </ol>

      {estado.saltado && (
        <button type="button" className="boton boton-plano" onClick={onReanudar}>
          Hacer el ejercicio de todas formas
        </button>
      )}
      {!estado.terminado && (
        <button type="button" className="boton boton-plano" onClick={onSaltar}>
          Saltar ejercicio
        </button>
      )}
    </section>
  );
}
