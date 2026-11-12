import { purgarIntentosLogin, purgarOAuth, purgarVerificacionesVencidas } from "@opai/auth";
import { programarCapturaSii, programarHorarios, programarPeriodicos } from "@opai/capabilities";

import {
  autorizarCron,
  encolarCapturaSiiDesdeCron,
  horaEn,
  hoyEn,
  porTenant,
  tocaTrabajosDiarios,
} from "@/lib/cron";
import { contextoSistema } from "@/lib/medidor";
import { purgarVentanas } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * Cron de cada hora: encola los trabajos horarios de cada tenant y, desde las 09:00 UTC, los diarios. No hace el
 * trabajo (ADR-029). Antes corría una vez al día, así que los trabajos «horarios» también corrían una sola vez.
 */
export async function GET(req: Request): Promise<Response> {
  const negado = autorizarCron(req);
  if (negado) return negado;
  const tocaDiarios = tocaTrabajosDiarios();
  let resultados: Record<string, unknown> = {};
  let errorTenants = false;
  try {
    resultados = await porTenant((t) => {
      const hoy = hoyEn(t.timezone);
      const hora = horaEn(t.timezone);
      return Promise.all([
        tocaDiarios
          ? programarPeriodicos(contextoSistema(t.id), hoy)
          : Promise.resolve([] as string[]),
        programarHorarios(contextoSistema(t.id), hora),
      ]).then(([diarios, horarios]) => ({ diarios, horarios }));
    });
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
  // Desafíos de passkey y marcas vencidos (CAR-286): best-effort, no cambia el `ok` del cron.
  await purgarVerificacionesVencidas().catch(() =>
    console.error("[cron programador] falló la purga de verificaciones vencidas"),
  );
  // Accesos OAuth vencidos o revocados y apps registradas sin uso (CAR-247): best-effort.
  await purgarOAuth().catch(() =>
    console.error("[cron programador] falló la purga del OAuth del MCP"),
  );
  // Purga de las ventanas de rate limit vencidas (NÚCLEO-B). Global y aislada, como la de login.
  let ventanasRatePurgadas: number | null = null;
  try {
    ventanasRatePurgadas = await purgarVentanas();
  } catch {
    console.error("[cron programador] falló la purga de ventanas de rate limit");
  }
  let capturaSiiEncolada: boolean | null = null;
  try {
    if (tocaDiarios)
      capturaSiiEncolada = await encolarCapturaSiiDesdeCron(programarCapturaSii, contextoSistema);
  } catch {
    console.error("[cron programador] falló la programación de captura SII");
  }
  const ok = !errorTenants && intentosLoginPurgados !== null && ventanasRatePurgadas !== null;
  return Response.json(
    { ok, resultados, capturaSiiEncolada, intentosLoginPurgados, ventanasRatePurgadas },
    { status: ok ? 200 : 500 },
  );
}
