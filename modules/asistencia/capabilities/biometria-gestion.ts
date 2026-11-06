import { z } from "zod";

import { type Contexto, defineCapability, noEncontrado } from "@opai/capabilities";

import { TIPOS_CONSENTIMIENTO, VERSION_CONSENTIMIENTO } from "../domain";
import { darDeBaja } from "./biometria-comun";
import { uuid } from "./esquemas";
import { personaPropia } from "./persona-propia";

const estadoSchema = z.object({
  rostroEnrolado: z.boolean(),
  proveedor: z.string().nullable(),
  enroladoEn: z.string().nullable(),
  consentimientos: z.array(z.object({ tipo: z.enum(TIPOS_CONSENTIMIENTO), vigente: z.boolean(), version: z.string().nullable() })),
  telefonoPersonalHabilitado: z.boolean(),
  /** Solo en `mi_estado`: la propia persona y su instalación, para marcar. */
  yo: z.object({ personaId: z.string(), instalacionId: z.string().nullable(), instalacionNombre: z.string().nullable() }).nullable(),
});

async function estadoDe(ctx: Contexto, personaId: string) {
  const [e, cs, cred] = await Promise.all([
    ctx.db.enrolamientoFacial.findUnique({ where: { tenantId_personaId: { tenantId: ctx.tenantId, personaId } } }),
    ctx.db.consentimientoPersona.findMany({ where: { personaId, revocadoEn: null } }),
    ctx.db.credencialTerreno.findUnique({ where: { personaId }, select: { telefonoPersonalHabilitado: true } }),
  ]);
  return {
    rostroEnrolado: e?.estado === "activo", proveedor: e?.estado === "activo" ? e.proveedor : null,
    enroladoEn: e?.estado === "activo" ? e.enroladoEn.toISOString() : null,
    consentimientos: TIPOS_CONSENTIMIENTO.map((tipo) => {
      const c = cs.find((x) => x.tipo === tipo);
      return { tipo, vigente: !!c && c.version === VERSION_CONSENTIMIENTO[tipo], version: c?.version ?? null };
    }),
    telefonoPersonalHabilitado: cred?.telefonoPersonalHabilitado ?? false,
    yo: null as { personaId: string; instalacionId: string | null; instalacionNombre: string | null } | null,
  };
}

export const biometriaEstado = defineCapability({
  id: "asistencia.biometria.estado",
  descripcion:
    "Estado de la identificación facial de una persona: si tiene el rostro enrolado, qué consentimientos están vigentes y si está habilitada para marcar desde su teléfono. Nunca devuelve la referencia del proveedor ni datos biométricos.",
  permiso: "asistencia:ver_todo",
  input: z.object({ personaId: uuid }),
  output: estadoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    if (!(await ctx.db.persona.findFirst({ where: { id: i.personaId, archivadaEn: null, anonimizadaEn: null }, select: { id: true } })))
      throw noEncontrado("La persona");
    return estadoDe(ctx, i.personaId);
  },
});

export const biometriaMiEstado = defineCapability({
  id: "asistencia.biometria.mi_estado",
  descripcion:
    "Estado de mi identificación facial y de mis consentimientos: si mi rostro está enrolado, qué aceptaste y si puedes marcar desde tu teléfono. Es solo de la propia persona y no devuelve datos biométricos.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  input: z.object({}),
  output: estadoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const p = await personaPropia(ctx);
    const v = await ctx.db.vinculoLaboral.findFirst({ where: { personaId: p.id, estado: "vigente" }, select: { instalacionId: true } });
    const inst = v?.instalacionId ? await ctx.db.instalacion.findUnique({ where: { id: v.instalacionId }, select: { id: true, nombre: true } }) : null;
    return { ...(await estadoDe(ctx, p.id)), yo: { personaId: p.id, instalacionId: inst?.id ?? null, instalacionNombre: inst?.nombre ?? null } };
  },
});

export const biometriaDarDeBaja = defineCapability({
  id: "asistencia.biometria.dar_de_baja",
  descripcion:
    "RR. HH. borra la biometría de una persona a su pedido o por decisión de la empresa: se elimina su rostro en el proveedor y en la base, y la persona sigue marcando con RUT y PIN. Queda en la bitácora y no se puede deshacer.",
  permiso: "asistencia:configurar",
  portales: ["erp"],
  soloPersonas: true,
  input: z.object({ personaId: uuid }),
  output: z.object({ borrada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const e = await ctx.db.enrolamientoFacial.findFirst({ where: { personaId: i.personaId, estado: "activo" } });
    if (dryRun || !e) return { borrada: false };
    await darDeBaja(ctx, e, "rrhh");
    return { borrada: true };
  },
});
