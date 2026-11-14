import { Segmentado, Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { PESTANAS_ESTADO_BANCO } from "./bancos-tipos";

/** Estado (pestañas) y tipo (ingresos o egresos) de los movimientos, por URL. */
export function FiltrosMovimientos({
  estado,
  tipo,
  href,
}: {
  estado: string;
  tipo: "ingresos" | "egresos" | null;
  href: (estado: string, tipo?: string | null) => string;
}) {
  return (
    <>
      <Tabs Link={LinkNext} activa={estado} tabs={PESTANAS_ESTADO_BANCO.map((e) => ({ id: e.id, etiqueta: e.etiqueta, href: href(e.id) }))} />
      <Segmentado
        Link={LinkNext}
        etiqueta="Tipo de movimiento"
        activa={tipo ?? "todos"}
        opciones={[
          { id: "todos", etiqueta: "Todos", href: href(estado, null) },
          { id: "ingresos", etiqueta: "Ingresos", href: href(estado, "ingresos") },
          { id: "egresos", etiqueta: "Egresos", href: href(estado, "egresos") },
        ]}
      />
    </>
  );
}
