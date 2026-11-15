import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import type { Contexto, Modelo, Nivel, Turno } from "./tipos";

type Fallo = { ok: false; error: { code: string; message: string } };
type Ok = { ok: true; data: Turno };

/** Lee el SSE de `/api/agente` hasta `resultado` o `error`. */
async function leerSse(res: Response): Promise<Ok | Fallo> {
  if (!res.ok || !res.body) {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "No se pudo completar la solicitud." },
    };
  }
  const lector = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let evento = "";
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lineas = buf.split("\n");
    buf = lineas.pop() ?? "";
    for (const linea of lineas) {
      if (linea.startsWith("event:")) evento = linea.slice(6).trim();
      else if (linea.startsWith("data:") && evento) {
        const dato = JSON.parse(linea.slice(5).trim()) as unknown;
        if (evento === "resultado") {
          const r = dato as Ok | Fallo;
          return r.ok ? { ok: true, data: r.data as Turno } : r;
        }
        if (evento === "error") {
          const m = (dato as { mensaje?: string }).mensaje ?? "No se pudo completar la solicitud.";
          return { ok: false, error: { code: "INTERNAL", message: m } };
        }
        evento = "";
      }
    }
  }
  return { ok: false, error: { code: "INTERNAL", message: "No se pudo completar la solicitud." } };
}

/** Llama `agente.turno.preparar` por SSE; la corrida sigue en el servidor si el cliente se corta. */
export async function llamarTurno(args: {
  portal: string;
  texto: string;
  modelo: Modelo;
  nivel: Nivel;
  turnoId: string;
  conversacionId: string | null;
  contexto?: Contexto | undefined;
}): Promise<Ok | Fallo> {
  void args.portal; // el portal lo fija el servidor en /api/agente (ERP).
  const res = await fetch("/api/agente", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      accion: "preparar",
      idempotencyKey: args.turnoId,
      entrada: {
        mensaje: args.texto,
        modelo: args.modelo,
        nivel: args.nivel,
        turnoId: args.turnoId,
        ...(args.conversacionId ? { conversacionId: args.conversacionId } : {}),
        ...(args.contexto ? { contexto: args.contexto } : {}),
      },
    }),
  });
  return leerSse(res);
}

/** Lee el historial de una conversación (para reanudar tras un corte). */
export async function leerHistorialTurno(
  portal: string,
  conversacionId: string,
): Promise<{ turno?: string | undefined; rol: string; texto: string }[] | null> {
  const r = await ejecutarCapacidad(portal, "agente.conversaciones.get", { id: conversacionId });
  if (!r.ok) return null;
  const { historial } = r.data as {
    historial: { turno?: string; rol: string; texto: string }[];
  };
  return historial;
}
