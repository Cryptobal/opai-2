export type DestinatarioCadena =
  | { tipo: "guardia" }
  | { tipo: "supervisores" }
  | { tipo: "rol"; rol: "owner" | "admin" | "gerente" | "supervisor" }
  | { tipo: "usuario"; usuarioId: string };

export type PasoCadena = {
  destinatario: DestinatarioCadena;
  canales: ("campana" | "push" | "whatsapp" | "sms" | "correo" | "llamada")[];
  esperaMin: number;
  exigeConfirmacion: boolean;
  activo: boolean;
};

export type CadenaCentral = {
  id: string | null;
  instalacionId: string | null;
  severidad: string | null;
  pasos: PasoCadena[];
  plazoAtencionMin: number;
  activa: boolean;
};