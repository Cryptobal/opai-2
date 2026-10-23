import { ActividadFicha } from "@/app/_components/maestros/actividad-ficha";
import type { SearchParams } from "@/lib/parametros";

import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Actividad de la persona" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Persona · Actividad (52): personas y agentes, con lo que cambió. */
export default function ActividadPersona(props: Props) {
  return (
    <PaginaPersona {...props} tab="actividad">
      {(p, q) => (
        <ActividadFicha
          entidad={{ tipo: "persona", id: p.id }}
          actor={q["actor"]}
          base={`/personas/${p.id}/actividad`}
        />
      )}
    </PaginaPersona>
  );
}
