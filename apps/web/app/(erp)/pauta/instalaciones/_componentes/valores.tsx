import { cn } from "@opai/ds";

import { pct } from "../../_componentes/etiquetas";

type Tono = "bien" | "aviso" | "alerta";

/**
 * Umbrales solo para leer de un vistazo (no son metas de la empresa): cobertura bien ≥ 95 % y alerta
 * < 88 %; ausentismo bien ≤ 3 % y alerta > 8 %; atrasos bien ≤ 5 % y alerta > 10 %.
 */
const UMBRALES = {
  cobertura: { bien: 95, alerta: 88, mayorEsMejor: true },
  ausentismo: { bien: 3, alerta: 8, mayorEsMejor: false },
  atrasos: { bien: 5, alerta: 10, mayorEsMejor: false },
} as const;

export function tonoDe(campo: keyof typeof UMBRALES, v: number | null): Tono | null {
  if (v === null) return null;
  const u = UMBRALES[campo];
  if (u.mayorEsMejor) return v >= u.bien ? "bien" : v < u.alerta ? "alerta" : "aviso";
  return v <= u.bien ? "bien" : v > u.alerta ? "alerta" : "aviso";
}

const CLASE: Record<Tono, string> = {
  bien: "text-success-fg",
  aviso: "text-warning-fg",
  alerta: "text-danger-fg",
};

/** Porcentaje con el color de su estado (bien, aviso, alerta); «—» cuando no hay dato. */
export function Pct({
  campo,
  v,
  className,
}: {
  campo: keyof typeof UMBRALES;
  v: number | null;
  className?: string;
}) {
  const t = tonoDe(campo, v);
  return (
    <span className={cn("tabular-nums", t ? CLASE[t] : "text-fg-subtle", className)}>{pct(v)}</span>
  );
}
