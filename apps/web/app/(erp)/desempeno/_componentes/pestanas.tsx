import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

const PESTANAS = [
  { id: "cargos", etiqueta: "Cargos", href: "/desempeno" },
  { id: "indicadores", etiqueta: "Indicadores propios", href: "/desempeno/indicadores" },
];

/** Pestañas de Desempeño por ruta: los cargos y los indicadores que arma la empresa. */
export function PestanasDesempeno({ activa }: { activa: "cargos" | "indicadores" }) {
  return <Tabs Link={LinkNext} activa={activa} tabs={PESTANAS} />;
}
