import { InputFecha } from "./input-fecha";

type RangoProps = {
  desde: string;
  hasta: string;
  onCambiar: (rango: { desde: string; hasta: string }) => void;
  etiquetaDesde?: string;
  etiquetaHasta?: string;
};

/** Rango desde–hasta; marca error si el término es anterior al inicio. */
export function InputFechaRango({ desde, hasta, onCambiar, ...e }: RangoProps) {
  const invalido = Boolean(desde && hasta && hasta < desde);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <InputFecha
          valor={desde}
          onCambiar={(v) => onCambiar({ desde: v, hasta })}
          aria-label={e.etiquetaDesde ?? "Desde"}
          className="flex-1"
        />
        <span aria-hidden className="text-fg-subtle">
          –
        </span>
        <InputFecha
          valor={hasta}
          onCambiar={(v) => onCambiar({ desde, hasta: v })}
          aria-label={e.etiquetaHasta ?? "Hasta"}
          invalido={invalido}
          className="flex-1"
        />
      </div>
      {invalido ? (
        <p className="text-xs font-medium text-danger-fg">El término es anterior al inicio</p>
      ) : null}
    </div>
  );
}
