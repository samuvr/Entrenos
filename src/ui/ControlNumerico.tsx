interface Props {
  etiqueta: string;
  valor: number;
  paso: number;
  min: number;
  sufijo?: string;
  onCambio: (valor: number) => void;
}

/** Peso y repeticiones se tocan solo con -/+: nunca sale el teclado. */
export function ControlNumerico({ etiqueta, valor, paso, min, sufijo, onCambio }: Props) {
  // Se redondea porque sumar 2,5 en coma flotante acaba dando 37.499999.
  const ajustar = (delta: number) => onCambio(Math.max(min, Math.round((valor + delta) * 100) / 100));

  return (
    <div className="control">
      <span className="control-etiqueta">{etiqueta}</span>
      <div className="control-fila">
        <button type="button" className="boton-paso" onClick={() => ajustar(-paso)} aria-label={`Bajar ${etiqueta}`}>
          −
        </button>
        <span className="control-valor">
          {valor.toLocaleString('es-ES')}
          {sufijo && <small>{sufijo}</small>}
        </span>
        <button type="button" className="boton-paso" onClick={() => ajustar(paso)} aria-label={`Subir ${etiqueta}`}>
          +
        </button>
      </div>
    </div>
  );
}
