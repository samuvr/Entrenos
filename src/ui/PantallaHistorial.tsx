import { useState } from 'react';
import { fechaCorta } from '../db/fechas';
import { formatearPeso } from '../db/formato';
import type { Bloque, Ejercicio } from '../db/types';
import type { DiaDelHistorial, Historial, HistorialEjercicio } from '../logica/historial';
import { ETIQUETA_MOTIVO } from '../logica/motivos';
import { resumirSeries } from '../logica/precarga';
import { progresaEnPeso } from '../logica/progresion';
import { Grafica } from './Grafica';

interface Props {
  bloque: Bloque;
  historial: Historial;
  onVolver: () => void;
}

type Vista = 'sesion' | 'ejercicio';

/** "37,5 kg", "45 s" o "12" según en qué se mida el ejercicio. */
function valorDe(ejercicio: Ejercicio, valor: number): string {
  if (progresaEnPeso(ejercicio)) return formatearPeso(valor);
  return ejercicio.unidad === 'segundos' ? `${valor} s` : String(valor);
}

/**
 * Historial del bloque (punto 5.4). Dos cortes de lo mismo: qué se hizo cada
 * día, y cómo va cada ejercicio a lo largo de las rotaciones.
 */
export function PantallaHistorial({ bloque, historial, onVolver }: Props) {
  const [vista, setVista] = useState<Vista>('sesion');
  const { adherencia } = historial;

  return (
    <main className="app">
      <header className="barra">
        <button type="button" className="boton-volver" onClick={onVolver} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>Historial</h1>
          <p className="meta">{bloque.nombre}</p>
        </div>
      </header>

      <section className="tarjeta">
        <h2>Adherencia</h2>
        <p className="meta">
          {adherencia.completadas} de {adherencia.total} sesiones
        </p>
        <div
          className="progreso-bloque"
          role="progressbar"
          aria-valuenow={adherencia.completadas}
          aria-valuemin={0}
          aria-valuemax={adherencia.total}
        >
          <span style={{ width: `${(adherencia.completadas / adherencia.total) * 100}%` }} />
        </div>
        <p className="meta">
          {/* El core se saltaba sistemáticamente el bloque pasado: por eso se
              cuenta aparte y no se esconde dentro del total de series. */}
          Core: {adherencia.coreHechas} de {adherencia.coreOportunidades} veces que tocaba
        </p>
      </section>

      <div className="pestanas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'sesion'}
          className={`pestana${vista === 'sesion' ? ' activa' : ''}`}
          onClick={() => setVista('sesion')}
        >
          Por sesión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'ejercicio'}
          className={`pestana${vista === 'ejercicio' ? ' activa' : ''}`}
          onClick={() => setVista('ejercicio')}
        >
          Por ejercicio
        </button>
      </div>

      {historial.dias.length === 0 ? (
        <p className="estado">Todavía no has terminado ninguna sesión de este bloque.</p>
      ) : vista === 'sesion' ? (
        historial.dias.map((dia) => <TarjetaDia key={dia.realizada.id} dia={dia} />)
      ) : (
        historial.ejercicios.map((suyo) => (
          <TarjetaEjercicioHistorial key={suyo.ejercicio.id} historial={suyo} />
        ))
      )}
    </main>
  );
}

function TarjetaDia({ dia }: { dia: DiaDelHistorial }) {
  const [abierto, setAbierto] = useState(false);
  const letra = dia.sesion?.letra ?? '?';

  return (
    <section className={`tarjeta ejercicio${abierto ? ' abierto' : ''}`}>
      <button type="button" className="cabecera-ejercicio" onClick={() => setAbierto(!abierto)}>
        <span className="orden">{letra}</span>
        <span className="nombre">
          {fechaCorta(dia.realizada.fecha)}
          <small className="sub">
            {dia.sesion?.nombre ?? 'Sesión desconocida'} · rotación {dia.realizada.rotacion}
            {dia.realizada.duracionMin ? ` · ${dia.realizada.duracionMin} min` : ''}
          </small>
        </span>
        <span className="progreso">
          {dia.seriesCompletadas}/{dia.seriesAnotadas}
        </span>
      </button>

      {abierto && (
        <ul className="ejercicios">
          {dia.ejercicios.map(({ ejercicio, series, saltado }) => (
            <li key={ejercicio.id}>
              <span className="nombre">{ejercicio.nombre}</span>
              <span className="objetivo">
                {saltado
                  ? `saltado · ${ETIQUETA_MOTIVO[series[0]?.motivoOmision ?? 'otro']}`
                  : resumirSeries(ejercicio, series)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TarjetaEjercicioHistorial({ historial }: { historial: HistorialEjercicio }) {
  const [abierto, setAbierto] = useState(false);
  const { ejercicio, puntos, estancado } = historial;
  const ultimo = puntos[puntos.length - 1];

  return (
    <section className={`tarjeta ejercicio${abierto ? ' abierto' : ''}`}>
      <button type="button" className="cabecera-ejercicio" onClick={() => setAbierto(!abierto)}>
        <span className="orden">{historial.sesion?.letra ?? '?'}</span>
        <span className="nombre">
          {ejercicio.nombre}
          {estancado && <span className="etiqueta etiqueta-estancado">estancado</span>}
          <small className="sub">
            {puntos.length === 0
              ? 'sin hacer todavía'
              : `${puntos.length} ${puntos.length === 1 ? 'vez' : 'veces'}`}
          </small>
        </span>
        <span className="progreso">{ultimo ? valorDe(ejercicio, ultimo.valor) : '—'}</span>
      </button>

      {abierto && (
        <>
          {puntos.length === 0 ? (
            <p className="nota">Todavía no has hecho este ejercicio en el bloque.</p>
          ) : (
            <>
              <Grafica
                puntos={puntos.map((p) => ({
                  etiqueta: `R${p.rotacion}`,
                  valor: p.valor,
                }))}
                formatear={(valor) => valorDe(ejercicio, valor)}
                descripcion={`Peso de ${ejercicio.nombre} a lo largo de las rotaciones. El detalle está en la tabla de debajo.`}
              />
              {estancado && (
                <p className="nota">
                  Tres sesiones con el mismo peso sin llegar al tope del rango.
                </p>
              )}
              <ul className="ejercicios">
                {[...puntos].reverse().map((punto) => (
                  <li key={punto.sesionRealizadaId} className="fila-fecha">
                    <span className="nombre">
                      {fechaCorta(punto.fecha)}
                      <small className="sub">rotación {punto.rotacion}</small>
                    </span>
                    <span className={`objetivo${punto.cumplio ? ' al-tope' : ''}`}>
                      {resumirSeries(ejercicio, punto.series)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
