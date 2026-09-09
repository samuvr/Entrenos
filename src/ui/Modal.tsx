import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  aviso?: string | null;
  onCerrar: () => void;
  children: ReactNode;
}

export function Modal({ titulo, aviso, onCerrar, children }: Props) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {aviso && <p className="modal-aviso">{aviso}</p>}
        {children}
        <button type="button" className="boton boton-plano" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
