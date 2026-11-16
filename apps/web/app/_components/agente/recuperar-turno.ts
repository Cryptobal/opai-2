import { ERROR_RED, textoError } from "./mensajes-error";
import { llamarTurno, leerHistorialTurno } from "./llamar-turno";
import {
  decidirReanudar,
  historialIncluyeTurno,
  type PendienteTurno,
} from "./reanudar-turno";
import { aplicarTurno } from "./respuesta-plan";
import type { Contexto, Mensaje, Modelo, Nivel, Turno } from "./tipos";

const ESPERA_MS = 2_000;

type Args = {
  portal: string;
  modelo: Modelo;
  nivel: Nivel;
  conversacionId: string | null;
  contexto?: Contexto | undefined;
  pendiente: PendienteTurno;
  generacion: number;
  vigente: () => number;
  poner: (id: string, cambio: (m: Mensaje) => Mensaje) => void;
  alConversacion: (id: string, tituloDe: string) => void;
};

/** Aplica un turno OK al mensaje pendiente y actualiza la conversación. */
function aplicarOk(a: Args, t: Turno, textoUsuario: string) {
  if (t.conversacionId && a.vigente() === a.generacion) a.alConversacion(t.conversacionId, textoUsuario);
  a.poner(a.pendiente.mensajeId, (m) => {
    const { error: _e, ...resto } = m;
    return aplicarTurno(resto, t, a.nivel);
  });
}

/**
 * Reintenta con el mismo `turnoId` (idempotencia) o recarga el historial. Un solo reintento de
 * envío si el mensaje no llegó; si sigue en curso, espera y vuelve a consultar.
 */
async function intentar(a: Args, p: PendienteTurno) {
  try {
    return await llamarTurno({
      portal: a.portal,
      texto: p.texto,
      modelo: a.modelo,
      nivel: a.nivel,
      turnoId: p.turnoId,
      conversacionId: a.conversacionId,
      ...(a.contexto ? { contexto: a.contexto } : {}),
    });
  } catch {
    return { ok: false as const, error: { code: "NETWORK", message: ERROR_RED } };
  }
}

export async function recuperarTurno(a: Args): Promise<"listo" | "esperar" | "fallo"> {
  if (a.vigente() !== a.generacion) return "listo";
  const historial = a.conversacionId
    ? ((await leerHistorialTurno(a.portal, a.conversacionId)) ?? [])
    : [];
  const enHistorial = historialIncluyeTurno(historial, a.pendiente.turnoId);
  let pendiente = a.pendiente;
  let r = await intentar(a, pendiente);
  let decision = decidirReanudar(r, pendiente, enHistorial);
  if (decision.accion === "reintentar_envio") {
    pendiente = { ...pendiente, reintentosEnvio: pendiente.reintentosEnvio + 1 };
    a.pendiente.reintentosEnvio = pendiente.reintentosEnvio;
    r = await intentar(a, pendiente);
    decision = decidirReanudar(r, pendiente, enHistorial);
  }
  if (a.vigente() !== a.generacion) return "listo";
  if (decision.accion === "aplicar") {
    aplicarOk(a, decision.data as Turno, pendiente.texto);
    return "listo";
  }
  if (decision.accion === "usar_historial") {
    const agente = [...historial]
      .reverse()
      .find((m) => m.rol === "agente" && m.turno === pendiente.turnoId);
    if (agente) {
      a.poner(pendiente.mensajeId, (m) => {
        const { error: _e, ...resto } = m;
        return { ...resto, texto: agente.texto };
      });
    }
    return "listo";
  }
  if (decision.accion === "esperar") return "esperar";
  const err =
    !r.ok && r.error.code !== "NETWORK"
      ? textoError(r.error.code, r.error.message)
      : ERROR_RED;
  a.poner(pendiente.mensajeId, (m) => ({ ...m, error: err }));
  return "fallo";
}

/** Espera un poco y reanuda mientras la pestaña sigue visible. */
export function programarReintento(fn: () => void): () => void {
  const id = window.setTimeout(fn, ESPERA_MS);
  return () => window.clearTimeout(id);
}
