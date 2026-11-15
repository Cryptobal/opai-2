// Destinatarios de un borrador generado por una programación (CAR-221). Cada borrador conserva su propia
// lista: se copia al generarlo, y cambiar la programación después no altera los borradores ya generados.
import type { TenantTx } from "@opai/db";
import { MAX_DESTINATARIOS, MAX_PARA, correoNormalizado, esCorreoValido } from "@opai/domain";

/**
 * Copia la lista de la programación al documento (ADR-103): todos reciben por igual como PARA (hasta 10; el resto
 * en copia) y la casilla DTE del cliente, que recibe el XML, se agrega en copia.
 */
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
    ? await tx.contacto.findMany({ where: { id: { in: ids }, estado: "activo", archivadoEn: null, anonimizadoEn: null }, select: { id: true, email: true } })
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
      tipo: data.length < MAX_PARA ? "PARA" : "CC",
      email,
      origen: f.contactoId ? "contacto_facturacion" : "manual",
    });
  }
  const doc = await tx.documentoEmitido.findFirst({ where: { id: documentoId }, select: { cuentaId: true } });
  const cuenta = doc ? await tx.cuenta.findFirst({ where: { id: doc.cuentaId }, select: { emailDte: true } }) : null;
  const casilla = cuenta?.emailDte && esCorreoValido(cuenta.emailDte) ? correoNormalizado(cuenta.emailDte) : null;
  // La casilla DTE siempre entra: si la lista ya llegó al tope, reemplaza al último en copia.
  if (casilla && !vistos.has(casilla)) {
    if (data.length >= MAX_DESTINATARIOS) data.pop();
    data.push({ tenantId, documentoId, orden: data.length, tipo: data.length ? "CC" : "PARA", email: casilla, origen: "casilla_dte" });
  }
  if (data.length) await tx.documentoEmitidoDestinatario.createMany({ data });
  return data.length;
}
