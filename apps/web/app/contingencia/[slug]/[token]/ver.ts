import "server-only";

import { executeCapability, type Resultado } from "@opai/capabilities";

import { contextoPublicoAsistencia } from "@/lib/contexto-publico-asistencia";

export type ContingenciaVista = {
  tipo: string;
  hora: string;
  motivo: string;
  venceEn: string;
  estado: "pendiente" | "aceptada" | "rechazada";
};

const contextoPublico = (slug: string, token: string) => contextoPublicoAsistencia(slug, token, "contingencia-publica");

export async function verContingencia(
  slug: string,
  token: string,
): Promise<{ limitada: true } | { ok: true; data: ContingenciaVista } | { ok: false }> {
  const ctx = await contextoPublico(slug, token);
  if (ctx === "limitada") return { limitada: true };
  if (!ctx) return { ok: false };
  const r: Resultado = await executeCapability(ctx, "asistencia.contingencias.ver_enlace", { token });
  return r.ok ? { ok: true, data: r.data as ContingenciaVista } : { ok: false };
}

export async function responderContingencia(
  slug: string,
  entrada: { token: string; rut: string; decision: "aceptada" | "rechazada"; comentario: string },
): Promise<"ok" | "limitada" | "rechazada" | "comentario"> {
  const ctx = await contextoPublico(slug, entrada.token);
  if (ctx === "limitada") return "limitada";
  if (!ctx) return "rechazada";
  const r: Resultado = await executeCapability(ctx, "asistencia.contingencias.responder_enlace", {
    token: entrada.token,
    rut: entrada.rut,
    decision: entrada.decision,
    ...(entrada.comentario ? { comentario: entrada.comentario } : {}),
  });
  if (r.ok) return "ok";
  return r.error.code === "UNPROCESSABLE" ? "comentario" : "rechazada";
}