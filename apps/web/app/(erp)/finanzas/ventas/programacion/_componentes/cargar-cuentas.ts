import { cuentasPaginadas } from "@/lib/cuentas-paginadas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { estadoPantalla } from "@/lib/formato";
import { requerirIdentidad } from "@/lib/servidor";
import type { CuentaFila } from "@/lib/tipos-maestros";

/** Clientes para el formulario de programación, o «forbidden» sin permiso de ventas. */
export async function cargarCuentasProgramacion(ruta: string) {
  const identidad = await requerirIdentidad(ruta);
  if (!puedeDeIdentidad(identidad)("finanzas:ventas.manage")) {
    return { state: "forbidden" as const, cuentas: [] as CuentaFila[] };
  }
  const r = await cuentasPaginadas({});
  return { state: estadoPantalla(r), cuentas: r.ok ? r.data.items : [] };
}
