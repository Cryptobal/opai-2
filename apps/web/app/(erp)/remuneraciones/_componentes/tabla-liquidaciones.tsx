import { Badge, Empty, Table, Td, Th } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { pesos } from "./etiquetas";
import type { LiquidacionResumen } from "./tipos";

/** Liquidaciones del período (diseño 03): una fila por persona, con enlace a su liquidación. */
export function TablaLiquidaciones({ periodoId, items }: { periodoId: string; items: LiquidacionResumen[] }) {
  if (items.length === 0)
    return <Empty titulo="Sin liquidaciones" descripcion="Calcula las liquidaciones del período para verlas aquí." />;
  return (
    <Table aria-label="Liquidaciones del período">
      <thead>
        <tr><Th>Persona</Th><Th className="text-right">Días</Th><Th className="text-right">Haberes</Th><Th className="text-right">Descuentos</Th><Th className="text-right">Líquido</Th></tr>
      </thead>
      <tbody>
        {items.map((l) => (
          <tr key={l.id}>
            <Td>
              <LinkNext href={`/remuneraciones/${periodoId}/liquidaciones/${l.id}`} className="t-body font-medium text-fg hover:underline">
                {l.personaNombre || "Persona"}
              </LinkNext>
              {l.advertencias.length > 0 ? <Badge tono="warning" className="ml-2">Revisar</Badge> : null}
            </Td>
            <Td className="t-numeric text-right">{l.diasTrabajados}</Td>
            <Td className="t-numeric text-right">{pesos(l.haberes)}</Td>
            <Td className="t-numeric text-right">{pesos(l.descuentos)}</Td>
            <Td className="t-numeric text-right font-semibold">{pesos(l.liquido)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
