// Piezas del vínculo contacto–cuenta compartidas por sus lecturas y escrituras.
import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";

export const vinculoSchema = z.object({
  id: z.string(),
  contactoId: z.string(),
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  cargo: z.string().nullable(),
  roles: z.array(z.string()),
  esPrincipal: z.boolean(),
});

type FilaVinculo = {
  id: string;
  contactoId: string;
  cuentaId: string;
  cargo: string | null;
  roles: string[];
  esPrincipal: boolean;
};
export const vistaVinculo = (v: FilaVinculo, cuentaNombre: string) => ({
  id: v.id,
  contactoId: v.contactoId,
  cuentaId: v.cuentaId,
  cuentaNombre,
  cargo: v.cargo,
  roles: v.roles,
  esPrincipal: v.esPrincipal,
});

/** Solo un principal por cuenta: desmarca al anterior en el vínculo y en la fila inicial del contacto. */
export async function unicoPrincipal(tx: TenantTx, cuentaId: string, contactoId: string) {
  await tx.contactoCuenta.updateMany({
    where: { cuentaId, esPrincipal: true, contactoId: { not: contactoId } },
    data: { esPrincipal: false },
  });
  await tx.contacto.updateMany({
    where: { cuentaId, esPrincipal: true, id: { not: contactoId } },
    data: { esPrincipal: false },
  });
}

export async function vinculoDe(ctx: Contexto, contactoId: string, cuentaId: string) {
  const v = await ctx.db.contactoCuenta.findFirst({ where: { contactoId, cuentaId } });
  if (!v) throw noEncontrado("El vínculo del contacto con la cuenta");
  return v;
}
