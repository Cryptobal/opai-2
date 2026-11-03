import { Alerta } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PlanesSeguimiento, type PlanConfig } from "./planes-seguimiento";

/** Configuración › Módulos › Comercial › Seguimiento: planes versionados por empresa (CAR-67, ADR-021). */
export async function SeccionSeguimiento() {
  const r = await ejecutarComoUsuario<PlanConfig[]>("erp", "comercial.seguimiento_planes.list", {});
  if (estadoPantalla(r) !== "ready" || !r.ok) return <Alerta tono="danger" titulo="No pudimos cargar los planes de seguimiento." />;
  return <PlanesSeguimiento planes={r.data} />;
}
