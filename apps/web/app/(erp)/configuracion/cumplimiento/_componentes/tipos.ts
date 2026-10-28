// Tipos y etiquetas de Cumplimiento (Ley 21.719), sin dependencias de servidor: los usan islas cliente.

export type Tono = "neutro" | "success" | "warning" | "danger" | "info" | "accent";
type Etiqueta = { etiqueta: string; tono: Tono };

export type Solicitud = {
  id: string;
  tipo: string;
  estado: string;
  titular: { tipo: string | null; id: string | null; email: string | null; nombre: string | null };
  plazoEn: string | null;
  recibidaEn: string;
  responsableId: string | null;
  resultado: string | null;
  documentoEvidenciaId: string | null;
  semaforo: string;
};

export type Incidente = {
  casoId: string;
  estado: string;
  descripcion: string | null;
  alcance: string | null;
  datosAfectados: string | null;
  ocurridoEn: string | null;
  registradoEn: string;
  actualizadoEn: string;
  avisos: { destinatario: string | null; canal: string | null; plazoEn: string | null }[];
  notificada: boolean;
};

export const TIPOS_SOLICITUD: Record<string, string> = {
  acceso: "Acceso",
  rectificacion: "Rectificación",
  cancelacion: "Cancelación",
  oposicion: "Oposición",
  portabilidad: "Portabilidad",
  bloqueo: "Bloqueo",
};

export const ESTADO_SOLICITUD: Record<string, Etiqueta> = {
  recibida: { etiqueta: "Recibida", tono: "info" },
  en_proceso: { etiqueta: "En proceso", tono: "warning" },
  resuelta: { etiqueta: "Resuelta", tono: "success" },
  rechazada: { etiqueta: "Rechazada", tono: "neutro" },
};

/** Semáforo del plazo (§8): solo ordena la atención; sin plazo configurado no hay número legal. */
export const SEMAFORO: Record<string, Etiqueta> = {
  sin_plazo: { etiqueta: "Sin plazo definido", tono: "neutro" },
  vigente: { etiqueta: "En plazo", tono: "success" },
  por_vencer: { etiqueta: "Por vencer", tono: "warning" },
  vencido: { etiqueta: "Vencida", tono: "danger" },
};

export const ESTADO_INCIDENTE: Record<string, Etiqueta> = {
  abierto: { etiqueta: "Abierto", tono: "danger" },
  en_evaluacion: { etiqueta: "En evaluación", tono: "warning" },
  notificado: { etiqueta: "Notificado", tono: "info" },
  cerrado: { etiqueta: "Cerrado", tono: "neutro" },
};

export const DESTINATARIO: Record<string, string> = {
  agencia: "Agencia de Protección de Datos",
  titulares: "Titulares afectados",
};

export const GESTION: Record<string, Etiqueta> = {
  trabajo: { etiqueta: "Trabajo diario", tono: "accent" },
  regulado: { etiqueta: "Hecho regulado", tono: "info" },
  externa: { etiqueta: "Otro mecanismo", tono: "neutro" },
  pendiente: { etiqueta: "Pendiente", tono: "warning" },
};

export const etiquetaDe = (m: Record<string, Etiqueta>, k: string): Etiqueta =>
  m[k] ?? { etiqueta: k, tono: "neutro" };

/** El acceso y la portabilidad producen la exportación del titular (§4.4). */
export const exporta = (tipo: string) => tipo === "acceso" || tipo === "portabilidad";
export const abierta = (estado: string) => estado === "recibida" || estado === "en_proceso";

export const nombreTitular = (s: Solicitud) =>
  s.titular.nombre ?? s.titular.email ?? "Titular sin nombre";
