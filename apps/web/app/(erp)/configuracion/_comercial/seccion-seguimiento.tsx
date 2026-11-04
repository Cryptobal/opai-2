import { Alerta } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type EtapaOpcion, PlanesSeguimiento, type PlanConfig } from "./planes-seguimiento";

/** Configuración › Módulos › Comercial › Seguimiento: planes versionados por empresa (CAR-67, ADR-021). */
export async function SeccionSeguimiento() {
  const r = await ejecutarComoUsuario<PlanConfig[]>("erp", "comercial.seguimiento_planes.list", {});
  if (estadoPantalla(r) !== "ready" || !r.ok) return <Alerta tono="danger" titulo="No pudimos cargar los planes de seguimiento." />;
  // Etapas abiertas del embudo, para «al responder pasa a» y «no cerrar desde».
  const embudo = await ejecutarComoUsuario<{ embudo: { etapas: { id: string; nombre: string; tipo: string; activa: boolean }[] } }>("erp", "comercial.config.get", {});
  const etapas: EtapaOpcion[] = embudo.ok ? embudo.data.embudo.etapas.filter((e) => e.activa && e.tipo === "abierta").map((e) => ({ valor: e.id, etiqueta: e.nombre })) : [];
  return <PlanesSeguimiento planes={r.data} etapas={etapas} />;
}
