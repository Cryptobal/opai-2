import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Aprobacion } from "./tipos";

/** Pendientes (o historial con `?historial=1`), filtradas por riesgo y agente. */
export async function cargarAprobaciones(p: Parametros) {
  const historial = p["historial"] === "1";
  const r = await ejecutarComoUsuario<Aprobacion[]>("erp", "core.aprobaciones.list", {
    limite: 100,
    ...(historial ? {} : { estado: "pendiente" }),
  });
  const todas = (r.ok ? r.data : []).filter((a) => (historial ? a.estado !== "pendiente" : true));
  const items = todas.filter(
    (a) =>
      (!p["riesgo"] || a.riesgo === p["riesgo"]) &&
      (!p["agente"] || (a.apiKeyId ?? "agente-interno") === p["agente"]),
  );
  const agentes = [
    ...new Map(todas.map((a) => [a.apiKeyId ?? "agente-interno", a.agente])).entries(),
  ].map(([valor, etiqueta]) => ({ valor, etiqueta }));
  const pendientes = historial ? null : todas.length;
  return { state: estadoPantalla(r), items, agentes, historial, pendientes, ver: p["ver"] };
}
