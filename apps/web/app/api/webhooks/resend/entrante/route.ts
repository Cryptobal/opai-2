import { crearContexto, executeCapability } from "@opai/capabilities";
import { resolverTokenSeguimiento } from "@opai/db";

import { leerEventoEntrante, leerTextoCorreo, tokenDeDestinatarios } from "@/lib/correo-entrante";
import { verificarFirmaSvix } from "@/lib/firma-svix";
import { medidorDiferido } from "@/lib/medidor";
import { permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";

asegurarRegistro();

const MAX_CUERPO = 256 * 1024;
const descartar = () => new Response(null, { status: 200 });

/**
 * Receptor del correo entrante de Resend (CAR-67). El webhook es de TODA la cuenta de Resend: lo que
 * no vaya a `<token>@respuestas.opai.cl` se descarta sin guardar ni registrar contenido (200). Sin firma
 * válida responde 401 (falla cerrado). El tenant sale del token, nunca del cuerpo.
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
  const token = ev ? tokenDeDestinatarios(ev.para) : null;
  if (!ev || !token) return descartar();
  const dueno = await resolverTokenSeguimiento(token);
  if (!dueno) return descartar();
  const apiKey = process.env["RESEND_API_KEY"];
  const texto = apiKey ? await leerTextoCorreo(ev.emailId, apiKey) : null;

  const ctx = crearContexto({ tenantId: dueno.tenantId, actor: { tipo: "system" }, medidor: medidorDiferido, modulosActivos: ["comercial"] });
  const r = await executeCapability(ctx, "comercial.seguimientos.recibir_correo", {
    seguimientoId: dueno.seguimientoId, mensajeId: ev.emailId, remitente: ev.desde.slice(0, 320),
    asunto: ev.asunto, texto: texto ?? "(Resend no entregó el contenido del correo.)", recibidoEn: ev.recibidoEn,
  });
  // Un fallo transitorio pide reintento a Resend; un rechazo de negocio (seguimiento borrado) se descarta.
  return r.ok || r.error.code === "NOT_FOUND" ? descartar() : new Response(null, { status: 500 });
}
