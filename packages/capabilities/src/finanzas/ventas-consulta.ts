import type { Contexto } from "../types";
import { noEncontrado } from "../errores";
import { notasCreditoPorDocumento } from "./cobros";
import { vistaVenta } from "./vistas-venta";

type Fila = Parameters<typeof vistaVenta>[0] & {
  lineas?: {
    id: string;
    orden: number;
    glosa: string;
    monto: number;
    cantidad?: { toString(): string } | null;
    unidad?: string | null;
    precioUnitario?: number | null;
    descuentoPct?: number | null;
  }[];
};

/** Factor de la cesión vigente de cada documento cedido o en cesión (nombre o, si falta, RUT). */
async function factoresDeCesion(ctx: Contexto, filas: readonly Fila[]) {
  const ids = filas.filter((f) => f.cesionEstado && f.cesionEstado !== "no_cedido").map((f) => f.id);
  const porDoc = new Map<string, string>();
  if (!ids.length) return porDoc;
  const cesiones = await ctx.db.cesion.findMany({
    where: { documentoId: { in: ids }, estado: { not: "anulada" } },
    select: { documentoId: true, factorNombre: true, factorRut: true },
    orderBy: { secuencia: "desc" },
  });
  for (const c of cesiones) if (!porDoc.has(c.documentoId)) porDoc.set(c.documentoId, c.factorNombre ?? c.factorRut);
  return porDoc;
}

export async function vistasDeVentas(ctx: Contexto, filas: readonly Fila[]) {
  const cuentaIds = [...new Set(filas.map((f) => f.cuentaId))];
  const cuentas = cuentaIds.length
    ? await ctx.db.cuenta.findMany({
        where: { id: { in: cuentaIds } },
        select: { id: true, nombre: true, rut: true },
      })
    : [];
  const cuentaDe = new Map(cuentas.map((c) => [c.id, c]));
  const nc = await notasCreditoPorDocumento(ctx.db, filas.map((f) => f.id));
  const factores = await factoresDeCesion(ctx, filas);
  return filas.map((fila) => {
    const f = { ...fila, montoNotasCredito: nc.get(fila.id) ?? 0, cesionFactor: factores.get(fila.id) ?? null };
    const c = cuentaDe.get(f.cuentaId) ?? { nombre: "—", rut: null as string | null };
    const lineas = (f.lineas ?? []).map((l) => ({
      id: l.id,
      orden: l.orden,
      glosa: l.glosa,
      monto: l.monto,
      cantidad: l.cantidad?.toString() ?? null,
      unidad: l.unidad ?? null,
      precioUnitario: l.precioUnitario ?? null,
      descuentoPct: l.descuentoPct ?? null,
    }));
    return vistaVenta(f, c, lineas);
  });
}

export async function vistaDeDocumento(ctx: Contexto, documentoId: string) {
  const doc = await ctx.db.documentoEmitido.findFirst({
    where: { id: documentoId },
    include: { lineas: { orderBy: { orden: "asc" } } },
  });
  if (!doc) throw noEncontrado("El documento");
  const [vista] = await vistasDeVentas(ctx, [doc]);
  return vista!;
}
