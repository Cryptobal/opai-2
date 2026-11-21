import { armarContextoPortalesVisibles } from "@opai/domain";

import type { Identidad } from "./actor";

/** Mapea la identidad de sesión al contexto puro de portales visibles (CAR-746). */
export function contextoPortalesDe(identidad: Identidad) {
  const actual = identidad.actual;
  return armarContextoPortalesVisibles({
    portalesMembresia: actual?.portales ?? [],
    rol: actual?.rol,
    platformRole: identidad.usuario.platformRole,
    modulosActivos: identidad.modulosActivos,
    instalaciones: identidad.acceso.instalaciones,
    personaVinculada: identidad.personaVinculada ?? false,
  });
}