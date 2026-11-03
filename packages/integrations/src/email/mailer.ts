/** Correo transaccional del núcleo (invitaciones, recuperación). El adaptador se elige por entorno. */
/** Archivo adjunto: el contenido va en base64 (lo que espera el proveedor). */
export type AdjuntoCorreo = {
  nombre: string;
  contenidoBase64: string;
  mime: string;
};

export type Correo = {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
  /** Copia visible para los demás destinatarios del mismo aviso (p. ej. contactos de facturación). */
  cc?: readonly string[];
  adjuntos?: readonly AdjuntoCorreo[];
};

export interface Mailer {
  readonly nombre: string;
  enviar(correo: Correo): Promise<void>;
}
