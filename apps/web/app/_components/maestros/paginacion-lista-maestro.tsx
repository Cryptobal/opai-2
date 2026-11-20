import { cn, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Parametros } from "@/lib/parametros";

import { anteriores, queryConCambios, tamanoPagina, type TamanoPagina } from "./paginacion-cursor";
import { SelectorTamanoPagina } from "./selector-tamano-pagina";

type Props = {
  p: Parametros;
  rutaBase: string;
  mostrados: number;
  siguiente: string | null;
  porPagina?: TamanoPagina;
};

/** Pie de lista maestro: «x–y de N», anterior/siguiente, tamaño 20/50/100; en móvil «Cargar más». */
export function PaginacionListaMaestro({ p, rutaBase, mostrados, siguiente, porPagina }: Props) {
  const tam = porPagina ?? tamanoPagina(p);
  const pila = anteriores(p).filter(Boolean);
  const desde = pila.length * tam + (mostrados ? 1 : 0);
  const hasta = pila.length * tam + mostrados;
  const previo = pila.slice(0, -1);
  const ultimo = pila.at(-1);
  const href = (cambios: Record<string, string | null>) =>
    `${rutaBase}${queryConCambios(p, cambios)}`;
  const anterior =
    p.cursor != null
      ? href({
          cursor: ultimo && ultimo !== "0" ? ultimo : null,
          prev: previo.join(",") || null,
        })
      : null;
  const proxima = siguiente
    ? href({ cursor: siguiente, prev: [...pila, p.cursor ?? "0"].join(",") })
    : null;
  const clase = (activo: boolean) =>
    cn(
      estilosBoton({ variant: "secondary" }),
      "text-sm",
      !activo && "pointer-events-none opacity-45",
    );
  const hayNavegacion = Boolean(anterior || proxima);

  if (!hayNavegacion && mostrados <= tam) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        {mostrados ? <span className="t-caption">{mostrados} en esta página</span> : null}
        <SelectorTamanoPagina actual={tam} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="t-caption">
          {desde}–{hasta}
          {proxima ? "+" : ""}
        </span>
        <div className="hidden items-center gap-2 md:flex">
          <LinkNext
            href={anterior ?? "#"}
            className={clase(Boolean(anterior))}
            aria-disabled={!anterior}
          >
            Anterior
          </LinkNext>
          <LinkNext
            href={proxima ?? "#"}
            className={clase(Boolean(proxima))}
            aria-disabled={!proxima}
          >
            Siguiente
          </LinkNext>
        </div>
        <SelectorTamanoPagina actual={tam} />
      </div>
      {proxima ? (
        <LinkNext href={proxima} className={cn(clase(true), "md:hidden")}>
          Cargar más
        </LinkNext>
      ) : null}
    </div>
  );
}
