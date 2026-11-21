import { Badge } from "@opai/ds";

import { ListaConfigMaestro } from "./lista-maestro";
import type { PrendaConfig } from "./tipos";

/** Lista de prendas del uniforme (CAR-743, patrón operaciones). */
export function ListaPrendas({ prendas, puede }: { prendas: PrendaConfig[]; puede: boolean }) {
  return (
    <ListaConfigMaestro
      filas={prendas}
      puede={puede}
      hrefEditar={(clave) => `?tab=prendas&editar=${encodeURIComponent(clave)}`}
      render={(p) => ({
        atenuar: !p.activo,
        cuerpo: (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="t-label text-md">{p.nombre}</span>
              <span className="t-caption text-fg-muted">{p.clave}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {p.enUso ? <Badge tono="info">En uso</Badge> : null}
              {!p.activo ? <Badge tono="neutro">Inactiva</Badge> : null}
            </span>
          </>
        ),
      })}
    />
  );
}