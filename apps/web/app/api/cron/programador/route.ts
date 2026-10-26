import { purgarIntentosLogin } from "@opai/auth";
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
  // Mantenimiento global del Núcleo (sin tenant): purga los intentos de login fuera de retención
  // (B1, Brief 07c). `login_intentos` es global y solo-anexar; la purga la hace una función
  // `SECURITY DEFINER` porque `opai_app` no puede borrar.
  const intentosLoginPurgados = await purgarIntentosLogin();
  return Response.json({ ok: true, resultados, intentosLoginPurgados });
}
