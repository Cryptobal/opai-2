import { estadoPantalla } from "@/lib/formato";
import { hoyIso } from "@/lib/fechas";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { RUTA_CIERRE } from "./meses";
import type { TableroCierre } from "./tipos";

export async function cargarCierre(sp: SearchParams) {
  const p = await leerParametros(sp);
  const identidad = await requerirIdentidad(RUTA_CIERRE);
  const periodo = /^\d{4}-(0[1-9]|1[0-2])$/.test(p["periodo"] ?? "") ? (p["periodo"] as string) : hoyIso().slice(0, 7);
  const r = await ejecutarComoUsuario<TableroCierre>("erp", "finanzas.cierre.tablero", { periodo });
  return {
    state: estadoPantalla(r),
    periodo,
    tablero: r.ok ? r.data : null,
    gestiona: puedeDeIdentidad(identidad)("finanzas:ventas.manage"),
  };
}
