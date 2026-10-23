import type { Direccion } from "@opai/ds";

/** Perfil de `core.empresa.get` (todas las claves, texto o null). */
export type Perfil = Record<
  | "razonSocial"
  | "rut"
  | "giro"
  | "calle"
  | "comuna"
  | "region"
  | "representanteNombre"
  | "representanteRut"
  | "representanteEmail"
  | "correoComercial"
  | "correoOperaciones"
  | "correoFinanzas"
  | "correoContacto"
  | "telefono"
  | "whatsapp"
  | "sitioWeb",
  string | null
>;
export type Tenant = { nombre: string; slug: string; vertical: string; timezone: string };

export type Textos = Omit<Perfil, "calle" | "comuna" | "region">;
export type DatosEmpresa = {
  textos: Record<keyof Textos, string>;
  direccion: Direccion | null;
  timezone: string;
};

export const CLAVES_TEXTO: (keyof Textos)[] = [
  "razonSocial",
  "rut",
  "giro",
  "representanteNombre",
  "representanteRut",
  "representanteEmail",
  "correoComercial",
  "correoOperaciones",
  "correoFinanzas",
  "correoContacto",
  "telefono",
  "whatsapp",
  "sitioWeb",
];

export const inicialEmpresa = (p: Perfil, t: Tenant): DatosEmpresa => ({
  textos: Object.fromEntries(CLAVES_TEXTO.map((k) => [k, p[k] ?? ""])) as Record<
    keyof Textos,
    string
  >,
  direccion: p.calle ? { calle: p.calle, comuna: p.comuna, region: p.region } : null,
  timezone: t.timezone,
});

export const ZONAS = [
  ["America/Santiago", "America/Santiago (Chile continental)"],
  ["America/Punta_Arenas", "America/Punta_Arenas (Magallanes)"],
  ["Pacific/Easter", "Pacific/Easter (Isla de Pascua)"],
  ["America/Lima", "America/Lima (Perú)"],
  ["America/Bogota", "America/Bogota (Colombia)"],
  ["America/Argentina/Buenos_Aires", "America/Buenos_Aires (Argentina)"],
  ["America/Mexico_City", "America/Mexico_City (México)"],
].map(([valor, etiqueta]) => ({ valor: valor ?? "", etiqueta: etiqueta ?? "" }));

export const CONTACTOS = [
  ["correoComercial", "Correo comercial", "email"],
  ["correoOperaciones", "Correo de operaciones", "email"],
  ["correoFinanzas", "Correo de finanzas", "email"],
  ["correoContacto", "Correo de contacto general", "email"],
  ["telefono", "Teléfono", "tel"],
  ["whatsapp", "WhatsApp", "tel"],
  ["sitioWeb", "Sitio web", "url"],
] as const;
