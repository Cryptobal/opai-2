// Tipos del estado 2.0 contra el que se calcula el plan (puros, sin base).

export const SISTEMA_OPAI1 = "opai1";

export type EntidadImportada = "cuenta" | "contacto" | "instalacion" | "programacion_recurrente";

export type CuentaDestino = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  giro: string | null;
  calle: string | null;
  comuna: string | null;
  ciudad: string | null;
  emailDte: string | null;
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

export type VinculoDestino = {
  id: string;
  contactoId: string;
  cuentaId: string;
  cargo: string | null;
  roles: string[];
  esPrincipal: boolean;
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
  vinculos: VinculoDestino[];
  instalaciones: InstalacionDestino[];
  ids: IdExternoDestino[];
  correlativosCpq: { anio: number; ultimo: number }[];
};

export const estadoVacio = (): EstadoDestino => ({
  cuentas: [],
  contactos: [],
  vinculos: [],
  instalaciones: [],
  ids: [],
  correlativosCpq: [],
});

/** Defaults nulos para tests en memoria. */
export function cuentaDestino(
  parcial: Pick<CuentaDestino, "id" | "nombre"> & Partial<Omit<CuentaDestino, "id" | "nombre">>,
): CuentaDestino {
  return {
    razonSocial: null,
    rut: null,
    giro: null,
    calle: null,
    comuna: null,
    ciudad: null,
    emailDte: null,
    ...parcial,
  };
}
