import { Badge, BarraProgreso, Empty, tonoUso } from "@opai/ds";

import { haceCuanto } from "@/lib/fechas";

import { usd } from "../../../_componentes/formato";
import { PaginaTenant } from "../pagina-tenant";

export const metadata = { title: "Agentes de la empresa" };

/** Plataforma → empresa · Agentes: cada API key con su gasto del mes contra el presupuesto. */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="agentes">
      {(_d, panel) =>
        panel?.keys.length ? (
          <ul className="flex flex-col rounded-lg border border-border bg-surface">
            {panel.keys.map((k) => {
              const f = k.presupuestoUsd ? k.gastadoUsd / k.presupuestoUsd : 0;
              return (
                <li
                  key={k.id}
                  className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_220px] md:items-center"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-medium text-fg">
                      {k.nombre}{" "}
                      <span className="t-mono text-sm font-normal text-fg-muted">{k.prefijo}…</span>
                    </span>
                    <span className="t-caption">
                      {k.ultimoUsoEn ? `último uso ${haceCuanto(k.ultimoUsoEn)}` : "sin uso"}
                    </span>
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="flex items-center justify-between gap-2">
                      {k.revocada ? <Badge>Revocada</Badge> : <Badge tono="success">Activa</Badge>}
                      <span className="t-caption t-numeric">
                        {usd(k.gastadoUsd)}
                        {k.presupuestoUsd ? ` de ${usd(k.presupuestoUsd)}` : " · sin tope"}
                      </span>
                    </span>
                    {k.presupuestoUsd ? (
                      <BarraProgreso
                        valor={f}
                        tono={tonoUso(f)}
                        etiqueta={`Presupuesto de ${k.nombre}`}
                      />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty titulo="Sin API keys" descripcion="La empresa aún no conecta agentes." />
        )
      }
    </PaginaTenant>
  );
}
