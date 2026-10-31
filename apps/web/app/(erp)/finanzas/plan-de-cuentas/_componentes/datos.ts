import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { AlertaPlan, Cuenta } from "../../_componentes/tipos";

type Plan = { cuentas: Cuenta[]; alertas: AlertaPlan[]; clavesFaltantes: string[]; inicializado: boolean };

export async function cargarPlan() {
  const identidad = await requerirIdentidad("/finanzas/plan-de-cuentas");
  const plan = await ejecutarComoUsuario<Plan>("erp", "finanzas.plan.listar", {});
  return {
    state: estadoPantalla(plan),
    plan: plan.ok ? plan.data : null,
    gestiona: puedeDeIdentidad(identidad)("finanzas:plan.manage"),
  };
}
