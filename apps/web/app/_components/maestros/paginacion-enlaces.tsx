import { cn, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Parametros } from "@/lib/parametros";

import { anteriores, POR_PAGINA, queryConCambios } from "./paginacion-cursor";

type Props = {
  p: Parametros;
  mostrados: number;
  siguiente: string | null;
  total?: number | null;
  /** Texto tras el número cuando no hay Anterior/Siguiente (p. ej. «instalaciones en esta página»). */
  etiquetaSinNav?: string;
};

export function PaginacionEnlaces({ p, mostrados, siguiente, total = null, etiquetaSinNav }: Props) {
  const pila = anteriores(p);
  const desde = pila.length * POR_PAGINA + (mostrados ? 1 : 0);
  const hasta = pila.length * POR_PAGINA + mostrados;
  const previo = pila.slice(0, -1);
  const ultimo = pila.at(-1);
  const anterior =
    p["cursor"] !== undefined
      ? queryConCambios(p, { cursor: ultimo && ultimo !== "0" ? ultimo : null, prev: previo.join(",") || null })
      : null;
  const proxima = siguiente
    ? queryConCambios(p, { cursor: siguiente, prev: [...pila, p["cursor"] ?? "0"].join(",") })
    : null;
  const clase = (activo: boolean) =>
    cn(estilosBoton({ variant: "secondary" }), !activo && "pointer-events-none opacity-45");
  if (!anterior && !proxima) {
    const solo =
      etiquetaSinNav != null
        ? `${mostrados} ${etiquetaSinNav}`
        : total === null
          ? `${mostrados} resultados`
          : `${mostrados} de ${total}`;
    return <span className="t-caption">{solo}</span>;
  }
  return (
    <>
      <span className="t-caption">
        {desde}–{hasta}
        {total !== null ? ` de ${total}` : ""}
      </span>
      <span className="flex gap-2">
        <LinkNext href={anterior ?? "#"} className={clase(Boolean(anterior))} aria-disabled={!anterior}>
          Anterior
        </LinkNext>
        <LinkNext href={proxima ?? "#"} className={clase(Boolean(proxima))} aria-disabled={!proxima}>
          Siguiente
        </LinkNext>
      </span>
    </>
  );
}