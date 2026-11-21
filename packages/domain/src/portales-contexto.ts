import { esRol } from "./permisos";
import type { ContextoPortalesVisibles } from "./portales";

/** Arma el contexto puro de portales visibles (CAR-746); una sola forma para web y capacidades. */
export function armarContextoPortalesVisibles(f: {
  portalesMembresia: readonly string[];
  rol: string | null | undefined;
  platformRole?: string | null;
  modulosActivos: readonly string[];
  instalaciones: readonly string[] | null;
  personaVinculada: boolean;
}): ContextoPortalesVisibles {
  return {
    portalesMembresia: f.portalesMembresia,
    rol: f.rol && esRol(f.rol) ? f.rol : "viewer",
    platformRole: f.platformRole ?? null,
    modulosActivos: f.modulosActivos,
    instalaciones: f.instalaciones,
    personaVinculada: f.personaVinculada,
  };
}