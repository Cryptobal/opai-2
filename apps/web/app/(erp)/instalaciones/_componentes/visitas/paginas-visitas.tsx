import { cn, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { conCambios, type Parametros } from "@/lib/parametros";

/** «Más antiguas» por cursor propio (`?vcursor=`) y vuelta a las más recientes; sin contador. */
export function PaginasVisitas({ p, siguiente }: { p: Parametros; siguiente: string | null }) {
  const clase = cn(estilosBoton({ variant: "secondary" }));
  if (!siguiente && !p["vcursor"]) return null;
  return (
    <span className="flex gap-2">
      {p["vcursor"] ? (
        <LinkNext href={conCambios(p, { vcursor: null, visita: null })} className={clase}>
          Más recientes
        </LinkNext>
      ) : null}
      {siguiente ? (
        <LinkNext href={conCambios(p, { vcursor: siguiente, visita: null })} className={clase}>
          Más antiguas
        </LinkNext>
      ) : null}
    </span>
  );
}
