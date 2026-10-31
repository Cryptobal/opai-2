import { Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";
import { puedeGestionarSolicitudes } from "@/lib/pestanas-modulos";

import { cargarSolicitud, cargarSolicitudes, filtrosDe } from "../_componentes/datos";
import { DetalleSolicitud } from "../_componentes/detalle-solicitud";
import { consultaLista, ListaSolicitudes } from "../_componentes/lista-solicitudes";

export const metadata = { title: "Solicitud" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Detalle de una solicitud dentro de la vista dividida; en teléfono, el detalle con "Atrás". */
export default function Solicitud({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Solicitudes"
      ruta="/solicitudes"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      opciones={(d) => ({
        volver: { href: `/solicitudes${consultaLista(d.p)}`, etiqueta: "Solicitudes" },
      })}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, filtrosDe(searchParams)]);
        const datos = cargarSolicitud(id);
        datos.catch(() => undefined);
        const [lista, gestiona] = await Promise.all([
          cargarSolicitudes(p),
          puedeGestionarSolicitudes(),
        ]);
        return { id, p, datos, lista, gestiona };
      }}
    >
      {({ id, p, datos, lista, gestiona }) => (
        <SplitScreen
          telefono="detalle"
          unPanelHastaLg
          etiquetaLista="Lista de solicitudes"
          lista={
            <ListaSolicitudes state={lista.state} items={lista.items} p={p} seleccionada={id} />
          }
          detalle={
            <Suspense fallback={<Loading variante="detalle" />}>
              <DetalleSolicitud datos={datos} gestiona={gestiona} />
            </Suspense>
          }
        />
      )}
    </PaginaPortal>
  );
}
