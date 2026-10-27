import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { conflicto, noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { iso } from "../comun";
import { dondeContacto } from "./alcance";
import { otroQue, telefonoSchema, textoOpcional } from "./comun";

export const ROLES_CONTACTO = ["comercial", "operacional", "facturacion", "cobranza"] as const;

export const contactoSchema = z.object({
  id: z.string(),
  cuentaId: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  cargo: z.string().nullable(),
  esPrincipal: z.boolean(),
  roles: z.array(z.string()),
  estado: z.string(),
  notas: z.string().nullable(),
  archivadoEn: z.string().nullable(),
});

type FilaContacto = Omit<z.input<typeof contactoSchema>, "archivadoEn"> & {
  archivadoEn: Date | null;
};
export const vista = (c: FilaContacto) => ({
  ...c,
  email: c.email ?? null,
  telefono: c.telefono ?? null,
  cargo: c.cargo ?? null,
  notas: c.notas ?? null,
  archivadoEn: iso(c.archivadoEn),
});

export const campos = {
  nombres: z.string().trim().min(1).max(80),
  apellidos: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()).nullable().optional(),
  telefono: telefonoSchema.nullable().optional(),
  cargo: textoOpcional(120),
  esPrincipal: z.boolean().optional().describe("Contacto principal de la cuenta (solo uno)."),
  roles: z.array(z.enum(ROLES_CONTACTO)).optional(),
  notas: textoOpcional(2000),
};

export async function contactoDe(ctx: Contexto, id: string) {
  // findFirst (no findUnique) para aplicar el alcance por filas vía la cuenta del contacto.
  const c = await ctx.db.contacto.findFirst({ where: { id, AND: [dondeContacto(ctx)] } });
  if (!c) throw noEncontrado("El contacto");
  return c;
}

export async function emailLibre(
  ctx: Contexto,
  cuentaId: string,
  email?: string | null,
  excepto?: string,
) {
  if (!email) return;
  const otro = await ctx.db.contacto.findFirst({
    where: { cuentaId, email, archivadoEn: null, ...otroQue(excepto) },
  });
  if (otro) throw conflicto(`Ya hay un contacto con ese correo en la cuenta (${otro.nombres}).`);
}

/** Solo un principal por cuenta: al marcar uno se desmarca el anterior. */
export async function unicoPrincipal(tx: TenantTx, cuentaId: string, id: string) {
  await tx.contacto.updateMany({
    where: { cuentaId, esPrincipal: true, id: { not: id } },
    data: { esPrincipal: false },
  });
}
