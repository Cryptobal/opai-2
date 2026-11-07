// Reglas puras del correo que recibe el cliente al enviarle una cotización (CAR-192): qué PDF
// viaja adjunto según el límite del proveedor de correo y los textos de adjuntos y de acceso.

/**
 * Tope de bytes de PDF adjuntos por correo. Resend admite 40 MB por mensaje ya codificado en base64
 * (×4/3), y los buzones de destino (Gmail, Outlook) rechazan alrededor de 25 MB: 18 MB crudos quedan
 * bajo ambos con margen para el cuerpo del correo.
 */
export const TOPE_ADJUNTOS_BYTES = 18 * 1024 * 1024;

export type ClavePdfEnvio = "cotizacion" | "propuesta";
export type PdfEnvio = { clave: ClavePdfEnvio; nombre: string; bytes: number };

/**
 * Qué se adjunta y qué se enlaza. Si todo cabe, todo va adjunto. Si no, se adjunta la cotización (que
 * es el documento comercial) y el resto se enlaza; si ni la cotización cabe sola, nada se adjunta.
 */
export function elegirAdjuntos(pdfs: readonly PdfEnvio[], tope = TOPE_ADJUNTOS_BYTES) {
  const total = pdfs.reduce((s, p) => s + p.bytes, 0);
  if (total <= tope) return { adjuntar: [...pdfs], enlazar: [] as PdfEnvio[] };
  const cot = pdfs.find((p) => p.clave === "cotizacion");
  const adjuntar = cot && cot.bytes <= tope ? [cot] : [];
  return { adjuntar, enlazar: pdfs.filter((p) => !adjuntar.includes(p)) };
}

export type EnlaceDocumento = { nombre: string; url: string };

/** Bloque «qué recibes»: adjuntos y, si no cupieron, el enlace de descarga. */
export function textoAdjuntos(adjuntados: readonly string[], enlazados: readonly EnlaceDocumento[]) {
  const lineas = [
    ...adjuntados.map((n) => `- ${n} (adjunto)`),
    ...enlazados.map((e) => `- ${e.nombre}: ${e.url}`),
  ];
  if (lineas.length === 0) return "";
  const nota = enlazados.length ? "\n(Los enlaces de descarga funcionan por 7 días.)" : "";
  return `Qué incluye este envío:\n${lineas.join("\n")}${nota}`;
}

export type EstadoAccesoCorreo =
  | "ya_tiene_acceso"
  | "vinculado"
  | "invitado"
  | "invitacion_pendiente"
  | "no_aplica";

/** Cómo entrar al Portal Cliente; vacío si al contacto no se le dio acceso. */
export function textoAcceso(estado: EstadoAccesoCorreo, d: { url: string; comercial: string }) {
  const ayuda = d.comercial ? `Si no puedes entrar, escríbenos a ${d.comercial}.` : "Si no puedes entrar, responde este correo.";
  if (estado === "invitado" || estado === "invitacion_pendiente") {
    return [
      "Cómo entrar a tu Portal Cliente la primera vez:",
      "1. Abre el correo de invitación que te enviamos por separado (revisa también el spam) y crea tu contraseña.",
      `2. Entra a ${d.url} con este mismo correo y tu contraseña.`,
      "3. Si la invitación venció, pídenos una nueva.",
      ayuda,
    ].join("\n");
  }
  if (estado === "vinculado" || estado === "ya_tiene_acceso") {
    return [
      `Tu Portal Cliente: ${d.url}`,
      "Entra con este mismo correo y tu contraseña. Si la olvidaste, usa «¿Olvidaste tu contraseña?» y revisa tu bandeja.",
      ayuda,
    ].join("\n");
  }
  return "";
}
