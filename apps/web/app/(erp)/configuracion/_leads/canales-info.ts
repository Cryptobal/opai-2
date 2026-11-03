import { Bot, Globe, Mail, PenLine, type LucideIcon } from "lucide-react";

export type CanalConfig = {
  canal: "formulario_web" | "correo" | "agente" | "manual";
  estado: "sin_conectar" | "conectado" | "revocado";
  dominioAutorizado: string | null;
  remitentesIgnorados: string[];
  responsableId: string | null;
  endpoint?: string;
  tokenSufijo?: string | null;
  tokenActivo?: boolean;
  ultimaSolicitudEn?: string | null;
};

export const INFO: Record<
  CanalConfig["canal"],
  { nombre: string; texto: string; icono: LucideIcon }
> = {
  formulario_web: {
    nombre: "Formulario web",
    texto:
      "Recibe consultas desde el sitio de la empresa (por ejemplo gard.cl). Genera una clave, configúrala en el sitio y envía al endpoint público de OPAI.",
    icono: Globe,
  },
  correo: {
    nombre: "Correo de entrada",
    texto:
      "Una dirección por empresa que crea solicitudes desde los mensajes. Disponible con la próxima entrega.",
    icono: Mail,
  },
  agente: {
    nombre: "Agente",
    texto:
      "Los agentes registran solicitudes con la herramienta comercial_solicitudes_create, con vista previa.",
    icono: Bot,
  },
  manual: {
    nombre: "Registro manual",
    texto:
      "Una persona registra la solicitud desde la bandeja (por ejemplo, un mensaje de WhatsApp).",
    icono: PenLine,
  },
};

export const ESTADO = {
  sin_conectar: { etiqueta: "Sin conectar", tono: "neutro" },
  conectado: { etiqueta: "Conectado", tono: "success" },
  revocado: { etiqueta: "Revocado", tono: "danger" },
} as const;
