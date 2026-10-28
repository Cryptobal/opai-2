// Tipos del estado 2.0 contra el que se calcula el plan (puros, sin base).

export const SISTEMA_OPAI1 = "opai1";

export type EntidadImportada = "cuenta" | "contacto" | "instalacion";

export type CuentaDestino = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
};

export type ContactoDestino = {
  id: string;
  cuentaId: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  esPrincipal: boolean;
  roles: string[];
};

export type InstalacionDestino = {
  id: string;
  cuentaId: string;
  nombre: string;
  calle: string | null;
  comuna: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
};

export type IdExternoDestino = {
  entidadTipo: EntidadImportada;
  idExterno: string;
  entidadId: string;
};

export type EstadoDestino = {
  cuentas: CuentaDestino[];
  contactos: ContactoDestino[];
  instalaciones: InstalacionDestino[];
  ids: IdExternoDestino[];
};

export const estadoVacio = (): EstadoDestino => ({
  cuentas: [],
  contactos: [],
  instalaciones: [],
  ids: [],
});
