import { Badge, Empty, Monograma, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { clp, type EmpresaCobro, type ModuloCobro, type Resumen } from "./cobro";

/** Módulos contratados o con condición: los demás no aportan a la vista. */
const relevantes = (e: EmpresaCobro) =>
  e.modulos.filter((m) => m.condicion || m.estado === "activo" || m.estado === "trial");

function ChipModulo({ m }: { m: ModuloCobro }) {
  if (m.calculo.facturable)
    return (
      <Badge tono="success" title={m.cargo ? "Cargo generado" : "Se factura este mes"}>
        {m.nombre} · {clp(m.cargo?.montoClp ?? m.calculo.montoClp)}
        {m.cargo ? " ✓" : ""}
      </Badge>
    );
  return (
    <Badge
      tono={m.calculo.motivo === "en_prueba" ? "info" : "neutro"}
      title={m.calculo.motivoTexto}
    >
      {m.nombre} · {m.calculo.motivoTexto}
    </Badge>
  );
}

/** Empresas del mes con lo que factura cada módulo y lo que no (con su motivo), y el total. */
export function TablaEmpresas({ resumen }: { resumen: Resumen }) {
  if (resumen.empresas.length === 0) return <Empty titulo="Aún no hay empresas" />;
  const href = (id: string) => `/platform/tenants/${id}/cobro`;
  return (
    <>
      <ul className="flex flex-col rounded-lg border border-border bg-surface md:hidden">
        {resumen.empresas.map((e) => (
          <li
            key={e.tenantId}
            className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0"
          >
            <LinkNext
              href={href(e.tenantId)}
              className="flex min-h-11 items-center justify-between gap-3"
            >
              <span className="truncate text-base font-medium text-fg">{e.nombre}</span>
              <span className="t-numeric text-base font-semibold text-fg">{clp(e.totalClp)}</span>
            </LinkNext>
            <span className="flex flex-wrap gap-1.5">
              {relevantes(e).map((m) => (
                <ChipModulo key={m.moduloId} m={m} />
              ))}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-fg">Total</span>
          <span className="t-numeric font-semibold text-fg">{clp(resumen.totales.totalClp)}</span>
        </li>
      </ul>
      <div className="hidden md:block">
        <Table>
          <thead>
            <Tr>
              <Th>Empresa</Th>
              <Th>Módulos</Th>
              <Th className="text-right">A facturar</Th>
            </Tr>
          </thead>
          <tbody>
            {resumen.empresas.map((e) => (
              <Tr key={e.tenantId}>
                <Td className="w-64">
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
                    {relevantes(e).length ? (
                      relevantes(e).map((m) => <ChipModulo key={m.moduloId} m={m} />)
                    ) : (
                      <span className="t-caption">Sin módulos contratados</span>
                    )}
                  </span>
                </Td>
                <Td className="t-numeric text-right font-medium">{clp(e.totalClp)}</Td>
              </Tr>
            ))}
            <Tr>
              <Td className="font-semibold">Total</Td>
              <Td className="t-caption">
                {resumen.totales.facturables} se facturan · {resumen.totales.noFacturables}{" "}
                contratados sin facturar
              </Td>
              <Td className="t-numeric text-right font-semibold">
                {clp(resumen.totales.totalClp)}
              </Td>
            </Tr>
          </tbody>
        </Table>
      </div>
    </>
  );
}
