"use client";

import { ChevronsUpDown } from "lucide-react";

import { cn } from "../cn";
import { Monograma } from "../components/avatar";
import type { Portal, Tenant } from "./types";

type Props = {
  portales: readonly Portal[];
  portalActual: string;
  tenant?: Tenant;
  /** `compacto`: monograma + portal (teléfono). `riel`: apilado (iPad). `tarjeta`: con nombre del tenant (desktop). */
  variante?: "compacto" | "riel" | "tarjeta";
  className?: string;
};

const CAJA = {
  compacto: "h-11 pr-2 pl-1",
  riel: "h-14 w-16 flex-col justify-center gap-1 rounded-md border border-border bg-surface",
  tarjeta: "h-11 border border-border bg-surface px-2.5",
} as const;

/** Selector de portal: un <select> nativo accesible sobre el botón visual del diseño. */
export function PortalSwitcher({
  portales,
  portalActual,
  tenant,
  variante = "compacto",
  className,
}: Props) {
  const actual = portales.find((p) => p.id === portalActual) ?? portales[0];
  const riel = variante === "riel";
  // Con un solo portal no hay nada que elegir: queda el monograma y el nombre, sin selector.
  const elegible = portales.length > 1;
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className={cn("pointer-events-none flex items-center gap-2 rounded-md", CAJA[variante])}
      >
        <Monograma nombre={tenant?.nombre ?? "OPAI"} />
        <span className={cn("min-w-0", riel ? "flex items-center gap-0.5" : "flex-1")}>
          <span
            className={cn(
              "block truncate font-semibold text-fg",
              riel ? "text-[11px] leading-[14px]" : "text-[15px] leading-5",
            )}
          >
            {actual?.etiqueta}
          </span>
          {variante === "tarjeta" && tenant ? (
            <span className="block truncate text-xs text-fg-muted">{tenant.nombre}</span>
          ) : null}
          {riel && elegible ? <ChevronsUpDown className="size-3 text-fg-subtle" /> : null}
        </span>
        {riel || !elegible ? null : <ChevronsUpDown className="size-4 text-fg-subtle" />}
      </div>
      {elegible ? (
        <select
          aria-label="Cambiar de portal"
          value={actual?.id ?? portalActual}
          onChange={(e) => {
            const destino = portales.find((p) => p.id === e.target.value);
            if (destino) window.location.assign(destino.href);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {portales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.etiqueta}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
