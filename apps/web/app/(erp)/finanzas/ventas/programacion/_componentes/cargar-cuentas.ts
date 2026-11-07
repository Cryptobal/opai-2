import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import type { CuentaFila, Pagina } from "@/lib/tipos-maestros";

/**
 * Qué se pinta según el estado de la carga. Nunca «nada»: una carga fallida mostraba una pantalla en blanco (CAR-221 B).
 * «empty» (sin clientes) sí muestra el formulario, que lo explica.
 */
export function vistaDeCarga(state: string): "formulario" | "forbidden" | "error" {
  if (state === "ready" || state === "empty") return "formulario";
  return state === "forbidden" ? "forbidden" : "error";
}

/** Clientes para el formulario de programación, o «forbidden» sin permiso de ventas. */
export async function cargarCuentasProgramacion(ruta: string) {
  const identidad = await requerirIdentidad(ruta);
  if (!puedeDeIdentidad(identidad)("finanzas:ventas.manage")) {
    return { state: "forbidden" as const, cuentas: [] as CuentaFila[] };
  }
  const r = await ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", {
    limite: 200,
  });
  return { state: estadoPantalla(r), cuentas: r.ok ? r.data.items : [] };
}
