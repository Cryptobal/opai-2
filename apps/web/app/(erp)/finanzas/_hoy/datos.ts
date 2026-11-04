import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { ResumenHoy } from "./hoy";

export async function cargarHoy() {
  await requerirIdentidad("/finanzas");
  const r = await ejecutarComoUsuario<ResumenHoy>("erp", "finanzas.hoy.resumen", {});
  return { state: estadoPantalla(r), resumen: r.ok ? r.data : null };
}
