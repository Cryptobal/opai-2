import { Alerta } from "@opai/ds";

import type { SearchParams } from "@/lib/parametros";

import { SeccionContactosAcceso } from "@/app/(erp)/configuracion/_portal_cliente/seccion-contactos-acceso";
import { SeccionPortalCliente } from "@/app/(erp)/configuracion/_portal_cliente/seccion-portal-cliente";
import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Portal Cliente de la cuenta" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/**
 * Portal Cliente de una cuenta (CAR-88): qué ve el cliente y quién de su equipo entra. Ruta propia
 * (archivo nuevo): la pestaña en la ficha llega cuando la ficha se reordene con Personas y Tickets.
 */
export default function PortalCuenta(props: Props) {
  return (
    <PaginaCuenta {...props} tab="portal">
      {(c) => (
        <div className="space-y-6">
          {c.estado === "prospecto" ? (
            <Alerta tono="info" titulo="Prospecto con acceso limitado">
              El contacto solo ve su propuesta en el portal hasta que la cuenta pase a cliente.
            </Alerta>
          ) : null}
          {c.estado === "cliente_inactivo" ? (
            <Alerta tono="warning" titulo="Cuenta inactiva">
              Los contactos con acceso entran en modo solo historial: documentos, cotizaciones y registros pasados, sin datos
              nuevos hasta que reactives la cuenta.
            </Alerta>
          ) : null}
          <SeccionContactosAcceso
            cuentaId={c.id}
            cuentaInactiva={c.estado === "cliente_inactivo"}
            esProspecto={c.estado === "prospecto"}
          />
          <SeccionPortalCliente cuentaId={c.id} />
        </div>
      )}
    </PaginaCuenta>
  );
}
