import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { AbrirTicket } from "./_componentes/abrir-ticket";
import { ListaTickets, type TicketCliente } from "./_componentes/lista-tickets";

export const metadata = { title: tituloPagina("cliente", "Tickets") };

type Respuesta = {
  items: TicketCliente[];
  siguiente: string | null;
  tipos: { id: string; nombre: string }[];
  instalaciones: { id: string; nombre: string }[];
};

/**
 * Tickets del Portal Cliente (CAR-519): el contacto abre tickets de sus instalaciones y sigue su estado, solo si la
 * empresa los encendió para la cuenta. El alcance (sus tickets, de instalaciones de su acceso) lo aplica el servidor.
 */
export default function Pagina({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Tickets"
      ruta="/cliente/tickets"
      volver={{ href: "/cliente", etiqueta: "Resumen" }}
      cargando="lista"
      cargar={async () => {
        const { desde } = await leerParametros(searchParams);
        const r = await ejecutarComoUsuario<Respuesta>(
          "cliente",
          "tickets.portal_tickets.listar",
          desde ? { cursor: desde } : {},
        );
        return exigirDatos(r);
      }}
    >
      {(r) => (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="t-body-sm">Pedidos y reclamos que abriste a tu empresa de seguridad.</p>
            <AbrirTicket
              instalaciones={r.instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre }))}
              tipos={r.tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))}
            />
          </div>
          <ListaTickets items={r.items} siguiente={r.siguiente} puedeAbrir={r.tipos.length > 0 && r.instalaciones.length > 0} />
        </div>
      )}
    </PaginaPortal>
  );
}
