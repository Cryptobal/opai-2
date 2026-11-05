import { createHash } from "node:crypto";
import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { estadoCorreccion, valorEfectivo } from "../domain";
import { registrarRespuesta } from "./correcciones-responder";

const rutPlano = (r: string) => r.replace(/[.\s-]/g, "").toLowerCase();
export const hashDeToken = (t: string) => createHash("sha256").update(t).digest("hex");

async function porEnlace(ctx: Contexto, token: string, rut: string | undefined) {
  const e = await ctx.db.correccionEnlace.findUnique({ where: { tokenHash: hashDeToken(token) } });
  if (!e) throw noEncontrado("El enlace");
  const c = await ctx.db.correccion.findUnique({ where: { id: e.correccionId } });
  const p = c ? await ctx.db.persona.findUnique({ where: { id: c.personaId }, select: { rut: true } }) : null;
  // El enlace es la credencial y el RUT confirma quién responde: un RUT distinto responde igual que un enlace inexistente.
  if (!c || (rut !== undefined && (!p?.rut || rutPlano(p.rut) !== rutPlano(rut)))) throw noEncontrado("El enlace");
  return c;
}

const tokenSchema = z.string().min(20).max(200);

export const correccionesVerEnlace = defineCapability({
  id: "asistencia.correcciones.ver_enlace",
  descripcion:
    "Muestra, con el enlace personal del aviso, la corrección propuesta sobre una marca (original, valor propuesto, motivo y plazo) para que el trabajador decida. No revela datos personales.",
  permiso: null,
  interna: true,
  input: z.object({ token: tokenSchema }),
  output: z.object({
    original: z.string(), propuesta: z.string(), motivo: z.string(), venceEn: z.string().nullable(),
    estado: z.enum(["pendiente", "aceptada", "objetada", "vencida"]),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const c = await porEnlace(ctx, i.token, undefined);
    const marca = await ctx.db.marca.findUniqueOrThrow({ where: { id: c.marcaId } });
    const r = await ctx.db.correccionRespuesta.findUnique({ where: { tenantId_correccionId: { tenantId: ctx.tenantId, correccionId: c.id } } });
    const estado = estadoCorreccion(
      { selloServidor: c.horaServidor, plazoHoras: c.plazoHoras },
      r && r.resultado !== "vencida" ? (r.resultado as "aceptada" | "objetada") : null,
      new Date(),
    );
    const v = valorEfectivo({ tipo: marca.tipo as never, hora: marca.horaServidor }, { tipo: c.tipoPropuesto as never, hora: c.horaPropuesta }, estado);
    const f = (x: { tipo: string; hora: Date }) => `${x.tipo} · ${x.hora.toISOString()}`;
    return { original: f(v.original), propuesta: f({ tipo: c.tipoPropuesto, hora: c.horaPropuesta }), motivo: c.motivo, venceEn: c.venceEn?.toISOString() ?? null, estado };
  },
});

export const correccionesResponderEnlace = defineCapability({
  id: "asistencia.correcciones.responder_enlace",
  descripcion:
    "Responde (acepta u objeta) una corrección desde el enlace personal del aviso, sin sesión, identificándose con el RUT. Objetar exige un comentario.",
  permiso: null,
  interna: true,
  input: z.object({
    token: tokenSchema, rut: z.string().min(8).max(14),
    resultado: z.enum(["aceptada", "objetada"]), comentario: z.string().trim().max(500).optional(),
  }),
  output: z.object({ resultado: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const c = await porEnlace(ctx, i.token, i.rut);
    if (dryRun) return { resultado: i.resultado };
    if (i.resultado === "objetada" && (i.comentario?.trim().length ?? 0) < 3) throw reglaDeNegocio("Para objetar escribe un comentario.");
    await ctx.transaccion((tx) => registrarRespuesta(ctx, tx, c.id, i.resultado, i.comentario, "enlace"));
    return { resultado: i.resultado };
  },
});
