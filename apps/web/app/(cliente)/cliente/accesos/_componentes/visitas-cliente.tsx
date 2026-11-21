import { diaEnZona } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import type { Pagina } from "@/app/(erp)/accesos/_componentes/datos";
import type { Prerregistro } from "@/app/(erp)/accesos/prerregistros/_componentes/datos";
import { ListaPrerregistros } from "@/app/(erp)/accesos/prerregistros/_componentes/lista-prerregistros";
import { Prerregistrar } from "@/app/(erp)/accesos/prerregistros/_componentes/prerregistrar";

import type { Instalacion } from "./accesos-cliente";
import { ruta } from "./ruta";

export type Visitas = Pagina<Prerregistro>;

type Props = { instalaciones: Instalacion[]; instalacion: string | undefined; visitas: Visitas };

/** Visitas prerregistradas en las instalaciones del cliente y «Prerregistrar» (CAR-539), con las piezas del ERP. */
export function VisitasCliente({ instalaciones, instalacion, visitas }: Props) {
  return (
    <ListaPrerregistros
      state="ready"
      items={visitas.items}
      {...(instalaciones.length > 0
        ? {
            accion: (
              <Prerregistrar
                portal="cliente"
                instalaciones={instalaciones}
                hoy={diaEnZona(new Date())}
                {...(instalacion ? { instalacionId: instalacion } : {})}
              />
            ),
          }
        : {})}
      {...(visitas.siguiente
        ? {
            paginacion: (
              <LinkNext
                href={ruta({ instalacion, vista: "visitas", cursor: visitas.siguiente })}
                className="t-label px-4 py-3 text-accent"
              >
                Siguiente página
              </LinkNext>
            ),
          }
        : {})}
    />
  );
}
