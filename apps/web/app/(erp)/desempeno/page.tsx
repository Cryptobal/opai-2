import { Badge, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";

import { cargarScorecards, type FilaScorecard } from "./_componentes/datos";
import { PestanasDesempeno } from "./_componentes/pestanas";
import { mesCorto } from "./_componentes/tipos";

export const metadata = { title: "Desempeño" };

function Estado({ f }: { f: FilaScorecard }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {f.vigenteDesde ? (
        <Badge tono="success">Vigente desde {mesCorto(f.vigenteDesde)}</Badge>
      ) : (
        <Badge tono="neutro">Sin scorecard</Badge>
      )}
      {f.pendiente ? <Badge tono="warning">Cambios pendientes</Badge> : null}
    </span>
  );
}

/** Desempeño (ADR-094, CAR-307): los cargos de la empresa y el estado de su scorecard. */
export default function Desempeno() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Desempeño"
      ruta="/desempeno"
      completo
      cargar={async () => ({ r: await cargarScorecards() })}
    >
      {({ r }) => (
        <ListScreen<FilaScorecard>
          state={estadoPantalla(r)}
          titulo="Desempeño"
          filtros={<PestanasDesempeno activa="cargos" />}
          items={r.ok ? r.data : []}
          clave={(f) => f.cargoId}
          href={(f) => `/desempeno/cargos/${f.cargoId}`}
          Link={LinkNext}
          tarjeta={(f) => (
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-base font-medium text-fg">{f.cargo}</span>
              <span className="t-caption">
                {f.indicadores === 1 ? "1 indicador" : `${f.indicadores} indicadores`}
              </span>
              <Estado f={f} />
            </span>
          )}
          columnas={[
            { id: "cargo", etiqueta: "Cargo", render: (f) => f.cargo },
            { id: "indicadores", etiqueta: "Indicadores", render: (f) => f.indicadores },
            { id: "estado", etiqueta: "Scorecard", render: (f) => <Estado f={f} /> },
          ]}
          textos={{
            vacio: {
              titulo: "Sin cargos",
              descripcion:
                "Crea los cargos de la empresa en Configuración para definir cómo se mide cada uno.",
            },
          }}
        />
      )}
    </PaginaPortal>
  );
}
