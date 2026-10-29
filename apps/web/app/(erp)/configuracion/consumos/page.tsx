import { Estado, KpiTile } from "@opai/ds";

import { leerParametros, type SearchParams } from "@/lib/parametros";

import { PaginaConfig } from "../_centro/pagina-config";
import { cargarConsumos, kpis, mesesHasta } from "./_componentes/datos";
import { SelectorMes } from "./_componentes/selector-mes";
import { num, PorAgenteTabla, PorRecursoModulo, usd } from "./_componentes/tablas";

export const metadata = { title: "Consumos" };

/** Variación respecto del mes anterior; gastar menos es bueno (verde), más es aviso. */
function variacion(actual: number, previo: number | undefined) {
  if (!previo) return undefined;
  const p = Math.round(((actual - previo) / previo) * 100);
  return {
    texto: `${p > 0 ? "↗ +" : p < 0 ? "↘ −" : ""}${Math.abs(p)} %`,
    tono: p > 0 ? ("warning" as const) : ("success" as const),
  };
}

/** Consumos (33): KPIs del mes con variación y detalle por recurso, módulo y agente. */
export default function Consumos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="consumos"
      titulo="Consumos"
      cargar={async () => cargarConsumos((await leerParametros(searchParams))["mes"])}
      cabecera={({ mes }) => ({ acciones: <SelectorMes mes={mes} opciones={mesesHasta()} /> })}
    >
      {({ state, actual, previo, agentes }) => {
        const a = kpis(actual.ok ? actual.data : null);
        const p = previo ? kpis(previo) : null;
        const v = (k: keyof typeof a) => variacion(a[k], p?.[k]);
        const tile = (etiqueta: string, valor: string, k: keyof typeof a) => {
          const x = v(k);
          return <KpiTile etiqueta={etiqueta} valor={valor} {...(x ? { variacion: x } : {})} />;
        };
        return (
          <Estado state={state} variante="detalle">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tile("Inteligencia artificial", usd(a.iaUsd), "iaUsd")}
                {tile("Correos", num(a.correos), "correos")}
                {tile("Geolocalización", num(a.geo), "geo")}
                {tile("Llamadas API y MCP", num(a.llamadas), "llamadas")}
              </div>
              <p className="t-caption -mt-2">
                {a.iaTokens ? `${num(a.iaTokens)} tokens de IA · ` : ""}Variación respecto del mes
                anterior
              </p>
              <div className="grid gap-4 2xl:grid-cols-2 2xl:items-start">
                <PorRecursoModulo filas={actual.ok ? actual.data.porRecursoModulo : []} />
                <PorAgenteTabla filas={agentes} />
              </div>
            </div>
          </Estado>
        );
      }}
    </PaginaConfig>
  );
}
