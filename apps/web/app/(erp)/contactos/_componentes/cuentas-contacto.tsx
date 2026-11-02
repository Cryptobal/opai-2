import { PERMISOS_CORE } from "@opai/domain";
import { Estado, SeccionTarjeta } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { ListaVinculosDiferida } from "./diferidas";
import type { VinculoContacto } from "./vinculos-tipos";

/** La capacidad filtra las cuentas por tenant y alcance antes de enviarlas al navegador. */
export async function CuentasContacto({ contactoId }: { contactoId: string }) {
  const [r, identidad] = await Promise.all([
    ejecutarComoUsuario<VinculoContacto[]>("erp", "core.contactos.cuentas", { contactoId }),
    identidadActual(),
  ]);
  if (!r.ok)
    return (
      <SeccionTarjeta titulo="Cuentas">
        <Estado
          state={estadoPantalla(r)}
          variante="lista"
          textos={{ error: { accion: <BotonReintentar /> } }}
        >
          {null}
        </Estado>
      </SeccionTarjeta>
    );
  const gestionar = identidad ? puedeDeIdentidad(identidad)(PERMISOS_CORE.cuentasManage) : false;
  return (
    <ListaVinculosDiferida contactoId={contactoId} vinculos={r.data} gestionar={gestionar} />
  );
}
