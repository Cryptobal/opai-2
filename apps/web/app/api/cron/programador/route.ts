import { purgarIntentosLogin } from "@opai/auth";
import { programarPeriodicos } from "@opai/capabilities";

import { autorizarCron, hoyEn, porTenant } from "@/lib/cron";
import { contextoSistema } from "@/lib/medidor";

export const maxDuration = 60;

/** Cron diario: encola los trabajos periódicos de cada tenant. No hace el trabajo (ADR-029). */
export async function GET(req: Request): Promise<Response> {
  const negado = autorizarCron(req);
  if (negado) return negado;
  let resultados: Record<string, unknown> = {};
  let errorTenants = false;
  try {
    resultados = await porTenant((t) =>
      programarPeriodicos(contextoSistema(t.id), hoyEn(t.timezone)),
    );
  } catch {
    errorTenants = true;
    console.error("[cron programador] falló la programación por tenant");
  }
  // Mantenimiento global del Núcleo (sin tenant): purga los intentos de login fuera de retención
  // (B1, Brief 07c). `login_intentos` es global y solo-anexar; la purga la hace una función
  // `SECURITY DEFINER` porque `opai_app` no puede borrar. Va aislada: un error en `porTenant` no la
  // impide, ni la purga a la programación.
  let intentosLoginPurgados: number | null = null;
  try {
    intentosLoginPurgados = await purgarIntentosLogin();
  } catch {
    console.error("[cron programador] falló la purga de intentos de login");
  }
  const ok = !errorTenants && intentosLoginPurgados !== null;
  return Response.json({ ok, resultados, intentosLoginPurgados }, { status: ok ? 200 : 500 });
}
