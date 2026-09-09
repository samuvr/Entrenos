import { diasEntre, fechaCorta, fechaISO } from '../db/fechas';
import type { Bloque, Sesion, SesionRealizada } from '../db/types';
import type { EstadoBloque } from '../logica/rotacion';

interface Props {
  bloque: Bloque;
  estado: EstadoBloque;
  sesiones: Sesion[];
  /** Sesión de otro día que quedó sin terminar, si la hay. */
  pendiente: SesionRealizada | undefined;
  onEmpezar: () => void;
  onElegirOtra: () => void;
  onContinuarPendiente: () => void;
  onDescartarPendiente: () => void;
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

/**
 * Pantalla de inicio: lo primero que se ve a las 6:30. Dice qué sesión toca
 * sin que haya que pensarlo y arranca con un solo toque.
 */
export function PantallaInicio({
  bloque,
  estado,
  sesiones,
  pendiente,
  onEmpezar,
  onElegirOtra,
  onContinuarPendiente,
  onDescartarPendiente,
}: Props) {
  const { siguiente } = estado;
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

      <section className="hoy">
        <p className="hoy-etiqueta">Hoy toca</p>
        <h1 className="hoy-titular">
          Sesión {siguiente.letra} — {siguiente.nombre}
        </h1>
        <p className="hoy-meta">
          Rotación {estado.rotacion} de {bloque.numeroRotaciones} · sesión {estado.numeroSesion} de{' '}
          {estado.totalSesiones} · RIR {siguiente.rirObjetivo}
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
        <p className="banner banner-aviso">
          Bloque completo: {estado.totalSesiones} de {estado.totalSesiones} sesiones. Queda exportar
          el CSV y cerrar el bloque.
        </p>
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
    </main>
  );
}
