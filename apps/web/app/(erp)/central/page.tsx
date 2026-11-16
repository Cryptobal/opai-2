import { ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { type Alerta, cargarCola, cargarEstado, ETIQUETA_SEVERIDAD, ordenarCola, SEVERIDADES, VISTAS } from "./_componentes/datos";
import { ResumenCentral } from "./_componentes/resumen";
import { columnasCola, instalacion, TarjetaCola } from "./_componentes/vista-cola";

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
          paginacion={
            cola.ok && cola.data.siguiente ? <span>Se muestran las 100 alertas más recientes; filtra por severidad para ver el resto.</span> : undefined
          }
          items={ordenarCola(cola.ok ? cola.data.items : [])}
          clave={(a) => a.id}
          grupo={instalacion}
          href={(a) => `/central/alertas/${a.id}`}
          Link={LinkNext}
          textos={{ vacio: { titulo: "Sin alertas", descripcion: "No hay alertas en esta vista." } }}
          tarjeta={(a) => <TarjetaCola a={a} />}
          columnas={columnasCola}
        />
      )}
    </PaginaPortal>
  );
}
