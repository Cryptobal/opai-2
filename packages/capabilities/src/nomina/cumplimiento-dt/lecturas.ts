import { z } from "zod";

import { TIPOS_MOVIMIENTO_MI_DT, csvMovimientosMiDt, nombreArchivoPendientesMiDt } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../../core/esquemas";
import { noEncontrado } from "../../errores";
import { PERMISO_READ } from "../comun";
import { exigeComplementoCumplimientoDt } from "./comun";
import { filaCsv, movimientosMiDt } from "./movimientos";
import { movimientoSchema, vistaMovimiento } from "./esquemas";

async function movimientoDe(ctx: Parameters<typeof movimientosMiDt>[0], movimientoTipo: (typeof TIPOS_MOVIMIENTO_MI_DT)[number], referenciaId: string) {
  const m = (await movimientosMiDt(ctx)).find((x) => x.movimientoTipo === movimientoTipo && x.referenciaId === referenciaId);
  if (!m) throw noEncontrado("El movimiento");
  return m;
}

/** Lista altas, bajas y anexos con plazo Mi DT y estado de registro. */
export const cumplimientoDtMovimientosListar = defineCapability({
  id: "nomina.midt.listar",
  descripcion:
    "Lista los movimientos para Mi DT: altas, bajas, anexos aprobados y finiquitos tras el término del vínculo, con plazo de 15 días y si ya quedaron registrados con comprobante.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({ pendientes: z.number().int(), registrados: z.number().int(), items: z.array(movimientoSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.personaId),
  async handler(ctx) {
    exigeComplementoCumplimientoDt(ctx);
    const items = await movimientosMiDt(ctx);
    return { items: items.map(vistaMovimiento), pendientes: items.filter((m) => !m.registrado).length, registrados: items.filter((m) => m.registrado).length };
  },
});

/** CSV con los movimientos aún pendientes de registrar en Mi DT. */
export const cumplimientoDtMovimientosExportar = defineCapability({
  id: "nomina.midt.exportar_pendientes",
  descripcion: "Genera un CSV con los movimientos pendientes de registro en Mi DT (formato por verificar).",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({ nombre: z.string(), contenido: z.string(), filas: z.number().int(), personaIds: z.array(z.string()) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.personaIds,
  async handler(ctx) {
    exigeComplementoCumplimientoDt(ctx);
    const pendientes = (await movimientosMiDt(ctx)).filter((m) => !m.registrado);
    return { nombre: nombreArchivoPendientesMiDt(), contenido: csvMovimientosMiDt(pendientes.map(filaCsv)), filas: pendientes.length, personaIds: pendientes.map((m) => m.personaId) };
  },
});

/** Datos de un movimiento para copiar o descargar. */
export const cumplimientoDtMovimientosDatos = defineCapability({
  id: "nomina.midt.datos",
  descripcion: "Devuelve una fila CSV con los datos de un movimiento para registrarlo en Mi DT.",
  permiso: PERMISO_READ,
  input: z.object({ movimientoTipo: z.enum(TIPOS_MOVIMIENTO_MI_DT), referenciaId: uuidSchema }),
  output: z.object({ nombre: z.string(), contenido: z.string(), personaId: z.string() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.personaId],
  async handler(ctx, { movimientoTipo, referenciaId }) {
    exigeComplementoCumplimientoDt(ctx);
    const m = await movimientoDe(ctx, movimientoTipo, referenciaId);
    return { nombre: `midt_${movimientoTipo}_${referenciaId.slice(0, 8)}.csv`, contenido: csvMovimientosMiDt([filaCsv(m)]), personaId: m.personaId };
  },
});