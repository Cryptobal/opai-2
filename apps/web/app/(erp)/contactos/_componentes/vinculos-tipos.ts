import { ROL_CONTACTO } from "../../cuentas/_componentes/roles-contacto";

export const ROLES_VINCULO: Record<string, string> = { ...ROL_CONTACTO, cesion: "Cesión" };

export type VinculoContacto = {
  id: string;
  contactoId: string;
  cuentaId: string;
  cuentaNombre: string;
  cargo: string | null;
  roles: string[];
  esPrincipal: boolean;
};
