import { Empty, Monograma, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { clp, type Resumen, TEXTO_INCLUIDO_EN_BASE } from "./cobro";
import {
  ChipIncluido,
  ChipNoSeFactura,
  ChipSeFactura,
  grupos,
  incluidos,
  noSeFacturan,
  seFacturan,
} from "./chips-cobro";

/** Empresas del mes con lo que se factura y lo que no (con su motivo), y el total. */
export function TablaEmpresas({ resumen }: { resumen: Resumen }) {
  if (resumen.empresas.length === 0) return <Empty titulo="Aún no hay empresas" />;
  const href = (id: string) => `/platform/tenants/${id}/cobro`;
  const t = resumen.totales;
  return (
    <>
      <ul className="flex flex-col rounded-lg border border-border bg-surface md:hidden">
        {resumen.empresas.map((e) => (
          <li key={e.tenantId} className="flex flex-col gap-2 border-b border-border px-4 py-3">
            <LinkNext
              href={href(e.tenantId)}
              className="flex min-h-11 items-center justify-between gap-3"
            >
              <span className="truncate text-base font-medium text-fg">{e.nombre}</span>
              <span className="t-numeric text-base font-semibold text-fg">{clp(e.totalClp)}</span>
            </LinkNext>
            {grupos(e)}
          </li>
        ))}
        <li className="flex flex-col gap-1 px-4 py-3">
          <span className="flex items-center justify-between">
            <span className="font-semibold text-fg">Total</span>
            <span className="t-numeric font-semibold text-fg">{clp(t.totalClp)}</span>
          </span>
          <span className="t-caption">
            {t.facturables} se facturan · {t.noFacturables} no se facturan
          </span>
        </li>
      </ul>
      <div className="hidden md:block">
        <Table>
          <thead>
            <Tr>
              <Th>Empresa</Th>
              <Th>Se facturan</Th>
              <Th>No se facturan</Th>
              <Th className="text-right">A facturar</Th>
            </Tr>
          </thead>
          <tbody>
            {resumen.empresas.map((e) => (
              <Tr key={e.tenantId}>
                <Td className="w-56">
                  <LinkNext href={href(e.tenantId)} className="flex items-center gap-3">
                    <Monograma nombre={e.nombre} className="size-8 rounded-md text-xs" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-fg">{e.nombre}</span>
                      <span className="t-caption t-mono">{e.slug}</span>
                    </span>
                  </LinkNext>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {seFacturan(e).map((m) => (
                      <ChipSeFactura key={m.moduloId} m={m} />
                    ))}
                  </span>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {noSeFacturan(e).map((m) => (
                      <ChipNoSeFactura key={m.moduloId} m={m} />
                    ))}
                    {incluidos(e).length ? (
                      <span className="t-caption w-full">{TEXTO_INCLUIDO_EN_BASE}:</span>
                    ) : null}
                    {incluidos(e).map((m) => (
                      <ChipIncluido key={m.moduloId} m={m} />
                    ))}
                  </span>
                </Td>
                <Td className="t-numeric text-right font-medium">{clp(e.totalClp)}</Td>
              </Tr>
            ))}
            <Tr>
              <Td className="font-semibold">Total</Td>
              <Td className="t-caption">{t.facturables} se facturan</Td>
              <Td className="t-caption">{t.noFacturables} no se facturan</Td>
              <Td className="t-numeric text-right font-semibold">{clp(t.totalClp)}</Td>
            </Tr>
          </tbody>
        </Table>
      </div>
    </>
  );
}
