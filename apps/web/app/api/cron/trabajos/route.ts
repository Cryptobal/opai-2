import { despacharPendientes, ejecutarTrabajos, programarCada5Min } from "@opai/capabilities";
import { colaDeTrabajos } from "@opai/db";

import { autorizarCron, porTenant, tramoEn } from "@/lib/cron";
import { contextoSistemaDelTenant } from "@/lib/medidor";

export const maxDuration = 60;

/** Cron (cada 5 minutos): despacha el outbox y ejecuta los trabajos vencidos de cada tenant (ADR-029). */
export async function GET(req: Request): Promise<Response> {
  const negado = autorizarCron(req);
  if (negado) return negado;
  // Presupuesto global de 45 s (la función dura 60): los tenants que no alcanzan esperan 5 min.
  const hasta = Date.now() + 45_000;
  const resultados = await porTenant(async (t) => {
    if (Date.now() >= hasta) return { omitido: "sin tiempo en esta vuelta" };
    const ctx = await contextoSistemaDelTenant(t.id);
    const encolados = await programarCada5Min(ctx, tramoEn(t.timezone));
    const eventos = await despacharPendientes(ctx);
    const trabajos = await ejecutarTrabajos(ctx, colaDeTrabajos(t.id), { hasta });
    return { encolados, eventos, trabajos };
  });
  return Response.json({ ok: true, resultados });
}
