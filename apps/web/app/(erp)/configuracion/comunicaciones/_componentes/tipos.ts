// Salidas de core.comunicaciones.eventos, core.notificacion_reglas.list y core.plantillas.get.

export type Canal = "correo" | "inapp";
export type Variable = { ruta: string; tipo: string; ejemplo: string; descripcion: string };
export type EventoComunicable = {
  evento: string;
  nombre: string;
  descripcion: string;
  transaccional: boolean;
  variables: Variable[];
  canales: { canal: string; version: number | null; reglaActiva: boolean }[];
};
export type Regla = {
  evento: string;
  canal: Canal;
  roles: string[];
  usuarios: string[];
  activa: boolean;
};
export type Plantilla = { asunto: string; cuerpo: string; version: number | null };
export type Plantillas = {
  vigente: Plantilla | null;
  porDefecto: Plantilla | null;
  versiones: (Plantilla & { activa: boolean; creadaEn: string })[];
};

export const NOMBRE_CANAL: Record<string, string> = { correo: "Correo", inapp: "In-app" };

/** Destinatarios predefinidos por roles; otra combinación se muestra como "Personalizado". */
export const DESTINATARIOS = [
  { valor: "owner,admin", etiqueta: "Owners y admins" },
  { valor: "owner", etiqueta: "Solo owners" },
  { valor: "owner,admin,gerente", etiqueta: "Owners, admins y gerentes" },
  { valor: "owner,admin,gerente,supervisor", etiqueta: "Incluye supervisores" },
];

/** Módulo del evento ("core.documento.vencido" → "Núcleo"). */
export const grupoDe = (evento: string) =>
  evento.startsWith("core.") ? "Núcleo" : (evento.split(".")[0] ?? "");

/** "core.documento.por_vencer" ↔ segmento de URL seguro. */
export const rutaEvento = (evento: string) =>
  `/configuracion/comunicaciones/${encodeURIComponent(evento)}`;
