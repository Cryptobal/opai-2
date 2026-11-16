import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { FilaFlujo } from "../../_componentes/datos";

import type { FilaEgreso, ProveedorOpcion, Recurrente } from "./tipos";

/** Gastos recurrentes, filas de egreso y proveedores para el selector (CAR-582). */
export async function cargarRecurrentes() {
  const puede = puedeDeIdentidad(await requerirIdentidad("/finanzas/flujo/recurrentes"));
  const configura = puede("finanzas:flujo.configurar");
  const [lista, filas, provs] = await Promise.all([
    ejecutarComoUsuario<Recurrente[]>("erp", "finanzas.recurrentes.listar", { incluirInactivos: true }),
    ejecutarComoUsuario<FilaFlujo[]>("erp", "finanzas.filas.listar", { incluirInactivas: true }),
    configura
      ? ejecutarComoUsuario<{ items: ProveedorOpcion[] }>("erp", "finanzas.proveedores.listar", { limite: 200 })
      : Promise.resolve({ ok: true as const, data: { items: [] as ProveedorOpcion[] } }),
  ]);
  const state = estadoPantalla(lista);
  const todasFilas = filas.ok ? filas.data : [];
  return {
    state,
    items: lista.ok
      ? [...lista.data].sort((a, b) => Number(b.activa) - Number(a.activa) || a.concepto.localeCompare(b.concepto, "es"))
      : [],
    filas: todasFilas.filter((f) => f.seccion === "egreso" && f.activa) as FilaEgreso[],
    filasAdmin: todasFilas.filter((f) => f.seccion === "egreso"),
    proveedores: provs.ok ? provs.data.items : [],
    configura,
  };
}