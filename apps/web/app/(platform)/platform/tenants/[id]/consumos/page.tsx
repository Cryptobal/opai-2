import { Empty, Table, Td, Th, Tr } from "@opai/ds";

import { cantidad, usd } from "../../../_componentes/formato";
import { PaginaTenant } from "../pagina-tenant";

export const metadata = { title: "Consumos de la empresa" };

/** Plataforma → empresa · Consumos del mes por recurso, con su costo. */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="consumos">
      {(_d, panel) =>
        panel?.porRecurso.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Recurso</Th>
                <Th className="text-right">Cantidad</Th>
                <Th className="text-right">Costo</Th>
              </tr>
            </thead>
            <tbody>
              {panel.porRecurso.map((r) => (
                <Tr key={r.recurso}>
                  <Td className="t-mono">{r.recurso}</Td>
                  <Td className="t-numeric text-right">{cantidad(r.cantidad)}</Td>
                  <Td className="t-numeric text-right">{usd(r.costoUsd)}</Td>
                </Tr>
              ))}
              <Tr>
                <Td className="font-semibold">Total del mes</Td>
                <Td />
                <Td className="t-numeric text-right font-semibold">{usd(panel.mes.costoUsd)}</Td>
              </Tr>
            </tbody>
          </Table>
        ) : (
          <Empty
            titulo="Sin consumos este mes"
            descripcion="Aparecen cuando la empresa usa IA, correos, mapas o la API."
          />
        )
      }
    </PaginaTenant>
  );
}
