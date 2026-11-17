import { PaginaPortal } from "@/app/_components/pagina-portal";
import { CargaFallida } from "@/lib/carga";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { identidadActual } from "@/lib/servidor";

import { cargarAdministrador, cargarContadoresPestanas, cargarMias } from "./datos";
import { BASE, PESTANAS, type PestanaId, type PortalRendicion } from "./tipos";
import { VistaMisRendiciones } from "./vista-mis-rendiciones";

/** «Mis rendiciones»: una consulta (`rendiciones.listar`), pestañas por ruta con contador. */
export function PaginaMisRendiciones({
  portal,
  pestana,
  searchParams,
}: {
  portal: PortalRendicion;
  pestana: PestanaId;
  searchParams?: SearchParams;
}) {
  const base = BASE[portal];
  const def = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Rendiciones"
      ruta={`${base}${def.segmento}`}
      cargar={async () => {
        const i = portal === "erp" ? await identidadActual() : null;
        const puede = i ? puedeDeIdentidad(i) : () => false;
        const accesos = {
          aprobar: puede("rendiciones:aprobar"),
          pagar: puede("rendiciones:pagar"),
          reporte: puede("rendiciones:ver_todas"),
        };
        const p = searchParams ? await leerParametros(searchParams) : {};
        try {
          const [pagina, contadores] = await Promise.all([
            cargarMias(portal, p, def.estado),
            cargarContadoresPestanas(portal),
          ]);
          return { pagina, contadores, p, empresa: null, admin: null, accesos };
        } catch (e) {
          if (!(e instanceof CargaFallida) || e.code !== "FORBIDDEN") throw e;
          return {
            pagina: { rendiciones: [], siguiente: null },
            contadores: [],
            p,
            empresa: (await identidadActual())?.actual?.tenant.nombre ?? "tu empresa",
            admin: await cargarAdministrador(portal),
            accesos,
          };
        }
      }}
    >
      {(props) => <VistaMisRendiciones portal={portal} pestana={pestana} {...props} />}
    </PaginaPortal>
  );
}