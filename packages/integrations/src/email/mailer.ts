/** Correo transaccional del núcleo (invitaciones, recuperación). El adaptador se elige por entorno. */
/** Archivo adjunto: el contenido va en base64 (lo que espera el proveedor). */
export type AdjuntoCorreo = {
  nombre: string;
  contenidoBase64: string;
  mime: string;
};

export type Correo = {
  para: string;
  /** Más destinatarios principales, que reciben igual que `para` (p. ej. todos los contactos de facturación). */
  paraAdicionales?: readonly string[];
  asunto: string;
  texto: string;
  html?: string;
  /** Copia visible para los demás destinatarios del mismo aviso (p. ej. contactos de facturación). */
  cc?: readonly string[];
  /** Copia oculta: ningún otro destinatario la ve (p. ej. un respaldo interno del documento enviado). */
  bcc?: readonly string[];
  adjuntos?: readonly AdjuntoCorreo[];
  /** Reply-To (p. ej. la dirección de respuestas de un seguimiento y el correo del vendedor). */
  responderA?: string[];
};

export interface Mailer {
  readonly nombre: string;
  enviar(correo: Correo): Promise<void>;
}
