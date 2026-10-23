import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { DetalleTenant, PanelTenant, Trabajo } from "./tipos";

/** Ficha de la empresa y su panel del mes (consumos, keys, trabajos, integraciones). */
export async function cargarTenant(tenantId: string) {
  const [d, p] = await Promise.all([
    ejecutarComoUsuario<DetalleTenant>("platform", "platform.tenants.get", { tenantId }),
    ejecutarComoUsuario<PanelTenant>("platform", "platform.tenants.panel", { tenantId }),
  ]);
  return { state: estadoPantalla(d), detalle: d.ok ? d.data : null, panel: p.ok ? p.data : null };
}

export async function trabajosDe(tenantId: string | undefined, conProblemas: boolean, limite = 50) {
  const r = await ejecutarComoUsuario<Trabajo[]>("platform", "platform.trabajos.list", {
    ...(tenantId ? { tenantId } : {}),
    conProblemas,
    limite,
  });
  return { state: estadoPantalla(r), items: r.ok ? r.data : [] };
}
