import { Badge, cn, estilosBoton, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { queryConCambios } from "@/app/_components/maestros/paginacion-cursor";
import { cuandoCompleto } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { type Parametros } from "@/lib/parametros";

import { cargarVisitas } from "./datos";
import { HojaVisita } from "./diferidas";
import { LLEGADA, resumenRevision, textoLlegada, type Visita } from "./tipos";

function paginacionVisitas(p: Parametros, siguiente: string | null) {
  const clase = cn(estilosBoton({ variant: "secondary" }));
  if (!siguiente && !p["vcursor"]) return null;
  return (
    <span className="flex gap-2">
      {p["vcursor"] ? (
        <LinkNext href={queryConCambios(p, { vcursor: null, visita: null })} className={clase}>
          Más recientes
        </LinkNext>
      ) : null}
      {siguiente ? (
        <LinkNext href={queryConCambios(p, { vcursor: siguiente, visita: null })} className={clase}>
          Más antiguas
        </LinkNext>
      ) : null}
    </span>
  );
}

/** Pestaña «Visitas» de la instalación (CAR-83): historial de visitas de supervisión y su detalle. */
export async function PestanaVisitas({
  instalacionId,
  p,
}: {
  instalacionId: string;
  p: Parametros;
}) {
  const r = await cargarVisitas(instalacionId, p);
  const items = r.ok ? r.data.items : [];
  return (
    <div className="@container">
      <ListScreen<Visita>
        state={estadoPantalla(r)}
        titulo="Visitas"
        sinCabecera
        items={items}
        clave={(v) => v.id}
        href={(v) => queryConCambios(p, { visita: v.id })}
        Link={LinkNext}
        paginacion={paginacionVisitas(p, r.ok ? r.data.siguiente : null)}
        tarjeta={(v) => (
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-base font-medium">{cuandoCompleto(v.iniciadaEn)}</span>
            <span className="t-caption truncate">
              {v.supervisor ?? "Supervisor"} · {resumenRevision(v)}
            </span>
            <span>
              <Badge tono={LLEGADA[v.geocerca].tono}>{textoLlegada(v)}</Badge>
            </span>
          </span>
        )}
        columnas={[
          {
            id: "fecha",
            etiqueta: "Llegada",
            className: "font-medium",
            render: (v) => cuandoCompleto(v.iniciadaEn),
          },
          { id: "supervisor", etiqueta: "Supervisor", render: (v) => v.supervisor ?? "—" },
          {
            id: "geocerca",
            etiqueta: "Ubicación",
            render: (v) => <Badge tono={LLEGADA[v.geocerca].tono}>{textoLlegada(v)}</Badge>,
          },
          { id: "revision", etiqueta: "Revisión", render: resumenRevision },
        ]}
        textos={{
          vacio: {
            titulo: "Aún no hay visitas",
            descripcion: "Las visitas de supervisión de esta instalación aparecerán aquí.",
          },
        }}
      />
      <HojaVisita visitas={items} />
    </div>
  );
}