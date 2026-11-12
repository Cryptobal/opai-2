import { erroresDeScorecard, erroresParaPublicar, vigenciaDelCambio } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import {
  indicadoresDeLaEmpresa,
  mesesDe,
  PERMISOS_DESEMPENO,
  scorecardSchema,
  versionesDe,
  vistaScorecard,
} from "./comun";

const entrada = z.object({
  cargoId: uuidSchema,
  indicadores: z
    .array(
      z.object({
        indicador: z.string().min(3).describe("Id del indicador, tal como viene en el catálogo."),
        meta: z
          .number()
          .min(0.0001)
          .max(1_000_000_000_000)
          .transform((v) => Math.round(v * 10_000) / 10_000)
          .describe("Meta mensual, en la unidad del indicador (hasta 4 decimales)."),
        peso: z.number().int().min(1).max(100).describe("Peso en puntos porcentuales."),
      }),
    )
    .max(12),
  personaVeResultado: z.boolean().default(true).describe("La persona ve su propio resultado."),
  personaVeRanking: z.boolean().default(false).describe("La persona ve su posición en el equipo."),
  publicar: z
    .boolean()
    .default(false)
    .describe("true publica (exige que los pesos sumen 100); false lo deja como borrador."),
});

export const scorecardsGuardar = defineCapability({
  id: "desempeno.scorecards.guardar",
  descripcion:
    "Guarda el scorecard de un cargo: los indicadores del catálogo con que se mide su gestión, la meta mensual y el peso de cada uno. Como borrador no exige nada más; para publicar, los pesos deben sumar 100. El primer scorecard de un cargo rige desde el mes en curso; un cambio rige desde el mes siguiente, así un mes que ya se está midiendo no cambia de reglas.",
  permiso: PERMISOS_DESEMPENO.scorecardsManage,
  input: entrada,
  output: scorecardSchema,
  efecto: "escritura",
  dryRun: true,
  // Publicar cambia cómo se mide a las personas: a un agente siempre le pide aprobación humana
  // (ADR-094 §6). Guardar un borrador es una propuesta y no la necesita.
  exigeAprobacion: (input) => input.publicar,
  describirAprobacion: async (ctx, input) => {
    const cargo = await ctx.db.cargo.findUnique({
      where: { id: input.cargoId },
      select: { nombre: true },
    });
    return `Publicar el scorecard del cargo ${cargo?.nombre ?? ""} con ${input.indicadores.length} indicador(es)`;
  },
  async handler(ctx, input, { dryRun }) {
    const cargo = await ctx.db.cargo.findUnique({
      where: { id: input.cargoId },
      select: { id: true, nombre: true, activo: true },
    });
    if (!cargo) throw noEncontrado("El cargo");
    if (!cargo.activo) throw reglaDeNegocio(`El cargo "${cargo.nombre}" está inactivo.`);
    const catalogo = indicadoresDeLaEmpresa(ctx);
    const errores = input.publicar
      ? erroresParaPublicar(input.indicadores)
      : erroresDeScorecard(input.indicadores);
    for (const item of input.indicadores) {
      const def = catalogo.get(item.indicador);
      if (!def) errores.push(`"${item.indicador}" no está en el catálogo de indicadores de la empresa.`);
      else if (def.unidad === "porcentaje" && item.meta > 100) {
        errores.push(`"${def.nombre}" es un porcentaje: su meta no puede pasar de 100.`);
      }
    }
    if (errores.length > 0) throw reglaDeNegocio(errores.join(" "), { errores });

    const [meses, versiones] = await Promise.all([mesesDe(ctx), versionesDe(ctx, input.cargoId)]);
    const publicadas = versiones.filter((v) => v.estado === "publicado").map((v) => v.vigenteDesde);
    const vigenteDesde = vigenciaDelCambio(publicadas, meses.actual, meses.siguiente);
    const destino = versiones.find((v) => v.vigenteDesde === vigenteDesde);
    if (destino?.estado === "publicado" && !input.publicar) {
      throw reglaDeNegocio(
        `Ya hay una versión publicada que rige desde ${vigenteDesde}. Para cambiarla, publica el cambio; un borrador la dejaría sin efecto.`,
      );
    }
    const cabecera = {
      estado: input.publicar ? "publicado" : "borrador",
      personaVeResultado: input.personaVeResultado,
      personaVeRanking: input.personaVeRanking,
    };
    const items = input.indicadores.map((item, orden) => ({ ...item, orden }));
    if (dryRun) {
      return vistaScorecard({ id: "", cargoId: input.cargoId, vigenteDesde, ...cabecera, indicadores: items });
    }
    return ctx.transaccion(async (tx) => {
      // Otra escritura pudo publicar entre la lectura y aquí: si cambió el mes de vigencia, se repite.
      const ahora = await tx.desempenoScorecard.findMany({
        where: { cargoId: input.cargoId, estado: "publicado" },
        select: { vigenteDesde: true },
      });
      const vigencia = vigenciaDelCambio(
        ahora.map((v) => v.vigenteDesde),
        meses.actual,
        meses.siguiente,
      );
      if (vigencia !== vigenteDesde) {
        throw conflicto("El scorecard de este cargo cambió recién. Vuelve a intentarlo.");
      }
      // Un solo cambio pendiente por cargo: se descartan los borradores de otros meses.
      await tx.desempenoScorecard.deleteMany({
        where: { cargoId: input.cargoId, estado: "borrador", vigenteDesde: { not: vigenteDesde } },
      });
      const datos = { ...cabecera, publicadoEn: input.publicar ? new Date() : null };
      const s = await tx.desempenoScorecard.upsert({
        where: {
          tenantId_cargoId_vigenteDesde: { tenantId: ctx.tenantId, cargoId: input.cargoId, vigenteDesde },
        },
        create: { tenantId: ctx.tenantId, cargoId: input.cargoId, vigenteDesde, ...datos },
        update: datos,
      });
      await tx.desempenoScorecardIndicador.deleteMany({ where: { scorecardId: s.id } });
      if (items.length > 0) {
        await tx.desempenoScorecardIndicador.createMany({
          data: items.map((item) => ({ ...item, tenantId: ctx.tenantId, scorecardId: s.id })),
        });
      }
      await ctx.eventos.emitir(tx, {
        tipo: input.publicar ? "desempeno.scorecard.publicado" : "desempeno.scorecard.guardado",
        entidadTipo: "scorecard",
        entidadId: s.id,
        payload: { cargoId: input.cargoId, vigenteDesde, indicadores: items.length },
      });
      return vistaScorecard({ ...s, indicadores: items });
    });
  },
});
