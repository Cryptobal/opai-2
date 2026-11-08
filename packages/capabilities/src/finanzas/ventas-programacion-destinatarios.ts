// Destinatarios de un borrador generado por una programación (CAR-221). Cada borrador conserva su propia
// lista: se copia al generarlo, y cambiar la programación después no altera los borradores ya generados.
import type { TenantTx } from "@opai/db";

/** Copia la lista de la programación al documento: el primero es PARA y el resto va en copia (CC). */
export async function copiarDestinatarios(
  tx: TenantTx,
  tenantId: string,
  programacionId: string,
  documentoId: string,
): Promise<number> {
  const filas = await tx.ventasProgramacionDestinatario.findMany({
    where: { programacionId },
    orderBy: { orden: "asc" },
  });
  const ids = filas.map((f) => f.contactoId).filter((x): x is string => x !== null);
  const contactos = ids.length
    ? await tx.contacto.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } })
    : [];
  const emailDe = new Map(contactos.map((c) => [c.id, c.email]));
  const vistos = new Set<string>();
  const data: { tenantId: string; documentoId: string; orden: number; tipo: string; email: string; origen: string }[] = [];
  for (const f of filas) {
    const crudo = f.contactoId ? emailDe.get(f.contactoId) : f.correo;
    const email = crudo?.trim().toLowerCase();
    if (!email || vistos.has(email)) continue;
    vistos.add(email);
    data.push({
      tenantId,
      documentoId,
      orden: data.length,
      tipo: data.length === 0 ? "PARA" : "CC",
      email,
      origen: f.contactoId ? "contacto_facturacion" : "manual",
    });
  }
  if (data.length) await tx.documentoEmitidoDestinatario.createMany({ data });
  return data.length;
}
