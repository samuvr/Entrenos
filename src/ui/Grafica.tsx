export interface PuntoGrafica {
  /** Lo que va debajo, en el eje: "R3", "12 sep". Solo se pintan algunas. */
  etiqueta: string;
  valor: number;
  /** Marca el punto como fuera de lo normal (peso fuera de rango). */
  destacado?: boolean;
}

interface Props {
  puntos: PuntoGrafica[];
  /** Banda de referencia, si la hay: el rango de control del peso corporal. */
  banda?: { min: number; max: number } | null;
  formatear: (valor: number) => string;
  /** Descripción para quien no ve la gráfica. La tabla de debajo es el detalle. */
  descripcion: string;
}

/** Paso del eje: números redondos según lo que abarque la gráfica. */
function pasoDelEje(recorrido: number): number {
  if (recorrido < 4) return 0.5;
  if (recorrido < 15) return 1;
  if (recorrido < 40) return 5;
  return 10;
}

/** Los pasos de 0,5 en coma flotante acaban dando 77.49999999999999. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

const ANCHO = 320;
const ALTO = 160;
const MARGEN = { arriba: 14, derecha: 10, abajo: 22, izquierda: 38 };
const CAJA = {
  ancho: ANCHO - MARGEN.izquierda - MARGEN.derecha,
  alto: ALTO - MARGEN.arriba - MARGEN.abajo,
};

/**
 * Gráfica de línea de una sola serie, a mano y en SVG.
 *
 * Una serie quiere decir que no hace falta leyenda ni paleta: el título de la
 * tarjeta ya dice qué se está mirando. No lleva tooltip a propósito: esto se usa
 * con el dedo y el hover no existe; el detalle está en la tabla de debajo, que
 * además es lo que sirve para leerlo sin ver la gráfica.
 */
export function Grafica({ puntos, banda, formatear, descripcion }: Props) {
  if (puntos.length === 0) return null;

  const valores = puntos.map((p) => p.valor);
  const minimo = Math.min(...valores, banda?.min ?? Infinity);
  const maximo = Math.max(...valores, banda?.max ?? -Infinity);
  const paso = pasoDelEje(maximo - minimo);
  // El eje se redondea a valores enteros del paso y se deja uno de aire arriba
  // y abajo: así las etiquetas son "35 kg" y no "34,4 kg", y la línea no queda
  // pegada al borde.
  const suelo = redondear(Math.floor(minimo / paso) * paso - paso);
  const techo = redondear(Math.ceil(maximo / paso) * paso + paso);

  const x = (indice: number) =>
    MARGEN.izquierda +
    (puntos.length === 1 ? CAJA.ancho / 2 : (indice / (puntos.length - 1)) * CAJA.ancho);
  const y = (valor: number) =>
    MARGEN.arriba + CAJA.alto - ((valor - suelo) / (techo - suelo)) * CAJA.alto;

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.valor)}`).join(' ');

  // Solo la primera y la última llevan número: uno en cada punto es ruido.
  const conEtiqueta = new Set([0, puntos.length - 1]);

  return (
    <svg
      className="grafica"
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label={descripcion}
      preserveAspectRatio="xMidYMid meet"
    >
      {banda && (
        <g className="grafica-banda">
          <rect
            x={MARGEN.izquierda}
            y={y(banda.max)}
            width={CAJA.ancho}
            height={Math.max(0, y(banda.min) - y(banda.max))}
          />
          <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(banda.max)} y2={y(banda.max)} />
          <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(banda.min)} y2={y(banda.min)} />
        </g>
      )}

      <line
        className="grafica-eje"
        x1={MARGEN.izquierda}
        x2={MARGEN.izquierda}
        y1={MARGEN.arriba}
        y2={MARGEN.arriba + CAJA.alto}
      />
      <text className="grafica-escala" x={MARGEN.izquierda - 6} y={MARGEN.arriba + 4} textAnchor="end">
        {formatear(techo)}
      </text>
      <text
        className="grafica-escala"
        x={MARGEN.izquierda - 6}
        y={MARGEN.arriba + CAJA.alto + 4}
        textAnchor="end"
      >
        {formatear(suelo)}
      </text>

      <path className="grafica-linea" d={linea} />

      {puntos.map((punto, i) => (
        <g key={`${punto.etiqueta}-${i}`}>
          <circle
            className={`grafica-punto${punto.destacado ? ' fuera' : ''}`}
            cx={x(i)}
            cy={y(punto.valor)}
            r={4}
          />
          {conEtiqueta.has(i) && (
            <text
              className="grafica-valor"
              x={x(i)}
              y={y(punto.valor) - 9}
              textAnchor={i === 0 && puntos.length > 1 ? 'start' : 'end'}
            >
              {formatear(punto.valor)}
            </text>
          )}
          {conEtiqueta.has(i) && (
            <text
              className="grafica-escala"
              x={x(i)}
              y={ALTO - 6}
              textAnchor={i === 0 && puntos.length > 1 ? 'start' : 'end'}
            >
              {punto.etiqueta}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
