import { Inbox } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";
import { puedeGestionarSolicitudes } from "@/lib/pestanas-modulos";

import { cargarSolicitudes, filtrosDe } from "./_componentes/datos";
import { HojaRegistrar } from "./_componentes/hojas-solicitud";
import { accionRegistrar, ListaSolicitudes } from "./_componentes/lista-solicitudes";

export const metadata = { title: "Solicitudes" };
type Props = { searchParams: SearchParams };

/** Solicitudes (Leads, BRIEF-07-leads): bandeja con canal visible; en teléfono, la lista. */
export default function Solicitudes({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Solicitudes"
      ruta="/solicitudes"
      completo
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        const [lista, gestiona] = await Promise.all([
          cargarSolicitudes(p),
          puedeGestionarSolicitudes(),
        ]);
        return { p, lista, gestiona };
      }}
      opciones={(d) => (d.gestiona ? { acciones: accionRegistrar } : {})}
    >
      {(d) => (
        <>
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de solicitudes"
            vacio={{ texto: "Elige una solicitud", icono: Inbox }}
            lista={
              <ListaSolicitudes
                state={d.lista.state}
                items={d.lista.items}
                p={d.p}
                {...(d.gestiona ? { registrar: accionRegistrar } : {})}
              />
            }
          />
          {d.gestiona ? <HojaRegistrar /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
