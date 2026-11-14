import { cn, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Parametros } from "@/lib/parametros";

/** Query string con cambios, conservando los filtros de la lista de la izquierda (null borra la clave). */
export function conVisitas(p: Parametros, cambios: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "?";
}

/** «Más antiguas» por cursor propio (`?vcursor=`) y vuelta a las más recientes; sin contador. */
export function PaginasVisitas({ p, siguiente }: { p: Parametros; siguiente: string | null }) {
  const clase = cn(estilosBoton({ variant: "secondary" }));
  if (!siguiente && !p["vcursor"]) return null;
  return (
    <span className="flex gap-2">
      {p["vcursor"] ? (
        <LinkNext href={conVisitas(p, { vcursor: null, visita: null })} className={clase}>
          Más recientes
        </LinkNext>
      ) : null}
      {siguiente ? (
        <LinkNext href={conVisitas(p, { vcursor: siguiente, visita: null })} className={clase}>
          Más antiguas
        </LinkNext>
      ) : null}
    </span>
  );
}
