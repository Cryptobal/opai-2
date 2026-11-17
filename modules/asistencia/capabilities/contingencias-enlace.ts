import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { resolverContingencia } from "./contingencias-resolver";
import { hashDeToken } from "./correcciones-enlace";
import { ETIQUETA_TIPO } from "./formato";

const PLAZO_MS = 48 * 3_600_000;
const tokenSchema = z.string().min(20).max(200);
const rutPlano = (r: string) => r.replace(/[.\s-]/g, "").toLowerCase();

async function porEnlace(ctx: Contexto, token: string, rut: string | undefined) {
  const e = await ctx.db.contingenciaEnlace.findUnique({ where: { tokenHash: hashDeToken(token) } });
  if (!e || e.venceEn.getTime() < Date.now()) throw noEncontrado("El enlace");
  const c = await ctx.db.contingencia.findUnique({ where: { id: e.contingenciaId } });
  const p = c ? await ctx.db.persona.findUnique({ where: { id: c.personaId }, select: { rut: true, usuarioId: true } }) : null;
  if (!c || (rut !== undefined && (!p?.rut || rutPlano(p.rut) !== rutPlano(rut)))) throw noEncontrado("El enlace");
  return { c, venceEn: e.venceEn };
}

export const contingenciasVerEnlace = defineCapability({
  id: "asistencia.contingencias.ver_enlace",
  descripcion: "Muestra una contingencia propuesta para aceptar u objetar desde el enlace del correo.",
  permiso: null,
  interna: true,
  input: z.object({ token: tokenSchema }),
  output: z.object({
    tipo: z.string(),
    hora: z.string(),
    motivo: z.string(),
    venceEn: z.string(),
    estado: z.enum(["pendiente", "aceptada", "rechazada"]),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const { c, venceEn } = await porEnlace(ctx, i.token, undefined);
    return {
      tipo: ETIQUETA_TIPO[c.tipo] ?? c.tipo,
      hora: c.horaDeclarada.toISOString(),
      motivo: c.motivo,
      venceEn: venceEn.toISOString(),
      estado: c.estado as "pendiente" | "aceptada" | "rechazada",
    };
  },
});

export const contingenciasResponderEnlace = defineCapability({
  id: "asistencia.contingencias.responder_enlace",
  descripcion: "Acepta u objeta una contingencia desde el enlace personal, identificándose con el RUT.",
  permiso: null,
  interna: true,
  input: z.object({
    token: tokenSchema,
    rut: z.string().min(8).max(14),
    decision: z.enum(["aceptada", "rechazada"]),
    comentario: z.string().trim().max(500).optional(),
  }),
  output: z.object({ decision: z.string() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const { c } = await porEnlace(ctx, i.token, i.rut);
    const p = await ctx.db.persona.findUniqueOrThrow({ where: { id: c.personaId }, select: { usuarioId: true } });
    if (dryRun) return { decision: i.decision };
    if (i.decision === "rechazada" && (i.comentario?.trim().length ?? 0) < 3) throw reglaDeNegocio("Para objetar escribe un comentario.");
    await ctx.transaccion((tx) => resolverContingencia(ctx, tx, c, i.decision, i.comentario, p.usuarioId ?? ""));
    return { decision: i.decision };
  },
});

export const plazoEnlaceContingencia = (desde: Date) => new Date(desde.getTime() + PLAZO_MS);