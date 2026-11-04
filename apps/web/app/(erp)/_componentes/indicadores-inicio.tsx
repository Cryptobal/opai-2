import { KpiTile } from "@opai/ds";

import { UF_ESCALA } from "@opai/domain";

import { ejecutarComoUsuario } from "@/lib/servidor";

import { armarIndicadores, type Indicadores } from "./indicadores-armar";

/** Indicadores del Inicio (CAR-182 · PR 3b): solo los que el usuario puede ver. Si la consulta falla
 *  no se pinta nada: no es lo que el usuario vino a hacer y los pendientes siguen en pantalla. */
export async function IndicadoresInicio() {
  const r = await ejecutarComoUsuario<Indicadores>("erp", "core.inicio.indicadores", {});
  if (!r.ok) return null;
  const tarjetas = armarIndicadores(r.data, UF_ESCALA);
  if (tarjetas.length === 0) return null;
  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tarjetas.map((t) => (
        <KpiTile
          key={t.id}
          etiqueta={t.etiqueta}
          valor={t.valor}
          {...(t.variacion ? { variacion: t.variacion } : {})}
        />
      ))}
    </section>
  );
}
