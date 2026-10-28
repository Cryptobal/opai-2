import { Badge, claseFila } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fechaCorta } from "@/lib/formato";

import {
  ESTADO_SOLICITUD,
  etiquetaDe,
  nombreTitular,
  SEMAFORO,
  type Solicitud,
  TIPOS_SOLICITUD,
} from "./tipos";

/** Filas de la bandeja ARCO+: titular, derecho, recepción, estado y semáforo del plazo. */
export function ListaSolicitudes({ items, consulta }: { items: Solicitud[]; consulta: string }) {
  return (
    <ul>
      {items.map((s) => {
        const e = etiquetaDe(ESTADO_SOLICITUD, s.estado);
        const sem = etiquetaDe(SEMAFORO, s.semaforo);
        const abierta = s.estado === "recibida" || s.estado === "en_proceso";
        return (
          <li key={s.id}>
            <LinkNext
              href={`?${consulta ? `${consulta}&` : ""}ver=${s.id}`}
              className={claseFila()}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-medium text-fg">{nombreTitular(s)}</span>
                <span className="t-caption truncate">
                  {TIPOS_SOLICITUD[s.tipo] ?? s.tipo} · recibida {fechaCorta(s.recibidaEn)}
                </span>
              </span>
              <span className="flex flex-none flex-col items-end gap-1">
                <Badge tono={e.tono}>{e.etiqueta}</Badge>
                {abierta ? (
                  <Badge tono={sem.tono} punto={false}>
                    {sem.etiqueta}
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
