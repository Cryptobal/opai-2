import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Secciones de Compras como rutas reales (server-first, ADR-037): libro y proveedores. */
export function PestanasCompras({ activa }: { activa: "libro" | "proveedores" }) {
  return (
    <Tabs
      Link={LinkNext}
      activa={activa}
      tabs={[
        { id: "libro", etiqueta: "Libro de compras", href: "/finanzas/compras" },
        { id: "proveedores", etiqueta: "Proveedores", href: "/finanzas/compras/proveedores" },
      ]}
    />
  );
}
