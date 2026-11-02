import type { Contexto } from "../types";
import { noEncontrado } from "../errores";
import { vistaVenta } from "./vistas-venta";

type Fila = Parameters<typeof vistaVenta>[0] & {
  lineas?: { id: string; orden: number; glosa: string; monto: number }[];
};

export async function vistasDeVentas(ctx: Contexto, filas: readonly Fila[]) {
  const cuentaIds = [...new Set(filas.map((f) => f.cuentaId))];
  const cuentas = cuentaIds.length
    ? await ctx.db.cuenta.findMany({
        where: { id: { in: cuentaIds } },
        select: { id: true, nombre: true, rut: true },
      })
    : [];
  const cuentaDe = new Map(cuentas.map((c) => [c.id, c]));
  return filas.map((f) => {
    const c = cuentaDe.get(f.cuentaId) ?? { nombre: "—", rut: null as string | null };
    const lineas = (f.lineas ?? []).map((l) => ({
      id: l.id,
      orden: l.orden,
      glosa: l.glosa,
      monto: l.monto,
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
