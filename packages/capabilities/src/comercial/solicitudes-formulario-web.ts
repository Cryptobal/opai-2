/* eslint-disable max-lines -- rotar token y recibir formulario web comparten Brief 07 PR 2 */
import { z } from "zod";

import {
  generarTokenFormulario,
  hashTokenFormulario,
  origenPermitido,
  rutaEndpointFormulario,
  sufijoToken,
  textoOriginalDesdeFormulario,
} from "@opai/domain";

import { defineCapability } from "../define";
import { emailSchema } from "../core/esquemas";
import { definidos, rutSchema, telefonoSchema, textoOpcional } from "../core/maestros/comun";
import { ajuste } from "../core/config/valores";
import { enviarCorreo } from "../core/comunicaciones/envio";
import { reglaDeNegocio } from "../errores";
import { PERMISO_CANALES } from "./solicitudes-comun";
import { camposSolicitud } from "./solicitudes-crear";
import { responsableValido } from "./validaciones";

const utmCampo = textoOpcional(120);

export const canalesRotarTokenFormulario = defineCapability({
  id: "comercial.canales.rotar_token_formulario",
  descripcion:
    "Genera una nueva clave del formulario web del tenant: conecta el canal si aún no lo estaba, revoca la clave anterior y devuelve el token completo una sola vez para copiarlo en el sitio.",
  permiso: PERMISO_CANALES,
  soloPersonas: true,
  input: z.object({}),
  output: z.object({
    token: z.string(),
    tokenSufijo: z.string(),
    endpoint: z.string(),
    estado: z.enum(["conectado", "revocado"]),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _input, { dryRun }) {
    const tenant = await ctx.db.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: { slug: true },
    });
    const token = generarTokenFormulario();
    const hash = hashTokenFormulario(token);
    const sufi = sufijoToken(token);
    const endpoint = rutaEndpointFormulario(tenant.slug);
    if (dryRun) {
      return {
        token: `${token.slice(0, 12)}…`,
        tokenSufijo: sufi,
        endpoint,
        estado: "conectado" as const,
      };
    }
    const guardado = await ctx.transaccion(async (tx) => {
      const c = await tx.canalSolicitud.upsert({
        where: { tenantId_canal: { tenantId: ctx.tenantId, canal: "formulario_web" } },
        create: {
          tenantId: ctx.tenantId,
          canal: "formulario_web",
          estado: "conectado",
          tokenHash: hash,
          tokenSufijo: sufi,
          tokenCreadoEn: new Date(),
        },
        update: {
          estado: "conectado",
          tokenHash: hash,
          tokenSufijo: sufi,
          tokenCreadoEn: new Date(),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.canal.actualizado",
        entidadTipo: "canal_solicitud",
        entidadId: c.id,
        payload: { canal: "formulario_web", accion: "rotar_token" },
      });
      return c;
    });
    void guardado;
    return { token, tokenSufijo: sufi, endpoint, estado: "conectado" as const };
  },
});

const inputFormularioPublico = z.object({
  token: z.string().min(16).max(200),
  /** Honeypot antispam: debe ir vacío. */
  website: z
    .string()
    .optional()
    .refine((v) => !v?.trim(), { message: "No se pudo procesar el envío." }),
  mensaje: z.string().trim().min(1).max(20_000),
  asunto: textoOpcional(200),
  nombre: camposSolicitud.nombre,
  empresa: camposSolicitud.empresa,
  email: emailSchema.nullable().optional(),
  telefono: telefonoSchema.nullable().optional(),
  rut: rutSchema.nullable().optional(),
  comuna: camposSolicitud.comuna,
  servicio: camposSolicitud.servicio,
  utmSource: utmCampo,
  utmMedium: utmCampo,
  utmCampaign: utmCampo,
  utmContent: utmCampo,
  utmTerm: utmCampo,
  paginaOrigen: textoOpcional(500),
  origin: z.string().nullable().optional(),
  referer: z.string().nullable().optional(),
});

export const solicitudesRecibirFormularioWeb = defineCapability({
  id: "comercial.solicitudes.recibir_formulario_web",
  descripcion:
    "Recibe una solicitud del formulario web público del tenant: valida la clave del canal, honeypot, origen opcional e idempotencia, crea la solicitud y avisa al responsable.",
  permiso: null,
  interna: true,
  input: inputFormularioPublico,
  output: z.object({ id: z.string(), creadaEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun, idempotencyKey }) {
    const canal = await ctx.db.canalSolicitud.findUnique({
      where: { tenantId_canal: { tenantId: ctx.tenantId, canal: "formulario_web" } },
    });
    if (!canal?.tokenHash || canal.estado !== "conectado") {
      throw reglaDeNegocio("El formulario web no está conectado.");
    }
    if (canal.tokenHash !== hashTokenFormulario(input.token)) {
      throw reglaDeNegocio("Clave del formulario inválida.");
    }
    if (!origenPermitido(canal.dominioAutorizado, input.origin ?? null, input.referer ?? null)) {
      throw reglaDeNegocio("El envío no proviene del dominio autorizado.");
    }
    if (!input.email?.trim() && !input.telefono?.trim()) {
      throw reglaDeNegocio("Indica un correo o un teléfono de contacto.");
    }
    // La reserva de idempotencia la hace `executeCapability` con la misma clave: aquí solo se exige.
    if (!idempotencyKey) throw reglaDeNegocio("Falta la cabecera Idempotency-Key.");
    const responsableId = canal.responsableId;
    await responsableValido(ctx, responsableId);
    const textoOriginal = textoOriginalDesdeFormulario({
      mensaje: input.mensaje,
      asunto: input.asunto ?? null,
    });
    const data = definidos({
      textoOriginal,
      asunto: input.asunto,
      nombre: input.nombre,
      empresa: input.empresa,
      email: input.email,
      telefono: input.telefono,
      rut: input.rut,
      comuna: input.comuna,
      servicio: input.servicio,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
      paginaOrigen: input.paginaOrigen,
      canal: "formulario_web" as const,
      estado: "nueva" as const,
      responsableId,
      registradaPorTipo: "sistema",
      registradaPorId: null,
    });
    if (dryRun) return { id: "", creadaEn: new Date().toISOString() };
    const tenant = await ctx.db.tenant.findUniqueOrThrow({
      where: { id: ctx.tenantId },
      select: { nombre: true, slug: true },
    });
    const urlBase = ctx.servicios.urlBase;
    const salida = await ctx.transaccion(async (tx) => {
      const s = await tx.solicitud.create({ data: { ...data, tenantId: ctx.tenantId } });
      await tx.canalSolicitud.update({
        where: { id: canal.id },
        data: { ultimaSolicitudEn: new Date() },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.solicitud.creada",
        entidadTipo: "solicitud",
        entidadId: s.id,
        payload: {
          canal: "formulario_web",
          responsableId,
          nombre: s.nombre ?? s.empresa ?? "Consulta web",
          url: `${urlBase}/solicitudes/${s.id}`,
        },
      });
      return { id: s.id, creadaEn: s.createdAt.toISOString(), email: s.email, nombre: s.nombre };
    });
    const acuse = await ajuste<boolean>(ctx, "comercial", "solicitudes_acuse_recibo");
    if (acuse && salida.email) {
      await enviarCorreo(
        {
          db: ctx.db,
          tenantId: ctx.tenantId,
          correo: ctx.servicios.correo,
          urlBase,
        },
        "comercial.solicitud.acuse",
        salida.email,
        {
          solicitud: { nombre: salida.nombre ?? "Hola" },
          empresa: { nombre: tenant.nombre },
        },
      );
    }
    return { id: salida.id, creadaEn: salida.creadaEn };
  },
});

// Metadatos del formulario web en canales.get (ver solicitudes-canales.ts).
