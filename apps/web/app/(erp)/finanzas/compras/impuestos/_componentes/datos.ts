import { mesesHasta } from "@/app/(erp)/configuracion/consumos/_componentes/datos";
import { hoyIso } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { BorradorF29 } from "./tipos";

/** Mes anterior al de hoy en hora de Chile: el F29 que toca declarar. */
export function mesPorDefecto(hoy = hoyIso()): string {
  const [a, m] = hoy.split("-").map(Number) as [number, number];
  const i = a * 12 + (m - 1) - 1;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

/** Borrador del F29 del mes pedido (`?mes=aaaa-mm`), o del mes anterior si no viene o no es de la lista. */
export async function cargarF29(mesUrl: string | undefined) {
  await requerirIdentidad("/finanzas/compras/impuestos");
  const opciones = mesesHasta();
  const mes = mesUrl && opciones.some((o) => o.valor === mesUrl) ? mesUrl : mesPorDefecto();
  const r = await ejecutarComoUsuario<BorradorF29>("erp", "finanzas.impuestos.borrador_f29", { periodo: mes });
  return { state: estadoPantalla(r), f29: r.ok ? r.data : null, mes, opciones };
}
