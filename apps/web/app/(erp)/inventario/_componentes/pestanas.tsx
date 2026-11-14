import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

// CAR-237 suma «Ropa».
const PESTANAS = [
  { id: "activos", etiqueta: "Activos", href: "/inventario" },
  { id: "tipos", etiqueta: "Tipos", href: "/inventario/tipos" },
];

/** Pestañas de Inventario por ruta: los activos de la empresa y el catálogo de tipos. */
export function PestanasInventario({ activa }: { activa: "activos" | "tipos" }) {
  return <Tabs Link={LinkNext} activa={activa} tabs={PESTANAS} />;
}
