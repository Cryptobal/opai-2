import { Empty } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";

import { cargarListas } from "../_componentes/datos";
import { PanelListas } from "../_componentes/panel-listas";
import { filtroInstalacion } from "../_componentes/filtro-instalacion";
import { SegmentoAccesos } from "../_componentes/segmento-accesos";

export const metadata = { title: "Listas de acceso" };

/** Listas autorizada y bloqueada por instalación (CAR-475 / CAR-506 alcance en instalación). */
export default function ListasAcceso({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      completo
      cargar={() => cargarListas(searchParams)}
    >
      {(d) => {
        const inst = d.instalacionId;
        const href = (lista: string) => `/accesos/listas?instalacion=${inst ?? ""}&lista=${lista}`;
        return (
          <>
            <SegmentoAccesos activa="listas" />
            <div className="mb-3">
              <ChipsFiltro
                filtros={[
                  {
                    ...filtroInstalacion(d.instalaciones),
                    ...(inst ? { porDefecto: inst } : {}),
                  },
                ]}
              />
            </div>
            {inst && d.r ? (
              <PanelListas
                state={estadoPantalla(d.r)}
                instalacionId={inst}
                tipo={d.tipo}
                entradas={d.r.ok ? d.r.data : []}
                href={href}
                portal="erp"
              />
            ) : (
              <Empty
                titulo="Sin instalaciones a tu cargo"
                descripcion="Las listas se arman por instalación."
              />
            )}
          </>
        );
      }}
    </PaginaPortal>
  );
}