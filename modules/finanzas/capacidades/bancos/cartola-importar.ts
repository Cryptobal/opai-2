import { Buffer } from "node:buffer";

import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import {
  CARTOLA_MAX_BASE64,
  type MapeoColumnasGenerico,
} from "@opai/domain";

import { emparejarCartola } from "./cartola-emparejar";
import { cuadraturaSchema, filaPreviewSchema } from "./esquemas";
import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { cuentaDe } from "./util";
import { aplicarImportacionCartola } from "./cartola-importar-aplicar";
import { cartolaRepetida, leerCartola, mensajeDescuadre } from "./cartola-leer";

const MAX_B64 = CARTOLA_MAX_BASE64;

export const bancosCartolaImportar = defineCapability({
  id: "finanzas.cartolas.importar",
  descripcion:
    "Importa una cartola Santander XLSX o CSV/XLSX genérico con vista previa por fila (leída, duplicada o rechazada). No duplica lo que ya entró por la sincronización con el banco u otra cartola, aunque venga con otra fecha (±3 días, misma glosa o número de documento): lo omite y deja la fecha de la cartola.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({
    cuentaId: z.uuid(),
    formato: z.enum(["santander", "generico"]),
    contenidoBase64: z.string().min(1).max(MAX_B64),
    nombreArchivo: z.string().max(200).optional(),
    mapeoColumnas: z
      .object({
        fecha: z.string(),
        monto: z.string(),
        glosa: z.string(),
        referencia: z.string().optional(),
        sucursal: z.string().optional(),
        saldo: z.string().optional(),
      })
      .optional(),
    idempotencyKey: z.string().min(8).max(120),
  }),
  output: z.object({
    aplicados: z.number().int(),
    duplicados: z.number().int(),
    /** Duplicados que ya estaban con otra fecha: se dejan con la fecha de la cartola (CAR-341). */
    fechasAjustadas: z.number().int(),
    rechazados: z.number().int(),
    saldoFinal: z.number().int().nullable(),
    filas: z.array(filaPreviewSchema),
    /** Saldo inicial + detalle = saldo final de la cartola (CAR-341); null si el archivo no trae saldos. */
    cuadratura: cuadraturaSchema.nullable(),
    /** La misma cuenta ya tiene una cartola con este período (CAR-341); la vista previa lo avisa. */
    yaImportada: z.object({ nombreArchivo: z.string().nullable(), creadaEn: z.string() }).nullable().optional(),
    /** Movimientos que las reglas del banco conciliaron solas o dejaron sugeridos (no en vista previa). */
    reglas: z.object({ conciliados: z.number().int(), sugeridos: z.number().int() }).optional(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    const prevCartola = await ctx.db.cartolaImportada.findFirst({
      where: { tenantId: ctx.tenantId, idempotencyKey: input.idempotencyKey },
    });
    if (prevCartola && !dryRun) throw reglaDeNegocio("Importación ya aplicada con esta clave de idempotencia.");

    const buf = Buffer.from(input.contenidoBase64, "base64");
    const { filas: parsedFilas, rechazadas, saldoFinal, fechaDesde, fechaHasta, cuadratura } = await leerCartola(
      buf,
      input.formato,
      (input.mapeoColumnas ?? cuenta.mapeoColumnas ?? null) as MapeoColumnasGenerico | null,
    );

    // CAR-341: lo que ya entró por la sincronización u otra cartola (aunque con otra fecha) no se duplica.
    const { previews, nuevos, ajustes, duplicados } = await emparejarCartola(ctx, cuenta.id, parsedFilas);
    for (const r of rechazadas) {
      previews.push({ indice: r.indice, estado: "rechazada", motivo: r.motivo, fecha: null, monto: null, glosa: null });
    }

    const resumen = {
      aplicados: nuevos.length,
      duplicados,
      fechasAjustadas: ajustes.length,
      rechazados: rechazadas.length,
      saldoFinal,
      filas: previews,
      cuadratura,
      yaImportada: dryRun ? await cartolaRepetida(ctx, cuenta.id, fechaDesde, fechaHasta) : null,
    };

    if (dryRun) return resumen;
    // CAR-341: una cartola que no cuadra (saldo inicial + detalle ≠ saldo final) está mal leída o incompleta.
    if (cuadratura && !cuadratura.cuadra) throw reglaDeNegocio(mensajeDescuadre(cuadratura.diferencia));

    const { reglas } = await aplicarImportacionCartola(ctx, {
      cuenta,
      formato: input.formato,
      ...(input.nombreArchivo !== undefined ? { nombreArchivo: input.nombreArchivo } : {}),
      idempotencyKey: input.idempotencyKey,
      nuevos,
      ajustes,
      duplicados,
      rechazadas,
      saldoFinal,
      saldoInicial: cuadratura?.saldoInicial ?? null,
      fechaDesde,
      fechaHasta,
    });

    return { ...resumen, reglas };
  },
});
