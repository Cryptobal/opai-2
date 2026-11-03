import { PanelActividad } from "@/app/_components/actividad/panel-actividad";
import { itemsDeEtapas } from "@/app/_components/actividad/sistema";
import type { SearchParams } from "@/lib/parametros";

import { PaginaNegocio } from "../../_componentes/pagina-negocio";

export const metadata = { title: "Actividad del negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Negocio · Actividad (CAR-162): notas, llamadas, reuniones y tareas mezcladas con los cambios de etapa. */
export default function ActividadDelNegocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="actividad">
      {(n, p) => (
        <PanelActividad
          ficha={{
            tipo: "negocio",
            id: n.id,
            nombre: n.titulo,
            relacionadas: [
              { tipo: "cuenta", id: n.cuentaId, nombre: n.cuentaNombre },
              ...n.contactos
                .filter((c) => c.esPrincipal)
                .map((c) => ({ tipo: "contacto" as const, id: c.contactoId, nombre: c.nombre })),
            ],
          }}
          tipo={p["tipo"]}
          base={`/negocios/${n.id}/actividad`}
          sistema={itemsDeEtapas(n.historial)}
        />
      )}
    </PaginaNegocio>
  );
}
