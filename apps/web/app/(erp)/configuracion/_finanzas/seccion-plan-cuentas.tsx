import { Estado } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Cuenta } from "@/app/(erp)/finanzas/_componentes/tipos";

/**
 * Pestaña «Plan de cuentas» de Configuración › Módulos › Finanzas (ADR-018): resumen del plan y acceso
 * a su pantalla. El módulo no tiene página de configuración propia.
 */
export async function SeccionPlanCuentas() {
  const r = await ejecutarComoUsuario<{ cuentas: Cuenta[]; inicializado: boolean }>(
    "erp",
    "finanzas.plan.listar",
    {},
  );
  const cuentas = r.ok ? r.data.cuentas : [];
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      <div className="flex flex-col gap-4">
        <p className="text-base text-fg-muted">
          {r.ok && r.data.inicializado
            ? `${cuentas.length} cuentas, ${cuentas.filter((c) => c.activa).length} activas. Edítalas, agrega las tuyas y revisa los grupos en la pantalla del plan.`
            : "Aún no hay plan de cuentas. Cárgalo desde su pantalla con la plantilla chilena base."}
        </p>
        <div>
          <EnlaceBoton href="/finanzas/plan-de-cuentas" variante="secondary">Abrir el plan de cuentas</EnlaceBoton>
        </div>
      </div>
    </Estado>
  );
}
