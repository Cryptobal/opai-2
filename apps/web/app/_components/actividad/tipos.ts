import type { ItemTimeline } from "@opai/ds";

// Tipos de la actividad comercial en pantalla (CAR-162), espejo de la salida de core.actividades.*.

export type EntidadActividad = "negocio" | "cuenta" | "contacto" | "instalacion";

export type ActividadVista = {
  id: string;
  tipo: "nota" | "llamada" | "correo" | "whatsapp" | "reunion" | "visita" | "tarea";
  titulo: string;
  detalle: string | null;
  ocurrioEn: string;
  vencimiento: string | null;
  todoElDia: boolean;
  prioridad: string | null;
  estado: string | null;
  asistentes: string[];
  acuerdos: string | null;
  resultado: "contesto" | "no_contesto" | "volver_a_llamar" | null;
  completadaEn: string | null;
  creadaPorId: string | null;
  creadaPorNombre: string | null;
  responsables: string[];
  responsablesDetalle: { id: string; nombre: string }[];
  vinculos: { tipo: EntidadActividad; id: string }[];
  vinculosDetalle: { tipo: EntidadActividad; id: string; nombre: string }[];
};

export type ListaActividades = { items: ActividadVista[]; siguiente: string | null };

/** Ficha sobre la que se registra: ella misma y las fichas relacionadas que se ligan por defecto. */
export type FichaActividad = {
  tipo: EntidadActividad;
  id: string;
  nombre: string;
  relacionadas: { tipo: EntidadActividad; id: string; nombre: string }[];
};

export const ETIQUETA_ENTIDAD: Record<EntidadActividad, string> = {
  negocio: "Negocio",
  cuenta: "Cuenta",
  contacto: "Contacto",
  instalacion: "Instalación",
};

export const RUTA_ENTIDAD: Record<EntidadActividad, string> = {
  negocio: "/negocios",
  cuenta: "/cuentas",
  contacto: "/contactos",
  instalacion: "/instalaciones",
};

export const RESULTADO: Record<NonNullable<ActividadVista["resultado"]>, string> = {
  contesto: "contestó",
  no_contesto: "no contestó",
  volver_a_llamar: "pidió volver a llamar",
};

export const PRIORIDAD: Record<string, string> = { alta: "alta", media: "media", baja: "baja" };

export type ItemOrdenado = ItemTimeline & { orden: string };

export const FILTROS_ACTIVIDAD = [
  { id: "todo", etiqueta: "Todo" },
  { id: "nota", etiqueta: "Notas" },
  { id: "llamada", etiqueta: "Llamadas" },
  { id: "reunion", etiqueta: "Reuniones" },
  { id: "tarea", etiqueta: "Tareas" },
  { id: "correo", etiqueta: "Correos" },
  { id: "sistema", etiqueta: "Sistema" },
] as const;
export type FiltroActividad = (typeof FILTROS_ACTIVIDAD)[number]["id"];
