import { useCallback, useEffect, useRef, useState } from 'react';
import {
  obtenerBloqueActivo,
  obtenerEjerciciosPorSesion,
  obtenerPesosCorporales,
  obtenerSesionEnCurso,
  obtenerSesionesDeBloque,
  obtenerSesionesRealizadas,
} from './db/consultas';
import { inicializarDatos } from './db/inicializar';
import { leerRangoPesoCorporal, leerUltimaCopia } from './db/ajustes';
import { cerrarBloque, reabrirBloque } from './db/bloques';
import { descartarSesion, iniciarOReanudarSesion } from './db/registro';
import type {
  Bloque,
  Ejercicio,
  PesoCorporal,
  RangoPesoCorporal,
  RegistroCopia,
  Sesion,
  SesionRealizada,
} from './db/types';
import { calcularEstadoCopia } from './logica/copia';
import { cargarHistorial, type Historial } from './logica/historial';
import { calcularEstadoBloque, rotacionDeSesion } from './logica/rotacion';
import { Modal } from './ui/Modal';
import { PantallaDatos } from './ui/PantallaDatos';
import { PantallaElegirSesion } from './ui/PantallaElegirSesion';
import { PantallaHistorial } from './ui/PantallaHistorial';
import { PantallaInicio } from './ui/PantallaInicio';
import { PantallaPesoCorporal } from './ui/PantallaPesoCorporal';
import { PantallaSesion } from './ui/PantallaSesion';

interface Datos {
  bloque: Bloque;
  sesiones: Sesion[];
  ejerciciosPorSesion: Map<string, Ejercicio[]>;
  realizadas: SesionRealizada[];
  enCurso: SesionRealizada | undefined;
  ultimaCopia: RegistroCopia | null;
  pesos: PesoCorporal[];
  rangoPeso: RangoPesoCorporal;
}

type Vista = 'inicio' | 'elegir' | 'sesion' | 'datos' | 'historial' | 'peso';

export function App() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [vista, setVista] = useState<Vista>('inicio');
  const [error, setError] = useState<string | null>(null);
  /** Sesión que el usuario quiere empezar tirando otra que está a medias. */
  const [confirmarCambio, setConfirmarCambio] = useState<Sesion | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [historial, setHistorial] = useState<Historial | null>(null);
  const yaArrancada = useRef(false);

  const cargar = useCallback(async () => {
    await inicializarDatos();
    const bloque = await obtenerBloqueActivo();
    if (!bloque) throw new Error('No hay ningún bloque cargado.');
    const [sesiones, ejerciciosPorSesion, realizadas, enCurso, ultimaCopia, pesos, rangoPeso] =
      await Promise.all([
        obtenerSesionesDeBloque(bloque.id),
        obtenerEjerciciosPorSesion(bloque.id),
        obtenerSesionesRealizadas(bloque.id),
        obtenerSesionEnCurso(bloque.id),
        leerUltimaCopia(),
        obtenerPesosCorporales(),
        leerRangoPesoCorporal(),
      ]);
    setDatos({
      bloque,
      sesiones,
      ejerciciosPorSesion,
      realizadas,
      enCurso,
      ultimaCopia,
      pesos,
      rangoPeso,
    });

    // Al abrir la app con una sesión a medias se entra directamente en ella.
    // Solo al arrancar: si luego se sale a Inicio a propósito, no rebota.
    if (!yaArrancada.current) {
      yaArrancada.current = true;
      if (enCurso) setVista('sesion');
    }
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [cargar]);

  // El historial recorre todas las series del bloque, así que se calcula solo
  // cuando se entra a verlo. Al volver a cargar los datos se recalcula, que es
  // justo lo que hace falta después de terminar una sesión.
  useEffect(() => {
    if (vista !== 'historial' || !datos) return;
    let vigente = true;
    void cargarHistorial(datos.bloque).then((cargado) => {
      if (vigente) setHistorial(cargado);
    });
    return () => {
      vigente = false;
    };
  }, [vista, datos]);

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

  const { bloque, sesiones, ejerciciosPorSesion, realizadas, enCurso, ultimaCopia } = datos;
  const { pesos, rangoPeso } = datos;
  const estado = calcularEstadoBloque(bloque, sesiones, realizadas);
  const estadoCopia = calcularEstadoCopia(estado.completadas, sesiones.length, ultimaCopia);

  const empezar = async (sesion: Sesion, descartarLaOtra = false) => {
    const rotacion = rotacionDeSesion(realizadas, sesion.id, bloque.numeroRotaciones);
    try {
      await iniciarOReanudarSesion(bloque.id, sesion.id, rotacion, descartarLaOtra);
    } catch {
      // Hay otra sesión a medias con series ya registradas: se pregunta antes
      // de tirarla, que es lo único que se puede perder en toda la app.
      setConfirmarCambio(sesion);
      return;
    }
    setConfirmarCambio(null);
    await cargar();
    setVista('sesion');
  };

  if (vista === 'sesion' && enCurso) {
    const sesion = sesiones.find((s) => s.id === enCurso.sesionId);
    if (sesion) {
      return (
        <PantallaSesion
          bloque={bloque}
          sesion={sesion}
          sesionRealizada={enCurso}
          onTerminada={async () => {
            await cargar();
            setVista('inicio');
          }}
          onSalir={() => setVista('inicio')}
        />
      );
    }
  }

  if (vista === 'datos') {
    return (
      <PantallaDatos
        bloque={bloque}
        completadas={estado.completadas}
        haySesionEnCurso={enCurso !== undefined}
        estadoCopia={estadoCopia}
        onCambio={cargar}
        onVolver={() => setVista('inicio')}
      />
    );
  }

  if (vista === 'historial') {
    return historial ? (
      <PantallaHistorial
        bloque={bloque}
        historial={historial}
        onVolver={() => setVista('inicio')}
      />
    ) : (
      <main className="app">
        <p className="estado">Cargando historial…</p>
      </main>
    );
  }

  if (vista === 'peso') {
    return (
      <PantallaPesoCorporal
        pesos={pesos}
        rango={rangoPeso}
        onCambio={cargar}
        onVolver={() => setVista('inicio')}
      />
    );
  }

  if (vista === 'elegir') {
    return (
      <>
        <PantallaElegirSesion
          bloque={bloque}
          sesiones={sesiones}
          ejerciciosPorSesion={ejerciciosPorSesion}
          realizadas={realizadas}
          sesionQueTocaId={estado.siguiente.id}
          onElegir={(sesion) => void empezar(sesion)}
          onVolver={() => setVista('inicio')}
        />
        {confirmarCambio && (
          <ConfirmarCambio
            sesion={confirmarCambio}
            onConfirmar={() => void empezar(confirmarCambio, true)}
            onCancelar={() => setConfirmarCambio(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PantallaInicio
        bloque={bloque}
        estado={estado}
        sesiones={sesiones}
        pendiente={enCurso}
        estadoCopia={estadoCopia}
        onEmpezar={() => void empezar(estado.siguiente)}
        onElegirOtra={() => setVista('elegir')}
        onCopias={() => setVista('datos')}
        onHistorial={() => setVista('historial')}
        onPesoCorporal={() => setVista('peso')}
        onCerrarBloque={() => setConfirmarCierre(true)}
        onReabrirBloque={async () => {
          await reabrirBloque(bloque.id);
          await cargar();
        }}
        onContinuarPendiente={() => setVista('sesion')}
        onDescartarPendiente={async () => {
          if (enCurso) await descartarSesion(enCurso.id);
          await cargar();
        }}
      />
      {confirmarCambio && (
        <ConfirmarCambio
          sesion={confirmarCambio}
          onConfirmar={() => void empezar(confirmarCambio, true)}
          onCancelar={() => setConfirmarCambio(null)}
        />
      )}
      {confirmarCierre && (
        <Modal
          titulo="Cerrar el bloque"
          aviso="Exporta antes el CSV y guarda la copia: es lo que vas a querer para preparar el bloque 4."
          onCerrar={() => setConfirmarCierre(false)}
        >
          <div className="modal-opciones">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => {
                setConfirmarCierre(false);
                setVista('datos');
              }}
            >
              Exportar primero
            </button>
            <button
              type="button"
              className="boton boton-principal"
              onClick={async () => {
                await cerrarBloque(bloque.id);
                setConfirmarCierre(false);
                await cargar();
              }}
            >
              Cerrar el bloque
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ConfirmarCambio({
  sesion,
  onConfirmar,
  onCancelar,
}: {
  sesion: Sesion;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal
      titulo={`Empezar la sesión ${sesion.letra}`}
      aviso="Tienes otra sesión a medias con series ya registradas. Si empiezas esta, se pierden."
      onCerrar={onCancelar}
    >
      <div className="modal-opciones">
        <button type="button" className="boton boton-principal" onClick={onConfirmar}>
          Empezar {sesion.letra} y descartar la otra
        </button>
      </div>
    </Modal>
  );
}
