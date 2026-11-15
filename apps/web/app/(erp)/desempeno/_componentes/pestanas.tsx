import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

const PESTANAS = [
  { id: "cargos", etiqueta: "Cargos", href: "/desempeno" },
  { id: "indicadores", etiqueta: "Indicadores propios", href: "/desempeno/indicadores" },
  { id: "cierres", etiqueta: "Meses cerrados", href: "/desempeno/cierres" },
];

/** Pestañas de Desempeño por ruta: los cargos, los indicadores que arma la empresa y los meses cerrados. */
export function PestanasDesempeno({ activa }: { activa: "cargos" | "indicadores" | "cierres" }) {
  return <Tabs Link={LinkNext} activa={activa} tabs={PESTANAS} />;
}
