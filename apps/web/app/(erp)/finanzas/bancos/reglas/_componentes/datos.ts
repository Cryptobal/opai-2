import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { CuentaBanco } from "../../_componentes/bancos-tipos";
import type { Destinos } from "../../_componentes/destinos";
import type { ReglaBanco } from "./tipos-reglas";

/** Reglas del banco (CAR-328): la lista, los destinos posibles y las cuentas para «Aplicar a lo pendiente». */
export async function cargarReglas() {
  const puede = puedeDeIdentidad(await requerirIdentidad("/finanzas/bancos/reglas"));
  const ver = puede("finanzas:bancos.ver");
  const gestiona = puede("finanzas:bancos.gestionar");
  if (!ver) return { state: "forbidden" as const, reglas: [], destinos: null, cuentas: [], gestiona: false };
  const [reglas, destinos, cuentas] = await Promise.all([
    ejecutarComoUsuario<{ items: ReglaBanco[] }>("erp", "finanzas.reglas_banco.listar", {}),
    ejecutarComoUsuario<Destinos>("erp", "finanzas.bancos.destinos", {}),
    ejecutarComoUsuario<{ items: CuentaBanco[] }>("erp", "finanzas.bancos.listar", {}),
  ]);
  return {
    state: estadoPantalla(reglas),
    reglas: reglas.ok ? reglas.data.items : [],
    destinos: destinos.ok ? destinos.data : null,
    cuentas: cuentas.ok ? cuentas.data.items.filter((c) => c.activa) : [],
    gestiona,
  };
}
