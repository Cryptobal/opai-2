import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarInstalaciones, cargarTicket, cargarTickets, cargarTipos } from "./datos";
import { DetalleTicket } from "./detalle-ticket";
import { ListaTickets } from "./lista-tickets";
import type { TabTicket } from "./ficha-ticket";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabTicket;
  children: (ticket: { id: string }) => ReactNode;
};

/** Toda pestaña de un ticket: lista a la izquierda y ficha a la derecha (CAR-545). */
export function PaginaTicket({ params, searchParams, tab, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Tickets"
      ruta="/tickets"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, leerParametros(searchParams)]);
        const datos = cargarTicket(id);
        datos.catch(() => undefined);
        const [lista, tipos, instalaciones] = await Promise.all([
          cargarTickets(p),
          cargarTipos(),
          cargarInstalaciones(),
        ]);
        return { id, p, datos, lista, tipos: tipos.ok ? tipos.data : [], instalaciones };
      }}
    >
      {({ id, p, datos, lista, tipos, instalaciones }) => (
        <SplitScreen
          telefono="detalle"
          unPanelHastaLg
          etiquetaLista="Lista de tickets"
          lista={
            <ListaTickets
              p={p}
              lista={lista}
              tipos={tipos}
              instalaciones={instalaciones}
              seleccionada={id}
              compacta
            />
          }
          detalle={
            <Suspense fallback={<Loading variante="detalle" />}>
              <DetalleTicket datos={datos} tab={tab}>
                {(t) => children(t)}
              </DetalleTicket>
            </Suspense>
          }
        />
      )}
    </PaginaPortal>
  );
}