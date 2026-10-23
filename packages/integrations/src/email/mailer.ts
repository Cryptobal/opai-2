/** Correo transaccional del núcleo (invitaciones, recuperación). El adaptador se elige por entorno. */
export type Correo = {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
};

export interface Mailer {
  readonly nombre: string;
  enviar(correo: Correo): Promise<void>;
}
