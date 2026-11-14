import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

const PESTANAS = [
  { id: "activos", etiqueta: "Activos", href: "/inventario" },
  { id: "ropa", etiqueta: "Ropa", href: "/inventario/ropa" },
  { id: "entregas", etiqueta: "Entregas", href: "/inventario/entregas" },
  { id: "tipos", etiqueta: "Tipos", href: "/inventario/tipos" },
];

/** Pestañas de Inventario por ruta: los activos, la ropa por talla, las entregas y el catálogo de tipos. */
export function PestanasInventario({ activa }: { activa: "activos" | "ropa" | "entregas" | "tipos" }) {
  return <Tabs Link={LinkNext} activa={activa} tabs={PESTANAS} />;
}
