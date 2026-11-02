import { Buffer } from "node:buffer";

import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import {
  CARTOLA_MAX_BASE64,
  planificarDedupeCartola,
  parsearCartolaSantander,
  parsearCsvGenerico,
  validarTamanoCartola,
  type FilaCartolaParseada,
  type MapeoColumnasGenerico,
} from "@opai/domain";

import { filaPreviewSchema } from "./esquemas";
import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { cuentaDe } from "./util";
import { aplicarImportacionCartola } from "./cartola-importar-aplicar";

const MAX_B64 = CARTOLA_MAX_BASE64;

export const bancosCartolaImportar = defineCapability({
  id: "finanzas.cartolas.importar",
  descripcion:
    "Importa una cartola Santander XLSX o CSV/XLSX genérico con vista previa por fila (leída, duplicada o rechazada).",
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
    rechazados: z.number().int(),
    saldoFinal: z.number().int().nullable(),
    filas: z.array(filaPreviewSchema),
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
    validarTamanoCartola(buf.byteLength);
    let parsedFilas: FilaCartolaParseada[];
    let rechazadas: { indice: number; motivo: string }[];
    let saldoFinal: number | null;
    let fechaDesde: string | null;
    let fechaHasta: string | null;

    if (input.formato === "santander") {
      const r = await parsearCartolaSantander(buf);
      parsedFilas = r.filas;
      rechazadas = r.rechazadas;
      saldoFinal = r.saldoFinal;
      fechaDesde = r.fechaDesde;
      fechaHasta = r.fechaHasta;
    } else {
      const mapeo = (input.mapeoColumnas ?? cuenta.mapeoColumnas ?? null) as MapeoColumnasGenerico | null;
      if (!mapeo) throw reglaDeNegocio("Indica el mapeo de columnas o guárdalo en la cuenta.");
      const r = parsearCsvGenerico(buf.toString("utf8"), mapeo);
      parsedFilas = r.filas;
      rechazadas = r.rechazadas;
      saldoFinal = null;
      fechaDesde = null;
      fechaHasta = null;
    }

    const existentes = await ctx.db.movimientoBancario.findMany({
      where: { cuentaId: cuenta.id },
      select: { claveDedupe: true, saldoDespues: true },
    });
    const porIndice = new Map(parsedFilas.map((f) => [f.indice, f]));
    const plan = planificarDedupeCartola(
      parsedFilas.map((f) => ({
        indice: f.indice,
        base: f.claveDedupe,
        saldoDespues: f.saldoDespues,
      })),
      existentes,
    );
    const previews: z.infer<typeof filaPreviewSchema>[] = [];
    let duplicados = 0;
    const nuevos: FilaCartolaParseada[] = [];

    for (const p of plan) {
      const orig = porIndice.get(p.indice);
      if (!orig) continue;
      if (p.estado === "duplicada") {
        duplicados += 1;
        previews.push({
          indice: orig.indice,
          estado: "duplicada",
          motivo: "Ya existe con la misma huella.",
          fecha: orig.fecha,
          monto: orig.monto,
          glosa: orig.glosa,
        });
        continue;
      }
      nuevos.push({ ...orig, claveDedupe: p.claveDedupe });
      previews.push({
        indice: orig.indice,
        estado: "leida",
        motivo: null,
        fecha: orig.fecha,
        monto: orig.monto,
        glosa: orig.glosa,
      });
    }
    for (const r of rechazadas) {
      previews.push({ indice: r.indice, estado: "rechazada", motivo: r.motivo, fecha: null, monto: null, glosa: null });
    }

    const resumen = {
      aplicados: nuevos.length,
      duplicados,
      rechazados: rechazadas.length,
      saldoFinal,
      filas: previews,
    };

    if (dryRun) return resumen;

    await aplicarImportacionCartola(ctx, {
      cuenta,
      formato: input.formato,
      ...(input.nombreArchivo !== undefined ? { nombreArchivo: input.nombreArchivo } : {}),
      idempotencyKey: input.idempotencyKey,
      nuevos,
      duplicados,
      rechazadas,
      saldoFinal,
      fechaDesde,
      fechaHasta,
    });

    return resumen;
  },
});
