import type { ReactNode } from "react";

import { KpiTile } from "../components/card";
import { Cabecera, Estado, type EstadoPantalla, type TextosEstado } from "./estado";

export type Kpi = { etiqueta: string; valor: string; variacion?: { texto: string; tono: "success" | "danger" | "neutro" } };

export type DashboardScreenProps = {
  state: EstadoPantalla;
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  kpis: readonly Kpi[];
  /** Widgets: cada hijo ocupa una celda de la grilla (una columna en teléfono, dos en lg). */
  children?: ReactNode;
  textos?: TextosEstado;
};

/** Dashboard: tiles de indicador y grilla de widgets. */
export function DashboardScreen({ state, titulo, subtitulo, acciones, kpis, children, textos }: DashboardScreenProps) {
  return (
    <section>
      <Cabecera titulo={titulo} {...(subtitulo ? { subtitulo } : {})} {...(acciones ? { acciones } : {})} />
      <Estado state={state} variante="dashboard" {...(textos ? { textos } : {})}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiTile key={k.etiqueta} etiqueta={k.etiqueta} valor={k.valor} {...(k.variacion ? { variacion: k.variacion } : {})} />
          ))}
        </div>
        {children ? <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div> : null}
      </Estado>
    </section>
  );
}
