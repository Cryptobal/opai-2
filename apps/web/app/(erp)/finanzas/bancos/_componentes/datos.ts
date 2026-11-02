import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { CuentaBanco, MovimientoBanco } from "./bancos-tipos";

export type { CuentaBanco, MovimientoBanco } from "./bancos-tipos";

export async function cargarBancos(sp: SearchParams) {
  const p = await leerParametros(sp);
  const identidad = await requerirIdentidad("/finanzas/bancos");
  const puede = puedeDeIdentidad(identidad);
  const ver = puede("finanzas:bancos.ver");
  const gestiona = puede("finanzas:bancos.gestionar");
  const cuentaId = p["cuenta"] ?? null;
  const estado = p["estado"] ?? "pendiente";
  const movId = p["mov"] ?? null;

  const cuentas = ver
    ? await ejecutarComoUsuario<{ items: CuentaBanco[] }>("erp", "finanzas.bancos.listar", {})
    : null;
  const items = cuentas?.ok ? cuentas.data.items : [];
  const activa = cuentaId ?? items[0]?.id ?? null;

  const movs =
    ver && activa
      ? await ejecutarComoUsuario<{ items: MovimientoBanco[] }>("erp", "finanzas.movimientos_bancarios.listar", {
          cuentaId: activa,
          estado,
          limite: 50,
        })
      : null;

  return {
    state: estadoPantalla(cuentas ?? { ok: false, error: { code: "FORBIDDEN" } }),
    cuentas: items,
    cuentaId: activa,
    estado,
    movimientos: movs?.ok ? movs.data.items : [],
    movId,
    gestiona,
    ver,
  };
}
