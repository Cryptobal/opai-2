import type { DestinatarioCadena, PasoCadena } from "./tipos-cadena";

export const CANALES_OPCIONES = [
  { valor: "campana", etiqueta: "Campana" },
  { valor: "push", etiqueta: "Push" },
  { valor: "whatsapp", etiqueta: "WhatsApp (próximamente)" },
] as const;

export const DESTINATARIOS_BASE = [
  { valor: "guardia", etiqueta: "Guardia del turno" },
  { valor: "supervisores", etiqueta: "Supervisores de la instalación" },
  { valor: "rol:gerente", etiqueta: "Gerente de operaciones" },
  { valor: "rol:admin", etiqueta: "Administrador" },
  { valor: "rol:supervisor", etiqueta: "Supervisor" },
  { valor: "rol:owner", etiqueta: "Dueño" },
] as const;

export function decodificarDestinatario(codigo: string): DestinatarioCadena {
  if (codigo === "guardia" || codigo === "supervisores") return { tipo: codigo };
  if (codigo.startsWith("rol:")) return { tipo: "rol", rol: codigo.slice(4) as "owner" | "admin" | "gerente" | "supervisor" };
  return { tipo: "usuario", usuarioId: codigo };
}

export function codificarDestinatario(d: DestinatarioCadena): string {
  if (d.tipo === "guardia" || d.tipo === "supervisores") return d.tipo;
  if (d.tipo === "rol") return `rol:${d.rol}`;
  return d.usuarioId;
}

export function pasoVacio(): PasoCadena {
  return { destinatario: { tipo: "supervisores" }, canales: ["campana", "push"], esperaMin: 5, exigeConfirmacion: false, activo: true };
}