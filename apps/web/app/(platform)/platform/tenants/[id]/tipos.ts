// Salidas de platform.tenants.get y platform.tenants.panel.

export type DetalleTenant = {
  tenant: {
    id: string;
    slug: string;
    nombre: string;
    vertical: string;
    timezone: string;
    estado: string;
  };
  modulos: {
    id: string;
    nombre: string;
    version: string;
    dependencias: string[];
    estado: string | null;
  }[];
  administradores: {
    membershipId: string;
    nombre: string;
    email: string;
    rol: string;
    estado: string;
  }[];
  invitaciones: { id: string; email: string; rol: string; estado: string }[];
  apiKeys: {
    id: string;
    nombre: string;
    prefijo: string;
    scopes: string[];
    ultimoUsoEn: string | null;
    revocadaEn: string | null;
  }[];
  uso: { total: number; errores: number; porModulo: { modulo: string; total: number }[] };
};

export type PanelTenant = {
  mes: {
    iaUsd: number;
    iaTokens: number;
    correos: number;
    llamadas: number;
    costoUsd: number;
    ultimoAcceso: string | null;
  };
  porRecurso: { recurso: string; cantidad: number; costoUsd: number }[];
  keys: {
    id: string;
    nombre: string;
    prefijo: string;
    revocada: boolean;
    ultimoUsoEn: string | null;
    gastadoUsd: number;
    presupuestoUsd: number | null;
  }[];
  trabajos: { fallidos: number; reintentando: number };
  integraciones: {
    proveedor: string;
    modalidad: string;
    estado: string;
    ultimoTestEn: string | null;
    ultimoError: string | null;
  }[];
};

export type Trabajo = {
  id: string;
  tenantId: string;
  empresa: string;
  slug: string;
  tipo: string;
  estado: string;
  intentos: number;
  maxIntentos: number;
  programadoPara: string | null;
  actualizadoEn: string | null;
  ultimoError: string | null;
  payload: unknown;
};
