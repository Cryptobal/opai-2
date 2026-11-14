import { Badge, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { cuandoCompleto } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";

import { Paginacion } from "../../../personas/_componentes/paginacion";
import { cargarVisitas } from "./datos";
import { HojaVisita } from "./diferidas";
import { LLEGADA, resumenRevision, textoLlegada, type Visita } from "./tipos";

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
  const ver = (v: Visita) => {
    const q = new URLSearchParams({
      ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
      visita: v.id,
    });
    return `?${q.toString()}`;
  };
  return (
    <div className="@container">
      <ListScreen<Visita>
        state={estadoPantalla(r)}
        titulo="Visitas"
        sinCabecera
        items={items}
        clave={(v) => v.id}
        href={ver}
        Link={LinkNext}
        paginacion={
          <Paginacion
            p={p}
            mostrados={items.length}
            siguiente={r.ok ? r.data.siguiente : null}
            total={null}
          />
        }
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
            descripcion:
              "Las visitas que registre un supervisor en esta instalación aparecerán aquí.",
          },
        }}
      />
      <HojaVisita visitas={items} />
    </div>
  );
}
