import { Empty, Table, Td, Th, Tr } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { cantidad, Superadmin, usd } from "../_componentes/formato";

export const metadata = { title: "Consumos" };

type Fila = { tenantId: string; nombre: string; costoUsd: number; ejecuciones: number };

/** Plataforma → Consumos: costo y ejecuciones de cada empresa en los últimos 30 días. */
export default function Consumos() {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Consumos"
      ruta="/platform/consumos"
      opciones={() => ({ insignia: <Superadmin /> })}
      cargar={async () => {
        const r = await ejecutarComoUsuario<Fila[]>("platform", "platform.consumos.summary", {
          dias: 30,
        });
        return {
          state: estadoPantalla(r),
          filas: r.ok ? [...r.data].sort((a, b) => b.costoUsd - a.costoUsd) : [],
        };
      }}
    >
      {({ filas }) => (
        <div className="flex flex-col gap-3">
          <h2 className="t-title text-fg md:hidden">Consumos</h2>
          <p className="t-caption">Últimos 30 días, con los precios vigentes de Ajustes.</p>
          {filas.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Empresa</Th>
                  <Th className="text-right">Ejecuciones</Th>
                  <Th className="text-right">Costo</Th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <Tr key={f.tenantId}>
                    <Td className="font-medium">{f.nombre}</Td>
                    <Td className="t-numeric text-right">{cantidad(f.ejecuciones)}</Td>
                    <Td className="t-numeric text-right">{usd(f.costoUsd)}</Td>
                  </Tr>
                ))}
                <Tr>
                  <Td className="font-semibold">Total</Td>
                  <Td className="t-numeric text-right font-semibold">
                    {cantidad(filas.reduce((s, f) => s + f.ejecuciones, 0))}
                  </Td>
                  <Td className="t-numeric text-right font-semibold">
                    {usd(filas.reduce((s, f) => s + f.costoUsd, 0))}
                  </Td>
                </Tr>
              </tbody>
            </Table>
          ) : (
            <Empty titulo="Sin empresas" />
          )}
        </div>
      )}
    </PaginaPortal>
  );
}
