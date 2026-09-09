import { diasEntre, fechaCorta, fechaISO, fechaLarga } from '../db/fechas';
import type { Bloque, Sesion, SesionRealizada } from '../db/types';
import type { EstadoCopia } from '../logica/copia';
import type { EstadoBloque } from '../logica/rotacion';

interface Props {
  bloque: Bloque;
  estado: EstadoBloque;
  sesiones: Sesion[];
  /** Sesión de otro día que quedó sin terminar, si la hay. */
  pendiente: SesionRealizada | undefined;
  estadoCopia: EstadoCopia;
  onEmpezar: () => void;
  onElegirOtra: () => void;
  onContinuarPendiente: () => void;
  onDescartarPendiente: () => void;
  onCopias: () => void;
  onCerrarBloque: () => void;
  onReabrirBloque: () => void;
}

/** "8 sep (ayer)" — el cuándo importa más que la fecha exacta. */
function cuando(fecha: string): string {
  const dias = diasEntre(fecha, fechaISO());
  const relativo = dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`;
  return `${fechaCorta(fecha)} (${relativo})`;
}

/** Una sesión de hoy está a medias; una de otro día se quedó sin cerrar. */
function textoPendiente(fecha: string): string {
  return diasEntre(fecha, fechaISO()) === 0
    ? 'La tienes a medias.'
    : `La empezaste el ${cuando(fecha)} y no la cerraste.`;
}

/** "una rotación" / "3 rotaciones" sin copia. */
function textoCopia(estado: EstadoCopia): string {
  const rotaciones =
    estado.rotacionesSinCopia === 1 ? 'una rotación' : `${estado.rotacionesSinCopia} rotaciones`;
  return estado.ultima
    ? `Llevas ${rotaciones} sin guardar copia (la última, del ${fechaLarga(estado.ultima.fecha)}).`
    : `Llevas ${rotaciones} y ninguna copia guardada.`;
}

/**
 * Pantalla de inicio: lo primero que se ve a las 6:30. Dice qué sesión toca
 * sin que haya que pensarlo y arranca con un solo toque.
 */
export function PantallaInicio({
  bloque,
  estado,
  sesiones,
  pendiente,
  estadoCopia,
  onEmpezar,
  onElegirOtra,
  onContinuarPendiente,
  onDescartarPendiente,
  onCopias,
  onCerrarBloque,
  onReabrirBloque,
}: Props) {
  const { siguiente } = estado;
  const cerrado = !bloque.activo;
  const sesionPendiente = pendiente
    ? sesiones.find((s) => s.id === pendiente.sesionId)
    : undefined;

  return (
    <main className="app">
      <header className="cabecera">
        <p className="sobretitulo">{bloque.nombre}</p>
      </header>

      {pendiente && sesionPendiente && (
        <section className="tarjeta pendiente-otro-dia">
          <h2>Sesión {sesionPendiente.letra} sin terminar</h2>
          <p className="meta">{textoPendiente(pendiente.fecha)}</p>
          <button type="button" className="boton boton-secundario" onClick={onContinuarPendiente}>
            Continuar sesión {sesionPendiente.letra}
          </button>
          <button type="button" className="boton boton-plano" onClick={onDescartarPendiente}>
            Descartarla
          </button>
        </section>
      )}

      {cerrado ? (
        <section className="tarjeta destacada">
          <h2>Bloque cerrado</h2>
          <p className="meta">
            {bloque.fechaFin ? `Lo cerraste el ${fechaLarga(bloque.fechaFin)}. ` : ''}
            {estado.completadas} de {estado.totalSesiones} sesiones.
          </p>
          <p className="nota">
            El bloque 4 se carga editando los datos de semilla. Guarda la copia antes de tocar nada.
          </p>
          <button type="button" className="boton boton-principal" onClick={onCopias}>
            Exportar y guardar copia
          </button>
          <button type="button" className="boton boton-plano" onClick={onReabrirBloque}>
            Reabrir bloque
          </button>
        </section>
      ) : (
        <>
          <section className="hoy">
            <p className="hoy-etiqueta">Hoy toca</p>
            <h1 className="hoy-titular">
              Sesión {siguiente.letra} — {siguiente.nombre}
            </h1>
            <p className="hoy-meta">
              Rotación {estado.rotacion} de {bloque.numeroRotaciones} · sesión{' '}
              {estado.numeroSesion} de {estado.totalSesiones} · RIR {siguiente.rirObjetivo}
            </p>
            <div
              className="progreso-bloque"
              role="progressbar"
              aria-valuenow={estado.completadas}
              aria-valuemin={0}
              aria-valuemax={estado.totalSesiones}
            >
              <span style={{ width: `${(estado.completadas / estado.totalSesiones) * 100}%` }} />
            </div>
            <p className="hoy-meta">
              {estado.ultimaRealizada
                ? `Última sesión: ${cuando(estado.ultimaRealizada.fecha)}`
                : 'Todavía no has hecho ninguna sesión de este bloque.'}
            </p>
          </section>

          {estado.bloqueTerminado && (
            <section className="tarjeta destacada">
              <h2>Bloque completo</h2>
              <p className="meta">
                {estado.totalSesiones} de {estado.totalSesiones} sesiones. Exporta el CSV para
                analizarlo y cierra el bloque.
              </p>
              <button type="button" className="boton boton-principal" onClick={onCopias}>
                Exportar CSV del bloque
              </button>
              <button type="button" className="boton boton-plano" onClick={onCerrarBloque}>
                Cerrar bloque
              </button>
            </section>
          )}
          {estado.descarga && (
            <p className="banner banner-descarga">
              SEMANA DE DESCARGA: 2 series, sin acercarte al fallo
            </p>
          )}
          {siguiente.aviso && <p className="banner banner-aviso">{siguiente.aviso}</p>}

          <button type="button" className="boton boton-principal boton-empezar" onClick={onEmpezar}>
            Empezar sesión {siguiente.letra}
          </button>
          <button type="button" className="boton boton-plano" onClick={onElegirOtra}>
            Elegir otra sesión
          </button>
        </>
      )}

      {estadoCopia.toca && (
        <button type="button" className="banner banner-copia" onClick={onCopias}>
          {textoCopia(estadoCopia)} Guárdala ahora: solo están en este móvil.
        </button>
      )}

      <button type="button" className="boton boton-plano" onClick={onCopias}>
        Copia de seguridad y exportar
      </button>
    </main>
  );
}
