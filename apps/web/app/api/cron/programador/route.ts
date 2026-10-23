import { programarPeriodicos } from "@opai/capabilities";

import { autorizarCron, hoyEn, porTenant } from "@/lib/cron";
import { contextoSistema } from "@/lib/medidor";

export const maxDuration = 60;

/** Cron diario: encola los trabajos periódicos de cada tenant. No hace el trabajo (ADR-029). */
export async function GET(req: Request): Promise<Response> {
  const negado = autorizarCron(req);
  if (negado) return negado;
  const resultados = await porTenant((t) =>
    programarPeriodicos(contextoSistema(t.id), hoyEn(t.timezone)),
  );
  return Response.json({ ok: true, resultados });
}
