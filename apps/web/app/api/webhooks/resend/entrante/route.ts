import { crearContexto, executeCapability } from "@opai/capabilities";
import { resolverBuzonCorreo, resolverTokenSeguimiento } from "@opai/db";

import { type EventoEntrante, destinatariosVisibles, destinoDe, leerEventoEntrante, leerTextoCorreo } from "@/lib/correo-entrante";
import { verificarFirmaSvix } from "@/lib/firma-svix";
import { medidorDiferido } from "@/lib/medidor";
import { soloLecturaDe } from "@/lib/solo-lectura";
import { permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";

asegurarRegistro();

const MAX_CUERPO = 256 * 1024;
const descartar = () => new Response(null, { status: 200 });
const SIN_TEXTO = "(Resend no entregó el contenido del correo.)";

/** Un fallo transitorio pide reintento a Resend; un rechazo de negocio (p. ej. seguimiento borrado) se descarta. */
const responder = (r: { ok: true } | { ok: false; error: { code: string } }) =>
  r.ok || r.error.code === "NOT_FOUND" || r.error.code === "FORBIDDEN" ? descartar() : new Response(null, { status: 500 });

async function texto(emailId: string): Promise<string> {
  const apiKey = process.env["RESEND_API_KEY"];
  return (apiKey ? await leerTextoCorreo(emailId, apiKey) : null) ?? SIN_TEXTO;
}

/** CAR-67: respuesta a `s<token>@respuestas.opai.cl` (un seguimiento). Sin cambios de comportamiento. */
async function alSeguimiento(ev: EventoEntrante, token: string): Promise<Response> {
  const dueno = await resolverTokenSeguimiento(token);
  if (!dueno) return descartar();
  const ctx = crearContexto({ tenantId: dueno.tenantId, actor: { tipo: "system" }, medidor: medidorDiferido, modulosActivos: ["comercial"],
    modulosSoloLectura: await soloLecturaDe(dueno.tenantId, "comercial") });
  return responder(await executeCapability(ctx, "comercial.seguimientos.recibir_correo", {
    seguimientoId: dueno.seguimientoId, mensajeId: ev.emailId, remitente: ev.desde.slice(0, 320),
    asunto: ev.asunto, texto: await texto(ev.emailId), recibidoEn: ev.recibidoEn,
  }));
}

/** CAR-233: correo a la dirección de registro de la empresa `t<token>@respuestas.opai.cl` (reply-to o CCO). */
async function alBuzon(ev: EventoEntrante, token: string): Promise<Response> {
  const dueno = await resolverBuzonCorreo(token);
  if (!dueno) return descartar();
  const ctx = crearContexto({ tenantId: dueno.tenantId, actor: { tipo: "system" }, medidor: medidorDiferido });
  return responder(await executeCapability(ctx, "core.correos.recibir", {
    mensajeId: ev.emailId, remitente: ev.desde.slice(0, 320), destinatarios: destinatariosVisibles(ev),
    asunto: ev.asunto?.slice(0, 500) ?? null, texto: await texto(ev.emailId), recibidoEn: ev.recibidoEn,
  }));
}

/**
 * Receptor del correo entrante de Resend (CAR-67, extendido en CAR-233). El webhook es de TODA la cuenta
 * de Resend: lo que no vaya a una dirección de `@respuestas.opai.cl` con token (`s…` de un seguimiento o
 * `t…` de la empresa) se descarta sin guardar ni registrar contenido (200). Sin firma válida responde
 * 401 (falla cerrado). El tenant sale del token de la dirección de destino, nunca del cuerpo ni del remitente.
 */
export async function POST(req: Request): Promise<Response> {
  const secreto = process.env["RESEND_INBOUND_WEBHOOK_SECRET"] ?? "";
  if (!(await permitir("resend-entrante", 600, 60_000))) return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_CUERPO) return new Response(null, { status: 413 });
  const cuerpo = await req.text();
  if (cuerpo.length > MAX_CUERPO) return new Response(null, { status: 413 });
  const firmada = verificarFirmaSvix(secreto, cuerpo, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    firma: req.headers.get("svix-signature"),
  });
  if (!firmada) return new Response(null, { status: 401 });

  const ev = leerEventoEntrante(cuerpo);
  const destino = ev ? destinoDe(ev) : null;
  if (!ev || !destino) return descartar();
  return destino.tipo === "seguimiento" ? alSeguimiento(ev, destino.token) : alBuzon(ev, destino.token);
}
