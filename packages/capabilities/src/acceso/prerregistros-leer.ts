import { z } from "zod";

import { cursorDe } from "../core/maestros/comun";
import { tenantActual } from "../core/comun";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { dondeInstalacionId, instalacionEnAlcance } from "../rondas/comun";
import { nombresInstalacion, paginaConInstalacion, PERMISO_PATENTE, PERMISO_READ } from "./comun";
import { codigoInvitacion } from "./huella";
import {
  diaSchema,
  fechaDia,
  hoyEmpresa,
  PERMISO_PRERREGISTRO,
  prerregistroSchema,
  vistaPrerregistro,
} from "./prerregistro-comun";

export const prerregistrosListar = defineCapability({
  id: "acceso.prerregistros.listar",
  descripcion:
    "Lista los prerregistros de visitas de una instalación o de todas las del alcance: los esperados de un día, o sin día los vigentes y próximos. Trae los visitantes con el documento enmascarado y el estado de cada día (pendiente, no llegó o cancelado).",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    dia: diaSchema
      .optional()
      .describe("Esperados de ese día; sin él, los que terminan hoy o después."),
    cursor: z.uuid().optional().describe("Id del último prerregistro de la página anterior."),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ items: z.array(prerregistroSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((p) => p.id),
  async handler(ctx, input) {
    if (input.instalacionId) await instalacionEnAlcance(ctx, input.instalacionId);
    const hoy = await hoyEmpresa(ctx);
    const dia = input.dia ? fechaDia(input.dia) : null;
    const filas = await ctx.db.prerregistro.findMany({
      where: {
        AND: [
          dondeInstalacionId(ctx),
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
          dia ? { desde: { lte: dia }, hasta: { gte: dia } } : { hasta: { gte: fechaDia(hoy) } },
        ],
      },
      orderBy: [{ desde: "asc" }, { id: "asc" }],
      include: { visitantes: { orderBy: { createdAt: "asc" } } },
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente, instalacion } = await paginaConInstalacion(ctx, filas, input);
    const verPatente = ctx.autorizar(PERMISO_PATENTE);
    return {
      siguiente,
      items: items.map((p) =>
        vistaPrerregistro(p, { instalacion: instalacion(p.instalacionId), hoy, verPatente }),
      ),
    };
  },
});

export const prerregistrosObtener = defineCapability({
  id: "acceso.prerregistros.get",
  descripcion:
    "Devuelve un prerregistro de visita de una instalación del alcance: fechas, horario, anfitrión, motivo, nota para el guardia, visitantes con el documento enmascarado y el estado de cada día.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: prerregistroSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => [salida.id],
  async handler(ctx, { id }) {
    const p = await ctx.db.prerregistro.findFirst({
      where: { AND: [{ id }, dondeInstalacionId(ctx)] },
      include: { visitantes: { orderBy: { createdAt: "asc" } } },
    });
    if (!p) throw noEncontrado("El prerregistro");
    const [hoy, nombres] = await Promise.all([
      hoyEmpresa(ctx),
      nombresInstalacion(ctx, [p.instalacionId]),
    ]);
    return vistaPrerregistro(p, {
      instalacion: nombres.get(p.instalacionId) ?? "",
      hoy,
      verPatente: ctx.autorizar(PERMISO_PATENTE),
    });
  },
});

export const prerregistrosInvitacion = defineCapability({
  id: "acceso.prerregistros.invitacion",
  descripcion:
    "Devuelve la invitación de un visitante prerregistrado para un día: nombre, instalación, horario, anfitrión y el código del QR de ese día, para mostrarla o enviarla. El código sirve una sola vez y solo ese día; no hay invitación de un día pasado ni de un prerregistro cancelado.",
  permiso: PERMISO_PRERREGISTRO,
  input: z.object({ visitanteId: uuidSchema, dia: diaSchema }),
  output: z.object({
    empresa: z.string(),
    visitante: z.string(),
    instalacion: z.string(),
    dia: z.string(),
    desdeMin: z.number().int().nullable(),
    hastaMin: z.number().int().nullable(),
    anfitrion: z.string(),
    codigo: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (_salida, input) => [input.visitanteId],
  async handler(ctx, { visitanteId, dia }) {
    const v = await ctx.db.prerregistroVisitante.findFirst({
      where: { id: visitanteId, prerregistro: dondeInstalacionId(ctx) },
      include: { prerregistro: true },
    });
    if (!v) throw noEncontrado("El visitante");
    const p = v.prerregistro;
    const d = fechaDia(dia);
    if (p.canceladoEn) throw reglaDeNegocio("El prerregistro está cancelado.");
    if (d < p.desde || d > p.hasta) throw reglaDeNegocio("Ese día no está en el prerregistro.");
    if (d < fechaDia(await hoyEmpresa(ctx))) throw reglaDeNegocio("Ese día ya pasó.");
    const [tenant, nombres] = await Promise.all([
      tenantActual(ctx),
      nombresInstalacion(ctx, [p.instalacionId]),
    ]);
    return {
      empresa: tenant.nombre,
      visitante: v.nombre,
      instalacion: nombres.get(p.instalacionId) ?? "",
      dia,
      desdeMin: p.desdeMin,
      hastaMin: p.hastaMin,
      anfitrion: p.anfitrion,
      codigo: codigoInvitacion(ctx.tenantId, v.id, dia),
    };
  },
});
