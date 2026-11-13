import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { mesCorto } from "./tipos";

/** «aaaa-mm» ± n meses. */
export function mesVecino(periodo: string, delta: number): string {
  const total = Number(periodo.slice(0, 4)) * 12 + Number(periodo.slice(5, 7)) - 1 + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** `?mes=aaaa-mm` válido, o null (la capacidad usa el mes en curso). */
export function mesDeUrl(crudo: string | string[] | undefined): string | null {
  const v = Array.isArray(crudo) ? crudo[0] : crudo;
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null;
}

/**
 * Cambiar de mes en Desempeño (ADR-094, pendiente de CAR-307): enlaces ‹ › en la URL (`?mes=`), sin JavaScript
 * propio. No avanza más allá del mes en curso, que es el último con resultado.
 */
export function SelectorMes({
  periodo,
  actual,
  base,
}: {
  periodo: string;
  actual: string;
  base: string;
}) {
  const anterior = mesVecino(periodo, -1);
  const siguiente = mesVecino(periodo, 1);
  const href = (m: string) => (m === actual ? base : `${base}?mes=${m}`);
  return (
    <nav aria-label="Mes" className="flex items-center gap-1">
      <EnlaceBoton variante="ghost" href={href(anterior)} etiqueta={`Ver ${mesCorto(anterior)}`}>
        ‹
      </EnlaceBoton>
      <span className="t-label min-w-28 text-center first-letter:uppercase" aria-live="polite">
        {mesCorto(periodo)}
      </span>
      {periodo < actual ? (
        <EnlaceBoton
          variante="ghost"
          href={href(siguiente)}
          etiqueta={`Ver ${mesCorto(siguiente)}`}
        >
          ›
        </EnlaceBoton>
      ) : (
        <span aria-hidden className="inline-flex size-11 md:size-10" />
      )}
    </nav>
  );
}
