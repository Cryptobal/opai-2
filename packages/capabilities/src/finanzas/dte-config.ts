import { z } from "zod";

import { AVISO_CAF_DIAS_DEFECTO, AMBIENTES_SII, UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO } from "@opai/domain";
import { produccionTributariaHabilitada } from "@opai/integrations";

import { defineCapability } from "../define";
import { dia, diaSchema, escribirConEvento, rutSchema } from "../core/maestros/comun";
import { actividadesEmpresaDe } from "../core/empresa/actividades";
import { reglaDeNegocio } from "../errores";
import { actecoDesdeDteConfig, escribirActecoDesdeDteConfig } from "./dte-config-acteco";
import { PERMISO_READ, PERMISO_VENTAS_CONFIGURE } from "./comun";
import {
  configDteSchema,
  exigeOwnerHumanoDte,
  mensajeRechazoDteConfig,
  proveedorCesionSchema,
  proveedorEmisionSchema,
  vistaCfgDte,
} from "./dte-config-vista";

export const dteConfigObtener = defineCapability({
  id: "finanzas.dte_config.obtener",
  descripcion:
    "Devuelve la configuración DTE del tenant: ambiente SII, conectores de emisión/cesión y umbrales de aviso CAF/folios.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: configDteSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const where = { tenantId: ctx.tenantId };
    const [cfg, actividades] = await Promise.all([ctx.db.dteConfig.findUnique({ where }), actividadesEmpresaDe(ctx)]);
    return vistaCfgDte({
      ambiente: cfg?.ambiente ?? "certificacion",
      rutEmisor: cfg?.rutEmisor ?? null,
      emisionProveedor: cfg?.emisionProveedor ?? "simulado",
      cesionProveedor: cfg?.cesionProveedor ?? null,
      resolucionSiiNumero: cfg?.resolucionSiiNumero ?? null,
      resolucionSiiFecha: cfg?.resolucionSiiFecha ?? null,
      // CAR-243: el ACTECO es el principal de la empresa (Configuración › Empresa), no una columna de esta tabla.
      acteco: actividades.principal,
      oficinaSii: cfg?.oficinaSii ?? null,
      umbralFoliosPct: cfg?.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
      avisoCafDias: cfg?.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
      fechaCorte1_0: cfg?.fechaCorte1_0 ?? null,
    });
  },
});

const ACTECO_DTE =
  "ACTECO principal de la empresa (CAR-243: vive en Configuración › Empresa; para varios códigos usar core.empresa.acteco_set). Un número lo fija como principal; null lo quita si es el único.";

export const dteConfigActualizar = defineCapability({
  id: "finanzas.dte_config.actualizar",
  descripcion:
    "Actualiza ambiente SII, conectores y umbrales. Pasar a producción solo lo puede hacer el owner, con vista previa y auditoría.",
  permiso: PERMISO_VENTAS_CONFIGURE,
  input: z.object({
    ambiente: z.enum(AMBIENTES_SII),
    rutEmisor: rutSchema.optional(),
    emisionProveedor: proveedorEmisionSchema.optional(),
    cesionProveedor: proveedorCesionSchema.optional(),
    resolucionSiiNumero: z.number().int().min(0).max(999_999).nullable().optional(),
    resolucionSiiFecha: diaSchema.nullable().optional(),
    acteco: z.number().int().min(1).max(999_999).nullable().optional().describe(ACTECO_DTE),
    oficinaSii: z.string().trim().min(1).max(60).nullable().optional().describe("Oficina del SII del emisor, como se imprime en el documento."),
    umbralFoliosPct: z.number().int().min(1).max(100).optional(),
    avisoCafDias: z.number().int().min(1).max(365).optional(),
    fechaCorte1_0: diaSchema.nullable().optional(),
  }),
  output: configDteSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // Candado de ambiente (CAR-191): también en vista previa.
    if (input.ambiente === "produccion" && !produccionTributariaHabilitada()) {
      throw reglaDeNegocio("La producción del SII solo está disponible en app.opai.cl.");
    }
    const tocaSensibles =
      input.ambiente === "produccion"
      || input.emisionProveedor !== undefined
      || input.cesionProveedor !== undefined;
    if (tocaSensibles) {
      exigeOwnerHumanoDte(ctx, "activar producción SII o cambiar conectores DTE");
    }
    const rut = input.rutEmisor ?? undefined;
    const prev = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
    const fechaCorteDb =
      input.fechaCorte1_0 === undefined
        ? prev?.fechaCorte1_0 ?? null
        : input.fechaCorte1_0
          ? new Date(`${input.fechaCorte1_0}T00:00:00.000Z`)
          : null;
    const resolucionFechaDb =
      input.resolucionSiiFecha === undefined
        ? prev?.resolucionSiiFecha ?? null
        : input.resolucionSiiFecha
          ? new Date(`${input.resolucionSiiFecha}T00:00:00.000Z`)
          : null;
    const next = {
      ambiente: input.ambiente,
      rutEmisor: rut ?? prev?.rutEmisor ?? null,
      emisionProveedor: input.emisionProveedor ?? prev?.emisionProveedor ?? "simulado",
      cesionProveedor:
        input.cesionProveedor !== undefined ? input.cesionProveedor : (prev?.cesionProveedor ?? null),
      resolucionSiiNumero:
        input.resolucionSiiNumero !== undefined ? input.resolucionSiiNumero : (prev?.resolucionSiiNumero ?? null),
      resolucionSiiFecha: resolucionFechaDb,
      oficinaSii: input.oficinaSii !== undefined ? input.oficinaSii : (prev?.oficinaSii ?? null),
      umbralFoliosPct: input.umbralFoliosPct ?? prev?.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
      avisoCafDias: input.avisoCafDias ?? prev?.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
      fechaCorte1_0: fechaCorteDb,
    };
    const actividades = await actividadesEmpresaDe(ctx);
    const acteco = actecoDesdeDteConfig(actividades, input.acteco);
    if (dryRun) return vistaCfgDte({ ...next, acteco: acteco.principal });
    if (next.ambiente === "produccion" && !next.rutEmisor) {
      throw reglaDeNegocio("Producción requiere RUT emisor configurado.");
    }
    if (next.ambiente === "produccion" && next.resolucionSiiNumero === 0) {
      throw reglaDeNegocio("La resolución 0 solo existe en certificación; en producción indique la resolución vigente.");
    }
    if (next.emisionProveedor === "simpleapi" && (next.resolucionSiiNumero == null || !next.resolucionSiiFecha)) {
      throw reglaDeNegocio("SimpleAPI requiere número y fecha de resolución SII del emisor.");
    }
    const fechaCorteAnterior = dia(prev?.fechaCorte1_0 ?? null);
    const fechaCorteNueva = dia(next.fechaCorte1_0);
    const cfg = await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.dte_config.actualizada",
        entidadTipo: "dte_config",
        payload: () => ({
          ambiente: next.ambiente,
          emisionProveedor: next.emisionProveedor,
          cesionProveedor: next.cesionProveedor,
          ...(input.fechaCorte1_0 !== undefined && fechaCorteNueva !== fechaCorteAnterior
            ? { fechaCorte1_0: fechaCorteNueva }
            : {}),
        }),
      },
      async (tx) => {
        if (acteco.cambia) await escribirActecoDesdeDteConfig(tx, ctx.tenantId, acteco);
        return tx.dteConfig.upsert({
          where: { tenantId: ctx.tenantId },
          create: { tenantId: ctx.tenantId, ...next },
          update: next,
        });
      },
    ).catch((error: unknown) => {
      const msg = mensajeRechazoDteConfig(error);
      throw msg ? reglaDeNegocio(msg) : error;
    });
    return vistaCfgDte({ ...cfg, acteco: acteco.principal });
  },
});
