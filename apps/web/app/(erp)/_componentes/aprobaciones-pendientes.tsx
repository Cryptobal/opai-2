"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

type Decision = { id: string; resumen: string };

/** «Margen · CPQ-2026-002 · Cliente» → tipo, título y detalle; sin ese formato, todo va de título. */
export function partesDeResumen(resumen: string) {
  const partes = resumen.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (partes.length < 2) return { tipo: null, titulo: resumen, detalle: null };
  const [tipo = "", titulo = "", ...resto] = partes;
  return { tipo, titulo, detalle: resto.length ? resto.join(" · ") : null };
}

/**
 * Aprobaciones pendientes de la Bandeja: encabezado con el conteo y una tarjeta por decisión
 * (tipo, código, cliente) que lleva a su detalle. Sin decisiones listadas queda solo el acceso al total.
 */
export function AprobacionesPendientes({ total, decisiones }: { total: number; decisiones: Decision[] }) {
  return (
    <section aria-labelledby="bandeja-aprobaciones" className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 id="bandeja-aprobaciones" className="t-label flex items-center gap-2">
          Aprobaciones pendientes
          <Badge tono="warning">{total}</Badge>
        </h3>
        <EnlaceBoton href="/configuracion/aprobaciones" variante="ghost">
          Ver todas
        </EnlaceBoton>
      </div>
      <ul className="flex flex-col gap-2">
        {decisiones.map((d) => {
          const { tipo, titulo, detalle } = partesDeResumen(d.resumen);
          return (
            <li key={d.id}>
              <Link
                href={`/configuracion/aprobaciones?ver=${encodeURIComponent(d.id)}`}
                className="group flex min-h-14 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 outline-none transition-[border-color,box-shadow] duration-150 hover:border-fg-subtle focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)]"
              >
                <span className="min-w-0 flex-1 space-y-1">
                  {tipo ? <Badge tono="info">{tipo}</Badge> : null}
                  <span className="t-label block truncate text-fg">{titulo}</span>
                  {detalle ? <span className="t-caption block truncate">{detalle}</span> : null}
                </span>
                <ChevronRight aria-hidden className="size-4 flex-none text-fg-muted transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
