import { Badge, claseFila } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fechaCorta } from "@/lib/formato";

import { ESTADO_INCIDENTE, etiquetaDe, type Incidente } from "./tipos";

/** Filas del registro de incidentes: descripción, detección, estado y si faltan avisos. */
export function ListaIncidentes({ items }: { items: Incidente[] }) {
  return (
    <ul>
      {items.map((i) => {
        const e = etiquetaDe(ESTADO_INCIDENTE, i.estado);
        return (
          <li key={i.casoId}>
            <LinkNext href={`?ver=${i.casoId}`} className={claseFila()}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-medium text-fg">
                  {i.descripcion ?? "Incidente"}
                </span>
                <span className="t-caption truncate">
                  Detectado {fechaCorta(i.ocurridoEn ?? i.registradoEn)} · {i.avisos.length}{" "}
                  aviso(s)
                </span>
              </span>
              <span className="flex flex-none flex-col items-end gap-1">
                <Badge tono={e.tono}>{e.etiqueta}</Badge>
                {!i.notificada && i.estado !== "cerrado" ? (
                  <Badge tono="warning" punto={false}>
                    Avisos pendientes
                  </Badge>
                ) : null}
              </span>
            </LinkNext>
          </li>
        );
      })}
    </ul>
  );
}
