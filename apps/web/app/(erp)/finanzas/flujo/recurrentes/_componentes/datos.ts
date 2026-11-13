import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { FilaEgreso, Recurrente } from "./tipos";

/** Gastos recurrentes y filas de egreso: dos capacidades por navegación. */
export async function cargarRecurrentes() {
  const puede = puedeDeIdentidad(await requerirIdentidad("/finanzas/flujo/recurrentes"));
  const [lista, filas] = await Promise.all([
    ejecutarComoUsuario<Recurrente[]>("erp", "finanzas.recurrentes.listar", { incluirInactivos: true }),
    ejecutarComoUsuario<FilaEgreso[]>("erp", "finanzas.filas.listar", { incluirInactivas: false }),
  ]);
  return {
    state: estadoPantalla(lista),
    items: lista.ok ? [...lista.data].sort((a, b) => Number(b.activa) - Number(a.activa) || a.concepto.localeCompare(b.concepto, "es")) : [],
    filas: filas.ok ? filas.data.filter((f) => f.seccion === "egreso") : [],
    configura: puede("finanzas:flujo.configurar"),
  };
}
