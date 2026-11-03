import { tokenDeDireccion } from "@opai/domain";

export type EventoEntrante = {
  emailId: string;
  desde: string;
  asunto: string | null;
  para: string[];
  recibidoEn: string;
};

/** Lee el evento `email.received` de Resend. Devuelve null si no es un correo recibido bien formado. */
export function leerEventoEntrante(cuerpo: string): EventoEntrante | null {
  let j: unknown;
  try {
    j = JSON.parse(cuerpo);
  } catch {
    return null;
  }
  if (typeof j !== "object" || j === null) return null;
  const e = j as { type?: unknown; created_at?: unknown; data?: Record<string, unknown> };
  const d = e.data;
  if (e.type !== "email.received" || !d || typeof d["email_id"] !== "string") return null;
  const para = Array.isArray(d["to"]) ? d["to"].filter((x): x is string => typeof x === "string") : [];
  return {
    emailId: d["email_id"],
    desde: typeof d["from"] === "string" ? d["from"] : "",
    asunto: typeof d["subject"] === "string" ? d["subject"] : null,
    para,
    recibidoEn: typeof e.created_at === "string" && !Number.isNaN(Date.parse(e.created_at)) ? new Date(e.created_at).toISOString() : new Date().toISOString(),
  };
}

/** Token del seguimiento de la primera dirección `@respuestas.opai.cl` del correo; null si ninguna lo es. */
export const tokenDeDestinatarios = (para: string[]): string | null => {
  for (const p of para) {
    const t = tokenDeDireccion(p);
    if (t) return t;
  }
  return null;
};

/** Texto del correo recibido (`GET /emails/receiving/{id}`), recortado. Null si Resend no lo entrega. */
export async function leerTextoCorreo(emailId: string, apiKey: string): Promise<string | null> {
  const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!r?.ok) return null;
  const j = (await r.json().catch(() => null)) as { text?: unknown; html?: unknown } | null;
  const texto = typeof j?.text === "string" ? j.text : typeof j?.html === "string" ? j.html.replace(/<[^>]+>/g, " ") : "";
  return texto.replace(/\s+\n/g, "\n").trim().slice(0, 20000);
}
