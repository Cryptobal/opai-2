import type { ConfigPortal } from "@opai/domain";

/** Cuenta que se puede configurar (id y nombre). */
export type CuentaOpcion = { id: string; nombre: string };

/** Tipo de documento de personas que el tenant puede marcar como visible para el cliente. */
export type TipoDocumentoOpcion = { codigo: string; nombre: string };

export type ConfigCuenta = {
  cuentaId: string;
  cuentaNombre: string;
  guardada: boolean;
  config: ConfigPortal;
};

export type InstalacionOpcion = { id: string; nombre: string };

export type AccesoFila = {
  id: string;
  membershipId: string;
  nombre: string;
  email: string;
  estado: "activo" | "suspendido" | "revocado";
  todasInstalaciones: boolean;
  instalaciones: InstalacionOpcion[];
};

export type Candidato = { membershipId: string; nombre: string; email: string };
