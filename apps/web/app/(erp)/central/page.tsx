import { Badge, ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { haceCuanto } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import {
  type Alerta,
  cargarCola,
  cargarEstado,
  ETIQUETA_ESTADO,
  ETIQUETA_SEVERIDAD,
  ordenarCola,
  SEVERIDADES,
  TONO_ESTADO,
  TONO_SEVERIDAD,
  VISTAS,
} from "./_componentes/datos";
import { ResumenCentral } from "./_componentes/resumen";

export const metadata = { title: "Central" };
type Props = { searchParams: SearchParams };

const FILTROS = [
  { param: "vista", etiqueta: "Vista", opciones: VISTAS, porDefecto: "activas" },
  {
    param: "severidad",
    etiqueta: "Severidad",
    opciones: SEVERIDADES.map((s) => ({ valor: s, etiqueta: ETIQUETA_SEVERIDAD[s] ?? s })),
  },
];

const instalacion = (a: Alerta) => a.instalacionNombre ?? "Instalación sin nombre";

/** Central · cola en vivo (modulos/central.md §3, CA10): alertas agrupadas por instalación, la más grave arriba. */
export default function Central({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Central"
      ruta="/central"
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const [cola, estado] = await Promise.all([cargarCola(p), cargarEstado()]);
        return { cola, estado };
      }}
    >
      {({ cola, estado }) => (
        <ListScreen<Alerta>
          state={estadoPantalla(cola)}
          titulo="Central"
          subtitulo={estado.ok ? <ResumenCentral estado={estado.data} /> : undefined}
          filtros={<ChipsFiltro filtros={FILTROS} />}
          items={ordenarCola(cola.ok ? cola.data.items : [])}
          clave={(a) => a.id}
          grupo={instalacion}
          href={(a) => `/central/alertas/${a.id}`}
          Link={LinkNext}
          textos={{ vacio: { titulo: "Sin alertas", descripcion: "No hay alertas en esta vista." } }}
          tarjeta={(a) => (
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-2">
                <Badge tono={TONO_SEVERIDAD[a.severidad] ?? "neutro"}>{ETIQUETA_SEVERIDAD[a.severidad] ?? a.severidad}</Badge>
                <span className="truncate text-base font-medium text-fg">{a.titulo}</span>
              </span>
              <span className="t-caption">
                {ETIQUETA_ESTADO[a.estado] ?? a.estado} · {haceCuanto(a.createdAt)}
              </span>
            </span>
          )}
          columnas={[
            { id: "instalacion", etiqueta: "Instalación", render: (a) => instalacion(a) },
            {
              id: "severidad",
              etiqueta: "Severidad",
              render: (a) => (
                <Badge tono={TONO_SEVERIDAD[a.severidad] ?? "neutro"}>{ETIQUETA_SEVERIDAD[a.severidad] ?? a.severidad}</Badge>
              ),
            },
            { id: "titulo", etiqueta: "Alerta", render: (a) => <span className="font-medium text-fg">{a.titulo}</span> },
            {
              id: "estado",
              etiqueta: "Estado",
              render: (a) => <Badge tono={TONO_ESTADO[a.estado] ?? "neutro"}>{ETIQUETA_ESTADO[a.estado] ?? a.estado}</Badge>,
            },
            { id: "desde", etiqueta: "Desde", render: (a) => haceCuanto(a.createdAt) },
          ]}
        />
      )}
    </PaginaPortal>
  );
}
