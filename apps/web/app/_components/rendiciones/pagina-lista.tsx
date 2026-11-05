import { Cabecera, Forbidden } from "@opai/ds";

import { CargaFallida } from "@/lib/carga";
import { identidadActual } from "@/lib/servidor";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { cargarMias } from "./datos";
import { ListaRendiciones } from "./lista";
import { PestanasRendiciones } from "./pestanas";
import { BASE, PESTANAS, type PestanaId, type PortalRendicion } from "./tipos";

/** «Mis rendiciones»: una consulta (`rendiciones.listar`), pestañas por ruta con contador. */
export function PaginaMisRendiciones({
  portal,
  pestana,
}: {
  portal: PortalRendicion;
  pestana: PestanaId;
}) {
  const base = BASE[portal];
  const def = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Rendiciones"
      ruta={`${base}${def.segmento}`}
      cargar={async () => {
        try {
          return { todas: await cargarMias(portal), empresa: null };
        } catch (e) {
          if (!(e instanceof CargaFallida) || e.code !== "FORBIDDEN") throw e;
          return {
            todas: [],
            empresa: (await identidadActual())?.actual?.tenant.nombre ?? "tu empresa",
          };
        }
      }}
    >
      {({ todas, empresa }) => {
        if (empresa)
          return (
            <Forbidden
              titulo="No puedes rendir gastos"
              descripcion={`Tu rol no tiene el permiso para rendir gastos. Pídele acceso al administrador de ${empresa}.`}
            />
          );
        const items = todas.filter((r) => r.estado === def.estado);
        const nueva = (
          <EnlaceBoton href={`${base}/nueva`} className="w-full md:w-auto">
            Nueva rendición
          </EnlaceBoton>
        );
        return (
          <div className="flex flex-col gap-4">
            <Cabecera titulo="Mis rendiciones" acciones={nueva} accionesSiempre />
            <PestanasRendiciones portal={portal} activa={pestana} rendiciones={todas} />
            <ListaRendiciones
              state="ready"
              items={items}
              portal={portal}
              textos={
                todas.length === 0
                  ? {
                      titulo: "Aún no has rendido gastos",
                      descripcion:
                        "Sube la boleta o la factura de lo que pagaste y envíala a aprobación.",
                      accion: nueva,
                    }
                  : {
                      titulo: `No tienes rendiciones ${def.etiqueta.toLowerCase()}`,
                      descripcion: "Aquí aparecerán cuando cambien de estado.",
                    }
              }
            />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
