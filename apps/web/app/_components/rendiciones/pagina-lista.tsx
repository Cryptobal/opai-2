import { Cabecera, Forbidden } from "@opai/ds";

import { CargaFallida } from "@/lib/carga";
import { identidadActual } from "@/lib/servidor";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { cargarAdministrador, cargarMias } from "./datos";
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
          return { todas: await cargarMias(portal), empresa: null, admin: null };
        } catch (e) {
          if (!(e instanceof CargaFallida) || e.code !== "FORBIDDEN") throw e;
          return {
            todas: [],
            empresa: (await identidadActual())?.actual?.tenant.nombre ?? "tu empresa",
            admin: await cargarAdministrador(portal),
          };
        }
      }}
    >
      {({ todas, empresa, admin }) => {
        if (empresa)
          return (
            <Forbidden
              titulo="No tienes acceso a Rendiciones"
              descripcion={
                admin
                  ? `Necesitas el permiso Rendir. Pídele acceso a ${admin}, administrador de ${empresa}.`
                  : `Necesitas el permiso Rendir. Pídele acceso al administrador de ${empresa}.`
              }
            />
          );
        const items = todas.filter((r) => r.estado === def.estado);
        const nueva = (
          <EnlaceBoton href={`${base}/nueva`} className="hidden md:inline-flex">
            Nueva rendición
          </EnlaceBoton>
        );
        // Teléfono: botón flotante abajo a la derecha, como en el diseño aprobado.
        const flotante = (
          <EnlaceBoton
            href={`${base}/nueva`}
            className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 shadow-overlay md:hidden"
          >
            Nueva rendición
          </EnlaceBoton>
        );
        return (
          <div className="flex flex-col gap-4 pb-24 md:pb-0">
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
                      descripcion: "Saca una foto de la boleta y envíala a aprobación.",
                      accion: (
                        <EnlaceBoton href={`${base}/nueva`} className="md:hidden">
                          Nueva rendición
                        </EnlaceBoton>
                      ),
                    }
                  : {
                      titulo: `No tienes rendiciones ${def.etiqueta.toLowerCase()}`,
                      descripcion: "Aquí aparecerán cuando cambien de estado.",
                    }
              }
            />
            {todas.length > 0 ? flotante : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
