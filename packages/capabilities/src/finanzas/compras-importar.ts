import { z } from "zod";

import { normalizarRut } from "@opai/domain";

import { defineCapability } from "../define";
import { aFecha, hoy, textoOpcional } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { PERMISO_COMPRAS, montoSchema, plazoPagoDefecto, tipoDteSchema } from "./comun";
import { camposDocumento, totalYError } from "./compras-escritura";

const MAX_FILAS = 200;

const filaSchema = z.object({
  proveedorRut: z.string().trim().describe("RUT del emisor, con o sin puntos."),
  proveedorRazonSocial: z.string().trim().max(160).optional().describe("Necesaria solo si hay que crear el proveedor."),
  ...camposDocumento,
  tipoDte: tipoDteSchema,
  montoNeto: montoSchema.default(0),
  glosa: textoOpcional(300),
});

const resultadoFila = z.object({
  indice: z.number().int().describe("Posición de la fila en la entrada (desde 0)."),
  estado: z.enum(["nuevo", "duplicado", "error"]),
  mensaje: z.string().nullable(),
});

/**
 * Importa documentos recibidos en lote (planilla del RCV exportada del SII, o lo que arme un agente).
 * Las filas válidas entran y las con error se reportan sin frenar al resto; repetir la importación no
 * duplica nada (clave: proveedor + tipo + folio).
 */
export const comprasImportar = defineCapability({
  id: "finanzas.compras.importar",
  descripcion:
    "Importa hasta 200 documentos recibidos al libro de compras de una vez. Cada fila trae el RUT del emisor, tipo, folio, fechas y montos. Crea los proveedores nuevos si se pide y hay razón social; los documentos repetidos se omiten y las filas con error se informan sin frenar las demás. Con vista previa antes de confirmar.",
  permiso: PERMISO_COMPRAS,
  input: z.object({
    documentos: z.array(filaSchema).min(1).max(MAX_FILAS),
    crearProveedores: z.boolean().default(false),
  }),
  output: z.object({
    nuevos: z.number().int(),
    duplicados: z.number().int(),
    errores: z.number().int(),
    proveedoresCreados: z.number().int(),
    filas: z.array(resultadoFila),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ruts = [...new Set(input.documentos.map((d) => normalizarRut(d.proveedorRut)).filter((r): r is string => !!r))];
    const proveedores = new Map(
      (await ctx.db.proveedor.findMany({ where: { rut: { in: ruts } } })).map((p) => [p.rut, p]),
    );
    const plazo = await plazoPagoDefecto(ctx);
    const filas: z.infer<typeof resultadoFila>[] = [];
    const vistos = new Set<string>();
    let proveedoresCreados = 0;
    for (const [indice, d] of input.documentos.entries()) {
      const falla = (mensaje: string) => filas.push({ indice, estado: "error", mensaje });
      const rut = normalizarRut(d.proveedorRut);
      if (!rut) {
        falla("RUT del emisor inválido.");
        continue;
      }
      const { total, error } = totalYError(d);
      if (error) {
        falla(error);
        continue;
      }
      let proveedor = proveedores.get(rut);
      if (!proveedor) {
        if (!input.crearProveedores || !d.proveedorRazonSocial) {
          falla("El proveedor no existe: pide crearlo e indica su razón social.");
          continue;
        }
        proveedoresCreados += 1;
        if (!dryRun)
          proveedor = await ctx.db.proveedor.create({
            data: { tenantId: ctx.tenantId, rut, razonSocial: d.proveedorRazonSocial, plazoPagoDias: plazo },
          });
        else proveedor = { id: `nuevo:${rut}` } as NonNullable<typeof proveedor>;
        proveedores.set(rut, proveedor);
      }
      const clave = `${proveedor.id}|${d.tipoDte}|${d.folio}`;
      const existe =
        vistos.has(clave) ||
        (!proveedor.id.startsWith("nuevo:") &&
          !!(await ctx.db.documentoRecibido.findFirst({
            where: { proveedorId: proveedor.id, tipoDte: d.tipoDte, folio: d.folio },
            select: { id: true },
          })));
      vistos.add(clave);
      if (existe) {
        filas.push({ indice, estado: "duplicado", mensaje: "Ya estaba en el libro." });
        continue;
      }
      if (!dryRun)
        await ctx.db.documentoRecibido.create({
          data: {
            tenantId: ctx.tenantId,
            proveedorId: proveedor.id,
            tipoDte: d.tipoDte,
            folio: d.folio,
            fechaEmision: aFecha(d.fechaEmision),
            fechaRecepcion: aFecha(d.fechaRecepcion ?? hoy()),
            montoNeto: d.montoNeto,
            montoExento: d.montoExento,
            montoIva: d.montoIva,
            montoOtros: d.montoOtros,
            montoTotal: total,
            origen: "importacion",
            glosa: d.glosa ?? null,
          },
        });
      filas.push({ indice, estado: "nuevo", mensaje: null });
    }
    const cuenta = (e: "nuevo" | "duplicado" | "error") => filas.filter((f) => f.estado === e).length;
    const nuevos = cuenta("nuevo");
    if (!dryRun && nuevos > 0)
      await ctx.transaccion(async (tx) => {
        await ctx.eventos.emitir(tx, {
          tipo: "finanzas.compras.importadas",
          entidadTipo: "libro_compras",
          entidadId: ctx.tenantId,
          payload: { nuevos, duplicados: cuenta("duplicado") },
        });
      });
    if (!dryRun && nuevos === 0 && cuenta("error") === filas.length)
      throw reglaDeNegocio("Ninguna fila se pudo importar; revisa los errores.");
    return { nuevos, duplicados: cuenta("duplicado"), errores: cuenta("error"), proveedoresCreados, filas };
  },
});

