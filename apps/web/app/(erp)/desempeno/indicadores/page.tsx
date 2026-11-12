import { Badge, ListScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import { cargarHechos, cargarPropios } from "../_componentes/datos";
import { PestanasDesempeno } from "../_componentes/pestanas";
import { conUnidad, ETIQUETA_FORMA, mesCorto, type Propio } from "../_componentes/tipos";
import { EditarPropio } from "./_componentes/editar-propio";

export const metadata = { title: "Indicadores propios" };

function Estado({ p }: { p: Propio }) {
  return p.estado === "publicado" ? (
    <Badge tono="success">Publicado, rige desde {mesCorto(p.vigenteDesde)}</Badge>
  ) : (
    <Badge tono="warning">Borrador</Badge>
  );
}

/** Indicadores propios (ADR-094, CAR-313): los que la empresa arma sobre hechos que OPAI registra. */
export default function IndicadoresPropios() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Desempeño"
      ruta="/desempeno"
      completo
      cargar={async () => {
        const [r, hechos, identidad] = await Promise.all([
          cargarPropios(),
          cargarHechos(),
          identidadActual(),
        ]);
        const edita = identidad ? puedeDeIdentidad(identidad)("desempeno:scorecards.manage") : false;
        return { r, hechos: hechos.ok ? hechos.data.filter((h) => h.puedeUsar) : [], edita };
      }}
    >
      {({ r, hechos, edita }) => (
        <ListScreen<Propio>
          state={estadoPantalla(r)}
          titulo="Desempeño"
          filtros={<PestanasDesempeno activa="indicadores" />}
          accionPrincipal={edita ? <EditarPropio propio={null} hechos={hechos} /> : undefined}
          items={r.ok ? r.data : []}
          clave={(p) => p.id}
          {...(edita ? { acciones: (p: Propio) => <EditarPropio propio={p} hechos={hechos} /> } : {})}
          tarjeta={(p) => (
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-base font-medium text-fg">{p.nombre}</span>
              <span className="t-caption">
                {ETIQUETA_FORMA[p.definicion.forma]} · Meta sugerida {conUnidad(p.metaSugerida, p.unidad)}
              </span>
              <Estado p={p} />
            </span>
          )}
          columnas={[
            { id: "nombre", etiqueta: "Indicador", render: (p) => p.nombre },
            { id: "forma", etiqueta: "Cómo se calcula", render: (p) => ETIQUETA_FORMA[p.definicion.forma] },
            { id: "meta", etiqueta: "Meta sugerida", render: (p) => conUnidad(p.metaSugerida, p.unidad) },
            { id: "estado", etiqueta: "Estado", render: (p) => <Estado p={p} /> },
          ]}
          textos={{
            vacio: {
              titulo: "Sin indicadores propios",
              descripcion:
                "Arma un indicador con lo que OPAI ya registra, como negocios ganados o tareas completadas, y úsalo en el scorecard de un cargo.",
            },
          }}
        />
      )}
    </PaginaPortal>
  );
}
