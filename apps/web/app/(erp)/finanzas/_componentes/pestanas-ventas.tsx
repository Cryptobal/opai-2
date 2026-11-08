import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Secciones de Ventas como rutas reales (server-first, ADR-037), igual que Compras: libro, programación y tablero del mes. */
export function PestanasVentas({ activa }: { activa: "libro" | "plantillas" | "tablero" }) {
  return (
    <Tabs
      Link={LinkNext}
      activa={activa}
      tabs={[
        { id: "libro", etiqueta: "Libro de ventas", href: "/finanzas/ventas" },
        { id: "plantillas", etiqueta: "Programación", href: "/finanzas/ventas/programacion" },
        { id: "tablero", etiqueta: "Tablero del mes", href: "/finanzas/ventas/programacion/cierre" },
      ]}
    />
  );
}
