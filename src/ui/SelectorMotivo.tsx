import { MOTIVOS } from '../logica/motivos';
import type { MotivoOmision } from '../db/types';
import { Modal } from './Modal';

interface Props {
  titulo: string;
  aviso?: string | null;
  onElegir: (motivo: MotivoOmision) => void;
  onCancelar: () => void;
}

export function SelectorMotivo({ titulo, aviso, onElegir, onCancelar }: Props) {
  return (
    <Modal titulo={titulo} aviso={aviso} onCerrar={onCancelar}>
      <div className="modal-opciones">
        {MOTIVOS.map((m) => (
          <button
            key={m.valor}
            type="button"
            className="boton boton-secundario"
            onClick={() => onElegir(m.valor)}
          >
            {m.etiqueta}
          </button>
        ))}
      </div>
    </Modal>
  );
}
