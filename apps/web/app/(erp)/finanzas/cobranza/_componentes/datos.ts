import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { FichaDeudor, ResumenCobranza } from "./tipos";

export async function cargarCobranza() {
  const identidad = await requerirIdentidad("/finanzas/cobranza");
  const r = await ejecutarComoUsuario<ResumenCobranza>("erp", "finanzas.cobranza.resumen", {});
  return {
    state: estadoPantalla(r),
    resumen: r.ok ? r.data : null,
    gestiona: puedeDeIdentidad(identidad)("finanzas:ventas.manage"),
  };
}

export async function cargarDeudor(cuentaId: string) {
  const identidad = await requerirIdentidad(`/finanzas/cobranza/${cuentaId}`);
  const r = await ejecutarComoUsuario<FichaDeudor>("erp", "finanzas.cobranza.deudor", { cuentaId });
  return {
    state: estadoPantalla(r),
    ficha: r.ok ? r.data : null,
    gestiona: puedeDeIdentidad(identidad)("finanzas:ventas.manage"),
  };
}
