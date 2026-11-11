import { esDireccionOpai, tokenBuzonDeDireccion, tokenDeDireccion } from "@opai/domain";

export type EventoEntrante = {
  emailId: string;
  desde: string;
  asunto: string | null;
  para: string[];
  /** Copias (CAR-233): `cc` y `bcc` si Resend los entrega. El CCO del vendedor puede llegar solo aquí. */
  copia: string[];
  copiaOculta: string[];
  recibidoEn: string;
};

const direcciones = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 50) : [];

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
  return {
    emailId: d["email_id"],
    desde: typeof d["from"] === "string" ? d["from"] : "",
    asunto: typeof d["subject"] === "string" ? d["subject"] : null,
    para: direcciones(d["to"]),
    copia: direcciones(d["cc"]),
    copiaOculta: direcciones(d["bcc"]),
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

export type Destino = { tipo: "seguimiento"; token: string } | { tipo: "buzon"; token: string };

/**
 * A qué dirección de OPAI llegó el correo. Manda el token de un seguimiento en «para» (camino de
 * CAR-67, sin cambios); si no hay, el de la dirección de registro de la empresa (CAR-233), en para,
 * copia o copia oculta. Null si ninguna es nuestra: el correo se descarta sin guardar nada.
 */
export function destinoDe(ev: Pick<EventoEntrante, "para" | "copia" | "copiaOculta">): Destino | null {
  const seguimiento = tokenDeDestinatarios(ev.para);
  if (seguimiento) return { tipo: "seguimiento", token: seguimiento };
  for (const d of [...ev.para, ...ev.copia, ...ev.copiaOculta]) {
    const t = tokenBuzonDeDireccion(d);
    if (t) return { tipo: "buzon", token: t };
  }
  return null;
}

/** Destinatarios visibles para el historial: para y copia, sin las direcciones de OPAI. */
export const destinatariosVisibles = (ev: Pick<EventoEntrante, "para" | "copia">): string[] =>
  [...ev.para, ...ev.copia].filter((d) => !esDireccionOpai(d)).map((d) => d.slice(0, 320)).slice(0, 50);

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
