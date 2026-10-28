import type { Contexto } from "../src/types";

/** Fixture anterior al retiro. No usa create: esa capacidad ya debe rechazar cargo. */
export async function cargoHistorico(
  ctx: Contexto,
  input: {
    cargoId: string;
    sueldoBase: number;
    vigenteDesde: string;
    colacion?: number;
    movilizacion?: number;
    items?: { tipo: string; nombre: string; monto: number }[];
  },
) {
  const { items = [], vigenteDesde, ...data } = input;
  const e = await ctx.db.estructuraSueldo.create({
    data: {
      tenantId: ctx.tenantId,
      nivel: "cargo",
      estado: "archivada",
      colacion: 0,
      movilizacion: 0,
      gratificacion: "legal_25",
      ...data,
      vigenteDesde: new Date(vigenteDesde),
    },
  });
  for (const i of items)
    await ctx.db.estructuraItem.create({
      data: {
        tenantId: ctx.tenantId,
        estructuraId: e.id,
        ...i,
      },
    });
  return e;
}
