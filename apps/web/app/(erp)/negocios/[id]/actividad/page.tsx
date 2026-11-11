import { Suspense } from "react";

import { Skeleton } from "@opai/ds";

import { HistorialCorreos } from "@/app/_components/correos/historial-correos";
import { PanelActividad } from "@/app/_components/actividad/panel-actividad";
import { itemsDeEtapas } from "@/app/_components/actividad/sistema";
import type { SearchParams } from "@/lib/parametros";

import { PaginaNegocio } from "../../_componentes/pagina-negocio";

export const metadata = { title: "Actividad del negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Negocio · Actividad (CAR-162): notas, llamadas, reuniones y tareas con los cambios de etapa, y sus correos (CAR-233). */
export default function ActividadDelNegocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="actividad">
      {(n, p) => (
        <div className="flex flex-col gap-4">
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
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <HistorialCorreos entidadTipo="negocio" entidadId={n.id} />
          </Suspense>
        </div>
      )}
    </PaginaNegocio>
  );
}
