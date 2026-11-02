import { Buffer } from "node:buffer";

import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import {
  mismoSaldoDespues,
  parsearCartolaSantander,
  parsearCsvGenerico,
  type FilaCartolaParseada,
  type MapeoColumnasGenerico,
} from "@opai/domain";

import { filaPreviewSchema } from "./esquemas";
import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { cuentaDe } from "./util";
import { aplicarImportacionCartola } from "./cartola-importar-aplicar";

const MAX_B64 = 7_000_000;

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
    let parsedFilas: FilaCartolaParseada[];
    let rechazadas: { indice: number; motivo: string }[];
    let saldoFinal: number | null;
    let fechaDesde: string | null;
    let fechaHasta: string | null;

    if (input.formato === "santander") {
      const r = parsearCartolaSantander(buf);
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
    const porClave = new Map(existentes.map((e) => [e.claveDedupe, e.saldoDespues]));
    const previews: z.infer<typeof filaPreviewSchema>[] = [];
    let duplicados = 0;
    const nuevos: FilaCartolaParseada[] = [];

    for (const f of parsedFilas) {
      const dup = porClave.has(f.claveDedupe);
      if (dup && mismoSaldoDespues(porClave.get(f.claveDedupe), f.saldoDespues)) {
        duplicados += 1;
        previews.push({
          indice: f.indice,
          estado: "duplicada",
          motivo: "Ya existe con la misma huella.",
          fecha: f.fecha,
          monto: f.monto,
          glosa: f.glosa,
        });
        continue;
      }
      nuevos.push(f);
      previews.push({
        indice: f.indice,
        estado: "leida",
        motivo: null,
        fecha: f.fecha,
        monto: f.monto,
        glosa: f.glosa,
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
      nombreArchivo: input.nombreArchivo,
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
