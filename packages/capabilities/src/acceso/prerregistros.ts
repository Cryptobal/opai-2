import { z } from "zod";

import { validarRangoPrerregistro } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { dondeInstalacionId, instalacionEnAlcance } from "../rondas/comun";
import { nombresInstalacion, PERMISO_PATENTE, PERMISO_REGISTROS, quien } from "./comun";
import {
  diaSchema,
  fechaDia,
  hoyEmpresa,
  PERMISO_PRERREGISTRO,
  prerregistroSchema,
  vistaPrerregistro,
} from "./prerregistro-comun";
import { visitanteParaGuardar, visitanteSchema } from "./prerregistro-visitante";

const minuto = z.number().int().min(0).max(1439);
const NULO = "00000000-0000-0000-0000-000000000000";

export const prerregistrosCrear = defineCapability({
  id: "acceso.prerregistros.crear",
  descripcion:
    "Prerregistra una visita de uno o varios días (hasta 30) en una instalación, con uno o varios visitantes, horario esperado, anfitrión, motivo y nota para el guardia. Cada visitante recibe un QR por día, de un solo uso. Del documento se guarda solo la huella y la máscara.",
  permiso: PERMISO_PRERREGISTRO,
  input: z.object({
    instalacionId: uuidSchema,
    visitantes: z.array(visitanteSchema).min(1).max(20),
    desde: diaSchema,
    hasta: diaSchema.optional().describe("Último día; sin él, la visita es de un solo día."),
    desdeMin: minuto
      .optional()
      .describe("Hora de llegada esperada, en minutos desde la medianoche."),
    hastaMin: minuto.optional(),
    anfitrion: z.string().trim().min(2).max(120),
    motivo: z.string().trim().max(200).optional(),
    nota: z.string().trim().max(300).optional(),
    avisarLlegada: z.boolean().default(false),
  }),
  output: prerregistroSchema,
  efecto: "escritura",
  dryRun: true,
  // Los números de documento nunca quedan en la auditoría ni en las aprobaciones.
  sensibles: ["visitantes"],
  async handler(ctx, i, { dryRun }) {
    await instalacionEnAlcance(ctx, i.instalacionId);
    const hoy = await hoyEmpresa(ctx);
    const hasta = i.hasta ?? i.desde;
    const error = validarRangoPrerregistro(i.desde, hasta, hoy);
    if (error) throw reglaDeNegocio(error);
    if ((i.desdeMin === undefined) !== (i.hastaMin === undefined))
      throw reglaDeNegocio("El horario necesita desde y hasta.");
    if (i.desdeMin !== undefined && i.hastaMin !== undefined && i.desdeMin >= i.hastaMin)
      throw reglaDeNegocio("El horario termina antes de empezar.");
    const visitantes = i.visitantes.map((v) => visitanteParaGuardar(ctx, v));
    if (new Set(visitantes.map((v) => `${v.docTipo}:${v.huella}`)).size < visitantes.length)
      throw reglaDeNegocio("Hay un visitante repetido.");
    const datos = {
      tenantId: ctx.tenantId,
      instalacionId: i.instalacionId,
      desde: fechaDia(i.desde),
      hasta: fechaDia(hasta),
      desdeMin: i.desdeMin ?? null,
      hastaMin: i.hastaMin ?? null,
      anfitrion: i.anfitrion,
      motivo: i.motivo || null,
      nota: i.nota || null,
      avisarLlegada: i.avisarLlegada,
      creadoPor: quien(ctx),
    };
    const fila = dryRun
      ? {
          ...datos,
          id: NULO,
          canceladoEn: null,
          visitantes: visitantes.map((v) => ({ ...v, id: NULO })),
        }
      : await ctx.db.prerregistro.create({
          data: { ...datos, visitantes: { create: visitantes } },
          include: { visitantes: true },
        });
    const nombres = await nombresInstalacion(ctx, [i.instalacionId]);
    return vistaPrerregistro(fila, {
      instalacion: nombres.get(i.instalacionId) ?? "",
      hoy,
      verPatente: ctx.autorizar(PERMISO_PATENTE),
    });
  },
});

export const prerregistrosCancelar = defineCapability({
  id: "acceso.prerregistros.cancelar",
  descripcion:
    "Cancela un prerregistro de visita que aún no termina: sus QR dejan de servir desde ese momento. Puede cancelarlo quien lo creó o quien gestiona los registros de acceso. No se borra: queda cancelado, con quién y cuándo.",
  permiso: PERMISO_PRERREGISTRO,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, canceladoEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const p = await ctx.db.prerregistro.findFirst({
      where: { AND: [{ id }, dondeInstalacionId(ctx)] },
      select: { id: true, hasta: true, creadoPor: true, canceladoEn: true },
    });
    if (!p) throw noEncontrado("El prerregistro");
    if (p.canceladoEn) throw reglaDeNegocio("El prerregistro ya está cancelado.");
    if (p.hasta < fechaDia(await hoyEmpresa(ctx)))
      throw reglaDeNegocio("El prerregistro ya terminó.");
    if (p.creadoPor !== quien(ctx) && !ctx.autorizar(PERMISO_REGISTROS))
      throw prohibido(
        "Solo quien creó el prerregistro o quien gestiona los registros puede cancelarlo.",
      );
    const ahora = new Date();
    if (!dryRun)
      await ctx.db.prerregistro.update({
        where: { id },
        data: { canceladoEn: ahora, canceladoPor: quien(ctx) },
      });
    return { id, canceladoEn: ahora.toISOString() };
  },
});
