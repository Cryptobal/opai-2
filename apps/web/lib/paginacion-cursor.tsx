import { cn, estilosBoton } from "@opai/ds";
import type { ReactNode } from "react";

import { LinkNext } from "@/app/_components/link-next";
import type { Parametros } from "@/lib/parametros";

function anterioresCursor(p: Parametros) {
  return p["prev"] ? p["prev"].split(",") : [];
}

function con(p: Parametros, cambios: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "?";
}

type Props = {
  p: Parametros;
  porPagina: number;
  mostrados: number;
  siguiente: string | null;
  total: number | null;
  /** Texto cuando no hay páginas (sin total): «12 tickets». */
  etiquetaCorta?: string;
};

/** Anterior/Siguiente por cursor (`?prev=` guarda la pila de páginas). */
export function PaginacionCursor({ p, porPagina, mostrados, siguiente, total, etiquetaCorta }: Props) {
  const pila = anterioresCursor(p);
  const desde = pila.length * porPagina + (mostrados ? 1 : 0);
  const hasta = pila.length * porPagina + mostrados;
  const previo = pila.slice(0, -1);
  const ultimo = pila.at(-1);
  const anterior =
    p["cursor"] !== undefined
      ? con(p, { cursor: ultimo && ultimo !== "0" ? ultimo : null, prev: previo.join(",") || null })
      : null;
  const proxima = siguiente
    ? con(p, { cursor: siguiente, prev: [...pila, p["cursor"] ?? "0"].join(",") })
    : null;
  const clase = (activo: boolean) =>
    cn(estilosBoton({ variant: "secondary" }), !activo && "pointer-events-none opacity-45");
  let resumen: ReactNode;
  if (!anterior && !proxima) {
    resumen =
      total === null ? (
        <span className="t-caption">{etiquetaCorta ?? `${mostrados} resultados`}</span>
      ) : (
        <span className="t-caption">
          {mostrados} de {total}
        </span>
      );
    return resumen;
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