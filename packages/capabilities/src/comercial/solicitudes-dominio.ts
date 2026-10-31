// Lógica pura de Solicitudes (Leads, Brief 07): canales, estados y transiciones permitidas. Sin db ni
// Next; se prueba con Vitest. Estados: nueva → en_revision → convertida | descartada (reversible).

export const CANALES_SOLICITUD = ["formulario_web", "correo", "agente", "manual"] as const;
export type CanalSolicitud = (typeof CANALES_SOLICITUD)[number];

export const ESTADOS_SOLICITUD = ["nueva", "en_revision", "convertida", "descartada"] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const ESTADOS_CANAL = ["sin_conectar", "conectado", "revocado"] as const;
export type EstadoCanal = (typeof ESTADOS_CANAL)[number];

/** Canales que se registran dentro de OPAI y nacen conectados; los otros necesitan infraestructura (PR 2). */
export const CANALES_INTERNOS: readonly CanalSolicitud[] = ["agente", "manual"];

export const ESTADO_INICIAL_CANAL = (c: CanalSolicitud): EstadoCanal =>
  CANALES_INTERNOS.includes(c) ? "conectado" : "sin_conectar";

export type AccionSolicitud =
  "derivar" | "descartar" | "reabrir" | "convertir" | "marcar_duplicada";

/** Estados desde los que cada acción es válida (R3, R4, R5). `convertida` es terminal. */
const DESDE: Readonly<Record<AccionSolicitud, readonly EstadoSolicitud[]>> = {
  derivar: ["nueva"],
  descartar: ["nueva", "en_revision"],
  reabrir: ["descartada"],
  convertir: ["nueva", "en_revision"],
  marcar_duplicada: ["nueva", "en_revision"],
};

export function puede(estado: EstadoSolicitud, accion: AccionSolicitud): boolean {
  return DESDE[accion].includes(estado);
}

/** Estado al que lleva la acción. Reabrir vuelve a `en_revision` (comercial.md, R5). */
export function estadoTras(accion: AccionSolicitud, actual: EstadoSolicitud): EstadoSolicitud {
  if (!puede(actual, accion)) throw new Error(`No se puede ${accion} una solicitud ${actual}.`);
  switch (accion) {
    case "derivar":
      return "en_revision";
    case "descartar":
      return "descartada";
    case "reabrir":
      return "en_revision";
    case "convertir":
      return "convertida";
    case "marcar_duplicada":
      return "descartada";
  }
}

/** Mensaje de negocio cuando la acción no corresponde al estado. */
export function motivoRechazo(estado: EstadoSolicitud, accion: AccionSolicitud): string {
  if (estado === "convertida") return "La solicitud ya se convirtió en un negocio.";
  const nombre: Record<AccionSolicitud, string> = {
    derivar: "derivar",
    descartar: "descartar",
    reabrir: "reabrir",
    convertir: "convertir",
    marcar_duplicada: "marcar como duplicada",
  };
  return `No se puede ${nombre[accion]} una solicitud en estado «${estado}».`;
}

/** Clave para detectar posibles duplicadas: correo o RUT canónicos, sin mayúsculas ni espacios. */
export function claveDuplicado(d: { email?: string | null; rut?: string | null }): string[] {
  const claves: string[] = [];
  if (d.email?.trim()) claves.push(`email:${d.email.trim().toLowerCase()}`);
  if (d.rut?.trim()) claves.push(`rut:${d.rut.trim().toUpperCase()}`);
  return claves;
}

/** Nombre y apellidos para el contacto a partir de un nombre completo («Ana María Pérez Soto»). */
export function partirNombre(completo: string | null | undefined): {
  nombres: string;
  apellidos: string;
} {
  const partes = (completo ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { nombres: "Sin nombre", apellidos: "—" };
  if (partes.length === 1) return { nombres: partes[0] as string, apellidos: "—" };
  if (partes.length === 2) return { nombres: partes[0] as string, apellidos: partes[1] as string };
  const mitad = Math.ceil(partes.length / 2);
  return { nombres: partes.slice(0, mitad).join(" "), apellidos: partes.slice(mitad).join(" ") };
}

/** Título por defecto del negocio al convertir: «cuenta · servicio» (o solo la cuenta). */
export function tituloNegocio(cuenta: string, servicio?: string | null): string {
  const s = servicio?.trim();
  const t = s ? `${cuenta} · ${s}` : cuenta;
  return t.length > 120 ? t.slice(0, 119) + "…" : t;
}
