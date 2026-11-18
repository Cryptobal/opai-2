import { diaEnZona } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";

import { filtroInstalacion } from "../_componentes/filtro-instalacion";
import { rutaAccesos } from "../_componentes/lista-registros";
import { SegmentoAccesos } from "../_componentes/segmento-accesos";
import { cargarPrerregistros, uuid } from "./_componentes/datos";
import { ListaPrerregistros } from "./_componentes/lista-prerregistros";
import { Prerregistrar } from "./_componentes/prerregistrar";

export const metadata = { title: "Prerregistros de visitas" };

/** Prerregistros de visitas (CAR-478, diseño `Prerregistrar`): vigentes y próximos, con «Prerregistrar». */
export default function Prerregistros({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      completo
      cargar={() => cargarPrerregistros(searchParams)}
    >
      {(d) => {
        const inst = uuid(d.p["instalacion"]);
        const siguiente = d.r.ok ? d.r.data.siguiente : null;
        return (
          <>
            <SegmentoAccesos activa="prerregistros" />
            <ListaPrerregistros
              state={estadoPantalla(d.r)}
              items={d.r.ok ? d.r.data.items : []}
              {...(d.crea && d.instalaciones.length > 0
                ? {
                    accion: (
                      <Prerregistrar
                        instalaciones={d.instalaciones}
                        hoy={diaEnZona(new Date())}
                        {...(inst ? { instalacionId: inst } : {})}
                      />
                    ),
                  }
                : {})}
              filtros={<ChipsFiltro filtros={[filtroInstalacion(d.instalaciones)]} />}
              {...(siguiente
                ? {
                    paginacion: (
                      <LinkNext
                        href={rutaAccesos("/accesos/prerregistros", d.p, { cursor: siguiente })}
                        className="t-label px-4 py-3 text-accent"
                      >
                        Siguiente página
                      </LinkNext>
                    ),
                  }
                : {})}
            />
          </>
        );
      }}
    </PaginaPortal>
  );
}
