import { Badge } from "@opai/ds";

import { COBERTURA_PUESTO, estadoDe } from "./estados";

/**
 * Estado visible de un puesto-posición (Brief 11): «Inactivo» neutro si está desactivado; si no,
 * su cobertura. En teléfono la cobertura va corta («PPC») para no cortar la fila (CAR-8), con el
 * texto completo para lectores de pantalla; desde md se ve completa.
 */
export function BadgePuesto({ estado, cobertura }: { estado: string; cobertura: string }) {
  if (estado !== "activo") return <Badge tono="neutro">Inactivo</Badge>;
  const c = estadoDe(COBERTURA_PUESTO, cobertura);
  if (c.corta === c.etiqueta) return <Badge tono={c.tono}>{c.etiqueta}</Badge>;
  return (
    <Badge tono={c.tono}>
      <span aria-hidden className="md:hidden">
        {c.corta}
      </span>
      <span className="sr-only md:not-sr-only">{c.etiqueta}</span>
    </Badge>
  );
}

/** Inactivos al final, sin alterar el orden de los demás (por nombre, desde la capacidad). */
export const activosPrimero = <T extends { estado: string }>(puestos: T[]): T[] =>
  [...puestos].sort((a, b) => Number(a.estado !== "activo") - Number(b.estado !== "activo"));
