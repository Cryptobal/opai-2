import { cn, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Parametros } from "@/lib/parametros";

import { anteriores, POR_PAGINA } from "./datos";

function con(p: Parametros, cambios: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "?";
}

type Props = { p: Parametros; mostrados: number; siguiente: string | null };

/** Anterior/Siguiente por cursor (`?prev=` guarda la pila de páginas). */
export function PaginacionTickets({ p, mostrados, siguiente }: Props) {
  const pila = anteriores(p);
  const desde = pila.length * POR_PAGINA + (mostrados ? 1 : 0);
  const hasta = pila.length * POR_PAGINA + mostrados;
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
  if (!anterior && !proxima) return <span className="t-caption">{mostrados} tickets</span>;
  return (
    <>
      <span className="t-caption">
        {desde}–{hasta}
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