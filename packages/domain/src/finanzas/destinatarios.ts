// Destinatarios del correo de un DTE de venta (CAR-221 · A3b). Lógica pura.
// Regla de Carlos (12-nov-2026, ADR-103): todos los contactos de facturación reciben el documento por igual
// como destinatarios principales (hasta 10 PARA, como en OPAI 1) y la casilla DTE del cliente, que recibe el XML,
// va siempre en copia. Hasta 20 correos en total.

export const TIPOS_DESTINATARIO = ["PARA", "CC", "BCC"] as const;
export type TipoDestinatario = (typeof TIPOS_DESTINATARIO)[number];

export const ORIGENES_DESTINATARIO = ["casilla_dte", "contacto_facturacion", "manual"] as const;
export type OrigenDestinatario = (typeof ORIGENES_DESTINATARIO)[number];

export const MAX_DESTINATARIOS = 20;
export const MAX_PARA = 10;

export type DestinatarioDoc = { tipo: TipoDestinatario; email: string; origen: OrigenDestinatario };

const CORREO = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

export const correoNormalizado = (valor: string): string => valor.trim().toLowerCase();

export const esCorreoValido = (valor: string): boolean => {
  const c = correoNormalizado(valor);
  return c.length <= 254 && CORREO.test(c);
};

/** Mensaje en español si la lista no sirve para enviar el documento; null si es válida. */
export function validarDestinatarios(lista: readonly DestinatarioDoc[]): string | null {
  if (lista.length === 0) return "Indica al menos un destinatario (PARA).";
  if (lista.length > MAX_DESTINATARIOS) return `Máximo ${MAX_DESTINATARIOS} destinatarios por documento.`;
  const vistos = new Set<string>();
  for (const d of lista) {
    if (!esCorreoValido(d.email)) return `El correo «${d.email.trim()}» no es válido.`;
    const c = correoNormalizado(d.email);
    if (vistos.has(c)) return `El correo ${c} está repetido: cada uno va una sola vez (PARA, CC o BCC).`;
    vistos.add(c);
  }
  const para = lista.filter((d) => d.tipo === "PARA").length;
  if (para === 0) return "Falta el destinatario principal (PARA).";
  if (para > MAX_PARA) return `Máximo ${MAX_PARA} destinatarios principales (PARA); el resto va en CC o BCC.`;
  return null;
}

/** Agrupa la lista (ya validada) como la usa el envío: el primer PARA, los demás PARA y las copias, en el orden dado. */
export function agruparDestinatarios(lista: readonly DestinatarioDoc[]): {
  para: string;
  paraAdicionales: string[];
  cc: string[];
  bcc: string[];
} {
  const correo = (d: DestinatarioDoc) => correoNormalizado(d.email);
  const [para, ...paraAdicionales] = lista.filter((d) => d.tipo === "PARA").map(correo);
  if (!para) throw new Error("Falta el destinatario PARA.");
  return {
    para,
    paraAdicionales,
    cc: lista.filter((d) => d.tipo === "CC").map(correo),
    bcc: lista.filter((d) => d.tipo === "BCC").map(correo),
  };
}

export type ContactoFacturacion = { email: string | null; esPrincipal?: boolean };

/**
 * Sugerencia al elegir un cliente: los contactos con rol facturación van todos como PARA (hasta 10; el resto en copia)
 * y la casilla DTE de la cuenta, en copia. Sin contactos, la casilla DTE pasa a PARA. Descarta vacíos, inválidos y repetidos.
 */
export function destinatariosSugeridos(entrada: {
  emailDte: string | null;
  contactosFacturacion: readonly ContactoFacturacion[];
}): DestinatarioDoc[] {
  const salida: DestinatarioDoc[] = [];
  const vistos = new Set<string>();
  const agregar = (email: string | null, origen: OrigenDestinatario, tipo: TipoDestinatario) => {
    if (!email || !esCorreoValido(email)) return;
    const c = correoNormalizado(email);
    if (vistos.has(c)) return;
    vistos.add(c);
    salida.push({ tipo, email: c, origen });
  };
  const paras = () => salida.filter((d) => d.tipo === "PARA").length;
  for (const c of entrada.contactosFacturacion) agregar(c.email, "contacto_facturacion", paras() < MAX_PARA ? "PARA" : "CC");
  agregar(entrada.emailDte, "casilla_dte", paras() === 0 ? "PARA" : "CC");
  return salida.slice(0, MAX_DESTINATARIOS);
}
