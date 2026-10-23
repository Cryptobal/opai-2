import { Badge } from "./badge";

export type EstadoVigencia = "vigente" | "por_vencer" | "vencido" | "sin_fecha";

type Props = {
  estado: EstadoVigencia;
  /** Días hasta el vencimiento (negativo si venció). */
  dias?: number | null;
  /** Texto corto en vez del calculado (celdas densas). */
  texto?: string;
  className?: string;
};

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

export function textoVigencia(estado: EstadoVigencia, dias?: number | null): string {
  if (estado === "sin_fecha") return "Sin vencimiento";
  if (estado === "vencido")
    return dias != null && dias < 0 ? `Venció hace ${plural(-dias, "día")}` : "Vencido";
  if (estado === "por_vencer")
    return dias != null
      ? dias === 0
        ? "Vence hoy"
        : `Vence en ${plural(dias, "día")}`
      : "Por vencer";
  return "Vigente";
}

const TONO = {
  vigente: "success",
  por_vencer: "warning",
  vencido: "danger",
  sin_fecha: "neutro",
} as const;

/** Estado de vencimiento de un documento: badge con punto (el color es estado). */
export function Vigencia({ estado, dias, texto, className }: Props) {
  return (
    <Badge tono={TONO[estado]} punto={estado !== "sin_fecha"} {...(className ? { className } : {})}>
      {texto ?? textoVigencia(estado, dias)}
    </Badge>
  );
}

/** Celda del semáforo de vencimientos: ✓ vigente, días por vencer, V vencido, F falta. */
export function CeldaVigencia({
  estado,
  dias,
}: {
  estado: EstadoVigencia | "falta";
  dias?: number | null;
}) {
  const base =
    "inline-flex size-7 items-center justify-center rounded-sm text-[11px] font-semibold t-numeric";
  if (estado === "falta")
    return (
      <span
        title="Falta"
        className={`${base} border border-dashed border-border-strong text-fg-muted`}
      >
        F
      </span>
    );
  if (estado === "vencido")
    return (
      <span
        title={textoVigencia(estado, dias)}
        className={`${base} border border-danger-fg bg-danger-muted text-danger-fg`}
      >
        V
      </span>
    );
  if (estado === "por_vencer")
    return (
      <span
        title={textoVigencia(estado, dias)}
        className={`${base} bg-warning-muted text-warning-fg`}
      >
        {dias ?? "!"}
      </span>
    );
  return (
    <span
      title={textoVigencia(estado, dias)}
      className={`${base} bg-success-muted text-success-fg`}
    >
      ✓
    </span>
  );
}
