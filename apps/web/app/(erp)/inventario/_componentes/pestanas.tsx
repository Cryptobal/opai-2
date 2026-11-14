import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

// CAR-236 y CAR-237 suman «Activos» y «Ropa».
const PESTANAS = [{ id: "tipos", etiqueta: "Tipos", href: "/inventario" }];

/** Pestañas de Inventario por ruta. */
export function PestanasInventario({ activa }: { activa: "tipos" }) {
  return <Tabs Link={LinkNext} activa={activa} tabs={PESTANAS} />;
}
