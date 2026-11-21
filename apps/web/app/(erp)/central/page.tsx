import { ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import {
  type Alerta,
  cargarCola,
  cargarEstado,
  cargarTurnoEstado,
  ETIQUETA_SEVERIDAD,
  ordenarCola,
  SEVERIDADES,
  VISTAS,
} from "./_componentes/datos";
import { CargarMasCola } from "./_componentes/cargar-mas";
import { ResponsableTurno } from "./_componentes/responsable-turno";
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
        const [cola, estado, turno, usuarios] = await Promise.all([
          cargarCola(p),
          cargarEstado(),
          cargarTurnoEstado(),
          ejecutarComoUsuario<{ userId: string; nombre: string }[]>("erp", "core.users.list", {}),
        ]);
        const nombres = new Map((usuarios.ok ? usuarios.data : []).map((u) => [u.userId, u.nombre] as const));
        return { cola, estado, turno, nombres };
      }}
      opciones={() => ({
        acciones: (
          <EnlaceBoton href="/central/nueva-alerta" variante="secondary">
            Abrir alerta
          </EnlaceBoton>
        ),
      })}
    >
      {({ cola, estado, turno, nombres }) => (
        <ListScreen<Alerta>
          state={estadoPantalla(cola, estado, turno)}
          titulo="Central"
          subtitulo={
            estado.ok && turno.ok ? (
              <span className="flex flex-col gap-1">
                <ResumenCentral estado={estado.data} />
                <ResponsableTurno turno={turno.data} nombres={nombres} />
              </span>
            ) : undefined
          }
          filtros={<ChipsFiltro filtros={FILTROS} />}
          paginacion={
            cola.ok && cola.data.siguiente ? (
              <span className="flex flex-wrap items-center gap-3">
                Hay más alertas en esta vista.
                <CargarMasCola cursor={cola.data.siguiente} />
              </span>
            ) : undefined
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