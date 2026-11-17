import { z } from "zod";

import { TIPOS_MOVIMIENTO_MI_DT, csvMovimientosMiDt, nombreArchivoPendientesMiDt } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../../core/esquemas";
import { noEncontrado } from "../../errores";
import { PERMISO_READ } from "../comun";
import { filaCsv, movimientosMiDt } from "./movimientos";
import { movimientoSchema, vistaMovimiento } from "./esquemas";

async function movimientoDe(ctx: Parameters<typeof movimientosMiDt>[0], movimientoTipo: (typeof TIPOS_MOVIMIENTO_MI_DT)[number], referenciaId: string) {
  const m = (await movimientosMiDt(ctx)).find((x) => x.movimientoTipo === movimientoTipo && x.referenciaId === referenciaId);
  if (!m) throw noEncontrado("El movimiento");
  return m;
}

const entradaListaMidt = z.object({
  cursor: z.string().optional().describe("Clave del último movimiento de la página anterior."),
  limite: z.number().int().min(1).max(200).default(200),
});

function paginaMidt<T extends { clave: string }>(filas: T[], limite: number, cursor?: string) {
  const desde = cursor ? Math.max(0, filas.findIndex((f) => f.clave === cursor) + 1) : 0;
  const resto = filas.slice(desde);
  const items = resto.slice(0, limite);
  return { items, siguiente: resto.length > limite ? (items.at(-1)?.clave ?? null) : null };
}

/** Lista altas, bajas y anexos con plazo Mi DT y estado de registro. */
export const cumplimientoDtMovimientosListar = defineCapability({
  id: "nomina.midt.listar",
  descripcion:
    "Lista los movimientos de contratos para Mi DT: altas al iniciar un vínculo, bajas al terminarlo y anexos aprobados, con plazo de 15 días y si ya quedaron registrados con comprobante.",
  permiso: PERMISO_READ,
  input: entradaListaMidt,
  output: z.object({
    pendientes: z.number().int(),
    registrados: z.number().int(),
    items: z.array(movimientoSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.personaId),
  async handler(ctx, input) {
    const todos = await movimientosMiDt(ctx);
    const { items, siguiente } = paginaMidt(todos, input.limite, input.cursor);
    return {
      items: items.map(vistaMovimiento),
      pendientes: todos.filter((m) => !m.registrado).length,
      registrados: todos.filter((m) => m.registrado).length,
      siguiente,
    };
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
    const m = await movimientoDe(ctx, movimientoTipo, referenciaId);
    return { nombre: `midt_${movimientoTipo}_${referenciaId.slice(0, 8)}.csv`, contenido: csvMovimientosMiDt([filaCsv(m)]), personaId: m.personaId };
  },
});