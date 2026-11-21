import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

type Fila = { clave: string; orden: number };

export function ListaConfigMaestro<T extends Fila>({
  filas,
  puede,
  hrefEditar,
  render,
}: {
  filas: T[];
  puede: boolean;
  hrefEditar: (clave: string) => string;
  render: (fila: T) => { cuerpo: ReactNode; atenuar?: boolean };
}) {
  const ordenadas = [...filas].sort((a, b) => a.orden - b.orden);
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-surface">
      {ordenadas.map((fila) => {
        const { cuerpo, atenuar } = render(fila);
        const clase = cn(
          "flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0",
          atenuar && "text-fg-muted",
          puede && "transition-colors duration-150 hover:bg-bg",
        );
        if (!puede) {
          return (
            <li key={fila.clave} className={clase}>
              {cuerpo}
            </li>
          );
        }
        return (
          <li key={fila.clave}>
            <LinkNext
              href={hrefEditar(fila.clave)}
              className={cn(clase, "outline-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus")}
            >
              {cuerpo}
              <ChevronRight aria-hidden className="size-4 flex-none text-fg-subtle" />
            </LinkNext>
          </li>
        );
      })}
    </ul>
  );
}