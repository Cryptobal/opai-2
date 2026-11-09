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
    <PaginaCuenta {...props} tab="resumen">
      {(c) => (
        <div className="space-y-6">
          <SeccionContactosAcceso cuentaId={c.id} cuentaActiva={c.estado !== "cliente_inactivo"} />
          <SeccionPortalCliente cuentaId={c.id} />
        </div>
      )}
    </PaginaCuenta>
  );
}
