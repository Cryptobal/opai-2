import type { Resultado } from "@opai/capabilities";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { GrupoVista } from "./tipos";

export type DatosGrupos = {
  grupos: Resultado<GrupoVista[]>;
  /** Owner o admin con `core:users.manage`: crea, edita, archiva y cambia miembros (CAR-251). */
  gestiona: boolean;
};

/** Grupos vigentes y si el usuario actual los gestiona. La capacidad vuelve a validar todo. */
export async function cargarGrupos(): Promise<DatosGrupos> {
  const [grupos, identidad] = await Promise.all([
    ejecutarComoUsuario<GrupoVista[]>("erp", "core.grupos.list", {}),
    identidadActual(),
  ]);
  const miRol = identidad?.actual?.rol ?? "viewer";
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  const gestiona = (miRol === "owner" || miRol === "admin") && puede("core:users.manage");
  return { grupos, gestiona };
}
