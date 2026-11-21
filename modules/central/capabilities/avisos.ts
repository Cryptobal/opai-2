import { z } from "zod";

import { type Contexto, defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { acuseObligatorioPorDefecto, acuseTarde, PLAZO_ACUSE_MIN, TEXTO_AVISO_MAX, TIPOS_AVISO, vigenciaValida } from "../domain/mensajes";
import { uuidSchema } from "./esquemas";
import { esTrabajador, PERMISO_AVISOS, personaPropia, registrarEnBitacora, TRABAJO_ACUSE } from "./mensajes-util";
import { ID_VISTA_PREVIA, exigirPersona } from "./util";

const MAX_DESTINATARIOS = 500;

/**
 * Personas que reciben el aviso: las nombradas y las que tienen vínculo vigente en las instalaciones
 * elegidas, siempre dentro del alcance de quien envía (R17, R20). Cada una lleva su instalación.
 */
async function destinatarios(ctx: Contexto, personas: string[], instalaciones: string[]) {
  const alcance = ctx.alcance ? new Set(ctx.alcance.instalaciones) : null;
  if (alcance && instalaciones.some((i) => !alcance.has(i))) throw noEncontrado("La instalación");
  const insts = await ctx.db.instalacion.findMany({ where: { id: { in: instalaciones } }, select: { id: true } });
  if (insts.length !== new Set(instalaciones).size) throw noEncontrado("La instalación");
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { estado: "vigente", OR: [{ instalacionId: { in: instalaciones } }, { personaId: { in: personas } }] },
    select: { personaId: true, instalacionId: true },
    orderBy: { inicio: "desc" },
  });
  const porPersona = new Map<string, string | null>();
  for (const v of vinculos) {
    const pedida = personas.includes(v.personaId) || (v.instalacionId != null && instalaciones.includes(v.instalacionId));
    if (pedida && !porPersona.has(v.personaId)) porPersona.set(v.personaId, v.instalacionId);
  }
  const nombradas = await ctx.db.persona.findMany({ where: { id: { in: personas }, archivadaEn: null }, select: { id: true } });
  if (nombradas.length !== new Set(personas).size) throw noEncontrado("La persona");
  for (const p of nombradas) if (!porPersona.has(p.id)) porPersona.set(p.id, null);
  const lista = [...porPersona.entries()].map(([personaId, instalacionId]) => ({ personaId, instalacionId }));
  if (alcance && lista.some((d) => !d.instalacionId || !alcance.has(d.instalacionId))) throw noEncontrado("La persona");
  return lista;
}

/** La central envía una consigna, un cambio de turno o una instrucción, con o sin acuse (R17). */
export const avisosCrear = defineCapability({
  id: "central.avisos.crear",
  descripcion:
    "Envía un aviso de la central (consigna, cambio de turno o instrucción) a personas o a quienes trabajan en ciertas instalaciones, con acuse obligatorio y plazo. Sin acuse en el plazo se abre una alerta. Un cambio de turno solo avisa: no cambia la pauta.",
  permiso: PERMISO_AVISOS,
  portales: ["erp", "supervisor"],
  input: z
    .object({
      tipo: z.enum(TIPOS_AVISO),
      texto: z.string().trim().min(1).max(TEXTO_AVISO_MAX),
      personas: z.array(uuidSchema).max(MAX_DESTINATARIOS).default([]),
      instalaciones: z.array(uuidSchema).max(50).default([]),
      acuseObligatorio: z.boolean().optional(),
      plazoMin: z.number().int().min(5).max(1440).default(PLAZO_ACUSE_MIN),
      vigenteDesde: z.coerce.date().optional(),
      vigenteHasta: z.coerce.date().optional(),
    })
    .refine((i) => i.personas.length + i.instalaciones.length > 0, "Elige al menos una persona o instalación."),
  output: z.object({ id: uuidSchema, destinatarios: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  // Aviso masivo a más de una instalación: un agente necesita aprobación humana (spec §9, R11).
  exigeAprobacion: (i) => i.instalaciones.length > 1,
  async handler(ctx, i, { dryRun }) {
    if (!vigenciaValida(i.vigenteDesde ?? null, i.vigenteHasta ?? null)) throw reglaDeNegocio("El fin de la vigencia debe ser posterior al inicio.");
    const lista = await destinatarios(ctx, [...new Set(i.personas)], [...new Set(i.instalaciones)]);
    if (lista.length === 0) throw reglaDeNegocio("Nadie trabaja hoy en esas instalaciones: el aviso no tendría destinatarios.");
    if (lista.length > MAX_DESTINATARIOS) throw reglaDeNegocio(`Un aviso llega como máximo a ${MAX_DESTINATARIOS} personas.`);
    if (dryRun) return { id: ID_VISTA_PREVIA, destinatarios: lista.length };
    const acuse = i.acuseObligatorio ?? acuseObligatorioPorDefecto(i.tipo);
    const vence = acuse ? new Date(Date.now() + i.plazoMin * 60_000) : null;
    return ctx.transaccion(async (tx) => {
      const a = await tx.centralAviso.create({
        data: {
          tenantId: ctx.tenantId,
          tipo: i.tipo,
          texto: i.texto,
          acuseObligatorio: acuse,
          plazoMin: acuse ? i.plazoMin : null,
          vigenteDesde: i.vigenteDesde ?? null,
          vigenteHasta: i.vigenteHasta ?? null,
          enviadoPorId: ctx.usuario?.id ?? null,
        },
      });
      await tx.centralAvisoDestinatario.createMany({
        data: lista.map((d) => ({ tenantId: ctx.tenantId, avisoId: a.id, ...d, venceEn: vence })),
      });
      if (vence)
        await ctx.trabajos.encolar(tx, { tipo: TRABAJO_ACUSE, payload: { avisoId: a.id }, programadoPara: vence, claveUnica: `acuse:${a.id}` });
      await registrarEnBitacora(ctx, tx, "central.aviso.enviado", "central.aviso", a.id);
      await ctx.eventos.emitir(tx, { tipo: "central.aviso.enviado", entidadTipo: "central.aviso", entidadId: a.id, payload: { tipo: i.tipo, destinatarios: lista.length } });
      return { id: a.id, destinatarios: lista.length };
    });
  },
});

/** El guardia confirma «leído y entendido» (R17, CA7): hecho inmutable con hora de servidor. */
export const avisosAcusar = defineCapability({
  id: "central.avisos.acusar",
  descripcion: "El guardia confirma que leyó y entendió un aviso de la central. El acuse queda con la hora del servidor y no se puede editar; si llega tarde, queda marcado.",
  permiso: null,
  portales: ["trabajador"],
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, tarde: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!esTrabajador(ctx)) throw reglaDeNegocio("El acuse lo hace el guardia desde su portal.");
    exigirPersona(ctx, "acusar un aviso por un guardia");
    const persona = await personaPropia(ctx);
    const d = await ctx.db.centralAvisoDestinatario.findFirst({ where: { avisoId: i.id, personaId: persona.id } });
    if (!d) throw noEncontrado("El aviso");
    if (await ctx.db.centralAcuse.findFirst({ where: { avisoId: i.id, personaId: persona.id } })) throw reglaDeNegocio("Ya acusaste este aviso.");
    const tarde = acuseTarde(d.venceEn, new Date());
    if (dryRun) return { id: ID_VISTA_PREVIA, tarde };
    return ctx
      .transaccion(async (tx) => {
        const a = await tx.centralAcuse.create({ data: { tenantId: ctx.tenantId, avisoId: i.id, personaId: persona.id, tarde } });
        await registrarEnBitacora(ctx, tx, "central.aviso.acusado", "central.aviso", i.id);
        return { id: a.id, tarde };
      })
      .catch((e: unknown) => {
        // Dos acuses a la vez: el índice único deja uno solo.
        throw (e as { code?: string }).code === "P2002" ? reglaDeNegocio("Ya acusaste este aviso.") : e;
      });
  },
});
