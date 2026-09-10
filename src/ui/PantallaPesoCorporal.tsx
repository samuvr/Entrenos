import { useState } from 'react';
import { fechaCorta, fechaISO } from '../db/fechas';
import { formatearNumero, formatearPeso } from '../db/formato';
import { borrarPesoCorporal, guardarRangoPesoCorporal, registrarPesoCorporal } from '../db/peso';
import type { PesoCorporal, RangoPesoCorporal } from '../db/types';
import { calcularAvisoPeso, porSemanas } from '../logica/pesoCorporal';
import { ControlNumerico } from './ControlNumerico';
import { Grafica } from './Grafica';

interface Props {
  pesos: PesoCorporal[];
  rango: RangoPesoCorporal;
  onCambio: () => Promise<void>;
  onVolver: () => void;
}

/**
 * Peso corporal (punto 5.5). Una pesada por semana y aviso solo si se sale del
 * rango tres semanas seguidas: avisar por una pesada suelta sería ruido.
 */
export function PantallaPesoCorporal({ pesos, rango, onCambio, onVolver }: Props) {
  const semanas = porSemanas(pesos, rango);
  const aviso = calcularAvisoPeso(semanas);
  const ultimo = semanas[semanas.length - 1]?.registro;

  // Se parte del último peso: de una semana a otra cambia poco, así que
  // apuntarlo son un par de toques y no hace falta teclado.
  const [peso, setPeso] = useState(ultimo?.peso ?? (rango.min + rango.max) / 2);
  const [ajustando, setAjustando] = useState(false);
  const [rangoNuevo, setRangoNuevo] = useState(rango);

  const hoy = fechaISO();
  const yaHoy = pesos.some((p) => p.fecha === hoy);

  const guardar = async () => {
    await registrarPesoCorporal(hoy, peso);
    await onCambio();
  };

  return (
    <main className="app">
      <header className="barra">
        <button type="button" className="boton-volver" onClick={onVolver} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>Peso corporal</h1>
          <p className="meta">
            Rango de control {formatearNumero(rango.min)}–{formatearPeso(rango.max)}
          </p>
        </div>
      </header>

      {aviso && (
        <p className="banner banner-aviso">
          Tres semanas seguidas por {aviso.direccion === 'arriba' ? 'encima' : 'debajo'} del rango
          ({aviso.semanas.map((s) => formatearNumero(s.registro.peso)).join(', ')} kg).
        </p>
      )}

      <section className="tarjeta">
        <h2>{yaHoy ? 'Corregir la pesada de hoy' : 'Pesada de hoy'}</h2>
        <div className="controles">
          <ControlNumerico
            etiqueta="Peso"
            valor={peso}
            paso={0.1}
            min={0}
            sufijo=" kg"
            onCambio={setPeso}
          />
        </div>
        <button type="button" className="boton boton-principal" onClick={() => void guardar()}>
          Guardar {formatearPeso(peso)}
        </button>
      </section>

      {semanas.length > 0 && (
        <section className="tarjeta">
          <h2>Evolución</h2>
          <Grafica
            puntos={semanas.map((s) => ({
              etiqueta: fechaCorta(s.registro.fecha),
              valor: s.registro.peso,
              destacado: s.fuera !== null,
            }))}
            banda={rango}
            formatear={(valor) => `${formatearNumero(Math.round(valor * 10) / 10)}`}
            descripcion={`Peso corporal por semanas, con el rango de control de ${formatearNumero(rango.min)} a ${formatearNumero(rango.max)} kg sombreado. El detalle está en la lista de debajo.`}
          />
          <ul className="ejercicios">
            {[...semanas].reverse().map((semana) => (
              <li key={semana.lunes} className="fila-fecha">
                <span className="nombre">{fechaCorta(semana.registro.fecha)}</span>
                <span className={`objetivo${semana.fuera ? ' fuera-rango' : ''}`}>
                  {formatearPeso(semana.registro.peso)}
                  {semana.fuera && ` · fuera por ${semana.fuera}`}
                </span>
                <button
                  type="button"
                  className="boton-deshacer"
                  aria-label={`Borrar la pesada del ${fechaCorta(semana.registro.fecha)}`}
                  onClick={async () => {
                    await borrarPesoCorporal(semana.registro.id);
                    await onCambio();
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta">
        <h2>Rango de control</h2>
        {ajustando ? (
          <>
            <div className="controles">
              <ControlNumerico
                etiqueta="Mínimo"
                valor={rangoNuevo.min}
                paso={0.5}
                min={0}
                sufijo=" kg"
                onCambio={(min) => setRangoNuevo({ ...rangoNuevo, min })}
              />
              <ControlNumerico
                etiqueta="Máximo"
                valor={rangoNuevo.max}
                paso={0.5}
                min={0}
                sufijo=" kg"
                onCambio={(max) => setRangoNuevo({ ...rangoNuevo, max })}
              />
            </div>
            <button
              type="button"
              className="boton boton-secundario"
              onClick={async () => {
                // Si se cruzan los extremos se guardan al derecho: es un error
                // fácil de cometer a base de toques y no merece un aviso.
                const min = Math.min(rangoNuevo.min, rangoNuevo.max);
                const max = Math.max(rangoNuevo.min, rangoNuevo.max);
                await guardarRangoPesoCorporal({ min, max });
                setAjustando(false);
                await onCambio();
              }}
            >
              Guardar rango
            </button>
            <button type="button" className="boton boton-plano" onClick={() => setAjustando(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <p className="nota">
              Solo se avisa si te sales de él tres semanas seguidas y hacia el mismo lado.
            </p>
            <button
              type="button"
              className="boton boton-plano"
              onClick={() => {
                setRangoNuevo(rango);
                setAjustando(true);
              }}
            >
              Cambiar rango
            </button>
          </>
        )}
      </section>
    </main>
  );
}
