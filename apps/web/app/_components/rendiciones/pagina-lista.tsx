import { Forbidden } from "@opai/ds";

import type { SearchParams } from "@/lib/parametros";
import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargaMisRendiciones } from "./carga-mis-rendiciones";
import { CuerpoMisRendiciones } from "./cuerpo-mis-rendiciones";
import { BASE, PESTANAS, type PestanaId, type PortalRendicion } from "./tipos";

/** «Mis rendiciones»: lista paginada, búsqueda y contadores por pestaña. */
export function PaginaMisRendiciones({
  portal,
  pestana,
  searchParams,
}: {
  portal: PortalRendicion;
  pestana: PestanaId;
  searchParams: SearchParams;
}) {
  const def = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0];
  const base = BASE[portal];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Rendiciones"
      ruta={`${base}${def.segmento}`}
      cargar={() => cargaMisRendiciones(portal, pestana, searchParams)}
    >
      {(d) =>
        d.empresa ? (
          <Forbidden
            titulo="No tienes acceso a Rendiciones"
            descripcion={
              d.admin
                ? `Necesitas el permiso Rendir. Pídele acceso a ${d.admin}, administrador de ${d.empresa}.`
                : `Necesitas el permiso Rendir. Pídele acceso al administrador de ${d.empresa}.`
            }
          />
        ) : (
          <CuerpoMisRendiciones
            portal={portal}
            pestana={pestana}
            pagina={d.pagina}
            accesos={d.accesos}
            rutaBase={d.base}
            segmento={d.segmento}
            p={d.p}
          />
        )
      }
    </PaginaPortal>
  );
}