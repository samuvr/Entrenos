import { useEffect, useState } from 'react';
import { CLAVE_PANTALLA_ENCENDIDA, guardarAjuste, leerPantallaEncendida } from '../db/ajustes';
import {
  pedirPermisoNotificaciones,
  permisoNotificaciones,
  pitar,
  prepararAudio,
  vibrar,
  type EstadoPermiso,
} from './descanso';
import { hayWakeLock } from './pantallaEncendida';

interface Props {
  onVolver: () => void;
}

const TEXTO_PERMISO: Record<EstadoPermiso, string> = {
  granted: 'Activados: con el móvil bloqueado te llega una notificación al acabar el descanso.',
  denied:
    'Bloqueados. Actívalos en los ajustes del navegador (permisos del sitio → notificaciones).',
  default: 'Sin activar. Con la app a la vista pita y vibra igual.',
  'no-disponible': 'Este navegador no tiene notificaciones.',
};

/** Ajustes del temporizador de descanso y de la pantalla. */
export function PantallaAjustes({ onVolver }: Props) {
  const [permiso, setPermiso] = useState<EstadoPermiso>(permisoNotificaciones);
  const [pantallaEncendida, setPantallaEncendida] = useState(false);

  useEffect(() => {
    void leerPantallaEncendida().then(setPantallaEncendida);
  }, []);

  const alternarPantalla = async () => {
    const nuevo = !pantallaEncendida;
    setPantallaEncendida(nuevo);
    await guardarAjuste(CLAVE_PANTALLA_ENCENDIDA, nuevo);
  };

  return (
    <main className="app">
      <header className="barra">
        <button type="button" className="boton-volver" onClick={onVolver} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>Ajustes</h1>
          <p className="meta">Temporizador de descanso y pantalla.</p>
        </div>
      </header>

      <section className="tarjeta">
        <h2>Aviso al acabar el descanso</h2>
        <p className="nota">
          Al confirmar una serie arranca la cuenta atrás. Al llegar a cero pita y vibra. Con el
          móvil bloqueado, el aviso llega como notificación: para que sea fiable en Android, instala
          la app en la pantalla de inicio.
        </p>
        <p className="meta">{TEXTO_PERMISO[permiso]}</p>
        {permiso === 'default' && (
          <button
            type="button"
            className="boton boton-principal"
            onClick={async () => setPermiso(await pedirPermisoNotificaciones())}
          >
            Activar notificaciones
          </button>
        )}
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => {
            prepararAudio();
            pitar();
            vibrar();
          }}
        >
          Probar el pitido
        </button>
      </section>

      <section className="tarjeta">
        <h2>Pantalla encendida</h2>
        <p className="nota">
          Mantiene la pantalla encendida mientras estás en una sesión, para ver la cuenta atrás sin
          desbloquear. Gasta algo más de batería.
        </p>
        {hayWakeLock() ? (
          <label className="interruptor">
            <input
              type="checkbox"
              checked={pantallaEncendida}
              onChange={() => void alternarPantalla()}
            />
            <span>Mantener encendida durante la sesión</span>
          </label>
        ) : (
          <p className="meta">Este navegador no permite mantener la pantalla encendida.</p>
        )}
      </section>
    </main>
  );
}
