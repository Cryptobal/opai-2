import { KpiTile } from "@opai/ds";

import { cantidad, usd } from "../../_componentes/formato";

import type { PanelTenant } from "./tipos";

/** KPIs de consumo y salud en el resumen de la empresa. */
export function ResumenKpis({ panel }: { panel: PanelTenant | null }) {
  const m = panel?.mes;
  const t = panel?.trabajos;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        etiqueta="IA del mes"
        valor={usd(m?.iaUsd)}
        variacion={{ texto: `${cantidad(m?.iaTokens ?? 0)} tokens`, tono: "neutro" }}
      />
      <KpiTile
        etiqueta="Correos"
        valor={cantidad(m?.correos ?? 0)}
        variacion={{ texto: "este mes", tono: "neutro" }}
      />
      <KpiTile
        etiqueta="Llamadas API y MCP"
        valor={cantidad(m?.llamadas ?? 0)}
        variacion={{
          texto: `${panel?.keys.filter((k) => !k.revocada).length ?? 0} keys activas`,
          tono: "neutro",
        }}
      />
      <KpiTile
        etiqueta="Trabajos con problemas"
        valor={String((t?.fallidos ?? 0) + (t?.reintentando ?? 0))}
        variacion={
          t && (t.fallidos || t.reintentando)
            ? { texto: `${t.fallidos} fallido · ${t.reintentando} reintentando`, tono: "danger" }
            : { texto: "Sin problemas", tono: "neutro" }
        }
      />
    </div>
  );
}