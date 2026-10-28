import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";

/** Titulares polimórficos: no se infiere alcance desde email ni desde el responsable.
 * Personas: negación conservadora hasta la relación real del Brief 07b, igual que dondePersona.
 * Solicitudes externas/sin titular interno: solo acceso no acotado (ADR-022).
 */
export async function dondeSolicitud(ctx: Contexto): Promise<Prisma.SolicitudArcoWhereInput> {
  if (!ctx.alcance) return {};
  // SHARE impide mover/borrar contactos o cambiar la cuenta de la instalación entre la
  // autorización y la consulta ARCO. El ejecutor/handler mantiene esta transacción hasta el final.
  const contactos = await ctx.transaccion(
    (tx) => tx.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM core.contactos c
    JOIN core.instalaciones i ON i.cuenta_id = c.cuenta_id AND i.tenant_id = c.tenant_id
    WHERE c.tenant_id = ${ctx.tenantId}::uuid
      AND i.id = ANY(${[...ctx.alcance!.instalaciones]}::uuid[])
    ORDER BY c.id, i.id FOR SHARE OF c, i
  `,
  );
  return { titularTipo: "contacto", titularId: { in: contactos.map((c) => c.id) } };
}

/** Incluye dryRun: sus comprobaciones y respuesta tampoco usan autorizaciones obsoletas. */
export function enContextoArco<T>(ctx: Contexto, fn: (ctx: Contexto) => Promise<T>): Promise<T> {
  return ctx.transaccion((tx) => fn({ ...ctx, db: tx, transaccion: (f) => f(tx) }));
}
