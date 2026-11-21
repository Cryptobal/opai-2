import { ChevronRight } from "lucide-react";

import { Badge, cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import type { PrendaConfig } from "./tipos";

/** Lista de prendas del uniforme (CAR-743, patrón operaciones). */
export function ListaPrendas({ prendas, puede }: { prendas: PrendaConfig[]; puede: boolean }) {
  const ordenadas = [...prendas].sort((a, b) => a.orden - b.orden);
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-surface">
      {ordenadas.map((p) => {
        const inactivo = !p.activo;
        const clase = cn(
          "flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0",
          inactivo && "text-fg-muted",
          puede && "transition-colors duration-150 hover:bg-bg",
        );
        const cuerpo = (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="t-label text-md">{p.nombre}</span>
              <span className="t-caption text-fg-muted">{p.clave}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {p.enUso ? <Badge tono="info">En uso</Badge> : null}
              {inactivo ? <Badge tono="neutro">Inactiva</Badge> : null}
            </span>
          </>
        );
        if (!puede)
          return (
            <li key={p.clave} className={clase}>
              {cuerpo}
            </li>
          );
        return (
          <li key={p.clave}>
            <LinkNext href={`?tab=prendas&editar=${encodeURIComponent(p.clave)}`} className={cn(clase, "outline-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus")}>
              {cuerpo}
              <ChevronRight aria-hidden className="size-4 flex-none text-fg-subtle" />
            </LinkNext>
          </li>
        );
      })}
    </ul>
  );
}