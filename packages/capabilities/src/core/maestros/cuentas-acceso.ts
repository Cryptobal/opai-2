import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { dondeCuenta } from "./alcance";

export async function cuentaDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cuenta.findFirst({ where: { id, AND: [dondeCuenta(ctx)] } });
  if (!c) throw noEncontrado("La cuenta");
  return c;
}
