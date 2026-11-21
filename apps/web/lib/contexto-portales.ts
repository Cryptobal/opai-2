import { type ContextoPortalesVisibles, esRol } from "@opai/domain";

import type { Identidad } from "./actor";

/** Mapea la identidad de sesión al contexto puro de portales visibles (CAR-746). */
export function contextoPortalesDe(identidad: Identidad): ContextoPortalesVisibles {
  const actual = identidad.actual;
  return {
    portalesMembresia: actual?.portales ?? [],
    rol: actual && esRol(actual.rol) ? actual.rol : "viewer",
    platformRole: identidad.usuario.platformRole,
    modulosActivos: identidad.modulosActivos,
    instalaciones: identidad.acceso.instalaciones,
    personaVinculada: identidad.personaVinculada ?? false,
  };
}