import { z } from "zod";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, diaSchema, opcionalAFecha } from "../core/maestros/comun";
import { estadoDeTipo } from "./dominio";
import { cuentaValida, instalacionesDeCuenta, responsableValido } from "./validaciones";
import {
  PERMISO_MANAGE,
  embudoPorDefecto,
  negocioSchema,
  tipoVinculoSchema,
  vistaNegocio,
} from "./comun";
import { idAutor } from "../autor";

export const camposNegocio = {
  titulo: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .describe("Título del negocio (por defecto «cuenta · servicio»)."),
  tipoId: uuidSchema.nullable().optional().describe("Tipo de negocio (catálogo del tenant)."),
  origenId: uuidSchema.nullable().optional().describe("Origen del negocio (catálogo del tenant)."),
  responsableId: uuidSchema
    .nullable()
    .optional()
    .describe("Responsable; por defecto, quien lo crea."),
  probabilidad: z.number().int().min(0).max(100).optional(),
  montoEstimadoMensual: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .describe("CLP entero > 0."),
  cierreEstimado: diaSchema.nullable().optional(),
  inicioServicioEstimado: diaSchema.nullable().optional(),
};

export const negociosCreate = defineCapability({
  id: "comercial.negocios.create",
  descripcion:
    "Crea un negocio en la primera etapa del embudo por defecto, vinculado a una cuenta, con responsable, tipo, origen, monto estimado e instalaciones de la cuenta opcionales.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    cuentaId: uuidSchema,
    ...camposNegocio,
    instalaciones: z
      .array(z.object({ instalacionId: uuidSchema, tipo: tipoVinculoSchema.default("nueva") }))
      .max(50)
      .optional()
      .describe("Instalaciones de la misma cuenta que se vinculan al crear (R7, R16)."),
  }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cuentaValida(ctx, input.cuentaId);
    await responsableValido(ctx, input.responsableId);
    const instalaciones = await instalacionesDeCuenta(
      ctx,
      input.cuentaId,
      input.instalaciones ?? [],
    );
    const embudo = await embudoPorDefecto(ctx);
    const primera = await ctx.db.etapa.findFirst({
      where: { embudoId: embudo.id, activa: true },
      orderBy: { orden: "asc" },
    });
    if (!primera) throw reglaDeNegocio("El embudo no tiene etapas.");
    const responsableId = input.responsableId ?? ctx.usuario?.id ?? null;
    const data = definidos({
      titulo: input.titulo,
      cuentaId: input.cuentaId,
      embudoId: embudo.id,
      etapaId: primera.id,
      estado: estadoDeTipo(primera.tipo),
      tipoId: input.tipoId,
      origenId: input.origenId,
      responsableId,
      probabilidad: input.probabilidad ?? primera.probabilidad,
      montoEstimadoMensual: input.montoEstimadoMensual,
      cierreEstimado: opcionalAFecha(input.cierreEstimado),
      inicioServicioEstimado: opcionalAFecha(input.inicioServicioEstimado),
    });
    if (dryRun) {
      return vistaNegocio({
        id: "",
        valorMensual: null,
        cotizacionEnviadaEn: null,
        motivoPerdidaId: null,
        motivoPerdidaDetalle: null,
        competidor: null,
        ganadoEn: null,
        perdidoEn: null,
        archivadoEn: null,
        createdAt: new Date(),
        ...data,
        tipoId: data.tipoId ?? null,
        origenId: data.origenId ?? null,
        responsableId: data.responsableId ?? null,
        montoEstimadoMensual: data.montoEstimadoMensual ?? null,
        cierreEstimado: data.cierreEstimado ?? null,
        inicioServicioEstimado: data.inicioServicioEstimado ?? null,
      });
    }
    const creado = await ctx.transaccion(async (tx) => {
      const n = await tx.negocio.create({ data: { ...data, tenantId: ctx.tenantId } });
      for (const i of instalaciones) {
        await tx.negocioInstalacion.create({
          data: { tenantId: ctx.tenantId, negocioId: n.id, ...i },
        });
      }
      await tx.historialEtapa.create({
        data: {
          tenantId: ctx.tenantId,
          negocioId: n.id,
          aEtapaId: primera.id,
          actorTipo: ctx.actor.tipo,
          actorId: idAutor(ctx.actor),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.creado",
        entidadTipo: "negocio",
        entidadId: n.id,
        payload: {
          cuentaId: n.cuentaId,
          etapaId: n.etapaId,
          instalaciones: instalaciones.map((i) => i.instalacionId),
        },
      });
      return n;
    });
    return vistaNegocio(creado);
  },
});
