import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { aplicarCostosPredefinidos } from "../persistencia/costos-predefinidos";
import { recalcularVersion } from "../persistencia/recalcular";
import { exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { tramosDe } from "./esquemas-cobertura";
import { uuidSchema } from "./esquemas";
import { nuevaVacia, sinIndefinidos } from "./lineas";
import { resolverSueldoPuesto } from "./lineas-puesto";
import { rechazarCostosSinPermiso, seccionDe } from "./lineas-util";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe, ID_VISTA_PREVIA } from "./util";

export const lineasAgregarEsquema = defineCapability({
  id: "cpq.lineas.agregar_esquema",
  descripcion:
    "Agrega a una sección en borrador todos los puestos de un esquema de cobertura (turno y contra turno, con su ciclo, horario y días) de una vez; solo falta elegir el cargo y el sueldo, que se aplican a cada puesto salvo que se indique otro por tramo.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    seccionId: uuidSchema,
    esquemaId: uuidSchema,
    cargoId: uuidSchema.nullable().optional().describe("Cargo del catálogo para todos los puestos; trae su sueldo de referencia."),
    sueldoBaseClp: z.number().int().min(0).max(100_000_000).optional().describe("Sueldo base mensual de todos los puestos."),
    porTramo: z
      .array(
        z.object({
          tramoId: uuidSchema,
          cargoId: uuidSchema.nullable().optional(),
          sueldoBaseClp: z.number().int().min(0).max(100_000_000).optional(),
        }),
      )
      .max(20)
      .optional()
      .describe("Cargo o sueldo distinto para un tramo (p. ej. el de noche)."),
  }),
  output: z.object({ ids: z.array(uuidSchema), ventaMensualClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    rechazarCostosSinPermiso(ctx, { sueldoBaseClp: input.sueldoBaseClp ?? input.porTramo?.find((p) => p.sueldoBaseClp !== undefined)?.sueldoBaseClp }, ["sueldoBaseClp"]);
    const sec = await seccionDe(ctx, input.seccionId);
    const version = await versionDeCotizacion(ctx, sec.versionId);
    exigirBorrador(version);
    const cot = await cotizacionDe(ctx, version.cotizacionId);
    const esquema = await ctx.db.cpqEsquemaCobertura.findFirst({ where: { id: input.esquemaId } });
    if (!esquema) throw noEncontrado("El esquema de cobertura");
    if (!esquema.activo) throw reglaDeNegocio("El esquema de cobertura está archivado.");
    const tramos = await tramosDe(ctx, [esquema.id]);
    if (!tramos.length) throw reglaDeNegocio("El esquema no tiene tramos.");
    for (const p of input.porTramo ?? []) {
      if (!tramos.some((t) => t.id === p.tramoId)) throw reglaDeNegocio("Un tramo indicado no pertenece al esquema.");
    }
    const existentes = await ctx.db.cpqLinea.findMany({ where: { seccionId: sec.id }, select: { orden: true } });
    const base = existentes.reduce((m, l) => Math.max(m, l.orden), -1) + 1;
    const fila = async (t: (typeof tramos)[number], orden: number) => {
      const aparte = input.porTramo?.find((p) => p.tramoId === t.id);
      const pedido = {
        cargoId: aparte?.cargoId !== undefined ? aparte.cargoId : input.cargoId,
        sueldoBaseClp: aparte?.sueldoBaseClp ?? input.sueldoBaseClp,
        diasSemana: t.diasSemana,
      };
      const derivados = await resolverSueldoPuesto(ctx, pedido, null);
      return sinIndefinidos({
        tenantId: ctx.tenantId,
        seccionId: sec.id,
        tipo: "puesto",
        nombre: `${esquema.nombre} · ${t.nombre}`,
        posiciones: t.posiciones,
        cargoId: pedido.cargoId,
        patron: t.patronNombre,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
        habilitada: true,
        cantidadEscalada: 10_000,
        orden,
        ...derivados,
      });
    };
    const filas: Awaited<ReturnType<typeof fila>>[] = [];
    for (const [i, t] of tramos.entries()) filas.push(await fila(t, base + i));
    if (dryRun) {
      const r = await recalcularVersion(ctx, cot.id, undefined, false, {
        lineas: (ls) => [
          ...ls,
          ...filas.map((f, i) => ({ ...ls[0], ...nuevaVacia(), ...f, id: `${ID_VISTA_PREVIA.slice(0, -2)}${String(i).padStart(2, "0")}` }) as (typeof ls)[number]),
        ],
      });
      return { ids: filas.map(() => ID_VISTA_PREVIA), ventaMensualClp: r?.ventaMensual ?? null };
    }
    const ids: string[] = [];
    for (const f of filas) ids.push((await ctx.db.cpqLinea.create({ data: f })).id);
    // Costos predefinidos por puesto de la empresa (CAR-213), como al crear un puesto suelto.
    await aplicarCostosPredefinidos(ctx, version.id, { lineaIds: ids });
    await recalcularVersion(ctx, cot.id, undefined, true);
    const v = await ctx.db.cpqVersion.findFirst({ where: { id: version.id } });
    if (!v) throw noEncontrado("La versión");
    return { ids, ventaMensualClp: v.ventaMensualClp };
  },
});
