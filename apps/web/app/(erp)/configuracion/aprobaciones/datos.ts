import { estadoPantalla } from "@/lib/formato";
import {
  aprobacionDesdeCpq,
  type ItemBandejaCpqApi,
} from "@/lib/aprobaciones-cpq";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Aprobacion } from "./tipos";

/** Pendientes (o historial), agentes del núcleo y CPQ (margen + envío conjunto). */
export async function cargarAprobaciones(p: Parametros) {
  const historial = p["historial"] === "1";
  const [r, cpq] = await Promise.all([
    ejecutarComoUsuario<Aprobacion[]>("erp", "core.aprobaciones.list", {
      limite: 100,
      ...(historial ? {} : { estado: "pendiente" }),
    }),
    ejecutarComoUsuario<ItemBandejaCpqApi[]>("erp", "cpq.aprobaciones.list", {
      limite: 100,
      historial,
    }),
  ]);
  const deAgente = (r.ok ? r.data : []).filter((a) => (historial ? a.estado !== "pendiente" : true));
  const deCpq = (cpq.ok ? cpq.data : []).map(aprobacionDesdeCpq);
  const todas = [...deAgente, ...deCpq].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  const items = todas.filter(
    (a) =>
      (!p["riesgo"] || a.riesgo === p["riesgo"]) &&
      (!p["agente"] || a.ambito !== "empresa" || (a.apiKeyId ?? "agente-interno") === p["agente"]),
  );
  const agentes = [
    ...new Map(
      deAgente.map((a) => [a.apiKeyId ?? "agente-interno", a.agente]),
    ).entries(),
  ].map(([valor, etiqueta]) => ({ valor, etiqueta }));
  const pendientes = historial ? null : todas.filter((a) => a.estado === "pendiente").length;
  return { state: estadoPantalla(r, cpq), items, agentes, historial, pendientes, ver: p["ver"] };
}
