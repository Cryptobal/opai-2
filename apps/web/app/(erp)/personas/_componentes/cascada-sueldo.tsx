import { ChevronRight, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, cn, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { fecha, pesos } from "@/lib/fechas";
import {
  type EstructuraVista,
  GRATIFICACION,
  type Nivel,
  type SueldoEfectivo,
} from "@/lib/tipos-sueldo";

const OCULTO = "••••";

/** Montos definidos por un nivel ("Base $ 600.000 · Colación $ 45.000…"); null hereda. */
function montos(e: EstructuraVista): { etiqueta: string; valor: string }[] {
  const m = (n: number | null) => (e.sensible ? OCULTO : pesos(n));
  return [
    ...(e.sensible || e.sueldoBase !== null ? [{ etiqueta: "Base", valor: m(e.sueldoBase) }] : []),
    ...(e.sensible || e.colacion !== null ? [{ etiqueta: "Colación", valor: m(e.colacion) }] : []),
    ...(e.sensible || e.movilizacion !== null
      ? [{ etiqueta: "Movilización", valor: m(e.movilizacion) }]
      : []),
    ...e.items.map((i) => ({
      etiqueta: i.nombre,
      valor: e.sensible
        ? OCULTO
        : i.monto !== null
          ? pesos(i.monto)
          : `${(i.porcentaje ?? 0) / 10_000} %`,
    })),
    ...(e.sensible || e.gratificacion
      ? [
          {
            etiqueta: "Gratificación",
            valor: e.sensible ? OCULTO : (GRATIFICACION[e.gratificacion ?? ""] ?? "—"),
          },
        ]
      : []),
  ];
}

type Props = {
  s: SueldoEfectivo;
  rotulos: Record<Nivel, { titulo: string; detalle: ReactNode }>;
  enlace: string;
};

/** Estructura de sueldo efectiva (13): persona → puesto → cargo; marca los niveles que aportan. */
export function CascadaSueldo({ s, rotulos, enlace }: Props) {
  const aportan = new Set(s.conceptos.map((c) => c.origen));
  const sensible = Object.values(s.niveles).some((e) => e?.sensible);
  return (
    <SeccionTarjeta
      titulo="Estructura de sueldo efectiva"
      accion={
        <EnlaceBoton href={enlace} variante="ghost">
          Cómo se arma <ChevronRight className="size-4" aria-hidden />
        </EnlaceBoton>
      }
    >
      <p className="t-caption mb-3">
        Cada concepto toma el nivel más específico que lo define: persona, luego puesto, luego
        cargo.
        {sensible ? (
          <span className="ml-1 inline-flex items-center gap-1">
            <Lock className="size-3" aria-hidden /> Montos ocultos: sueldo sensible.
          </span>
        ) : null}
      </p>
      <div className="flex flex-col gap-2.5">
        {(["persona", "puesto", "cargo"] as const).map((n) => {
          const e = s.niveles[n];
          const aplica = Boolean(e) && aportan.has(n);
          return (
            <div
              key={n}
              className={cn(
                "grid gap-2 rounded-md border border-border p-3.5 md:grid-cols-[140px_minmax(0,1fr)_auto]",
                aplica && "border-accent shadow-[0_0_0_1px_var(--ds-accent)]",
              )}
            >
              <span className="flex flex-col">
                <span className="text-base font-medium text-fg">{rotulos[n].titulo}</span>
                <span className="t-caption">{rotulos[n].detalle}</span>
              </span>
              {e ? (
                <span className="flex flex-col gap-1">
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-base text-fg-muted">
                    {montos(e).map((m) => (
                      <span key={m.etiqueta}>
                        {m.etiqueta} <strong className="font-semibold text-fg">{m.valor}</strong>
                      </span>
                    ))}
                  </span>
                  <span className="t-caption">vigente desde {fecha(e.vigenteDesde)}</span>
                </span>
              ) : (
                <span className="text-base text-fg-muted">No definida</span>
              )}
              {aplica ? (
                <Badge tono="accent" className="self-start">
                  Aplica
                </Badge>
              ) : null}
            </div>
          );
        })}
      </div>
    </SeccionTarjeta>
  );
}
