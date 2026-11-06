import { createHash } from "node:crypto";
import { z } from "zod";

import { type Contexto, defineCapability, noEncontrado } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { TEXTO_CONSENTIMIENTO, TIPOS_CONSENTIMIENTO, type TipoConsentimiento, VERSION_CONSENTIMIENTO } from "../domain";
import { darDeBaja } from "./biometria-comun";
import { uuid } from "./esquemas";
import { personaPropia } from "./persona-propia";
import { usuarioId } from "./usuario";

const salida = z.object({
  tipo: z.enum(TIPOS_CONSENTIMIENTO), version: z.string(), aceptadoEn: z.string(), vigente: z.boolean(),
});

/** Registra la aceptación de la versión vigente del texto; una anterior de ese tipo se revoca. Idempotente. */
async function aceptar(ctx: Contexto, tx: TenantTx, personaId: string, tipo: TipoConsentimiento, medio: "kiosco" | "erp" | "portal") {
  const version = VERSION_CONSENTIMIENTO[tipo];
  const vigente = await tx.consentimientoPersona.findFirst({ where: { personaId, tipo, revocadoEn: null } });
  if (vigente?.version === version) return vigente;
  const ahora = new Date();
  if (vigente) await tx.consentimientoPersona.update({ where: { id: vigente.id }, data: { revocadoEn: ahora } });
  const fila = await tx.consentimientoPersona.create({
    data: {
      tenantId: ctx.tenantId, personaId, tipo, version, medio, aceptadoEn: ahora, registradoPor: usuarioId(ctx),
      textoHash: createHash("sha256").update(TEXTO_CONSENTIMIENTO[tipo]).digest("hex"),
    },
  });
  await ctx.bitacora.registrar(tx, {
    tipo: "asistencia.consentimiento.registrado", entidadTipo: "consentimiento", entidadId: fila.id, payload: { personaId, tipo, version, medio },
  });
  return fila;
}

const vista = (f: { tipo: string; version: string; aceptadoEn: Date }) =>
  ({ tipo: f.tipo as TipoConsentimiento, version: f.version, aceptadoEn: f.aceptadoEn.toISOString(), vigente: true });

export const consentimientosAceptar = defineCapability({
  id: "asistencia.consentimientos.aceptar",
  descripcion:
    "La propia persona acepta, desde Terreno o el Portal Trabajador, el consentimiento versionado para el uso de su rostro o de su teléfono personal al marcar. Queda la versión, el texto (por su huella) y la fecha. Un agente nunca consiente por una persona.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  input: z.object({ tipo: z.enum(TIPOS_CONSENTIMIENTO) }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const p = await personaPropia(ctx);
    if (dryRun) return { tipo: i.tipo, version: VERSION_CONSENTIMIENTO[i.tipo], aceptadoEn: new Date().toISOString(), vigente: false };
    return vista(await ctx.transaccion((tx) => aceptar(ctx, tx, p.id, i.tipo, ctx.portal === "terreno" ? "kiosco" : "portal")));
  },
});

export const consentimientosRegistrar = defineCapability({
  id: "asistencia.consentimientos.registrar",
  descripcion:
    "RR. HH. registra el consentimiento escrito de una persona para el uso de su rostro o de su teléfono personal al marcar, cuando lo firmó en papel o ante ellos. Queda la versión del texto, la fecha y quién lo registró.",
  permiso: "asistencia:configurar",
  portales: ["erp"],
  soloPersonas: true,
  input: z.object({ personaId: uuid, tipo: z.enum(TIPOS_CONSENTIMIENTO) }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!(await ctx.db.persona.findFirst({ where: { id: i.personaId, archivadaEn: null, anonimizadaEn: null }, select: { id: true } })))
      throw noEncontrado("La persona");
    if (dryRun) return { tipo: i.tipo, version: VERSION_CONSENTIMIENTO[i.tipo], aceptadoEn: new Date().toISOString(), vigente: false };
    return vista(await ctx.transaccion((tx) => aceptar(ctx, tx, i.personaId, i.tipo, "erp")));
  },
});

export const consentimientosRevocar = defineCapability({
  id: "asistencia.consentimientos.revocar",
  descripcion:
    "La propia persona revoca su consentimiento (rostro o teléfono personal). Al revocar el rostro se borra su biometría en el proveedor y sigue marcando con RUT y PIN. Es inmediato y no necesita aprobación.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  input: z.object({ tipo: z.enum(TIPOS_CONSENTIMIENTO) }),
  output: z.object({ revocado: z.boolean(), biometriaBorrada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const p = await personaPropia(ctx);
    const vigente = await ctx.db.consentimientoPersona.findFirst({ where: { personaId: p.id, tipo: i.tipo, revocadoEn: null } });
    if (dryRun || !vigente) return { revocado: false, biometriaBorrada: false };
    await ctx.transaccion(async (tx) => {
      await tx.consentimientoPersona.update({ where: { id: vigente.id }, data: { revocadoEn: new Date() } });
      await ctx.bitacora.registrar(tx, {
        tipo: "asistencia.consentimiento.revocado", entidadTipo: "consentimiento", entidadId: vigente.id, payload: { personaId: p.id, tipo: i.tipo },
      });
    });
    if (i.tipo !== "biometria_facial") return { revocado: true, biometriaBorrada: false };
    const e = await ctx.db.enrolamientoFacial.findFirst({ where: { personaId: p.id, estado: "activo" } });
    if (!e) return { revocado: true, biometriaBorrada: false };
    // Si el proveedor falla, el consentimiento ya está revocado (el rostro no se usa) y el trabajo diario reintenta.
    const borrada = await darDeBaja(ctx, e, "trabajador").then(() => true, () => false);
    return { revocado: true, biometriaBorrada: borrada };
  },
});

export const consentimientosTextos = defineCapability({
  id: "asistencia.consentimientos.textos",
  descripcion:
    "Textos vigentes de los consentimientos de Asistencia (uso del rostro y del teléfono personal) con su versión, tal como se muestran y se aceptan. Sirve para que la persona los lea antes de consentir.",
  permiso: null,
  portales: ["erp", "terreno", "trabajador"],
  input: z.object({}),
  output: z.array(z.object({ tipo: z.enum(TIPOS_CONSENTIMIENTO), version: z.string(), texto: z.string() })),
  efecto: "lectura",
  dryRun: false,
  handler: async () => TIPOS_CONSENTIMIENTO.map((tipo) => ({ tipo, version: VERSION_CONSENTIMIENTO[tipo], texto: TEXTO_CONSENTIMIENTO[tipo] })),
});
