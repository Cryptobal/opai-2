// A quién sale el correo de un documento de venta: factura, nota, proforma o estado de pago (ADR-103, regla de
// Carlos del 12-nov-2026). Todos los contactos de facturación reciben por igual como destinatarios principales y la
// casilla DTE del cliente, que recibe el XML, va siempre en copia aunque no esté en la lista guardada.
import { MAX_DESTINATARIOS, MAX_PARA, agruparDestinatarios, correoNormalizado, esCorreoValido, type DestinatarioDoc } from "@opai/domain";

import type { Contexto } from "../types";

export type Destinos = { para: string; paraAdicionales: string[]; cc: string[]; bcc: string[] };

/** Todos los correos del envío, sin repetir, en el orden en que salen. */
export const correosDe = (d: Destinos) => [d.para, ...d.paraAdicionales, ...d.cc, ...d.bcc];

/**
 * Destinatarios guardados en el documento o, si no hay lista, los contactos de facturación activos del cliente
 * (hasta 10 como PARA y el resto en copia). Agrega la casilla DTE en copia si no venía. `null` si no hay a quién mandar.
 */
export async function destinosDeDocumento(
  ctx: Contexto,
  doc: { id: string; cuentaId: string },
  emailDte: string | null,
): Promise<Destinos | null> {
  const guardados = await ctx.db.documentoEmitidoDestinatario.findMany({
    where: { documentoId: doc.id },
    orderBy: { orden: "asc" },
  });
  let lista: DestinatarioDoc[] = guardados.map((g) => ({
    tipo: g.tipo as DestinatarioDoc["tipo"],
    email: g.email,
    origen: g.origen as DestinatarioDoc["origen"],
  }));
  if (lista.length === 0) {
    const contactos = await ctx.db.contacto.findMany({
      where: {
        cuentaId: doc.cuentaId,
        estado: "activo",
        archivadoEn: null,
        anonimizadoEn: null,
        email: { not: null },
        roles: { has: "facturacion" },
      },
      orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
    });
    const correos = [...new Set(contactos.map((c) => correoNormalizado(c.email ?? "")).filter(Boolean))];
    lista = correos.slice(0, MAX_DESTINATARIOS).map((email, i) => ({ tipo: i < MAX_PARA ? "PARA" : "CC", email, origen: "contacto_facturacion" }));
  }
  const casilla = emailDte && esCorreoValido(emailDte) ? correoNormalizado(emailDte) : null;
  if (casilla && !lista.some((d) => correoNormalizado(d.email) === casilla)) {
    if (lista.length >= MAX_DESTINATARIOS) lista = lista.slice(0, MAX_DESTINATARIOS - 1);
    lista.push({ tipo: lista.some((d) => d.tipo === "PARA") ? "CC" : "PARA", email: casilla, origen: "casilla_dte" });
  }
  if (!lista.some((d) => d.tipo === "PARA")) return null;
  return agruparDestinatarios(lista);
}
