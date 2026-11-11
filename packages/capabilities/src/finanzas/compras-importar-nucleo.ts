// Núcleo de la importación de documentos recibidos (CAR-273): lo comparten la importación de planilla
// (`finanzas.compras.importar`) y la sincronización con el RCV del SII (`finanzas.compras.sincronizar_rcv`).
// Repetir no duplica nada (clave: proveedor + tipo + folio); una fila con error no frena las demás.
import type { z } from "zod";

import { normalizarRut } from "@opai/domain";

import { aFecha, hoy } from "../core/maestros/comun";
import { prohibido } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_PROVEEDORES, plazoPagoDefecto } from "./comun";
import { totalYError } from "./compras-escritura";
import type { filaSchema, resultadoFila } from "./compras-importar-esquemas";

export type FilaCompra = z.infer<typeof filaSchema>;
export type ResultadoImportacion = {
  nuevos: number;
  duplicados: number;
  errores: number;
  proveedoresCreados: number;
  filas: z.infer<typeof resultadoFila>[];
};

export async function importarDocumentosCompra(
  ctx: Contexto,
  input: { documentos: FilaCompra[]; crearProveedores: boolean },
  dryRun: boolean,
  origen: "importacion" | "sii_rcv",
): Promise<ResultadoImportacion> {
  const ruts = [...new Set(input.documentos.map((d) => normalizarRut(d.proveedorRut)).filter((r): r is string => !!r))];
  const proveedores = new Map(
    (await ctx.db.proveedor.findMany({ where: { rut: { in: ruts } } })).map((p) => [p.rut, p]),
  );
  // La importación crea proveedores nuevos sin permiso propio (L37): exigir proveedores.manage
  // antes de escribir nada si al menos una fila lo requiere, igual en dryRun que en real.
  const crearaProveedores =
    input.crearProveedores &&
    input.documentos.some((d) => {
      const rut = normalizarRut(d.proveedorRut);
      return !!rut && !proveedores.has(rut) && !!d.proveedorRazonSocial;
    });
  // El trabajo diario del RCV corre como sistema (sin rol): ahí el alta de proveedores ya la autorizó la empresa al
  // activar Emisión DTE; para una persona o un agente se exige el permiso.
  if (crearaProveedores && ctx.actor.tipo !== "system" && !ctx.autorizar(PERMISO_PROVEEDORES))
    throw prohibido("No tienes permiso para crear proveedores nuevos durante la importación.");
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
          origen,
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
        payload: { nuevos, duplicados: cuenta("duplicado"), origen },
      });
    });
  return { nuevos, duplicados: cuenta("duplicado"), errores: cuenta("error"), proveedoresCreados, filas };
}
