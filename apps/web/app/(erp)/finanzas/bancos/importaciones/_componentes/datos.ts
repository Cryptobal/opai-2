import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { CuentaBanco } from "../../_componentes/bancos-tipos";
import type { ImportacionCartola } from "./tipos";

/** Historial de importaciones de la cuenta elegida (CAR-341): una consulta de cuentas y una de cartolas. */
export async function cargarImportaciones(sp: SearchParams) {
  const p = await leerParametros(sp);
  const puede = puedeDeIdentidad(await requerirIdentidad("/finanzas/bancos/importaciones"));
  const ver = puede("finanzas:bancos.ver");
  const gestiona = puede("finanzas:bancos.gestionar");
  if (!ver) return { state: "forbidden" as const, cuentas: [], cuentaId: null, importaciones: [], gestiona: false };
  const cuentas = await ejecutarComoUsuario<{ items: CuentaBanco[] }>("erp", "finanzas.bancos.listar", {});
  const items = cuentas.ok ? cuentas.data.items : [];
  const cuentaId = p["cuenta"] && items.some((c) => c.id === p["cuenta"]) ? p["cuenta"] : (items[0]?.id ?? null);
  const lista = cuentaId
    ? await ejecutarComoUsuario<{ items: ImportacionCartola[] }>("erp", "finanzas.cartolas.listar", { cuentaId, limite: 120 })
    : null;
  return {
    state: estadoPantalla(lista ?? cuentas),
    cuentas: items,
    cuentaId,
    importaciones: lista?.ok ? lista.data.items : [],
    gestiona,
  };
}
