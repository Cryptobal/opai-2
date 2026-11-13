import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Secciones de Compras como rutas reales (server-first, ADR-037): libro, proveedores e IVA del mes (F29). */
export function PestanasCompras({ activa }: { activa: "libro" | "proveedores" | "impuestos" }) {
  return (
    <Tabs
      Link={LinkNext}
      activa={activa}
      tabs={[
        { id: "libro", etiqueta: "Libro de compras", href: "/finanzas/compras" },
        { id: "proveedores", etiqueta: "Proveedores", href: "/finanzas/compras/proveedores" },
        { id: "impuestos", etiqueta: "IVA y F29", href: "/finanzas/compras/impuestos" },
      ]}
    />
  );
}
