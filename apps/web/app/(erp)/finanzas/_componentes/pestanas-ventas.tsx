import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/**
 * Vistas de Ventas como botones juntos (CAR-258, opción A aprobada por Carlos el 14-nov-2026): Libro, Programación y
 * Tablero del mes, cada una con su ruta (server-first, ADR-037). La acción de crear va aparte, arriba a la derecha.
 */
export function PestanasVentas({ activa }: { activa: "libro" | "plantillas" | "tablero" }) {
  return (
    <Segmentado
      Link={LinkNext}
      etiqueta="Vista de Ventas"
      activa={activa}
      opciones={[
        { id: "libro", etiqueta: "Libro", href: "/finanzas/ventas" },
        { id: "plantillas", etiqueta: "Programación", href: "/finanzas/ventas/programacion" },
        { id: "tablero", etiqueta: "Tablero del mes", href: "/finanzas/ventas/programacion/cierre" },
      ]}
    />
  );
}
