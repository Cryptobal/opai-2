import type { Contexto } from "@opai/capabilities";

import { resolverActor } from "@/lib/actor";
import { permitir } from "@/lib/rate-limit";

/** Sesión ERP con módulo agente; 403/401/429 si no corresponde. */
export async function autorizarAgente(req: Request): Promise<Contexto | Response> {
  if (req.headers.has("authorization") || req.headers.get("origin") !== new URL(req.url).origin) {
    return Response.json({ error: "Prohibido." }, { status: 403 });
  }
  const ctx = await resolverActor(req);
  if (ctx instanceof Response) return ctx;
  if (
    ctx.actor.tipo !== "user" ||
    !ctx.conTenant ||
    !ctx.portalesMembresia.includes("erp") ||
    !ctx.modulosActivos.includes("agente") ||
    !ctx.autorizar("agente:usar")
  ) {
    return Response.json({ error: "Prohibido." }, { status: 403 });
  }
  if (
    !(await permitir(`agente:${ctx.tenantId}:${ctx.actor.id}`, 20, 60_000, { fallarCerrado: true }))
  ) {
    return Response.json(
      { error: "Demasiadas solicitudes." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  return ctx;
}
