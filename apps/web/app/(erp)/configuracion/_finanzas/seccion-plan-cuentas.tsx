import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ContenidoPlan, type DatosPlan } from "@/app/(erp)/finanzas/plan-de-cuentas/_componentes/contenido-plan";

/**
 * Pestaña «Plan de cuentas» de Configuración › Módulos › Finanzas (ADR-018, CAR-198/CAR-220): el plan completo
 * (árbol, crear, editar, inicializar) vive aquí. La pestaña ya exige `finanzas:plan.manage`, así que se gestiona.
 */
export async function SeccionPlanCuentas() {
  const r = await ejecutarComoUsuario<NonNullable<DatosPlan["plan"]>>("erp", "finanzas.plan.listar", {});
  const d: DatosPlan = { state: estadoPantalla(r), plan: r.ok ? r.data : null, gestiona: true };
  return <ContenidoPlan d={d} prefijo="?seccion=plan-cuentas&" sinTitulo />;
}
