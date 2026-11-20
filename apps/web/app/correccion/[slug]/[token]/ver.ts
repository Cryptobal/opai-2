import "server-only";

import { executeCapability, type Resultado } from "@opai/capabilities";

import { contextoPublicoAsistencia } from "@/lib/contexto-publico-asistencia";

export type CorreccionVista = {
  original: string;
  propuesta: string;
  motivo: string;
  venceEn: string | null;
  estado: "pendiente" | "aceptada" | "objetada" | "vencida";
};

const contextoPublico = (slug: string, token: string) => contextoPublicoAsistencia(slug, token, "correccion-publica");

export async function verCorreccion(
  slug: string,
  token: string,
): Promise<{ limitada: true } | { ok: true; data: CorreccionVista } | { ok: false }> {
  const ctx = await contextoPublico(slug, token);
  if (ctx === "limitada") return { limitada: true };
  if (!ctx) return { ok: false };
  const r: Resultado = await executeCapability(ctx, "asistencia.correcciones.ver_enlace", { token });
  return r.ok ? { ok: true, data: r.data as CorreccionVista } : { ok: false };
}

export async function responderCorreccion(
  slug: string,
  entrada: { token: string; rut: string; resultado: "aceptada" | "objetada"; comentario: string },
): Promise<"ok" | "limitada" | "rechazada" | "comentario"> {
  const ctx = await contextoPublico(slug, entrada.token);
  if (ctx === "limitada") return "limitada";
  if (!ctx) return "rechazada";
  const r: Resultado = await executeCapability(ctx, "asistencia.correcciones.responder_enlace", {
    token: entrada.token,
    rut: entrada.rut,
    resultado: entrada.resultado,
    ...(entrada.comentario ? { comentario: entrada.comentario } : {}),
  });
  if (r.ok) return "ok";
  return r.error.code === "UNPROCESSABLE" ? "comentario" : "rechazada";
}
