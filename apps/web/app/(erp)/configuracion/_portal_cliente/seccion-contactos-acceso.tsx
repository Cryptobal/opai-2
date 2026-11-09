import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { ContactoAcceso } from "./contactos-acceso";
import { TarjetaContactosDiferida } from "./tarjeta-contactos-diferida";

/** «Contactos y acceso al portal» de la pestaña Portal de la cuenta; se ve con `portal_cliente:accesos.read` (CAR-218). */
export async function SeccionContactosAcceso({ cuentaId }: { cuentaId: string }) {
  const identidad = await identidadActual();
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  if (!puede("portal_cliente:accesos.read")) return null;
  const r = await ejecutarComoUsuario<ContactoAcceso[]>("erp", "portal_cliente.contactos.listar", { cuentaId });
  if (!r.ok) return <p role="alert" className="t-body-sm text-danger-fg">No pudimos cargar los contactos de la cuenta. Reintenta en un momento.</p>;
  return <TarjetaContactosDiferida cuentaId={cuentaId} contactos={r.data} puedeGestionar={puede("portal_cliente:accesos.manage")} />;
}
