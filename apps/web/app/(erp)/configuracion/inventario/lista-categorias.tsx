import { Badge } from "@opai/ds";

import { ListaConfigMaestro } from "./lista-maestro";
import type { CategoriaConfig } from "./tipos";

const ETIQUETA_COMPORTAMIENTO = { activo: "Por unidad", ropa: "Por talla" } as const;

export function ListaCategorias({ categorias, puede }: { categorias: CategoriaConfig[]; puede: boolean }) {
  return (
    <ListaConfigMaestro
      filas={categorias}
      puede={puede}
      hrefEditar={(clave) => `?tab=categorias&editar=${encodeURIComponent(clave)}`}
      render={(c) => ({
        atenuar: !c.activo,
        cuerpo: (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="t-label text-md">{c.nombre}</span>
              <span className="t-caption text-fg-muted">{ETIQUETA_COMPORTAMIENTO[c.comportamiento]}</span>
            </span>
            {!c.activo ? <Badge tono="neutro">Inactiva</Badge> : null}
          </>
        ),
      })}
    />
  );
}