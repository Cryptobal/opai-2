import "server-only";

import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import type { Planilla } from "./datos";

export async function cargarPlanilla(sp?: SearchParams) {
  const p = sp ? await leerParametros(sp) : {};
  const identidad = await requerirIdentidad("/finanzas/flujo");
  const puede = puedeDeIdentidad(identidad);
  const movil = p.vista === "movil";
  const r = await ejecutarComoUsuario<Planilla>("erp", "finanzas.planilla.obtener", {
    semanas: movil ? 4 : undefined,
    movil,
  });
  return {
    state: estadoPantalla(r),
    planilla: r.ok ? r.data : null,
    gestiona: puede("finanzas:flujo.gestionar"),
    configura: puede("finanzas:flujo.configurar"),
    movil,
  };
}
