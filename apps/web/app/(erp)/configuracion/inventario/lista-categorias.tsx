import { ChevronRight } from "lucide-react";

import { Badge, cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import type { CategoriaConfig } from "./tipos";

const ETIQUETA_COMPORTAMIENTO = { activo: "Por unidad", ropa: "Por talla" } as const;

export function ListaCategorias({ categorias, puede }: { categorias: CategoriaConfig[]; puede: boolean }) {
  const ordenadas = [...categorias].sort((a, b) => a.orden - b.orden);
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-surface">
      {ordenadas.map((c) => {
        const inactiva = !c.activo;
        const clase = cn(
          "flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0",
          inactiva && "text-fg-muted",
          puede && "transition-colors duration-150 hover:bg-bg",
        );
        const cuerpo = (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="t-label text-md">{c.nombre}</span>
              <span className="t-caption text-fg-muted">{ETIQUETA_COMPORTAMIENTO[c.comportamiento]}</span>
            </span>
            {inactiva ? <Badge tono="neutro">Inactiva</Badge> : null}
          </>
        );
        if (!puede)
          return (
            <li key={c.clave} className={clase}>
              {cuerpo}
            </li>
          );
        return (
          <li key={c.clave}>
            <LinkNext href={`?tab=categorias&editar=${encodeURIComponent(c.clave)}`} className={cn(clase, "outline-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus")}>
              {cuerpo}
              <ChevronRight aria-hidden className="size-4 flex-none text-fg-subtle" />
            </LinkNext>
          </li>
        );
      })}
    </ul>
  );
}