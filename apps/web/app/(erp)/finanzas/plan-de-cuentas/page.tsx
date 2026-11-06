import { redirect } from "next/navigation";

export const metadata = { title: "Plan de cuentas" };

/** El plan de cuentas vive en Configuración › Finanzas › Plan de cuentas (CAR-198/CAR-220); la ruta antigua redirige. */
export default function PlanDeCuentas() {
  redirect("/configuracion/modulo/finanzas?seccion=plan-cuentas");
}
