import { COMUNICABLES_NUCLEO, renderizarCorreo } from "@opai/domain";
import type { AvisoCorreoBloqueo } from "@opai/db";
import { mailerDelEntorno } from "@opai/integrations/email";

/**
 * Correo a la persona cuando su ingreso con PIN queda en pausa (decisión de Carlos sobre F5). Usa el
 * comunicable transaccional `core.usuario.pin_bloqueado` con la marca de OPAI, como la recuperación de
 * contraseña. Nunca rompe el ingreso: un fallo del correo deja solo un aviso categórico, sin destinatario.
 */
export async function enviarCorreoBloqueo(a: NonNullable<AvisoCorreoBloqueo>): Promise<void> {
  try {
    const e = COMUNICABLES_NUCLEO.find((x) => x.evento === "core.usuario.pin_bloqueado");
    if (!e?.plantillas.correo) return;
    const r = renderizarCorreo(
      e,
      e.plantillas.correo,
      { usuario: { nombre: a.nombre }, minutos: String(a.minutos) },
      { nombre: "OPAI" },
    );
    await mailerDelEntorno().enviar({
      para: a.correo,
      asunto: r.asunto,
      texto: r.texto,
      html: r.html,
    });
  } catch (error) {
    console.warn("[pin] no se pudo enviar el aviso de bloqueo", {
      error: error instanceof Error ? error.name : typeof error,
    });
  }
}
